// client/src/api.ts

export interface TriviaQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface TriviaApiResponse {
  response_code: number; // 0 ok, 1 no results, 2 invalid, 3 token not found, 4 token empty
  results: TriviaQuestion[];
}

export interface QuizConfig {
  amount: number;
  category: number; // 0 means "any"
  difficulty: 'easy' | 'medium' | 'hard' | 'any';
}

/* -------------------- utilities -------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function shouldRetry(status: number | 0) {
  // 0 => network, 429 => rate limit, 5xx server errors
  return status === 0 || status === 429 || (status >= 500 && status <= 599);
}

function decodeUrl3986(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/* -------------------- backoff / fetch -------------------- */

const RETRIES = 4;          // total attempts = 5
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS  = 5000;

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastErr: any = null;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok && shouldRetry(res.status)) {
        // Respect Retry-After if present
        const retryAfter = res.headers.get('Retry-After');
        let waitMs = 0;
        if (retryAfter) {
          const seconds = Number(retryAfter);
          if (!Number.isNaN(seconds)) waitMs = Math.min(MAX_DELAY_MS, seconds * 1000);
        }
        if (waitMs === 0) {
          waitMs = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt)) + Math.random() * 250;
        }
        if (attempt < RETRIES) {
          await sleep(waitMs);
          continue;
        }
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Failed (${res.status}): ${txt || res.statusText}`);
      }
      return res;
    } catch (err: any) {
      lastErr = err;
      if (attempt >= RETRIES) break;
      const wait = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt)) + Math.random() * 250;
      await sleep(wait);
    }
  }
  throw lastErr ?? new Error('Network error');
}

/* -------------------- single-flight + cache -------------------- */

// De-dup concurrent calls with same params (helps with React StrictMode double render)
const inFlight = new Map<string, Promise<TriviaQuestion[]>>();

// Short-lived cache to avoid hammering the API on quick replays
const cache = new Map<string, { at: number; data: TriviaQuestion[] }>();
const CACHE_TTL = 60_000; // 1 min

function cacheKey(config: QuizConfig, token: string | null) {
  return JSON.stringify({ ...config, token: !!token }); // token presence affects OpenTDB response
}

function getCached(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

/* -------------------- OpenTDB token management -------------------- */

let opentdbToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

async function requestToken(): Promise<string | null> {
  try {
    const res = await fetchWithRetry('https://opentdb.com/api_token.php?command=request');
    const j = await res.json();
    if (j.response_code === 0 && j.token) return j.token as string;
    return null;
  } catch {
    return null; // operate without token if it fails
  }
}

async function getToken(): Promise<string | null> {
  if (opentdbToken) return opentdbToken;
  if (!tokenPromise) tokenPromise = requestToken().then(tok => { opentdbToken = tok; tokenPromise = null; return tok; });
  return tokenPromise;
}

async function resetToken(): Promise<void> {
  opentdbToken = null;
  tokenPromise = null;
}

/* -------------------- public API -------------------- */

export async function fetchTriviaQuestions(
  config: QuizConfig = { amount: 5, category: 0, difficulty: 'any' }
): Promise<TriviaQuestion[]> {

  const token = await getToken().catch(() => null);
  const key = cacheKey(config, token);

  const cached = getCached(key);
  if (cached) return cached;

  // Coalesce concurrent callers
  if (inFlight.has(key)) return inFlight.get(key)!;

  const promise = (async () => {
    // Build URL
    const params = new URLSearchParams();
    params.set('amount', String(config.amount));
    params.set('type', 'multiple');
    params.set('encode', 'url3986');
    if (config.category !== 0) params.set('category', String(config.category));
    if (config.difficulty !== 'any') params.set('difficulty', config.difficulty);
    if (token) params.set('token', token);

    let url = `https://opentdb.com/api.php?${params.toString()}`;

    // Fetch with retry
    let data: TriviaApiResponse;
    try {
      const res = await fetchWithRetry(url);
      data = await res.json();
    } catch (e) {
      inFlight.delete(key);
      throw e;
    }

    // Handle token-specific response codes:
    // 3: Token Not Found, 4: Token Empty (reset + retry once without token)
    if ((data.response_code === 3 || data.response_code === 4) && token) {
      await resetToken();
      const params2 = new URLSearchParams(params);
      params2.delete('token');
      const res2 = await fetchWithRetry(`https://opentdb.com/api.php?${params2.toString()}`);
      data = await res2.json();
    }

    if (data.response_code !== 0 || !Array.isArray(data.results)) {
      inFlight.delete(key);
      throw new Error('Invalid response from trivia API');
    }

    // Decode all fields
    const decoded = data.results.map(q => ({
      ...q,
      question: decodeUrl3986(q.question),
      correct_answer: decodeUrl3986(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map(decodeUrl3986),
    }));

    cache.set(key, { at: Date.now(), data: decoded });
    inFlight.delete(key);
    return decoded;
  })();

  inFlight.set(key, promise);
  return promise;
}
