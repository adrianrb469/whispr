import { validate } from "@/utils/validation";
import { AuthError } from "@utils/errors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loginSchema, refreshTokenSchema, registerSchema } from "./schemas";
import { login, refreshToken, register } from "./service";
import { authMiddleware } from "@/middleware";
import { getUserById } from "../user/service";

const app = new Hono();

app.post("/login", validate("json", loginSchema), async (c) => {
  const data = c.req.valid("json");

  const { success, error } = await login(data);

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

app.post("/register", validate("json", registerSchema), async (c) => {
  const data = c.req.valid("json");
  const result = await register(data);

  if (!result.success) {
    const status =
      result.error instanceof AuthError ? result.error.status : 500;
    const code =
      result.error instanceof AuthError
        ? result.error.code
        : "INTERNAL_SERVER_ERROR";

    throw new HTTPException(status, {
      message: code,
    });
  }

  return c.json({
    success: true,
  });
});

app.get("/oauth/github", (c) => {
  const redirectUrl = "https://github.com/login/oauth/authorize";
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = "http://localhost:3000/auth/github/callback";

  const url = `${redirectUrl}?client_id=${clientId}&redirect_uri=${redirectUri}`;
  return c.redirect(url);
});

app.use(authMiddleware());

app.post("/refresh-token", validate("json", refreshTokenSchema), async (c) => {
  const { userId } = c.req.valid("json");

  const user = await getUserById(+userId);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const { success, error, data } = await refreshToken(user);

  if (!success || !data) {
    const status = error instanceof AuthError ? error.status : 500;
    const code =
      error instanceof AuthError ? error.code : "INTERNAL_SERVER_ERROR";

    throw new HTTPException(status, { message: code });
  }

  return c.json({
    token: data.token,
  });
});

export default app;
