import { jwt } from "hono/jwt";
import { MiddlewareHandler } from "hono";
import { config } from "dotenv";

config();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY!;

export const authMiddleware = (): MiddlewareHandler => {
  return jwt({ secret: JWT_SECRET_KEY });
};
