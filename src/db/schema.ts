import { pgTable, serial, text, varchar, primaryKey, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type User = typeof users.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;

export const conversationMembers = pgTable("conversation_members", {
  conversationId: integer("conversation_id").references(() => conversations.id),
  userId: integer("user_id").references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.conversationId, table.userId], name: "pk_conversation_members" }),
]);

export type ConversationMember = typeof conversationMembers.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  senderId: integer("sender_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;

export const blockchain = pgTable("blockchain", {
  id: integer("id").primaryKey().notNull(),
  timestamp: timestamp("timestamp").notNull(),
  sender: varchar("sender", { length: 255 }).notNull(),
  message: text("message").notNull(),
  previousHash: text("previous_hash").notNull(),
  hash: text("hash").notNull(),
});
export type Blockchain = typeof blockchain.$inferSelect;