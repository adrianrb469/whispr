import { pgTable, serial, varchar, timestamp, unique, foreignKey, integer, text, jsonb, primaryKey, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const otpkeySequence = pgSequence("otpkey_sequence", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })

export const conversations = pgTable("conversations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id"),
	senderId: integer("sender_id"),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}),
]);

export const usersOtp = pgTable("users_otp", {
	userId: integer("user_id"),
	oneTimePrekey: jsonb("one_time_prekey"),
	id: integer().default(sql`nextval('otpkey_sequence'::regclass)`).primaryKey().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_otp_user_id_fk"
		}),
]);

export const usersBundle = pgTable("users_bundle", {
	userId: integer("user_id").primaryKey().notNull(),
	identityKey: jsonb("identity_key"),
	signedPrekey: jsonb("signed_prekey"),
	prekeySignature: text("prekey_signature"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "users_bundle_users_id_fk"
		}),
]);

export const conversationMembers = pgTable("conversation_members", {
	conversationId: integer("conversation_id").notNull(),
	userId: integer("user_id").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "conversation_members_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversation_members_user_id_users_id_fk"
		}),
	primaryKey({ columns: [table.conversationId, table.userId], name: "pk_conversation_members"}),
]);
