import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import csurf from "csurf";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust reverse proxy (needed for secure cookies behind proxies)
app.set("trust proxy", 1);

// Basic security headers (relaxed in development for Vite HMR)
if (app.get("env") === "development") {
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // Disable CSP in dev to allow Vite's inline HMR client
    }),
  );
} else {
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": ["'self'"],
          "script-src-elem": ["'self'"],
          "img-src": ["'self'", "data:", "blob:"],
          "media-src": ["'self'", "data:", "blob:"],
          "connect-src": ["'self'", "https://opentdb.com", "ws:", "wss:"],
        },
      },
    }),
  );
}

// CORS (tighten in production by setting ORIGIN env)
const corsOrigin = process.env.ORIGIN || true; // allow dev tools; set explicit origin in prod
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// Request body limits
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Cookies and session (DB-backed if DATABASE_URL, else memory store)
app.use(cookieParser());
const PgStore = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);
const sessionStore = process.env.DATABASE_URL
  ? new PgStore({ conString: process.env.DATABASE_URL, tableName: 'sessions', createTableIfMissing: true })
  : new (MemoryStore as any)({ checkPeriod: 1000 * 60 * 60 });

app.use(
  session({
    name: "qid",
    secret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: app.get("env") !== "development",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

// Global rate limiter for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return apiLimiter(req, res, next);
  next();
});

// CSRF protection for state-changing API routes using double-submit cookie
const csrfProtection = csurf({ cookie: { httpOnly: false, sameSite: "lax", secure: app.get("env") !== "development" } });
// Provide CSRF token endpoint for clients
app.get("/api/csrf-token", (req, res) => {
  // Run csurf for this request to ensure cookie/secret exists and get a token
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return csrfProtection(req as any, res as any, () => {
    const token = (req as any).csrfToken?.() as string | undefined;
    if (token) {
      // Expose token via a readable cookie for SPA convenience
      res.cookie("XSRF-TOKEN", token, {
        httpOnly: false,
        sameSite: "lax",
        secure: app.get("env") !== "development",
      });
    }
    res.json({ csrfToken: token });
  });
});

// Apply CSRF to mutating API routes only
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (req.path.startsWith("/api")) return csrfProtection(req as any, res as any, next);
  return next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const redacted = { ...capturedJsonResponse } as any;
        if (redacted?.user?.password) redacted.user.password = "<redacted>";
        if (redacted?.password) redacted.password = "<redacted>";
        if (app.get("env") === "development") {
          logLine += ` :: ${JSON.stringify(redacted).slice(0, 200)}`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // 404 for unknown API routes
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    ...(process.platform !== 'win32' && { reusePort: true }),
  }, () => {
    log(`serving on port ${port}`);
  });
})();
