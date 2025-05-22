import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import {
  conversations,
  conversationMembers,
  users,
  usersOtp,
} from "drizzle/schema";
import db from "@/db/drizzle";
import { eq, inArray, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface InitiateConversationPayload {
  to: number;
  from: number;
  payload: {
    iv: number[];
    ciphertext: number[];
    ephemeralKeyPublicJWK: Record<string, any>;
    usedOPKId?: string;
  };
}

async function addConversation(
  data: Omit<typeof conversations.$inferInsert, "id">
) {
  const [conversation] = await db
    .insert(conversations)
    .values(data)
    .returning();
  return conversation;
}

async function addConversationMember(
  data: typeof conversationMembers.$inferInsert
) {
  return await db.insert(conversationMembers).values(data);
}

export async function initiateConversation(
  data: InitiateConversationPayload
): Promise<Result<number, Error>> {
  try {
    // Verify both users exist
    const toUser = await db
      .select()
      .from(users)
      .where(eq(users.id, data.to))
      .limit(1);
    const fromUser = await db
      .select()
      .from(users)
      .where(eq(users.id, data.from))
      .limit(1);

    if (!toUser.length || !fromUser.length) {
      return err(new Error("One or both users not found"));
    }

    // Create the conversation
    const conversation = await addConversation({
      name: `Conversation between ${fromUser[0].username} and ${toUser[0].username}`,
      initialPayload: data.payload,
      createdAt: new Date().toISOString(),
    });

    // Add both participants to the conversation
    await addConversationMember({
      userId: data.to,
      conversationId: conversation.id,
    });

    await addConversationMember({
      userId: data.from,
      conversationId: conversation.id,
    });

    // If a one-time prekey was used, mark it as used
    if (data.payload.usedOPKId) {
      const otpkeyId = parseInt(data.payload.usedOPKId, 10);
      if (!isNaN(otpkeyId)) {
        await db
          .update(usersOtp)
          .set({
            oneTimePrekey: sql`jsonb_set(${usersOtp.oneTimePrekey}, '{used}', 'true')`,
          })
          .where(and(eq(usersOtp.userId, data.to), eq(usersOtp.id, otpkeyId)));
      }
    }

    return ok(conversation.id);
  } catch (error) {
    console.error("Failed to initiate conversation:", error);
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to initiate conversation")
    );
  }
}

export async function userInConversation(
  userId: number,
  conversationId: number
) {
  return await db
    .select()
    .from(conversationMembers)
    .where(
      eq(conversationMembers.userId, userId) &&
        eq(conversationMembers.conversationId, conversationId)
    );
}

export async function getConversation(conversationId: number) {
  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
}

export async function getConversations(conversationsIds: number[]) {
  return await db
    .select()
    .from(conversations)
    .where(inArray(users.id, conversationsIds));
}

export async function getCoversationsIds(userId: number) {
  return await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));
}
