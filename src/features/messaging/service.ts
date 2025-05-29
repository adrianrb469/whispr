import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { conversations, messages, users } from "drizzle/schema";
import db from "@/db/drizzle";
import { eq, desc } from "drizzle-orm";

export async function addMessage(message: newMessage) {
  return await db.insert(messages).values(message);
}

export async function getMessagesByConversationId(conversationId: number) {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt));
}
