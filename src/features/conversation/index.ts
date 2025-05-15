import { getConversations, getCoversationsIds } from "./service";
import { Hono } from "hono";

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
  
    const conversationsIds = userConversationsMembers.map((member) => member.conversationId).filter((id): id is number => id !== null);
    
    const userConversations = await getConversations(conversationsIds);
    if (!userConversations || userConversations.length === 0) {
      return c.json({ message: "No conversations were found" }, 404);
    }
  
    return c.json(userConversations);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
})

export default app;
