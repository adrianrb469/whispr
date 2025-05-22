import auth from "@features/auth";
import messaging from "@/features/messaging";
import conversation from "@/features/conversation";
import user from "@/features/user";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { ZodError } from "zod";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import type { ServerWebSocket } from "bun";

const { websocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
  })
);

app.use("*", logger());

app.route("/auth", auth);
app.route("/conversations", conversation);
app.route("/message", messaging);
app.route("/user", user);

app.onError((err: Error | HTTPException, c) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: "BAD_REQUEST",
        errors: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      400
    );
  }

  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }

  console.log("error!!!", err.message);

  return c.json(
    { success: false, error: err.message || "Internal Server Error" },
    500
  );
});

export const server = Bun.serve({
  fetch: app.fetch,
  port: 3000,
  websocket: websocket,
});

export default app;
