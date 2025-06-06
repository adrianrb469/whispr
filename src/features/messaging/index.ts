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

        const conversation = await getConversation(conversationId);

        if (!conversation) {
          return {
            status: 404,
            body: "Conversation not found",
          };
        }

        rawWs.subscribe(conversationId.toString());

        console.log(`Connected to conversation: ${conversationId}`);
      },
      // mensage que se esta mandando
      async onMessage(event, ws) {
        try {
          const msg = JSON.parse(event.data.toString());

          const message: newMessage = {
            conversationId: msg.room,
            senderId: +msg.senderId,
            content: msg.encryptedContent,
            createdAt: new Date(msg.timestamp),
          };

          const addedMessage = await addMessage(message);
          if (addedMessage) {
            server.publish(conversationId.toString(), JSON.stringify(msg));
          }
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
