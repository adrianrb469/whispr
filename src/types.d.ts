declare global {
  interface User {
    id: number;
    username: string;
    password: string;
    name: string;
  }

  interface newMessage {
    createdAt: string;
    conversationId: number | null;
    senderId: number | null;
    content: string;
  }
}

declare module "hono" {
  interface ContextVariableMap {
    userId: number;
    jwtPayload: any;
  }
}

export {};
