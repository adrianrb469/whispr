// validación con Zod
import { z } from 'zod';

export const transactionSchema = z.object({
  sender: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string(), 
});

export type TransactionInput = z.infer<typeof transactionSchema>;