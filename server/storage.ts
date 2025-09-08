import { 
  type User, 
  type InsertUser,
  type GameRoom,
  type InsertGameRoom,
  type GameParticipant,
  type InsertGameParticipant,
  type GameResult,
  type InsertGameResult,
  type SoloResult,
  type InsertSoloResult
} from "@shared/schema";
import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
// Database imports are only needed for DbStorage (commented out below)
// import { db } from "./db";
// import * as schema from "@shared/schema";
// import { eq, sql, and } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game room operations
  createGameRoom(room: InsertGameRoom & { hostId: string }): Promise<GameRoom>;
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  getGameRooms(): Promise<GameRoom[]>;
  updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined>;
  
  // Game participant operations
  addParticipant(participant: InsertGameParticipant): Promise<GameParticipant>;
  getParticipants(roomId: string): Promise<GameParticipant[]>;
  updateParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined>;
  removeParticipant(roomId: string, userId: string): Promise<void>;
  
  // Game result operations
  addGameResult(result: InsertGameResult): Promise<GameResult>;
  getGameResults(roomId: string): Promise<GameResult[]>;
  
  // Solo result operations
  addSoloResult(result: InsertSoloResult): Promise<SoloResult>;
  getSoloLeaderboard(limit?: number, offset?: number): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    averageTime: number;
    difficulty: string;
    category: string;
    timestamp: Date;
  }[]>;
  
  // Convenience methods
  joinGameRoom(roomId: string, userId: string): Promise<void>;
  leaveGameRoom(roomId: string, userId: string): Promise<void>;
  updateUserScore(userId: string, newScore: number): Promise<void>;
}

export class MemStorage implements IStorage {
  protected users: Map<string, User>;
  protected gameRooms: Map<string, GameRoom>;
  protected gameParticipants: Map<string, GameParticipant>;
  protected gameResults: Map<string, GameResult>;
  protected soloResults: Map<string, SoloResult>;

