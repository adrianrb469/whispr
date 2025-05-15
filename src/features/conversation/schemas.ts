import { z } from "zod";

export const messageIdSchema = z.object({
  id: z.string().min(1),
});
