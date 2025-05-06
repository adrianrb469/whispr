import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { uploadFileSchema } from "./schemas";

const app = new Hono();

app.get("/", async (c) => {
  return c.json({ message: "List files endpoint" });
});

export default app;
