import CollabRoomModel from "../model/collab-room-model.js";

export default function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", async (roomId, userData = {}) => {
      socket.join(roomId);
      
      // Load persisted messages from the room
      const room = await CollabRoomModel.findById(roomId);
      if (room && room.messages) {
        socket.emit("load_messages", room.messages);
      }
    });

    socket.on("send_message", async ({ roomId, message, senderUsername, senderId }) => {
      const msg = {
        id: Date.now(),
        text: message,
        senderUsername: senderUsername || "Unknown",
        senderId: senderId || "anonymous",
        createdAt: new Date(),
      };
      
      // Save message to database
      try {
        await CollabRoomModel.saveMessage(roomId, msg);
      } catch (error) {
        console.error("Error saving message:", error);
      }
      
      io.to(roomId).emit("receive_message", msg);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
