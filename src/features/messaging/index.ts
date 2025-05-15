import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createBunWebSocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'

import { server } from "@/index";
import { raw } from "hono/html";

const { upgradeWebSocket } = createBunWebSocket<ServerWebSocket>()

const app = new Hono();

// app.get("/ws", upgradeWebSocket((c) => {
//     return {
//       onOpen: (event, ws) => {
//         const rawWs = ws.raw as ServerWebSocket
//         console.log('Connection opened')
//         console.log("Event: ", event)
//         ws.send('Hello from server!')
//         rawWs.subscribe("general")
//         console.log("Subscribed to channel: general")
//       },
//       onMessage(event, ws) {
//         console.log(`Message from client: ${event.data}`)
//         ws.send(`Echo: ${event.data}`)
//         const rawWs = ws.raw as ServerWebSocket
//         rawWs.publish("general", JSON.stringify({ message: event.data }))
//         console.log(`Published message to channel: general`)
//       },
//       onClose: () => {
//         console.log('Connection closed')
//       },
//     }
//   })
// );

app.get(
  "/ws/:conversationId",
  upgradeWebSocket((c) => {
    const conversationId = c.req.param().conversationId as string;

    return {
      onOpen(_, ws) {
        const rawWs = ws.raw as ServerWebSocket;

        // Check if conversationId is valid and user is in conversation
        rawWs.subscribe(conversationId);

        console.log(`Connected to conversation: ${conversationId}`);
      },

      onMessage(event, ws) {
        try {
          const msg = JSON.parse(event.data);
          // Optional: validate msg fields here
          
          // Save to DB
          // saveMessageToDb(conversationId, msg.senderId, msg.text);

          // Broadcast to everyone else in the same conversation
          // conversationSockets.get(conversationId)?.forEach((sock) => {
          //   if (sock !== rawWs) {
          //     sock.send(JSON.stringify(msg));
          //   }
          // });
          server.publish(conversationId, JSON.stringify(msg));

        } catch (err) {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      },

      onClose(_, ws) {
        const rawWs = ws.raw as ServerWebSocket;
        rawWs.unsubscribe(conversationId);
        console.log(`Disconnected from conversation: ${conversationId}`);
      },
    };
  })
);

export default app;
