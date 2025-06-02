import {
  getConversations,
  getCoversationsIds,
  initiateConversation,
  initiateGroupConversation,
  getConversationById,
  getPendingConversations,
  getGroupConversations,
  changeConversationMemberStatus,
  conversationUserStatus,
  getConversationMessages,
  InitiateGroupConversationPayload,
} from "./service";
import { Hono } from "hono";
import { conversationInitiateSchema, conversationGroupSchema } from "./schemas";
import { validate } from "@/utils/validation";
import { HTTPException } from "hono/http-exception";
import { authMiddleware } from "@/middleware/auth.middleware";

const app = new Hono();

app.use("*", authMiddleware());

app.get("/", async (c): Promise<Response> => {
  try {
    const userId = c.req.param("userId");
    if (!userId) {
      return c.json({ message: "Missing userId" }, 400);
    }

    const userConversationsMembers = await getCoversationsIds(+userId);
    if (!userConversationsMembers || userConversationsMembers.length === 0) {
      return c.json({ message: "User has no conversations" }, 404);
    }

    const conversationsIds = userConversationsMembers
      .map((member) => member.conversationId)
      .filter((id): id is number => id !== null);

    const userConversations = await getConversations(conversationsIds);
    if (!userConversations || userConversations.length === 0) {
      return c.json({ message: "No conversations were found" }, 404);
    }

    return c.json(userConversations);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/:conversationId/messages", async (c) => {
  const conversationId = c.req.param("conversationId");
  const userId = c.get("userId");
  const isDirectMessage = c.req.query("isDirectMessage");

  console.log("Conversation ID:", conversationId);
  console.log("User ID:", userId);
  console.log("Is Direct Message:", isDirectMessage);

  if (!conversationId) {
    return c.json({ message: "Missing conversationId" }, 400);
  }

  const messages = await getConversationMessages(
    +conversationId,
    userId,
    isDirectMessage === "true",
  );

  console.log("Messages: ", messages);

  return c.json(messages);
});

app.get("/pending", async (c) => {
  try {
    const userId = c.get("userId");
    console.log("User ID: ", userId);

    const pendingConversations = await getPendingConversations(+userId);

    return c.json(pendingConversations);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.put("/:conversationId/accept", async (c) => {
  try {
    const conversationId = c.req.param("conversationId");
    if (!conversationId) {
      return c.json({ message: "Missing conversationId" }, 400);
    }

    const userId = c.get("userId");
    if (!userId) {
      return c.json({ message: "Missing userId" }, 400);
    }

    const body = await c.req.json();
    if (!body || !body.status) {
      return c.json({ message: "Missing status" }, 400);
    }

    const conversation = await getConversationById(+conversationId);
    if (!conversation) {
      return c.json({ message: "Conversation not found" }, 404);
    }

    const conversationMemberStatus = await changeConversationMemberStatus(
      +conversationId,
      +userId,
      body.status as conversationUserStatus,
    );
    if (!conversationMemberStatus) {
      return c.json({ message: "Conversation member not found" }, 404);
    }
    return c.json(conversationMemberStatus);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post(
  "/initiate",
  validate("json", conversationInitiateSchema),
  async (c) => {
    try {
      const initiateData = c.req.valid("json");

      const result = await initiateConversation(initiateData);

      if (result.success) {
        return c.json(
          {
            success: true,
            conversationId: result.data,
          },
          201,
        );
      } else {
        throw new HTTPException(400, { message: result.error.message });
      }
    } catch (error) {
      console.error("Error initiating conversation:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, {
        message: "Failed to initiate conversation",
      });
    }
  },
);

app.post("/group", validate("json", conversationGroupSchema), async (c) => {
  try {
    const userId = c.get("userId");

    const body = c.req.valid("json");

    const result = await initiateGroupConversation({
      ...body,
      userId,
    } as InitiateGroupConversationPayload);

    if (result.success) {
      return c.json(
        {
          success: true,
          conversationId: result.data,
        },
        201,
      );
    } else {
      throw new HTTPException(400, { message: result.error.message });
    }
  } catch (error) {
    console.error("Error initiating group conversation:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Failed to initiate group conversation",
    });
  }
});

app.get("/group", async (c) => {
  try {
    const userId = c.get("userId");

    const groupConversations = await getGroupConversations(+userId);

    return c.json(groupConversations);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