  constructor() {
    this.users = new Map();
    this.gameRooms = new Map();
    this.gameParticipants = new Map();
    this.gameResults = new Map();
    this.soloResults = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      displayName: insertUser.displayName,
      avatar: insertUser.avatar || "👤",
      gamesPlayed: 0,
      totalScore: 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Game room operations
  async createGameRoom(room: InsertGameRoom & { hostId: string }): Promise<GameRoom> {
    const id = randomUUID();
    const gameRoom: GameRoom = {
      id,
      name: room.name,
      hostId: room.hostId,
      status: "waiting",
      maxPlayers: room.maxPlayers || 8,
      currentPlayers: 1, // host is first player
      config: room.config,
      questions: null,
      currentQuestionIndex: 0,
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
    };
    this.gameRooms.set(id, gameRoom);
    return gameRoom;
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    return this.gameRooms.get(id);
  }

  async getGameRooms(): Promise<GameRoom[]> {
    return Array.from(this.gameRooms.values())
      .filter(room => room.status === "waiting")
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    const room = this.gameRooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.gameRooms.set(id, updatedRoom);
    return updatedRoom;
  }

  // Game participant operations
  async addParticipant(participant: InsertGameParticipant): Promise<GameParticipant> {
    const id = randomUUID();
    const gameParticipant: GameParticipant = {
      id,
      roomId: participant.roomId,
      userId: participant.userId,
      score: 0,
      currentAnswers: null,
      isReady: false,
      joinedAt: new Date(),
    };
    this.gameParticipants.set(id, gameParticipant);
    
    // Update room player count
    const room = this.gameRooms.get(participant.roomId);
    if (room) {
      room.currentPlayers = (room.currentPlayers || 0) + 1;
      this.gameRooms.set(participant.roomId, room);
    }
    
    return gameParticipant;
  }

  async getParticipants(roomId: string): Promise<GameParticipant[]> {
    return Array.from(this.gameParticipants.values())
      .filter(participant => participant.roomId === roomId)
      .sort((a, b) => a.joinedAt!.getTime() - b.joinedAt!.getTime());
  }

  async updateParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined> {
    const participant = this.gameParticipants.get(id);
    if (!participant) return undefined;
    
    const updatedParticipant = { ...participant, ...updates };
    this.gameParticipants.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    const participantToRemove = Array.from(this.gameParticipants.values())
      .find(p => p.roomId === roomId && p.userId === userId);
    
    if (participantToRemove) {
      this.gameParticipants.delete(participantToRemove.id);
      
      // Update room player count
      const room = this.gameRooms.get(roomId);
      if (room) {
        room.currentPlayers = Math.max(0, (room.currentPlayers || 0) - 1);
        this.gameRooms.set(roomId, room);
      }
    }
  }

  // Game result operations
  async addGameResult(result: InsertGameResult): Promise<GameResult> {
    const id = randomUUID();
    const gameResult: GameResult = {
      id,
      roomId: result.roomId,
      userId: result.userId,
      questionIndex: result.questionIndex,
      selectedAnswer: result.selectedAnswer || null,
      isCorrect: result.isCorrect || false,
      timeToAnswer: result.timeToAnswer || null,
      createdAt: new Date(),
    };
    this.gameResults.set(id, gameResult);
    return gameResult;
  }

  async getGameResults(roomId: string): Promise<GameResult[]> {
    return Array.from(this.gameResults.values())
      .filter(result => result.roomId === roomId)
      .sort((a, b) => a.questionIndex - b.questionIndex || a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  // Solo result operations
  async addSoloResult(result: InsertSoloResult): Promise<SoloResult> {
    const id = randomUUID();
    const soloResult: SoloResult = {
      id,
      userId: result.userId,
      score: result.score || 0,
      correctAnswers: result.correctAnswers || 0,
      totalQuestions: result.totalQuestions,
      averageTime: result.averageTime || null,
      difficulty: result.difficulty,
      category: result.category || null,
      config: result.config || null,
      createdAt: new Date(),
    };
    this.soloResults.set(id, soloResult);
    return soloResult;
  }

  async getSoloLeaderboard(limit = 50, offset = 0): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    averageTime: number;
    difficulty: string;
    category: string;
    timestamp: Date;
  }[]> {
    // Get best score per user
    const userBestScores = new Map<string, {
      result: SoloResult;
      user: User;
    }>();

    Array.from(this.soloResults.values()).forEach((result) => {
      const user = this.users.get(result.userId);
      if (!user) return;

      const existing = userBestScores.get(result.userId);
      if (!existing || result.score > existing.result.score || 
          (result.score === existing.result.score && result.createdAt! < existing.result.createdAt!)) {
        userBestScores.set(result.userId, { result, user });
      }
    });

    // Convert to leaderboard format and sort
    const leaderboard = Array.from(userBestScores.values())
      .map(({ result, user }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar || "👤",
        score: result.score,
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        averageTime: result.averageTime || 0,
        difficulty: result.difficulty,
        category: result.category || "Mixed",
        timestamp: result.createdAt!,
      }))
      .sort((a, b) => {
        // Sort by score desc, then by timestamp asc (earlier is better for ties)
        if (a.score !== b.score) return b.score - a.score;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    return leaderboard.slice(offset, offset + limit);
  }
  
  // Convenience methods
  async joinGameRoom(roomId: string, userId: string): Promise<void> {
    await this.addParticipant({ roomId, userId });
  }
  
  async leaveGameRoom(roomId: string, userId: string): Promise<void> {
    await this.removeParticipant(roomId, userId);
  }
  
  async updateUserScore(userId: string, newScore: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.totalScore = newScore;
      this.users.set(userId, user);
    }
  }
}

// Database Storage Implementation (commented out - using FileStorage)
/*
export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, id)
      });
      return result || undefined;
    } catch (error) {
      console.error('Database getUser error:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, username)
      });
      return result || undefined;
    } catch (error) {
      console.error('Database getUserByUsername error:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(schema.users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Database createUser error:', error);
      throw error;
    }
  }

  async createGameRoom(room: InsertGameRoom & { hostId: string }): Promise<GameRoom> {
    try {
      const [gameRoom] = await db.insert(schema.gameRooms).values(room).returning();
      return gameRoom;
    } catch (error) {
      console.error('Database createGameRoom error:', error);
      throw error;
    }
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    try {
      const result = await db.query.gameRooms.findFirst({
        where: (gameRooms, { eq }) => eq(gameRooms.id, id)
      });
      return result || undefined;
    } catch (error) {
      console.error('Database getGameRoom error:', error);
      return undefined;
    }
  }

  async getGameRooms(): Promise<GameRoom[]> {
    try {
      return await db.query.gameRooms.findMany();
    } catch (error) {
      console.error('Database getGameRooms error:', error);
      return [];
    }
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    try {
      const [updated] = await db.update(schema.gameRooms)
        .set(updates)
        .where(eq(schema.gameRooms.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Database updateGameRoom error:', error);
      return undefined;
    }
  }

  async addParticipant(participant: InsertGameParticipant): Promise<GameParticipant> {
    try {
      const [gameParticipant] = await db.insert(schema.gameParticipants).values(participant).returning();
      
      // Update room player count
      await db.update(schema.gameRooms)
        .set({ currentPlayers: sql`${schema.gameRooms.currentPlayers} + 1` })
        .where(eq(schema.gameRooms.id, participant.roomId));
      
      return gameParticipant;
    } catch (error) {
      console.error('Database addParticipant error:', error);
      throw error;
    }
  }

  async getParticipants(roomId: string): Promise<GameParticipant[]> {
    try {
      return await db.query.gameParticipants.findMany({
        where: (gameParticipants, { eq }) => eq(gameParticipants.roomId, roomId),
        orderBy: (gameParticipants, { asc }) => [asc(gameParticipants.joinedAt)]
      });
    } catch (error) {
      console.error('Database getParticipants error:', error);
      return [];
    }
  }

  async updateParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant | undefined> {
    try {
      const [updated] = await db.update(schema.gameParticipants)
        .set(updates)
        .where(eq(schema.gameParticipants.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Database updateParticipant error:', error);
      return undefined;
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    try {
      await db.delete(schema.gameParticipants)
        .where(and(
          eq(schema.gameParticipants.roomId, roomId),
          eq(schema.gameParticipants.userId, userId)
        ));
      
      // Update room player count
      await db.update(schema.gameRooms)
        .set({ currentPlayers: sql`GREATEST(${schema.gameRooms.currentPlayers} - 1, 0)` })
        .where(eq(schema.gameRooms.id, roomId));
    } catch (error) {
      console.error('Database removeParticipant error:', error);
    }
  }

  async addGameResult(result: InsertGameResult): Promise<GameResult> {
    try {
      const [gameResult] = await db.insert(schema.gameResults).values(result).returning();
      return gameResult;
    } catch (error) {
      console.error('Database addGameResult error:', error);
      throw error;
    }
  }

  async getGameResults(roomId: string): Promise<GameResult[]> {
    try {
      return await db.query.gameResults.findMany({
        where: (gameResults, { eq }) => eq(gameResults.roomId, roomId),
        orderBy: (gameResults, { asc }) => [
          asc(gameResults.questionIndex),
          asc(gameResults.createdAt)
        ]
      });
    } catch (error) {
      console.error('Database getGameResults error:', error);
      return [];
    }
  }

  async addSoloResult(result: InsertSoloResult): Promise<SoloResult> {
    try {
      const [soloResult] = await db.insert(schema.soloResults).values(result).returning();
      return soloResult;
    } catch (error) {
      console.error('Database addSoloResult error:', error);
      throw error;
    }
  }

  async getSoloLeaderboard(limit = 50, offset = 0): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    averageTime: number;
    difficulty: string;
    category: string;
    timestamp: Date;
  }[]> {
    try {
      // Get best score per user using SQL
      const results = await db.execute(sql`
        WITH ranked_results AS (
          SELECT 
            sr.*,
            u.username,
            u.display_name,
            u.avatar,
            ROW_NUMBER() OVER (
              PARTITION BY sr.user_id 
              ORDER BY sr.score DESC, sr.created_at ASC
            ) as rn
          FROM solo_results sr
          JOIN users u ON sr.user_id = u.id
        )
        SELECT 
          u.id,
          u.username,
          u.display_name as "displayName",
          u.avatar,
          rr.score,
          rr.correct_answers as "correctAnswers",
          rr.total_questions as "totalQuestions",
          COALESCE(rr.average_time, 0) as "averageTime",
          rr.difficulty,
          COALESCE(rr.category, 'Mixed') as category,
          rr.created_at as timestamp
        FROM ranked_results rr
        JOIN users u ON rr.user_id = u.id
        WHERE rr.rn = 1
        ORDER BY rr.score DESC, rr.created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return results.rows as any[];
    } catch (error) {
      console.error('Database getSoloLeaderboard error:', error);
      return [];
    }
  }

  async joinGameRoom(roomId: string, userId: string): Promise<void> {
    await this.addParticipant({ roomId, userId });
  }

  async leaveGameRoom(roomId: string, userId: string): Promise<void> {
    await this.removeParticipant(roomId, userId);
  }

  async updateUserScore(userId: string, newScore: number): Promise<void> {
    try {
      await db.update(schema.users)
        .set({ totalScore: newScore })
        .where(eq(schema.users.id, userId));
    } catch (error) {
      console.error('Database updateUserScore error:', error);
    }
  }
}
*/

// File-based storage that persists data to JSON files
export class FileStorage extends MemStorage {
  private dataFile: string;

  constructor() {
    super();
    this.dataFile = join(process.cwd(), 'data', 'users.json');
    this.loadData();
  }

  private loadData() {
    try {
      if (existsSync(this.dataFile)) {
        const data = JSON.parse(readFileSync(this.dataFile, 'utf8'));
        this.users = new Map(data.users || []);
        this.gameRooms = new Map(data.gameRooms || []);
        this.gameParticipants = new Map(data.gameParticipants || []);
        this.gameResults = new Map(data.gameResults || []);
        this.soloResults = new Map(data.soloResults || []);
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
    }
  }

  private saveData() {
    try {
      // Ensure data directory exists
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      const data = {
        users: Array.from(this.users.entries()),
        gameRooms: Array.from(this.gameRooms.entries()),
        gameParticipants: Array.from(this.gameParticipants.entries()),
        gameResults: Array.from(this.gameResults.entries()),
        soloResults: Array.from(this.soloResults.entries())
      };
      
      writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await super.createUser(insertUser);
    this.saveData();
    return user;
  }

  async updateUserScore(userId: string, newScore: number): Promise<void> {
    await super.updateUserScore(userId, newScore);
    this.saveData();
  }

  async createGameRoom(room: InsertGameRoom & { hostId: string }): Promise<GameRoom> {
    const gameRoom = await super.createGameRoom(room);
    this.saveData();
    return gameRoom;
  }

  async addParticipant(participant: InsertGameParticipant): Promise<GameParticipant> {
    const gameParticipant = await super.addParticipant(participant);
    this.saveData();
    return gameParticipant;
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await super.removeParticipant(roomId, userId);
    this.saveData();
  }

  async addGameResult(result: InsertGameResult): Promise<GameResult> {
    const gameResult = await super.addGameResult(result);
    this.saveData();
    return gameResult;
  }

  async addSoloResult(result: InsertSoloResult): Promise<SoloResult> {
    const soloResult = await super.addSoloResult(result);
    this.saveData();
    return soloResult;
  }
}

// Use file-based storage for data persistence
export const storage = new FileStorage();
