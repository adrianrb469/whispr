import { validate } from "@/utils/validation";
import { AuthError } from "@utils/errors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  loginSchema,
  oauthGithubSchema,
  refreshTokenSchema,
  registerSchema,
  validateTokenSchema,
  verifyMfaSchema,
} from "./schemas";
import {
  login,
  register,
  loginWithGithub,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
} from "./service";
import { authMiddleware } from "@/middleware";
import { getUserById } from "../user/service";
import { generateSecret, otpauthURL, totp } from "speakeasy";
import { toDataURL } from "qrcode";
import { users } from "drizzle/schema";
import { eq } from "drizzle-orm";
import db from "@/db/drizzle";

const app = new Hono();

app.post("/login", validate("json", loginSchema), async (c) => {
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
  if (user.mfaActive && user.mfaSecret) {
    return c.json({
      mfa: true,
    });
  }

  return c.json({
    access_token,
    refresh_token,
  });
});

app.post("/register", validate("json", registerSchema), async (c) => {
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
});

app.post("/oauth/github", validate("json", oauthGithubSchema), async (c) => {
  const { code } = c.req.valid("json");

  const { success, error, data } = await loginWithGithub(code);

  if (!success || !data) {
    const status = error instanceof AuthError ? error.status : 500;
    const code =
      error instanceof AuthError ? error.code : "INTERNAL_SERVER_ERROR";

    throw new HTTPException(status, { message: error.message });
  }

  return c.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
});

app.get(
  "/validate-token",
  validate("query", validateTokenSchema),
  async (c) => {
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
  }
);

app.post("/refresh-token", validate("json", refreshTokenSchema), async (c) => {
  const { userId, refresh_token: current_refresh_token } = c.req.valid("json");

  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(400, { message: "User not found" });
  }

  const {
    success: refresh_token_validated,
    data: verified_refresh_token_data,
  } = await verifyRefreshToken(current_refresh_token);

  if (!refresh_token_validated || !verified_refresh_token_data.valid) {
    throw new HTTPException(400, { message: "Invalid refresh token" });
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

  return c.json({
    access_token,
    refresh_token,
  });
});

app.post("/mfa/verify", validate("json", verifyMfaSchema), async (c) => {
  const { token } = c.req.valid("json");
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (!user.mfaSecret) {
    throw new HTTPException(400, { message: "MFA is not enabled" });
  }

  const verified = totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token,
  });

  if (!verified) {
    throw new HTTPException(400, { message: "Invalid MFA token" });
  }

  const { data: access_token } = await generateAccessToken(user);
  const { data: refresh_token } = await generateRefreshToken(user);

  return c.json({
    access_token,
    refresh_token,
  });
});

// use authMiddleware to the routes below
app.use("*", authMiddleware());

app.post("/mfa/setup", async (c) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const secret = generateSecret();

  const url = otpauthURL({
    secret: secret.base32,
    label: user.username,
    encoding: "base32",
    issuer: "www.whispr.com",
  });

  const qrCode = await toDataURL(url);

  await db
    .update(users)
    .set({
      mfaSecret: secret.base32,
      mfaActive: true,
    })
    .where(eq(users.id, userId));

  return c.json({
    secret: secret.base32,
    qrCode,
  });
});

app.post("/mfa/reset", async (c) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await db
    .update(users)
    .set({
      mfaSecret: "",
      mfaActive: false,
    })
    .where(eq(users.id, userId));

  return c.json({
    message: "MFA reseted",
  });
});

export default app;
