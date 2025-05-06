import { LoginSchema, type RegisterSchema } from "./schemas";
import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { User, users } from "@db/schema";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";

async function login({
  username,
  password,
}: LoginSchema): Promise<Result<void>> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = result[0];

  if (!user) {
    return err(new AuthError("User not found", 404, "USER_NOT_FOUND"));
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return err(
      new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS")
    );
  }

  return ok(undefined);
}

async function register({
  username,
  password,
  name,
}: RegisterSchema): Promise<Result<void>> {
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUsers.length > 0) {
    return err(new AuthError("Username already taken", 400, "USERNAME_TAKEN"));
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await db.insert(users).values({
    username,
    password: hashedPassword,
    name,
  });

  return ok(undefined);
}

export { login, register };
