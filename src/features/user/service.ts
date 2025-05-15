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
  return await db.query.usersBundle.findFirst({
    where: eq(usersBundle.userId, userId),
  });
}

export async function addKeybundle({
  userId,
  identityKey,
  signedPrekey,
  prekeySignature,
}: UserBundleSchema) {
  return await db.insert(usersBundle).values({
    userId: userId,
    identityKey: identityKey,
    signedPrekey: signedPrekey,
    prekeySignature: prekeySignature,
  });
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

  return await db.insert(usersOtp).values(usersOTPKeys).returning();
}
