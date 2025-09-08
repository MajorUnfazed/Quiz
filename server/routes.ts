import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 50 });
const writeLimiter = rateLimit({ windowMs: 1 * 60 * 1000, limit: 120 });

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const schema = insertUserSchema.extend({
        password: z.string().min(8).max(128),
      });
      const { username, password, displayName, avatar } = schema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName,
        avatar: avatar || "👤"
      });
      
      // establish session
      req.session!.userId = user.id;
      const { password: _p, ...safeUser } = user as any;
      res.json({ user: safeUser });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string().min(1).max(64),
        password: z.string().min(1).max(128),
      }).parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      req.session!.userId = user.id;
      const { password: _p, ...safeUser } = user as any;
      res.json({ user: safeUser });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session?.destroy(() => {
      res.json({ ok: true });
    });
  });

  // Get user route
  app.get('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const { id } = z.object({ id: z.string().uuid().or(z.string().min(1)) }).parse(req.params);
      if (req.session!.userId !== id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { password: _p, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // User scoring route  
  app.post('/api/users/update-score', requireAuth, writeLimiter, async (req, res) => {
    try {
      const { userId, pointsChange, isSoloMode } = z.object({
        userId: z.string(),
        pointsChange: z.number().int().min(-1000).max(1000),
        isSoloMode: z.boolean().optional(),
      }).parse(req.body);
      if (req.session!.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const currentScore = user.totalScore || 0;
      let newScore;
      
      if (isSoloMode) {
        // Solo mode: only positive points, no negatives
        newScore = currentScore + Math.max(0, pointsChange);
      } else {
        // Multiplayer mode: can lose points but never below 0
        newScore = Math.max(0, currentScore + pointsChange);
      }
      
      await storage.updateUserScore(userId, newScore);
      res.json({ success: true, newScore });
    } catch (error) {
      console.error('Update score error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      res.status(500).json({ error: 'Failed to update score' });
    }
  });

  // Game room routes (placeholder for now)
  app.get('/api/rooms', requireAuth, async (req, res) => {
    try {
      const rooms = await storage.getGameRooms();
      res.json(rooms);
    } catch (error) {
      console.error('Get rooms error:', error);
      res.status(500).json({ error: 'Failed to get rooms' });
    }
  });

  // Solo mode routes
  app.post('/api/solo/save', requireAuth, writeLimiter, async (req, res) => {
    try {
      const { userId, score, correctAnswers, totalQuestions, averageTime, difficulty, category, config } = z.object({
        userId: z.string(),
        score: z.number().int().min(0).max(1000),
        correctAnswers: z.number().int().min(0).max(1000),
        totalQuestions: z.number().int().min(1).max(1000),
        averageTime: z.number().int().min(0).max(3600000).nullable().optional(),
        difficulty: z.string().min(1).max(20),
        category: z.any().optional(),
        config: z.any().optional(),
      }).parse(req.body);

      if (req.session!.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!userId || score === undefined || correctAnswers === undefined || !totalQuestions) {
        return res.status(400).json({ error: 'Missing required solo result data' });
      }

      const soloResult = await storage.addSoloResult({
        userId,
        score,
        correctAnswers,
        totalQuestions,
        averageTime,
        difficulty: difficulty || 'medium',
        category,
        config
      });

      res.json({ success: true, id: soloResult.id });
    } catch (error) {
      console.error('Save solo result error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      res.status(500).json({ error: 'Failed to save solo result' });
    }
  });

  app.get('/api/leaderboard/solo', async (req, res) => {
    try {
      const { limit, offset } = z
        .object({
          limit: z.coerce.number().int().min(1).max(100).default(50),
          offset: z.coerce.number().int().min(0).max(5000).default(0),
        })
        .parse({ limit: req.query.limit, offset: req.query.offset });

      const leaderboard = await storage.getSoloLeaderboard(limit, offset);
      res.json(leaderboard);
    } catch (error) {
      console.error('Get solo leaderboard error:', error);
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  });

  const httpServer = createServer(app);

  // Add WebSocket server for real-time multiplayer
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedPlayers = new Map<string, { ws: WebSocket, userId: string, roomId: string | null }>();
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const type = data?.type;
        if (typeof type !== 'string') {
          return ws.send(JSON.stringify({ type: 'error', message: 'Invalid message type' }));
        }
        
        switch (type) {
          case 'join_lobby':
            // Player joins the lobby with their user ID
            if (!data.userId || typeof data.userId !== 'string') {
              return ws.send(JSON.stringify({ type: 'error', message: 'Invalid userId' }));
            }
            connectedPlayers.set(data.userId, { ws, userId: data.userId, roomId: null });
            ws.send(JSON.stringify({ type: 'lobby_joined', userId: data.userId }));
            break;
            
          case 'create_room':
            // Create a new game room
            try {
              if (!data.userId || typeof data.userId !== 'string') throw new Error('Invalid userId');
              const roomName = typeof data.roomName === 'string' ? data.roomName.slice(0, 80) : 'Room';
              const room = await storage.createGameRoom({
                name: roomName,
                hostId: data.userId,
                maxPlayers: Math.max(2, Math.min(Number(data.maxPlayers) || 8, 16)),
                config: data.config
              });
              
              // Add host to the room
              await storage.joinGameRoom(room.id, data.userId);
              
              // Update player's room ID
              const player = connectedPlayers.get(data.userId);
              if (player) {
                player.roomId = room.id;
              }
              
              ws.send(JSON.stringify({ type: 'room_created', room }));
              
              // Broadcast updated room list to all lobby players
              broadcastToLobby('room_list_updated');
            } catch (error) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to create room' }));
            }
            break;
            
          case 'join_room':
            // Join an existing game room
            try {
              if (typeof data.roomId !== 'string' || typeof data.userId !== 'string') throw new Error('Invalid payload');
              await storage.joinGameRoom(data.roomId, data.userId);
              
              // Update player's room ID
              const player = connectedPlayers.get(data.userId);
              if (player) {
                player.roomId = data.roomId;
              }
              
              const room = await storage.getGameRoom(data.roomId);
              ws.send(JSON.stringify({ type: 'room_joined', room }));
              
              // Notify other players in the room
              broadcastToRoom(data.roomId, { type: 'player_joined', userId: data.userId }, data.userId);
              broadcastToLobby('room_list_updated');
            } catch (error) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
            }
            break;
            
          case 'leave_room':
            // Leave the current room
            try {
              const player = connectedPlayers.get(data.userId);
              if (player?.roomId) {
                await storage.leaveGameRoom(player.roomId, data.userId);
                
                // Notify other players in the room
                broadcastToRoom(player.roomId, { type: 'player_left', userId: data.userId }, data.userId);
                
                player.roomId = null;
                ws.send(JSON.stringify({ type: 'room_left' }));
                broadcastToLobby('room_list_updated');
              }
            } catch (error) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to leave room' }));
            }
            break;
            
          case 'get_rooms':
            // Get list of available rooms
            try {
              const rooms = await storage.getGameRooms();
              ws.send(JSON.stringify({ type: 'rooms_list', rooms }));
            } catch (error) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to get rooms' }));
            }
            break;
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown event' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      // Find and remove the disconnected player
      for (const [userId, player] of Array.from(connectedPlayers.entries())) {
        if (player.ws === ws) {
          if (player.roomId) {
            // Leave any room they were in
            storage.leaveGameRoom(player.roomId, userId).catch(console.error);
            broadcastToRoom(player.roomId, { type: 'player_left', userId }, userId);
          }
          connectedPlayers.delete(userId);
          broadcastToLobby('room_list_updated');
          break;
        }
      }
      console.log('WebSocket connection closed');
    });
  });
  
  function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    for (const [userId, player] of Array.from(connectedPlayers.entries())) {
      if (player.roomId === roomId && userId !== excludeUserId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    }
  }
  
  function broadcastToLobby(messageType: string) {
    // Broadcast to players in lobby (not in any room)
    for (const [userId, player] of Array.from(connectedPlayers.entries())) {
      if (!player.roomId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: messageType }));
      }
    }
  }

  return httpServer;
}
