import {
  getConversations,
  getCoversationsIds,
  initiateConversation,
} from "./service";
import { Hono } from "hono";
import { conversationInitiateSchema } from "./schemas";
import { validate } from "@/utils/validation";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

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
          201
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
  }
);

export default app;
