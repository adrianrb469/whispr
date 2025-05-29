declare global {
  interface User {
    id: number;
    username: string;
    password: string;
    name: string;
    mfaEnabled: boolean;
    mfaSecret: string | null;
  }

  interface newMessage {
    conversationId: number | null;
    senderId: number | null;
    content: string;
    createdAt: Date;
  }
}

declare module "hono" {
  interface ContextVariableMap {
    userId: number;
    jwtPayload: any;
  }
}

export {};
