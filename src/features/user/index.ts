import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AuthError } from "@utils/errors";
import { validate } from "@/utils/validation";
import { userBundleWithOTPKeysSchema, userOTPKeysSchema } from "./schemas";
import {
  getUserById,
  getKeybundle,
  addKeybundle,
  addOTPKeys,
  getUsers,
  getAllOTPKeys,
} from "./service";
import { authMiddleware } from "@/middleware/auth.middleware";

const app = new Hono();

app.use("*", authMiddleware());

app.get("/", async (c) => {
  const users = await getUsers();
  return c.json(users);
});

app.get("/me", async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload || !payload.sub) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const userId = payload.sub as number;
  const user = await getUserById(userId);
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  // drop password
  const { password, ...userWithoutPassword } = user;

  return c.json(userWithoutPassword);
});

app.get("/:id/keybundle", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  if (isNaN(userId)) {
    throw new HTTPException(400, { message: "Invalid user ID" });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }
  console.log("user", user);
  const keybundle = await getKeybundle(userId);
  if (!keybundle) {
    throw new HTTPException(404, { message: "Keybundle not found" });
  }

  return c.json(keybundle);
});

app.post(
  "/:userId/keybundle",
  validate("json", userBundleWithOTPKeysSchema),
  async (c) => {
    const userId = +c.req.param("userId")!;
    if (!userId) {
      throw new HTTPException(400, { message: "Invalid user ID" });
    }

    const bundle = c.req.valid("json");

    const userBundle = {
      userId,
      identityKey: bundle.identityKey,
      signedPrekey: bundle.signedPrekey,
      prekeySignature: bundle.prekeySignature,
    };

    const userBundleFound = await getKeybundle(userId);

    if (userBundleFound) {
      return c.json({ success: true }, 200);
    }

    try {
      await addKeybundle(userBundle);

      console.log("oneTimePreKeys", bundle.oneTimePreKeys);

      await addOTPKeys({ userId: userId, keys: bundle.oneTimePreKeys });

      return c.json({ success: true }, 201);
    } catch (error) {
      console.error(error);
      if (error instanceof AuthError) {
        throw new HTTPException(403, { message: error.message });
      }
      throw new HTTPException(500, { message: "Failed to add keybundle" });
    }
  }
);

app.post("/otpkeys", validate("json", userOTPKeysSchema), async (c) => {
  const userOTPKeys = c.req.valid("json");

  await addOTPKeys({ userId: 1, keys: userOTPKeys });
});

app.get("/:id/otpkeys", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  if (isNaN(userId)) {
    throw new HTTPException(400, { message: "Invalid user ID" });
  }

  const otpKeys = await getAllOTPKeys(userId);
  return c.json(otpKeys);
});

export default app;
