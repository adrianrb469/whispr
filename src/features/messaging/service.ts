import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { conversations, messages, users } from "drizzle/schema";
import db from "@/db/drizzle";
import { eq, desc } from "drizzle-orm";

// Import the updated blockchain service
import { addTransaction } from "../blockchain/service";

export async function addMessage(message: newMessage) {
  // Convert Date to string for database insert
  const messageData = {
    ...message,
    createdAt: message.createdAt.toISOString(),
  };

  const result = await db.insert(messages).values(messageData);

  // Add transaction to blockchain if conversationId exists
  if (message.conversationId && message.senderId) {
    try {
      // Get sender username for blockchain record
      const sender = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, message.senderId))
        .limit(1);

      const senderName = sender[0]?.username || `User${message.senderId}`;

      // Process message content for blockchain
      const readableMessage =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);

      await addTransaction(message.conversationId, senderName, readableMessage);
    } catch (err) {
      console.error("Blockchain transaction error:", err);
      // Don't fail the message if blockchain fails
    }
  }

  return result;
}

export async function getMessagesByConversationId(conversationId: number) {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt));
}
