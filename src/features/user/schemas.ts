import { z } from "zod";

export const userBundleSchema = z.object({
  identityKey: z.object({
    kty: z.string(),
    crv: z.string(),
    x: z.string(),
    y: z.string(),
    d: z.string(),
  }),
  signedPrekey: z.object({
    kty: z.string(),
    crv: z.string(),
    x: z.string(),
    y: z.string(),
    d: z.string(),
  }),
  prekeySignature: z.string(),
});

export type UserBundleSchema = z.infer<typeof userBundleSchema>;

const oneTimePreKeySchema = z.object({
  kty: z.string(),
  crv: z.string(),
  x: z.string(),
  y: z.string(),
  d: z.string(),
});

export const userOTPKeysSchema = z.array(oneTimePreKeySchema);

export type UserOTPKeysSchema = z.infer<typeof userOTPKeysSchema>;
