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
  "/ws/:topicId",
  upgradeWebSocket((c) => {
    const topicId = c.req.param().topicId as string;

    return {
      onOpen(_, ws) {
        const rawWs = ws.raw as ServerWebSocket;

        // Check if topicId is valid and user is in topic
        rawWs.subscribe(topicId);

        console.log(`Connected to topic: ${topicId}`);
      },

      onMessage(event, ws) {
        const rawWs = ws.raw as ServerWebSocket;

        try {
          const msg = JSON.parse(event.data);
          // Optional: validate msg fields here
          
          // Save to DB
          // saveMessageToDb(topicId, msg.senderId, msg.text);

          // Broadcast to everyone else in the same topic
          // topicSockets.get(topicId)?.forEach((sock) => {
          //   if (sock !== rawWs) {
          //     sock.send(JSON.stringify(msg));
          //   }
          // });
          server.publish(topicId, JSON.stringify(msg));

        } catch (err) {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      },

      onClose(_, ws) {
        const rawWs = ws.raw as ServerWebSocket;
        rawWs.unsubscribe(topicId);
        console.log(`Disconnected from topic: ${topicId}`);
      },
    };
  })
);

export default app;
