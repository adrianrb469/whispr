import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  name: z.string().min(1),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
