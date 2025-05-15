import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { conversations, conversationMembers, users } from "@db/schema";
import db from "@/db/drizzle";
import { eq, inArray } from "drizzle-orm";

async function addConversation() {

}

export async function getConversations(conversationsIds: number[]) {
    return await db.select().from(conversations).where(inArray(users.id, conversationsIds));
}

export async function getCoversationsIds(userId: number) {
    return await db.select().from(conversationMembers).where(eq(conversationMembers.userId, userId));
}
