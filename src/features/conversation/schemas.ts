import { z } from "zod";

export const messageIdSchema = z.object({
  id: z.string().min(1),
});

export const conversationInitiateSchema = z.object({
  to: z
    .string()
    .or(z.number())
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val)),
  from: z
    .string()
    .or(z.number())
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val)),
  payload: z.object({
    iv: z.array(z.number()),
    ciphertext: z.array(z.number()),
    ephemeralKeyPublicJWK: z.record(z.any()),
    usedOPKId: z
      .number()
      .or(z.string())
      .transform((val) => val.toString())
      .optional(),
  }),
});

export const conversationGroupSchema = z.object({
  name: z.string().min(1),
  members: z.array(
    z.object({
      id: z.number().min(1),
      payload: z.object({
        iv: z.array(z.number()),
        ciphertext: z.array(z.number()),
        ephemeralKeyPublicJWK: z.record(z.any()),
        usedOPKId: z
          .number()
          .or(z.string())
          .transform((val) => val.toString())
          .optional(),
      }),
    }),
  ),
});
