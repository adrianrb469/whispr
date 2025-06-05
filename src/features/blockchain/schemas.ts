import { z } from "zod";

// esquema para validar las transacciones 
export const transactionSchema = z.object({
  conversationId: z
    .number()
    .int()
    .positive("Conversation ID must be a positive integer"),
  sender: z.string().min(1, "Sender is required"),
  message: z.string().min(1, "Message is required"),
});

// esquema para validar los parámetros de la consulta al obtener transacciones
// conversationId es opcional y se transforma a número si está presente
export const getTransactionsSchema = z.object({
  conversationId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});
