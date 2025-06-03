import { z } from "zod";

export const transactionSchema = z.object({
  sender: z.string().min(1, "Sender is required"),
  message: z.string().min(1, "Message is required"),
});
