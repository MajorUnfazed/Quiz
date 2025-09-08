import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  timestamp, 
  boolean, 
  jsonb, 
  index 
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar").default("👤"),
  gamesPlayed: integer("games_played").default(0),
  totalScore: integer("total_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game rooms for multiplayer
export const gameRooms = pgTable("game_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  hostId: varchar("host_id").notNull().references(() => users.id),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  maxPlayers: integer("max_players").notNull().default(8),
  currentPlayers: integer("current_players").notNull().default(0),
  config: jsonb("config").notNull(), // quiz configuration (amount, category, difficulty)
  questions: jsonb("questions"), // stored questions for consistency
  currentQuestionIndex: integer("current_question_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});

// Players in game rooms
export const gameParticipants = pgTable("game_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  score: integer("score").default(0),
  currentAnswers: jsonb("current_answers"), // player's selected answers
  isReady: boolean("is_ready").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Individual question results for detailed tracking
export const gameResults = pgTable("game_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  questionIndex: integer("question_index").notNull(),
  selectedAnswer: text("selected_answer"),
  isCorrect: boolean("is_correct").default(false),
  timeToAnswer: integer("time_to_answer"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Solo quiz results for leaderboard
export const soloResults = pgTable("solo_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull(),
  averageTime: integer("average_time"), // average milliseconds per question
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  category: text("category"), // quiz category
  config: jsonb("config"), // full quiz configuration
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema validation types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatar: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).pick({
  name: true,
  maxPlayers: true,
  config: true,
});

export const insertGameParticipantSchema = createInsertSchema(gameParticipants).pick({
  roomId: true,
  userId: true,
});

export const insertGameResultSchema = createInsertSchema(gameResults).pick({
  roomId: true,
  userId: true,
  questionIndex: true,
  selectedAnswer: true,
  isCorrect: true,
  timeToAnswer: true,
});

export const insertSoloResultSchema = createInsertSchema(soloResults).pick({
  userId: true,
  score: true,
  correctAnswers: true,
  totalQuestions: true,
  averageTime: true,
  difficulty: true,
  category: true,
  config: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameParticipant = typeof gameParticipants.$inferSelect;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;
export type GameResult = typeof gameResults.$inferSelect;
export type InsertGameResult = z.infer<typeof insertGameResultSchema>;
export type SoloResult = typeof soloResults.$inferSelect;
export type InsertSoloResult = z.infer<typeof insertSoloResultSchema>;
