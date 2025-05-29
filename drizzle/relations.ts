import { relations } from "drizzle-orm/relations";
import { conversations, messages, users, usersBundle, usersOtp, conversationMembers } from "./schema";

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({many}) => ({
	messages: many(messages),
	conversationMembers: many(conversationMembers),
}));

export const usersRelations = relations(users, ({many}) => ({
	messages: many(messages),
	usersBundles: many(usersBundle),
	usersOtps: many(usersOtp),
	conversationMembers: many(conversationMembers),
}));

export const usersBundleRelations = relations(usersBundle, ({one}) => ({
	user: one(users, {
		fields: [usersBundle.userId],
		references: [users.id]
	}),
}));

export const usersOtpRelations = relations(usersOtp, ({one}) => ({
	user: one(users, {
		fields: [usersOtp.userId],
		references: [users.id]
	}),
}));

export const conversationMembersRelations = relations(conversationMembers, ({one}) => ({
	conversation: one(conversations, {
		fields: [conversationMembers.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [conversationMembers.userId],
		references: [users.id]
	}),
}));