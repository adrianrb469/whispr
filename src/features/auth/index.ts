import { validate } from "@/utils/validation";
import { Hono } from "hono";
import {
  loginSchema,
  oauthGithubSchema,
  refreshTokenSchema,
  registerSchema,
  validateTokenSchema,
  verifyMfaSchema,
} from "./schemas";
import { authMiddleware } from "@/middleware";
import {
  handleLogin,
  handleRegister,
  handleOauthGithub,
  handleValidateToken,
  handleRefreshToken,
  handleMfaVerification,
  handleMfaSetup,
  handleEnableMfa,
  handleResetMfa,
  handleLogout,
} from "./controller";

const app = new Hono();

app.post("/login", validate("json", loginSchema), handleLogin);

app.post("/register", validate("json", registerSchema), handleRegister);

app.post(
  "/oauth/github",
  validate("json", oauthGithubSchema),
  handleOauthGithub
);

app.get(
  "/validate-token",
  validate("query", validateTokenSchema),
  handleValidateToken
);

app.post("/refresh-token", handleRefreshToken);

app.post(
  "/mfa/verify",
  validate("json", verifyMfaSchema),
  handleMfaVerification
);

// use authMiddleware to the routes below
app.use("*", authMiddleware());

app.post("/mfa/setup", handleMfaSetup);

app.post("/mfa/enable", handleEnableMfa);

app.post("/mfa/reset", handleResetMfa);

app.post("/logout", handleLogout);

export default app;
