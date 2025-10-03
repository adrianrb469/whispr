import { Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import {
  generateAccessToken,
  login,
  loginWithGithub,
  register,
  verifyAccessToken,
  verifyRefreshToken,
  generateRefreshToken,
} from "./service";
import { AuthError } from "@/utils/errors";
import { getUserById } from "../user/service";
import * as speakeasy from "speakeasy";
import { BlankInput } from "hono/types";
import { BlankEnv } from "hono/types";
import { users } from "drizzle/schema";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";
import * as qrcode from "qrcode";

export const handleLogin = async (
  c: Context<
    {},
    "/login",
    {
      in: {
        json: {
          username: string;
          password: string;
        };
      };
      out: {
        json: {
          username: string;
          password: string;
        };
      };
    }
  >
) => {
  const body = c.req.valid("json");

  const { success, error, data } = await login(body);

  if (!success || !data) {
    const status = error instanceof AuthError ? error.status : 500;
    const code =
      error instanceof AuthError ? error.code : "INTERNAL_SERVER_ERROR";

    throw new HTTPException(status, {
      message: code,
    });
  }

  const { access_token, refresh_token, user } = data;

  // if mfa is active and there is a valid mfa secret string, return mfa: true
  if (user.mfaEnabled && user?.mfaSecret) {
    return c.json({
      mfa: true,
      userId: user.id,
    });
  }

  // Set JWT tokens as HTTP-only cookies
  setCookie(c, "access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "Strict",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  setCookie(c, "refresh_token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "Strict",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 60 * 60 * 3, // 3 hours
    path: "/",
  });

  return c.json({
    success: true,
    message: "Login successful",
  });
};

export const handleRegister = async (
  c: Context<
    {},
    "/register",
    {
      in: {
        json: {
          username: string;
          password: string;
          name: string;
        };
      };
      out: {
        json: {
          username: string;
          password: string;
          name: string;
        };
      };
    }
  >
) => {
  const data = c.req.valid("json");
  const { success, error } = await register(data);

  if (!success) {
    const status = error instanceof AuthError ? error.status : 500;
    const code =
      error instanceof AuthError ? error.code : "INTERNAL_SERVER_ERROR";

    throw new HTTPException(status, {
      message: code,
    });
  }

  return c.json({
    success: true,
  });
};

export const handleOauthGithub = async (
  c: Context<
    {},
    "/oauth/github",
    {
      in: {
        json: {
          code: string;
        };
      };
      out: {
        json: {
          code: string;
        };
      };
    }
  >
) => {
  const { code } = c.req.valid("json");

  const { success, error, data } = await loginWithGithub(code);

  if (!success || !data) {
    const status = error instanceof AuthError ? error.status : 500;
    const code =
      error instanceof AuthError ? error.code : "INTERNAL_SERVER_ERROR";

    throw new HTTPException(status, { message: error.message });
  }

  const { access_token, refresh_token, user } = data;

  if (user.mfaEnabled && user?.mfaSecret) {
    return c.json({
      mfa: true,
      userId: user.id,
    });
  }

  // Set JWT tokens as HTTP-only cookies
  setCookie(c, "access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "Strict",
    sameSite: "None",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  setCookie(c, "refresh_token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 60 * 60 * 3, // 3 hours
    path: "/",
  });

  return c.json({
    success: true,
    message: "Login successful",
  });
};

export const handleValidateToken = async (
  c: Context<
    {},
    "/validate-token",
    {
      in: {
        query: {
          token: string;
        };
      };
      out: {
        query: {
          token: string;
        };
      };
    }
  >
) => {
  const { token } = c.req.valid("query");

  if (!token) {
    throw new HTTPException(400, { message: "No token provided" });
  }

  const { success, data } = await verifyAccessToken(token);

  if (!success || !data) {
    throw new HTTPException(401, { message: "Invalid JWT token" });
  }

  return c.json({
    valid: data.valid,
  });
};

