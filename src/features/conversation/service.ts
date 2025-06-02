import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import {
  conversations,
  conversationMembers,
  users,
  usersOtp,
  usersBundle,
  userStatusEnum,
  messages,
  messages,
} from "drizzle/schema";
import db from "@/db/drizzle";
import { eq, inArray, and, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export type conversationUserStatus = (typeof userStatusEnum.enumValues)[number];

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

export interface InitiateGroupConversationPayload {
  name: string;
  userId: number;
  members: {
    id: number;
    payload: {
      iv: number[];
      ciphertext: number[];
      ephemeralKeyPublicJWK: Record<string, any>;
      usedOPKId?: string;
    };
  }[];
}

async function addConversation(
  data: Omit<typeof conversations.$inferInsert, "id">,
) {
  const [conversation] = await db
    .insert(conversations)
    .values(data)
    .returning();
  return conversation;
}

async function addConversationMember(
  data: typeof conversationMembers.$inferInsert,
) {
  return await db.insert(conversationMembers).values(data);
}

async function addConversationMembers(
  data: (typeof conversationMembers.$inferInsert)[],
) {
  return await db.insert(conversationMembers).values(data);
}

export async function getConversationById(conversationId: number) {
  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
}

export async function initiateConversation(
  data: InitiateConversationPayload,
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
      status: "PENDING",
    });

    await addConversationMember({
      userId: data.from,
      conversationId: conversation.id,
      status: "OWNER",
    });

    // If a one-time prekey was used, mark it as used
    if (data.payload.usedOPKId) {
      const clientId = parseInt(data.payload.usedOPKId, 10);
      if (!isNaN(clientId)) {
        await db
          .update(usersOtp)
          .set({
            oneTimePrekey: sql`jsonb_set(${usersOtp.oneTimePrekey}, '{used}', 'true')`,
          })
          .where(
            and(eq(usersOtp.userId, data.to), eq(usersOtp.clientId, clientId)),
          );
      }
    }

    return ok(conversation.id);
  } catch (error) {
    console.error("Failed to initiate conversation:", error);
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to initiate conversation"),
    );
  }
}

export async function initiateGroupConversation(
  data: InitiateGroupConversationPayload,
) {
  try {
    const conversation = await addConversation({
      name: data.name,
      createdAt: new Date().toISOString(),
      type: "GROUP",
    });

    await addConversationMember({
      userId: data.userId,
      conversationId: conversation.id,
      status: "OWNER",
    });

    await addConversationMembers(
      data.members.map((member) => ({
        userId: member.id,
        conversationId: conversation.id,
        initialPayload: member.payload,
        status: "PENDING",
      })),
    );

    for (const member of data.members) {
      if (member.payload.usedOPKId) {
        const clientId = parseInt(member.payload.usedOPKId, 10);
        await db
          .update(usersOtp)
          .set({
            oneTimePrekey: sql`jsonb_set(${usersOtp.oneTimePrekey}, '{used}', 'true')`,
          })
          .where(
            and(
              eq(usersOtp.userId, member.id),
              eq(usersOtp.clientId, clientId),
            ),
          );
      }
    }

    return ok(conversation.id);
  } catch (error) {
    console.error("Failed to initiate group conversation:", error);
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to initiate group conversation"),
    );
  }
}

export async function userInConversation(
  userId: number,
  conversationId: number,
) {
  return await db
    .select()
    .from(conversationMembers)
    .where(
      eq(conversationMembers.userId, userId) &&
        eq(conversationMembers.conversationId, conversationId),
    );
}

