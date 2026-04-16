import {
  rooms,
  createRoom,
  getRoom,
  deleteRoom,
} from "../../utils/room-store.js";

beforeEach(() => {
  rooms.clear();
});

afterEach(() => jest.clearAllMocks());

/////////////////////////////////////////////////////
// createRoom
/////////////////////////////////////////////////////
describe("createRoom", () => {
  test("stores a room with the correct shape", () => {
    createRoom("room-1", "q-1");
    expect(rooms.get("room-1")).toEqual({
      id: "room-1",
      questionId: "q-1",
      users: [],
      messages: [],
    });
  });

  test("defaults questionId to null when omitted", () => {
    createRoom("room-2");
    expect(rooms.get("room-2").questionId).toBeNull();
  });

  test("overwrites an existing entry when called again with the same id", () => {
    createRoom("room-1", "q-old");
    createRoom("room-1", "q-new");
    expect(rooms.get("room-1").questionId).toBe("q-new");
  });
});

/////////////////////////////////////////////////////
// getRoom
/////////////////////////////////////////////////////
describe("getRoom", () => {
  test("returns the stored room object for a known id", () => {
    createRoom("room-1", "q-1");
    const room = getRoom("room-1");
    expect(room).toEqual({
      id: "room-1",
      questionId: "q-1",
      users: [],
      messages: [],
    });
  });

  test("returns undefined for an unknown id", () => {
    expect(getRoom("does-not-exist")).toBeUndefined();
  });
});

/////////////////////////////////////////////////////
// deleteRoom
/////////////////////////////////////////////////////
describe("deleteRoom", () => {
  test("removes the entry from the map", () => {
    createRoom("room-1", "q-1");
    deleteRoom("room-1");
    expect(rooms.has("room-1")).toBe(false);
  });

  test("does not throw when called for a non-existent id", () => {
    expect(() => deleteRoom("ghost")).not.toThrow();
  });
});
