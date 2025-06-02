import { describe, test, expect, beforeEach, vi, Mock } from "vitest";
import { Hono } from "hono";
import { handleLogin, handleRegister } from "../controller"; // Assuming controller exports these
import { HTTPException } from "hono/http-exception";

// Mock the service functions to isolate controller logic
vi.mock("../service", () => ({
  login: vi.fn(),
  register: vi.fn(),
  loginWithGithub: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  generateAccessToken: vi.fn(),
}));

// Mock user service
vi.mock("../../user/service", () => ({
  getUserById: vi.fn(),
}));

// Mock db
vi.mock("@/db/drizzle", () => ({
  default: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]), // Adjust as needed
  },
}));

// Mock speakeasy
vi.mock("speakeasy", () => ({
  totp: {
    verify: vi.fn(),
  },
  generateSecret: vi.fn().mockReturnValue({ base32: "mocksecret" }),
  otpauthURL: vi.fn().mockReturnValue("mockurl"),
}));

// Mock qrcode
vi.mock("qrcode", () => ({
  toDataURL: vi.fn().mockResolvedValue("mockqrcode"),
}));

describe("Auth Controller", async () => {
  let app: Hono;
  const { login } = await import("../service");

  beforeEach(() => {
    vi.clearAllMocks(); // Reset mocks before each test
    app = new Hono();
    app.onError((err, c) => {
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      // Handle other errors if necessary, or rethrow
      console.error("Unhandled error in test:", err);
      return c.json({ message: "Internal Server Error From Test" }, 500);
    });
    app.post("/login", handleLogin);
    app.post("/register", handleRegister);
    // Add other routes here as you test them
  });

  describe("handleLogin", () => {
    test("should return tokens on successful login", async () => {
      (login as Mock).mockResolvedValue({
        success: true,
        data: {
          access_token: "fake_access_token",
          refresh_token: "fake_refresh_token",
          user: { id: 1, mfaEnabled: false },
        },
      });

      const res = await app.request("/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "password" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        access_token: "fake_access_token",
        refresh_token: "fake_refresh_token",
      });
      expect(login).toHaveBeenCalledWith({
        username: "testuser",
        password: "password",
      });
    });

    test("should return mfa: true if MFA is enabled", async () => {
      (login as Mock).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, mfaEnabled: true, mfaSecret: "somesecret" },
        },
      });

      const res = await app.request("/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "password" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        mfa: true,
        userId: 1,
      });
    });

    test("should return 401 for AuthError from login service", async () => {
      (login as Mock).mockResolvedValue({
        success: false,
        error: {
          name: "AuthError",
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        },
      });

      const res = await app.request("/login", {
        method: "POST",
        body: JSON.stringify({
          username: "wronguser",
          password: "wrongpassword",
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
      const responseJson = await res.json();
      expect(responseJson.message).toBe("INVALID_CREDENTIALS");
    });

    test("should return 500 for generic error from login service", async () => {
      (login as Mock).mockResolvedValue({
        success: false,
        error: { message: "Some generic error" }, // Not an AuthError instance
      });

      const res = await app.request("/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "password" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(500);
      const responseJson = await res.json();
      expect(responseJson.message).toBe("INTERNAL_SERVER_ERROR");
    });
  });
});
