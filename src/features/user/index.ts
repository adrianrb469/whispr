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
} from "./service";

const app = new Hono();

app.get("/", async (c) => {
  const users = await getUsers();
  return c.json(users);
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

    console.log("userBundle", userBundle);

    const userBundleFound = await getKeybundle(userId);

    if (userBundleFound) {
      return c.json({ success: true }, 200);
    }

    try {
      await addKeybundle(userBundle);

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

export default app;
