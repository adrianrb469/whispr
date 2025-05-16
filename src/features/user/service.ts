import { UserBundleSchema, UserOTPKeysSchema } from "./schemas";
import { Result, ok, err } from "@/utils/result";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { usersBundle, users, usersOtp } from "drizzle/schema";
import * as bcrypt from "bcrypt";

export async function getUserById(userId: number) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function getKeybundle(userId: number) {
  const keyBundle = await db.query.usersBundle.findFirst({
    where: eq(usersBundle.userId, userId),
    columns: {
      identityKey: true,
      signedPrekey: true,
      prekeySignature: true,
    }
  });

  if (!keyBundle) {
    return null;
  }

  const otpKey = await getOTPKey(userId);
  if (!otpKey) {
    return null;
  }

  const { identityKey, signedPrekey, prekeySignature } = keyBundle;

  return {
    identityKey: identityKey,
    signedPrekey: signedPrekey,
    prekeySignature: prekeySignature,
    otpKey: otpKey.oneTimePrekey,
  };
}

async function getOTPKey(userId: number) {
  const key = await db.query.usersOtp.findFirst({
    where: eq(usersOtp.userId, userId),
  });

  if (key) {
    await db.delete(usersOtp).where(eq(usersOtp.id, key.id));
  }

  return key;
}

export async function addKeybundle(bundle: UserBundleSchema) {
  return await db.insert(usersBundle).values(bundle);
}

export async function addOTPKeys({
  userId,
  keys,
}: {
  userId: number;
  keys: UserOTPKeysSchema;
}) {
  const usersOTPKeys = keys.map((key) => ({
    userId: userId,
    oneTimePrekey: key,
  }));

  return await db.insert(usersOtp).values(usersOTPKeys);
}

export async function deleteUserBundle(userId: number) {
  return await db.delete(usersBundle).where(eq(usersBundle.userId, userId));
}
