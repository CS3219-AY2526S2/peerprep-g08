import mongoose from "mongoose";
const { Schema } = mongoose;

const CollabRoomModelSchema = new Schema({
  roomId: { type: String, unique: true },
  questionId: { type: String },
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
      createdAt: { type: Date, default: Date.now },
    },
  ],
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastSavedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  isFullyOccupied: { type: Boolean, default: false },
});

export const CollabRoom = mongoose.model("CollabRoom", CollabRoomModelSchema);

export default class CollabRoomModel {
  static async create(roomId, questionId) {
    return await CollabRoom.create({ roomId, questionId });
  }

  static async findById(roomId) {
    return await CollabRoom.findOne({ roomId });
  }

  static async addUserToRoom(roomId, user) {
    const room = await CollabRoom.findOne({ roomId });
    if (!room) return { error: "Room not found", data: null };
    if (room.users.find((u) => u.id === user.id))
      return { error: null, data: room };
    if (room.isFullyOccupied || room.users.length >= 2) return { error: "Room is full", data: null };

    const willBeFullyOccupied = room.users.length + 1 >= 2;
    const updated = await CollabRoom.findOneAndUpdate(
      { roomId },
      { $push: { users: user }, $set: { isFullyOccupied: willBeFullyOccupied } },
      { new: true },
    );

    return { error: null, data: updated };
  }

  static async saveMessage(roomId, message) {
    return await CollabRoom.findOneAndUpdate(
      { roomId },
      { $push: { messages: message }, $set: { lastSavedAt: new Date() } },
      { new: true },
    );
  }

  static async endRoom(roomId) {
    return await CollabRoom.findOneAndUpdate(
      { roomId },
      { $set: { endedAt: new Date() } },
      { new: true },
    );
  }
}
