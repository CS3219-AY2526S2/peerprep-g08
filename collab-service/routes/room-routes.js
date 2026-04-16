import express from "express";
import { createRoomController } from "../controller/room-controller.js";

export default function createRoomRoutes(io) {
  const router = express.Router();

  const { createRoom, joinRoom, getRoom, endRoom } = createRoomController(io);

  router.post("/create", createRoom);
  router.post("/join", joinRoom);
  router.get("/:roomId", getRoom);
  router.delete("/:roomId", endRoom);

  return router;
}

