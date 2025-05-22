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
} from "./schemas";
import {
  login,
  refreshToken,
  register,
  loginWithGithub,
  verifyJwt,
} from "./service";
import { authMiddleware } from "@/middleware";
import { getUserById } from "../user/service";

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

  return c.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
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

  // const {
  //   success: successUserInfo,
  //   error: errorUserInfo,
  //   data: dataUserInfo,
  // } = await getGithubUserInfo(data.token);

  // if (!successUserInfo || !dataUserInfo) {
  //   // const status = errorUserInfo instanceof AuthError ? errorUserInfo.status : 500;
  //   // const code = errorUserInfo instanceof AuthError ? errorUserInfo.code : "INTERNAL_SERVER_ERROR";
  //   // throw new HTTPException(status, { message: errorUserInfo.message });
  // }

  // TODO: register user

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

    const { success, data } = await verifyJwt(token);

    if (!success || !data) {
      throw new HTTPException(401, { message: "Invalid JWT token" });
    }

    return c.json({
      valid: data.valid,
    });
  }
);

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
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
});

export default app;
