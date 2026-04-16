import {
  createRoom,
  findById,
  deleteRoom,
  addUserToRoom,
} from "../model/collab-room-model.js";

class RoomModel {
  static create(id, questionId = null) {
    createRoom(id, questionId);
    return getRoom(id);
  }

  static findById(id) {
    return getRoom(id);
  }

  static remove(id) {
    deleteRoom(id);
  }

  static addUserToRoom(id, user) {
    return addUserToRoom(id, user);
  }
}

export default RoomModel;
