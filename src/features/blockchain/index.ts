import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { transactionSchema } from "./schemas";
import { addTransaction, getAllTransactions } from "./service";

// Inicializa el blockchain en memoria
import { initializeBlockchain } from "./blockchain";
initializeBlockchain();

const app = new Hono();

// POST /transactions
app.post(
  "/transactions",
  zValidator("json", transactionSchema),
  async (c) => {
    const { sender, message } = c.req.valid("json");
    const block = addTransaction(sender, message);
    return c.json(block, 201);
  },
);

// GET /transactions
app.get("/transactions", async (c) => {
  const chain = getAllTransactions();
  return c.json(chain);
});

export default app;
