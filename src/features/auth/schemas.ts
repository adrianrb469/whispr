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

export const refreshTokenSchema = z.object({
  userId: z.string().min(1),
});

export const oauthGithubSchema = z.object({
  code: z.string().min(1),
});

export const validateTokenSchema = z.object({
  token: z.string().min(1),
});

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type OauthGithubSchema = z.infer<typeof oauthGithubSchema>;
export type ValidateTokenSchema = z.infer<typeof validateTokenSchema>;
