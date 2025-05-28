import { jwt } from "hono/jwt";
import { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { config } from "dotenv";

config();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY!;

export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    // First, run the JWT verification
    const jwtMiddleware = jwt({ secret: JWT_SECRET_KEY });
    await jwtMiddleware(c, async () => {});

    // Extract the JWT payload
    const payload = c.get("jwtPayload");

    if (!payload || !payload.sub) {
      throw new HTTPException(401, {
        message: "Invalid or missing user ID in token",
      });
    }

    // Add the user ID to the context for easy access
    c.set("userId", payload.sub as number);

    await next();
  };
};
