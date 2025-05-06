import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type User = typeof users.$inferSelect;

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  path: text("path").notNull(),
  contentType: varchar("content_type", { length: 255 }),
  userId: serial("user_id").references(() => users.id),
});

export type File = typeof files.$inferSelect;