export const handleRefreshToken = async (
  c: Context<BlankEnv, "/refresh-token", BlankInput>
) => {
  // Get refresh token from cookies instead of request body
  const current_refresh_token = getCookie(c, "refresh_token");

  if (!current_refresh_token) {
    throw new HTTPException(400, { message: "No refresh token found" });
  }

  const {
    success: refresh_token_validated,
    data: verified_refresh_token_data,
  } = await verifyRefreshToken(current_refresh_token);

  if (!refresh_token_validated || !verified_refresh_token_data.valid) {
    throw new HTTPException(400, { message: "Invalid refresh token" });
  }

  // Extract user ID from the refresh token payload
  const { verify } = await import("hono/jwt");
  const payload = await verify(
    current_refresh_token,
    process.env.JWT_REFRESH_SECRET_KEY!
  );
  const userId = payload.sub as number;

  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(400, { message: "User not found" });
  }

  const { success: access_token_success, data: access_token } =
    await generateAccessToken(user);
  const { success: refresh_token_success, data: refresh_token } =
    await generateRefreshToken(user);

  if (
    !access_token_success ||
    !refresh_token_success ||
    !access_token ||
    !refresh_token
  ) {
    throw new HTTPException(500, { message: "Error generating tokens" });
  }

  // Set new JWT tokens as HTTP-only cookies
  setCookie(c, "access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  setCookie(c, "refresh_token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "Strict",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 60 * 60 * 3, // 3 hours
    path: "/",
  });

  return c.json({
    success: true,
    message: "Tokens refreshed successfully",
  });
};

export const handleMfaVerification = async (
  c: Context<
    {},
    "/mfa/verify",
    {
      in: {
        json: {
          userId: string;
          token: string;
        };
      };
      out: {
        json: {
          userId: string;
          token: string;
        };
      };
    }
  >
) => {
  const { token, userId } = c.req.valid("json");
  const user = await getUserById(+userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (!user.mfaSecret) {
    console.log("mfaSecret", user.mfaSecret);
    throw new HTTPException(400, { message: "MFA is not enabled" });
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token,
  });

  if (!verified) {
    throw new HTTPException(400, { message: "Invalid MFA token" });
  }

  const { data: access_token } = await generateAccessToken(user);
  const { data: refresh_token } = await generateRefreshToken(user);

  if (!access_token || !refresh_token) {
    throw new HTTPException(500, { message: "Error generating tokens" });
  }

  // Set JWT tokens as HTTP-only cookies
  setCookie(c, "access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "Strict",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  setCookie(c, "refresh_token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "Strict",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 60 * 60 * 3, // 3 hours
    path: "/",
  });

  return c.json({
    success: true,
    message: "MFA verification successful",
  });
};

export const handleMfaSetup = async (
  c: Context<BlankEnv, "/mfa/setup", BlankInput>
) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  let secret: string;

  if (user?.mfaSecret) {
    secret = user.mfaSecret;
  } else {
    secret = speakeasy.generateSecret({
      name: "Whispr",
      length: 32,
    }).base32;

    await db
      .update(users)
      .set({
        mfaSecret: secret,
        // mfaActive: true,
      })
      .where(eq(users.id, userId));
  }

  const url = speakeasy.otpauthURL({
    secret,
    label: user.username,
    encoding: "base32",
    issuer: "www.whispr.com",
  });

  const qrCode = await qrcode.toDataURL(url);

  return c.json({
    secret,
    qrCode,
  });
};

export const handleEnableMfa = async (
  c: Context<BlankEnv, "/mfa/enable", BlankInput>
) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (user.mfaEnabled) {
    throw new HTTPException(400, { message: "MFA is already enabled" });
  }

  if (!user.mfaSecret) {
    throw new HTTPException(400, { message: "MFA is not setup" });
  }

  await db
    .update(users)
    .set({
      mfaEnabled: true,
    })
    .where(eq(users.id, userId));

  return c.json({
    message: "MFA enabled",
  });
};

export const handleResetMfa = async (
  c: Context<BlankEnv, "/mfa/reset", BlankInput>
) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await db
    .update(users)
    .set({
      mfaSecret: "",
      mfaEnabled: false,
    })
    .where(eq(users.id, userId));

  return c.json({
    message: "MFA reseted",
  });
};

export const handleLogout = async (
  c: Context<BlankEnv, "/logout", BlankInput>
) => {
  // Clear the JWT cookies
  deleteCookie(c, "access_token", {
    path: "/",
  });

  deleteCookie(c, "refresh_token", {
    path: "/",
  });

  return c.json({
    success: true,
    message: "Logged out successfully",
  });
};
