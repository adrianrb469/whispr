import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { transactionSchema, getTransactionsSchema } from "./schemas";
import {
  addTransaction,
  getAllTransactions,
  validateConversationBlockchain,
} from "./service";

const app = new Hono();

// POST /transactions - 
app.post("/transactions", zValidator("json", transactionSchema), async (c) => {
  try {
    const { conversationId, sender, message } = c.req.valid("json");
    const block = await addTransaction(conversationId, sender, message);
    return c.json(block, 201);
  } catch (error) {
    return c.json({ error: "Failed to add transaction" }, 500);
  }
});

// GET /transactions 
app.get(
  "/transactions",
  zValidator("query", getTransactionsSchema),
  async (c) => {
    try {
      const { conversationId } = c.req.valid("query");
      const chain = await getAllTransactions(conversationId);
      return c.json(chain);
    } catch (error) {
      return c.json({ error: "Failed to fetch transactions" }, 500);
    }
  }
);

// GET /validate/:conversationId 
app.get("/validate/:conversationId", async (c) => {
  try {
    const conversationId = parseInt(c.req.param("conversationId"), 10);
    if (isNaN(conversationId)) {
      return c.json({ error: "Invalid conversation ID" }, 400);
    }

    const isValid = await validateConversationBlockchain(conversationId);
    return c.json({
      conversationId,
      isValid,
      message: isValid
        ? "Blockchain is valid"
        : "Blockchain integrity compromised",
    });
  } catch (error) {
    return c.json({ error: "Failed to validate blockchain" }, 500);
  }
});

export default app;
