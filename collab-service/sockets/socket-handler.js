import CollabRoomModel from "../model/collab-room-model.js";
import { getAIHelp } from "../services/ai-service.js";

// roomId : Map<userId, socketId>
// to keep track of currently active connections to handle reconnects/disconnects etc
const activeConnections = new Map();

export function clearActiveConnections() {
  activeConnections.clear();
}

export default function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", async (roomId, userData) => {
      if (!roomId) {
        socket.emit("join_error", { message: "Room ID is required" });
        return;
      }

      const userId = userData?.id;
      if (!userId) {
        socket.emit("join_error", { message: "User ID is required" });
        return;
      }

      // Check if room has ended
      const isEnded = await CollabRoomModel.isRoomEnded(roomId);
      if (isEnded) {
        socket.emit("room_ended", {
          message: "This room has ended and cannot be joined",
        });
        return;
      }

      if (!activeConnections.has(roomId)) {
        activeConnections.set(roomId, new Map());
      }
      const roomConnections = activeConnections.get(roomId);

      if (roomConnections.has(userId)) {
        socket.emit("join_error", {
          message: "Already connected in another tab",
        });
        return;
      }

      roomConnections.set(userId, socket.id);
      socket.roomId = roomId;
      socket.userId = userId;

      socket.join(roomId);

      // Load persisted messages from database
      const messages = await CollabRoomModel.getMessages(roomId);
      socket.emit("load_messages", messages);
    });

    socket.on(
      "send_message",
      async ({ roomId, message, senderUsername, senderId, codeContext }) => {
        const msg = {
          id: Date.now(),
          text: message,
          senderUsername: senderUsername || "Unknown",
          senderId: senderId || socket.id,
        };

        await CollabRoomModel.addMessage(roomId, msg);

        // Broadcast user's message to all users in the room FIRST
        io.to(roomId).emit("receive_message", msg);

        // Check if message is an AI request
        if (message.trim().toLowerCase().startsWith("@ai")) {
          // Emit a typing indicator to other users
          io.to(roomId).emit("ai_processing");

          try {
            // Get AI response
            const aiResult = await getAIHelp(
              message,
              senderId || socket.id,
              roomId,
              codeContext || "",
            );

            if (aiResult.success) {
              // Create AI response message
              const aiMsg = {
                id: Date.now(),
                text: aiResult.response,
                senderUsername: "AI Assistant",
                senderId: "ai-assistant",
                isAI: true,
              };

              // Save AI response to database
              await CollabRoomModel.addMessage(roomId, aiMsg);

              // Broadcast AI response to all users in the room
              io.to(roomId).emit("receive_message", aiMsg);
            } else {
              // Send error message as AI Assistant
              const errorMsg = {
                id: Date.now(),
                text: `⚠️ **AI Assistant**: ${aiResult.error}`,
                senderUsername: "AI Assistant",
                senderId: "ai-assistant",
                isAI: true,
                isError: true,
              };

              io.to(roomId).emit("receive_message", errorMsg);
            }
          } catch (error) {
            console.error(
              "[Socket Handler] Error processing AI request:",
              error,
            );

            // Send error message
            const errorMsg = {
              id: Date.now(),
              text: "⚠️ **AI Assistant**: An unexpected error occurred. Please try again.",
              senderUsername: "AI Assistant",
              senderId: "ai-assistant",
              isAI: true,
              isError: true,
            };

            io.to(roomId).emit("receive_message", errorMsg);
          }
        }
      },
    );

    // Handles voluntary leave (i.e. back button in browser)
    socket.on("leave_room", () => {
      const { roomId, userId } = socket;
      if (roomId && userId) {
        const roomConnections = activeConnections.get(roomId);
        if (roomConnections) {
          roomConnections.delete(userId);
          if (roomConnections.size === 0) {
            activeConnections.delete(roomId);
          }
        }
        socket.to(roomId).emit("user_disconnected", { userId });
        socket.leave(roomId);
        // Clear so the subsequent "disconnect" event is a no-op for this room
        socket.roomId = undefined;
        socket.userId = undefined;
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      const { roomId, userId } = socket;
      if (roomId && userId) {
        const roomConnections = activeConnections.get(roomId);
        if (roomConnections) {
          roomConnections.delete(userId);
          if (roomConnections.size === 0) {
            activeConnections.delete(roomId);
          }
        }
        socket.to(roomId).emit("user_disconnected", { userId });
      }
    });
  });
}
