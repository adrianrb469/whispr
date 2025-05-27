import {
  LoginSchema,
  RefreshTokenSchema,
  type RegisterSchema,
} from "./schemas";
import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { users } from "drizzle/schema";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { sign, verify } from "hono/jwt";
import axios from "axios";

import { config } from "dotenv";

config();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY!;
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY!;
const access_token_exp_time = 60 * 60; // 1 hour
const refresh_token_exp_time = 60 * 60 * 3; // 3 hours
const access_token_exp = Math.floor(Date.now() / 1000) + access_token_exp_time;
const refresh_token_exp =
  Math.floor(Date.now() / 1000) + refresh_token_exp_time;

const generateJwt = (
  userId: number,
  secretKey: string,
  exp: "access" | "refresh"
) => {
  const payload = {
    sub: userId,
    role: "user",
    exp: exp === "access" ? access_token_exp : refresh_token_exp,
  };
  return sign(payload, secretKey);
};

async function login({
  username,
  password,
}: LoginSchema): Promise<
  Result<{ access_token: string; refresh_token: string }>
> {
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

  const access_token = await generateJwt(user.id, JWT_SECRET_KEY, "access");
  const refresh_token = await generateJwt(
    user.id,
    JWT_REFRESH_SECRET_KEY,
    "refresh"
  );

  if (!access_token || !refresh_token) {
    return err(
      new AuthError("Failed to generate tokens", 500, "TOKEN_GENERATION_FAILED")
    );
  }

  return ok({
    access_token,
    refresh_token,
  });
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

async function refreshToken(
  user: User
): Promise<Result<{ access_token: string; refresh_token: string }>> {
  const access_token = await generateJwt(user.id, JWT_SECRET_KEY, "access");
  const refresh_token = await generateJwt(
    user.id,
    JWT_REFRESH_SECRET_KEY,
    "refresh"
  );

  if (!access_token || !refresh_token) {
    return err(
      new AuthError("Failed to generate tokens", 500, "TOKEN_GENERATION_FAILED")
    );
  }

  return ok({
    access_token,
    refresh_token,
  });
}

async function loginWithGithub(
  code: string
): Promise<Result<{ access_token: string; refresh_token: string }>> {
  const response = await axios.get(
    "https://github.com/login/oauth/access_token",
    {
      params: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      headers: {
        Accept: "application/json",
      },
    }
  );

  // api response is 200 if the token is invalid
  if (response.status !== 200 || response.data.error) {
    return err(
      new AuthError(
        response.data.error_description || "Failed to get github access token",
        500,
        "GITHUB_ACCESS_TOKEN_FAILED"
      )
    );
  }

  // if the user is not found, create a new user
  const { success, data } = await getGithubUserInfo(response.data.access_token);

  if (!success || !data) {
    return err(
      new AuthError(
        "Failed to get github user info",
        500,
        "GITHUB_USER_INFO_FAILED"
      )
    );
  }

  let user = await db
    .select()
    .from(users)
    .where(eq(users.id, data.id))
    .limit(1);

  if (user.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.login, salt);

    user = await db
      .insert(users)
      .values({
        id: data.id,
        username: data.login,
        password: hashedPassword,
        name: data.login,
      })
      .returning();
  }

  const access_token = await generateJwt(user[0].id, JWT_SECRET_KEY, "access");
  const refresh_token = await generateJwt(
    user[0].id,
    JWT_REFRESH_SECRET_KEY,
    "refresh"
  );

  if (!access_token || !refresh_token) {
    return err(
      new AuthError("Failed to generate tokens", 500, "TOKEN_GENERATION_FAILED")
    );
  }

  return ok({
    access_token,
    refresh_token,
  });
}

async function getGithubUserInfo(token: string): Promise<Result<any>> {
  const response = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 200 || response.data.error) {
    return err(
      new AuthError(
        response.data.error_description || "Failed to get github user info",
        500,
        "GITHUB_USER_INFO_FAILED"
      )
    );
  }

  return ok(response.data);
}

async function verifyAccessToken(
  token: string
): Promise<Result<{ valid: boolean }>> {
  try {
    const payload = await verify(token, JWT_SECRET_KEY);

    if (!payload) {
      return ok({
        valid: false,
      });
    }

    return ok({
      valid: true,
    });
  } catch {
    return ok({
      valid: false,
    });
  }
}

async function verifyRefreshToken(
  token: string
): Promise<Result<{ valid: boolean }>> {
  try {
    const payload = await verify(token, JWT_REFRESH_SECRET_KEY);

    if (!payload) {
      return ok({
        valid: false,
      });
    }

    return ok({
      valid: true,
    });
  } catch {
    return ok({
      valid: false,
    });
  }
}

async function generateAccessToken(user: User): Promise<Result<string>> {
  const access_token = await generateJwt(user.id, JWT_SECRET_KEY, "access");

  return ok(access_token);
}

async function generateRefreshToken(user: User): Promise<Result<string>> {
  const refresh_token = await generateJwt(
    user.id,
    JWT_REFRESH_SECRET_KEY,
    "refresh"
  );

  return ok(refresh_token);
}

export {
  login,
  register,
  refreshToken,
  loginWithGithub,
  getGithubUserInfo,
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
};
