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

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY!;
const JWT_EXPIRATION_TIME = 60 * 60; // 1 hour

async function login({
  username,
  password,
}: LoginSchema): Promise<Result<{ token: string }>> {
  // const result = await db
  //   .select()
  //   .from(users)
  //   .where(eq(users.username, username))
  //   .limit(1);

  // const user = result[0];

  // if (!user) {
  //   return err(new AuthError("User not found", 404, "USER_NOT_FOUND"));
  // }

  // const passwordMatch = await bcrypt.compare(password, user.password);

  // if (!passwordMatch) {
  //   return err(
  //     new AuthError("Invalid credentials", 401, "INVALID_CREDENTIALS")
  //   );
  // }

  // handle jwt generation...
  const payload = {
    // sub: user.id,
    sub: username,
    role: "user",
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRATION_TIME,
  };
  const token = await sign(payload, JWT_SECRET_KEY);

  console.log("token:", token);

  return ok({
    token,
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

async function refreshToken(user: User): Promise<Result<{ token: string }>> {
  const payload = {
    sub: user.id,
    role: "user",
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRATION_TIME,
  };
  const token = await sign(payload, JWT_SECRET_KEY);

  return ok({
    token,
  });
}

async function getGithubAccessToken(
  code: string
): Promise<Result<{ token: string }>> {
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

  console.log("response github access token:", response.data);

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

  return ok({
    token: response.data.access_token,
  });
}

async function getGithubUserInfo(
  token: string
): Promise<Result<{ data: any }>> {
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

  return ok({
    data: response.data,
  });
}

async function verifyJwt(token: string): Promise<Result<{ valid: boolean }>> {
  try {
    const payload = await verify(token, JWT_SECRET_KEY);
  } catch {
    return ok({
      valid: false,
    });
  }

  return ok({
    valid: true,
  });
}

async function verifyGithubToken(
  token: string
): Promise<Result<{ valid: boolean }>> {
  try {
    const response = await axios.get("https://api.github.com/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status !== 200 || response.data.error) {
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

export {
  login,
  register,
  refreshToken,
  getGithubAccessToken,
  getGithubUserInfo,
  verifyJwt,
  verifyGithubToken,
};
