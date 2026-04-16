import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync.js";
import * as encoding from "lib0/encoding.js";
import * as decoding from "lib0/decoding.js";
import { createClient } from "redis";
import { CollabRoom } from "../model/collab-room-model.js";

// temporary in-memory map, to be upgraded to Redis later
// roomId → { ydoc: Y.Doc, clients: Set<WebSocket> }
const rooms = new Map();

const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

try {
  await redisClient.connect();
  console.log("Redis connected");
} catch (err) {
  console.error("Redis connection failed:", err.message);
  process.exit(1);
}

const wss = new WebSocketServer({ noServer: true });

const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function setupYjsHandler(server, io) {
  // Every 30s: flush all active room states from Redis → MongoDB
  setInterval(async () => {
    const keys = await redisClient.keys("yjs:*");
    await Promise.all(
      keys.map((key) => saveRoomToMongo(key.replace("yjs:", ""))),
    );
  }, 30000);

  // Every 60s: check for rooms that have been inactive for 30+ minutes
  setInterval(async () => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      const inactive = now - room.lastActivity;
      if (inactive >= ROOM_TIMEOUT_MS) {
        console.log(`Room ${roomId} timed out after ${Math.round(inactive / 60000)}m of inactivity. Finalizing.`);
        try {
          // Notify all connected clients before closing
          if (io) io.to(roomId).emit("room_ended", { reason: "timeout" });
          await finalizeRoom(roomId);
          rooms.delete(roomId);
        } catch (err) {
          console.error(`Error finalizing timed-out room ${roomId}:`, err);
        }
      }
    }
  }, 60000);

  const activeRooms = await CollabRoom.find({ endedAt: null });
  for (const room of activeRooms) {
    const saved = await redisClient.get(`yjs:${room.roomId}`);
    const ydoc = new Y.Doc();
    if (saved) Y.applyUpdate(ydoc, Buffer.from(saved, "base64"));
    rooms.set(room.roomId, { ydoc, clients: new Set(), lastActivity: Date.now() });
    console.log(`Restored room ${room.roomId} from MongoDB`);
  }

  server.on("upgrade", (req, socket, head) => {
    if (req.url.startsWith("/yjs/")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", async (ws, req) => {
    const roomId = req.url.replace("/yjs/", "");

    if (!rooms.has(roomId)) {
      // Fixed race condition: first create and register the Y.Doc, then load state asynchronously
      const ydoc = new Y.Doc();
      rooms.set(roomId, { ydoc, clients: new Set(), lastActivity: Date.now() });

      const saved = await redisClient.get(`yjs:${roomId}`);
      if (saved) {
        Y.applyUpdate(ydoc, Buffer.from(saved, "base64"));
      } else {
        const dbRoom = await CollabRoom.findOne({ roomId });
        if (dbRoom?.content) {
          ydoc.getText("content").insert(0, dbRoom.content);
        }
      }
    }

    const room = rooms.get(roomId);

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    syncProtocol.writeSyncStep1(encoder, room.ydoc);
    ws.send(Buffer.from(encoding.toUint8Array(encoder)));

    room.clients.add(ws);

    ws.on("message", async (data) => {
      try {
        // Bump last activity on every message received
        room.lastActivity = Date.now();

        const decoder = decoding.createDecoder(new Uint8Array(data));
        const messageType = decoding.readVarUint(decoder);

        if (messageType === 0) {
          // sync message — handle and possibly send a response
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0);
          syncProtocol.readSyncMessage(decoder, encoder, room.ydoc, null);
          const response = encoding.toUint8Array(encoder);
          if (response.byteLength > 1) {
            ws.send(Buffer.from(response));
          }

          // save updated ydoc state to Redis
          const state = Y.encodeStateAsUpdate(room.ydoc);
          await redisClient.set(
            `yjs:${roomId}`,
            Buffer.from(state).toString("base64"),
          );
        }
        // type 1 = awareness — just broadcast as-is, no decoding needed

        // broadcast raw message to all other clients regardless of type
        for (const client of room.clients) {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(Buffer.from(data));
          }
        }
      } catch (err) {
        console.error("Yjs message error:", err);
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });

    ws.on("close", (code, reason) => {
      room.clients.delete(ws);
    });
  });

  wss.on("error", (err) => {
    console.error("WSS error:", err);
  });
}

async function saveRoomToMongo(roomId, extra = {}) {
  const saved = await redisClient.get(`yjs:${roomId}`);
  if (!saved) return;

  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, Buffer.from(saved, "base64"));
  const content = ydoc.getText("content").toString();

  await CollabRoom.findOneAndUpdate(
    { roomId },
    { content, lastSavedAt: new Date(), ...extra },
    { upsert: true },
  );
}

export async function finalizeRoom(roomId) {
  await saveRoomToMongo(roomId, { endedAt: new Date() });
  await redisClient.del(`yjs:${roomId}`);
}
