import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { server } from "@/index";
import { userInConversation, getConversation } from "../conversation/service";
import { addMessage } from "./service";

const { upgradeWebSocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono();

app.get(
  "/ws/:conversationId",
  upgradeWebSocket((c) => {
    const conversationId = +c.req.param().conversationId;

    return {
      async onOpen(_, ws) {
        const rawWs = ws.raw as ServerWebSocket;

        const userId = c.get("userId");

        const conversation = await getConversation(conversationId);

        if (!conversation) {
          return {
            status: 404,
            body: "Conversation not found",
          };
        }

        const isUserInConversation = await userInConversation(
          userId,
          conversationId,
        );
        if (!isUserInConversation) {
          return {
            status: 403,
            body: "User not in conversation",
          };
        }

        rawWs.subscribe(conversationId.toString());

        console.log(`Connected to conversation: ${conversationId}`);
      },

      async onMessage(event, ws) {
        try {
          const msg = JSON.parse(event.data.toString());

          console.log(msg);

          // const message: newMessage = {
          //   conversationId: msg.conversationId,
          //   senderId: msg.senderId,
          //   content: msg.text,
          //   createdAt: msg.timestamp,
          // }

          // await addMessage(message);

          server.publish(conversationId.toString(), JSON.stringify(msg));
        } catch (err) {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      },

      onClose(_, ws) {
        const rawWs = ws.raw as ServerWebSocket;
        rawWs.unsubscribe(conversationId.toString());
        console.log(`Disconnected from conversation: ${conversationId}`);
      },
    };
  }),
);

export default app;
