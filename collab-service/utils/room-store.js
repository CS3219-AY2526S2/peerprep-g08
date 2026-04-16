export const rooms = new Map();

export function createRoom(id, questionId = null) {
    rooms.set(id, {
        id,
        questionId,
        users: [],
        messages: [],
    });
}

export function getRoom(id) {
    return rooms.get(id);
}

export function deleteRoom(id) {
    rooms.delete(id);
}