import { z } from "zod";

export const transactionSchema = z.object({
  conversationId: z
    .number()
    .int()
    .positive("Conversation ID must be a positive integer"),
  sender: z.string().min(1, "Sender is required"),
  message: z.string().min(1, "Message is required"),
});

export const getTransactionsSchema = z.object({
  conversationId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});
