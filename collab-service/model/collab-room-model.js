import mongoose from "mongoose";
const { Schema } = mongoose;

const CollabRoomModelSchema = new Schema({
  roomId: { type: String, unique: true },
  questionId: { type: String },
  allowedUsers: [{ id: String, username: String }],
  users: [
    {
      id: String,
      username: String,
      email: String,
      isAdmin: Boolean,
    },
  ],
  messages: [
    {
      id: Number,
      text: String,
      senderUsername: String,
      senderId: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastSavedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

export const CollabRoom = mongoose.model("CollabRoom", CollabRoomModelSchema);

export default class CollabRoomModel {
  static async create(roomId, questionId, allowedUsers = []) {
    return await CollabRoom.create({ roomId, questionId, allowedUsers });
  }

  static async findById(roomId) {
    return await CollabRoom.findOne({ roomId });
  }

  static async addUserToRoom(roomId, user) {
    const room = await CollabRoom.findOne({ roomId });
    if (!room) return { error: "Room not found", data: null };
    if (room.endedAt) return { error: "Room already ended", data: null };
    if (room.allowedUsers && room.allowedUsers.length > 0) {
      if (!room.allowedUsers.find((u) => u.id === user.id)) {
        return { error: "User not allowed", data: null };
      }
    }
    if (room.users.find((u) => u.id === user.id))
      return { error: null, data: room };
    if (room.users.length >= 2) return { error: "Room is full", data: null };

    // Atomic query
    const updated = await CollabRoom.findOneAndUpdate(
      { roomId, $expr: { $lt: [{ $size: "$users" }, 2] } },
      { $push: { users: user } },
      { new: true },
    );

    if (!updated) return { error: "Room is full", data: null };
    return { error: null, data: updated };
  }

  static async endRoom(roomId) {
    return await CollabRoom.findOneAndUpdate(
      { roomId },
      { $set: { endedAt: new Date() } },
      { new: true },
    );
  }

  static async addMessage(roomId, message) {
    return await CollabRoom.findOneAndUpdate(
      { roomId },
      { $push: { messages: message } },
      { new: true },
    );
  }

  static async getMessages(roomId) {
    const room = await CollabRoom.findOne({ roomId });
    return room ? room.messages : [];
  }

  static async isRoomEnded(roomId) {
    const room = await CollabRoom.findOne({ roomId });
    return room && room.endedAt ? true : false;
  }
}
