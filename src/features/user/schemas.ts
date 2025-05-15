import { z } from "zod";

export const userBundleSchema = z.object({
  identityKey: z.object({
    keyId: z.string(),
    publicKey: z.string(),
    signature: z.string(),
  }),
  signedPrekey: z.object({
    keyId: z.string(),
    publicKey: z.string(),
    signature: z.string(),
  }),
  prekeySignature: z.string(),
});

export type UserBundleSchema = z.infer<typeof userBundleSchema>;

const oneTimePreKeySchema = z.object({
  keyId: z.string(),
  publicKey: z.string(),
  signature: z.string(),
});

export const userOTPKeysSchema = z.array(oneTimePreKeySchema);

export type UserOTPKeysSchema = z.infer<typeof userOTPKeysSchema>;