export async function getPendingConversations(userId: number) {
  const userPendingConversations = await db
    .select({
      id: conversationMembers.conversationId,
      conversationInitialPayload: conversations.initialPayload,
      memberInitialPayload: conversationMembers.initialPayload,
      conversationType: conversations.type,
    })
    .from(conversationMembers)
    .leftJoin(
      conversations,
      eq(conversations.id, conversationMembers.conversationId),
    )
    .where(
      and(
        eq(conversationMembers.userId, userId),
        eq(conversationMembers.status, "PENDING"),
      ),
    );

  const processedConversations = userPendingConversations.map((conv) => ({
    id: conv.id,
    initialPayload:
      conv.conversationType === "DIRECT"
        ? conv.conversationInitialPayload
        : conv.memberInitialPayload,
    type: conv.conversationType,
  }));

  const conversationsIds = processedConversations
    .map((conversation) => conversation.id)
    .filter((id): id is number => id !== null);

  const ownerOfConversations = await db
    .select({
      conversationId: conversationMembers.conversationId,
      initiatorId: conversationMembers.userId,
      initiatorIdentityKey: usersBundle.identityKey,
    })
    .from(conversationMembers)
    .leftJoin(
      conversations,
      eq(conversations.id, conversationMembers.conversationId),
    )
    .leftJoin(usersBundle, eq(usersBundle.userId, conversationMembers.userId))
    .where(
      and(
        inArray(conversationMembers.conversationId, conversationsIds) &&
          eq(conversationMembers.status, "OWNER"),
      ),
    );

  const pendingConversations = processedConversations.map((conversation) => {
    const owner = ownerOfConversations.find(
      (owner) => owner.conversationId === conversation.id,
    );
    return {
      id: conversation.id,
      initialPayload: conversation.initialPayload,
      initiatorId: owner?.initiatorId,
      initiatorIdentityKey: owner?.initiatorIdentityKey,
      type: conversation.type,
    };
  });

  return pendingConversations;
}

async function getDirectMessageHistory(
  currentUserId: number,
  targetUserId: number,
) {
  // First, find the direct message conversation that includes both users
  const conversation = await db
    .select({
      conversationId: conversations.id,
      conversationName: conversations.name,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(
      conversationMembers,
      eq(conversations.id, conversationMembers.conversationId),
    )
    .where(
      and(
        eq(conversations.type, "DIRECT"),
        inArray(conversationMembers.userId, [currentUserId, targetUserId]),
      ),
    )
    .groupBy(conversations.id, conversations.name, conversations.createdAt)
    .having(sql`COUNT(DISTINCT ${conversationMembers.userId}) = 2`)
    .limit(1); // Get just the first one if multiple DMs exist

  if (conversation.length === 0) {
    return { conversation: null, messages: [] };
  }

  const conversationId = conversation[0].conversationId;

  // Then get all messages for that conversation with sender info
  const chatHistory = await db
    .select({
      messages,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const chat = chatHistory.map((message) => ({
    id: message.messages.id,
    conversationId: message.messages.conversationId,
    senderId: message.messages.senderId,
    content: message.messages.content,
    createdAt: message.messages.createdAt,
  }));

  return chat;
}

export async function getConversationMessages(
  conversationId: number,
  userId: number,
  isDirectMessage: boolean,
) {
  if (!isDirectMessage) {
    return await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        senderName: users.username,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId));
  } else {
    const otherUserId = conversationId;

    return await getDirectMessageHistory(otherUserId, userId);
  }
}

export async function getGroupConversations(userId: number) {
  const userConversations = await db
    .select({
      conversationId: conversationMembers.conversationId,
    })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  const conversationIds = userConversations
    .map((conv) => conv.conversationId)
    .filter((id): id is number => id !== null);

  return await db
    .select()
    .from(conversations)
    .where(
      and(
        inArray(conversations.id, conversationIds),
        eq(conversations.type, "GROUP"),
      ),
    );
}

export async function getConversation(conversationId: number) {
  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
}

export async function changeConversationMemberStatus(
  conversationId: number,
  userId: number,
  status: conversationUserStatus,
) {
  return await db
    .update(conversationMembers)
    .set({
      status: status,
    })
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    );
}

export async function getConversations(conversationsIds: number[]) {
  return await db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, conversationsIds));
}

export async function getCoversationsIds(userId: number) {
  return await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));
}
