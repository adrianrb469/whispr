import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: ContentfulStatusCode = 500,
    public code:
      | "INVALID_CREDENTIALS"
      | "USER_NOT_FOUND"
      | "USERNAME_TAKEN"
      | "REGISTRATION_FAILED" = "INVALID_CREDENTIALS"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public status: ContentfulStatusCode = 500,
    public code:
      | "FILE_NOT_FOUND"
      | "UPLOAD_FAILED"
      | "INVALID_FILE"
      | "PERMISSION_DENIED" = "UPLOAD_FAILED"
  ) {
    super(message);
    this.name = "StorageError";
  }
}
