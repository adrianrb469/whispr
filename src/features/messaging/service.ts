import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { conversations, messages, users } from "drizzle/schema";
import db from "@/db/drizzle";
import { eq, desc } from "drizzle-orm";

// Importa la función de blockchain
import { addTransaction } from "../blockchain/service"; 

export async function addMessage(message: newMessage) {
  const result = await db.insert(messages).values(message);

  // Procesa el contenido del mensaje antes de agregarlo al blockchain
  try {
    const readableMessage = typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content); // Convierte a texto si es un objeto

    await addTransaction(
      String(message.senderId), 
      readableMessage           
    );
  } catch (err) {
    console.error("Blockchain error:", err);
    
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
