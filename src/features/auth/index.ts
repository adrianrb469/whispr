import { validate } from "@/utils/validation";
import { AuthError } from "@utils/errors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loginSchema, registerSchema } from "./schemas";
import { login, register } from "./service";

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

export default app;
