import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import socketHandler from "./sockets/socket-handler.js";
import { setupYjsHandler } from "./yjs/yjs-handler.js";
import createRoomRoutes from "./routes/room-routes.js";
import mongoose from "mongoose";
import "dotenv/config";

const port = process.env.PORT || 3219;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
  path: "/socket.io",
  allowUpgrades: true,
});

try {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("MongoDB connected");
} catch (err) {
  console.error("MongoDB connection failed:", err);
  process.exit(1);
}

setupYjsHandler(server, io);

app.use("/rooms", createRoomRoutes(io));


socketHandler(io);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "collab-service" });
});

server.listen(port, () => {
  console.log("Server running on port " + port);
});
