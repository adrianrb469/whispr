import {
  pgTable,
  serial,
  timestamp,
  text,
  varchar,
  jsonb,
  unique,
  boolean,
  foreignKey,
  integer,
  primaryKey,
  pgSequence,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userStatus = pgEnum("user_status", [
  "NONE",
  "PENDING",
  "FINISHED",
  "OWNER",
]);

export const conversationType = pgEnum("conversation_type", [
  "DIRECT",
  "GROUP",
]);

export const otpkeySequence = pgSequence("otpkey_sequence", {
  startWith: "1",
  increment: "1",
  minValue: "1",
  maxValue: "2147483647",
  cache: "1",
  cycle: false,
});

export const blockchain = pgTable(
  "blockchain",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id"),
    timestamp: timestamp("timestamp").notNull(),
    sender: text("sender").notNull(),
    message: text("message").notNull(),
    previousHash: text("previous_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: "blockchain_conversation_id_conversations_id_fk",
    }),
  ]
);

export const conversations = pgTable("conversations", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  initialPayload: jsonb("initial_payload"),
  type: conversationType().default("DIRECT").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    username: varchar({ length: 255 }).notNull(),
    password: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    mfaSecret: varchar("mfa_secret", { length: 255 }).default(""),
    mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  },
  (table) => [unique("users_username_unique").on(table.username)]
);

export const messages = pgTable(
  "messages",
  {
    id: serial().primaryKey().notNull(),
    conversationId: integer("conversation_id"),
    senderId: integer("sender_id"),
    content: text().notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: "messages_conversation_id_conversations_id_fk",
    }),
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [users.id],
      name: "messages_sender_id_users_id_fk",
    }),
  ]
);

export const usersBundle = pgTable(
  "users_bundle",
  {
    userId: integer("user_id").primaryKey().notNull(),
    identityKey: jsonb("identity_key"),
    signedPrekey: jsonb("signed_prekey"),
    prekeySignature: text("prekey_signature"),
    createdAt: timestamp("created_at", { mode: "string" }).default(
      sql`CURRENT_TIMESTAMP`
    ),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "users_bundle_users_id_fk",
    }),
  ]
);

export const usersOtp = pgTable(
  "users_otp",
  {
    userId: integer("user_id").notNull(),
    oneTimePrekey: jsonb("one_time_prekey"),
    clientId: integer("client_id").default(0).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_otp_user_id_fk",
    }),
    primaryKey({
      columns: [table.userId, table.clientId],
      name: "pk_users_otp",
    }),
  ]
);

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: integer("conversation_id").notNull(),
    userId: integer("user_id").notNull(),
    joinedAt: timestamp("joined_at", { mode: "string" }).defaultNow().notNull(),
    status: userStatus().default("NONE").notNull(),
    initialPayload: jsonb("initial_payload"),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: "conversation_members_conversation_id_conversations_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "conversation_members_user_id_users_id_fk",
    }),
    primaryKey({
      columns: [table.conversationId, table.userId],
      name: "pk_conversation_members",
    }),
  ]
);
