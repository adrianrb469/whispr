import { z } from "zod";

export const keySchema = z.object({
  kty: z.string(),
  crv: z.string(),
  x: z.string(),
  y: z.string(),
});

export const opkSchema = z.object({
  id: z.number(),
  kty: z.string(),
  crv: z.string(),
  x: z.string(),
  y: z.string(),
});

export const userBundleWithOTPKeysSchema = z.object({
  identityKey: keySchema,
  signedPrekey: keySchema,
  prekeySignature: z.string(),
  oneTimePreKeys: z.array(opkSchema),
});

export type UserBundleWithOTPKeysSchema = z.infer<
  typeof userBundleWithOTPKeysSchema
>;

export const userBundleSchema = z.object({
  userId: z.number(),
  identityKey: keySchema,
  signedPrekey: keySchema,
  prekeySignature: z.string(),
});

export type UserBundleSchema = z.infer<typeof userBundleSchema>;

export const userOTPKeysSchema = z.array(opkSchema);

export type UserOTPKeysSchema = z.infer<typeof userOTPKeysSchema>;
