import { UserBundleSchema, UserOTPKeysSchema } from "./schemas";
import { Result, ok, err } from "@/utils/result";
import db from "@/db/drizzle";
import { eq, and } from "drizzle-orm";
import { usersBundle, users, usersOtp } from "drizzle/schema";
import * as bcrypt from "bcrypt";

export async function getUserById(userId: number) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function getUsers() {
  return await db.query.users.findMany({
    columns: {
      id: true,
      username: true,
      name: true,
    },
  });
}

export async function getKeybundle(userId: number) {
  const keyBundle = await db.query.usersBundle.findFirst({
    where: eq(usersBundle.userId, userId),
    columns: {
      identityKey: true,
      signedPrekey: true,
      prekeySignature: true,
    },
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
    otpKey: {
      ...(otpKey.oneTimePrekey as Record<string, any>),
      id: otpKey.clientId,
    },
  };
}

async function getOTPKey(userId: number) {
  const key = await db.query.usersOtp.findFirst({
    where: eq(usersOtp.userId, userId),
  });

  // if (key) {
  //   await db.delete(usersOtp).where(and(eq(usersOtp.userId, userId), eq(usersOtp.clientId, key.clientId)));
  // }

  return key;
}

export async function addKeybundle(bundle: UserBundleSchema) {
  console.log("bundle inside function", bundle);
  return await db
    .insert(usersBundle)
    .values(bundle)
    .catch((error) => {
      console.log("error adding keybundle");
      console.error(error);
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
    clientId: key.id,
    oneTimePrekey: key,
  }));

  return await db.insert(usersOtp).values(usersOTPKeys);
}

export async function deleteUserBundle(userId: number) {
  return await db.delete(usersBundle).where(eq(usersBundle.userId, userId));
}

export async function getOTPKeyByClientId(userId: number, clientId: number) {
  return await db.query.usersOtp.findFirst({
    where: and(eq(usersOtp.userId, userId), eq(usersOtp.clientId, clientId)),
  });
}

export async function deleteOTPKey(userId: number, clientId: number) {
  return await db
    .delete(usersOtp)
    .where(and(eq(usersOtp.userId, userId), eq(usersOtp.clientId, clientId)));
}

export async function getAllOTPKeys(userId: number) {
  return await db.query.usersOtp.findMany({
    where: eq(usersOtp.userId, userId),
  });
}
