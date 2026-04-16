var mockCollabRoom;

jest.mock("mongoose", () => {
  mockCollabRoom = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  function Schema() {}
  Schema.prototype = {};
  return {
    Schema,
    model: jest.fn(() => mockCollabRoom),
  };
});

import CollabRoomModel from "../../model/collab-room-model.js";

afterEach(() => jest.clearAllMocks());

/////////////////////////////////////////////////////
// create
/////////////////////////////////////////////////////
describe("CollabRoomModel.create", () => {
  test("calls CollabRoom.create with roomId and questionId, returns the result", async () => {
    const fakeRoom = { roomId: "r1", questionId: "q1" };
    mockCollabRoom.create.mockResolvedValue(fakeRoom);

    const result = await CollabRoomModel.create("r1", "q1");

    expect(mockCollabRoom.create).toHaveBeenCalledWith({
      roomId: "r1",
      questionId: "q1",
      allowedUsers: [],
    });
    expect(result).toEqual(fakeRoom);
  });

  test("propagates errors from CollabRoom.create", async () => {
    mockCollabRoom.create.mockRejectedValue(new Error("Duplicate key"));
    await expect(CollabRoomModel.create("r1", "q1")).rejects.toThrow(
      "Duplicate key",
    );
  });

  test("passes allowedUsers to CollabRoom.create", async () => {
    const fakeRoom = {
      roomId: "r1",
      questionId: "q1",
      allowedUsers: [{ id: "u1", username: "alice" }],
    };
    mockCollabRoom.create.mockResolvedValue(fakeRoom);

    await CollabRoomModel.create("r1", "q1", [{ id: "u1", username: "alice" }]);

    expect(mockCollabRoom.create).toHaveBeenCalledWith({
      roomId: "r1",
      questionId: "q1",
      allowedUsers: [{ id: "u1", username: "alice" }],
    });
  });

  test("defaults allowedUsers to [] when not provided", async () => {
    const fakeRoom = { roomId: "r1", questionId: "q1", allowedUsers: [] };
    mockCollabRoom.create.mockResolvedValue(fakeRoom);

    await CollabRoomModel.create("r1", "q1");

    expect(mockCollabRoom.create).toHaveBeenCalledWith({
      roomId: "r1",
      questionId: "q1",
      allowedUsers: [],
    });
  });
});

/////////////////////////////////////////////////////
// findById
/////////////////////////////////////////////////////
describe("CollabRoomModel.findById", () => {
  test("queries by roomId field and returns the document", async () => {
    const fakeRoom = { roomId: "r1", questionId: "q1" };
    mockCollabRoom.findOne.mockResolvedValue(fakeRoom);

    const result = await CollabRoomModel.findById("r1");

    expect(mockCollabRoom.findOne).toHaveBeenCalledWith({ roomId: "r1" });
    expect(result).toEqual(fakeRoom);
  });

  test("returns null when room does not exist", async () => {
    mockCollabRoom.findOne.mockResolvedValue(null);
    const result = await CollabRoomModel.findById("nonexistent");
    expect(result).toBeNull();
  });
});

/////////////////////////////////////////////////////
// addUserToRoom
/////////////////////////////////////////////////////
describe("CollabRoomModel.addUserToRoom", () => {
  test("returns { error: null, data: room } when user is already in the room (idempotent join)", async () => {
    const existingRoom = { roomId: "r1", users: [{ id: "u1" }] };
    mockCollabRoom.findOne.mockResolvedValue(existingRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result).toEqual({ error: null, data: existingRoom });
    expect(mockCollabRoom.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("treats two users with undefined ids as duplicates (idempotent)", async () => {
    const existingRoom = { roomId: "r1", users: [{ id: undefined }] };
    mockCollabRoom.findOne.mockResolvedValue(existingRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", {
      id: undefined,
    });

    expect(result).toEqual({ error: null, data: existingRoom });
    expect(mockCollabRoom.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("returns { error: 'Room is full', data: null } when room already has 2 users (third user blocked)", async () => {
    const fullRoom = { roomId: "r1", users: [{ id: "u1" }, { id: "u2" }] };
    mockCollabRoom.findOne.mockResolvedValue(fullRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u3" });

    expect(result).toEqual({ error: "Room is full", data: null });
    expect(mockCollabRoom.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("adds user and returns { error: null, data: updatedRoom } when room has capacity", async () => {
    const roomWithOneUser = { roomId: "r1", users: [{ id: "u1" }] };
    const updatedRoom = { roomId: "r1", users: [{ id: "u1" }, { id: "u2" }] };
    mockCollabRoom.findOne.mockResolvedValue(roomWithOneUser);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u2" });

    expect(mockCollabRoom.findOneAndUpdate).toHaveBeenCalledWith(
      { roomId: "r1", $expr: { $lt: [{ $size: "$users" }, 2] } },
      { $push: { users: { id: "u2" } } },
      { new: true },
    );
    expect(result).toEqual({ error: null, data: updatedRoom });
  });

  test("returns Room is full when findOneAndUpdate resolves null (race condition: room filled between read and write)", async () => {
    const roomWithOneUser = { roomId: "r1", users: [{ id: "u1" }] };
    mockCollabRoom.findOne.mockResolvedValue(roomWithOneUser);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(null);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u2" });

    expect(result).toEqual({ error: "Room is full", data: null });
  });
  ///////////////////////////////////////////////////////
  // edge case test: cannot join a room that has ended
  ///////////////////////////////////////////////////////
  test("returns { error: 'Room already ended', data: null } when endedAt is set", async () => {
    mockCollabRoom.findOne.mockResolvedValue({
      roomId: "r1",
      users: [],
      endedAt: new Date(),
    });

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result).toEqual({ error: "Room already ended", data: null });
    expect(mockCollabRoom.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("proceeds normally when endedAt is null (room still active)", async () => {
    const emptyRoom = { roomId: "r1", users: [], endedAt: null };
    const updatedRoom = { roomId: "r1", users: [{ id: "u1" }] };
    mockCollabRoom.findOne.mockResolvedValue(emptyRoom);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result.error).toBeNull();
  });

  test("proceeds normally when endedAt is absent (field not set)", async () => {
    const emptyRoom = { roomId: "r1", users: [] };
    const updatedRoom = { roomId: "r1", users: [{ id: "u1" }] };
    mockCollabRoom.findOne.mockResolvedValue(emptyRoom);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result.error).toBeNull();
  });

  test("endedAt check takes priority over duplicate-user check", async () => {
    mockCollabRoom.findOne.mockResolvedValue({
      roomId: "r1",
      users: [{ id: "u1" }],
      endedAt: new Date(),
    });

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result).toEqual({ error: "Room already ended", data: null });
    expect(mockCollabRoom.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("first user can always join an empty room", async () => {
    const emptyRoom = { roomId: "r1", users: [] };
    const updatedRoom = { roomId: "r1", users: [{ id: "u1" }] };
    mockCollabRoom.findOne.mockResolvedValue(emptyRoom);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result).toEqual({ error: null, data: updatedRoom });
  });

  // edge case handling: allowedUsers handling
  test("returns { error: 'User not allowed', data: null } when user not in allowedUsers", async () => {
    mockCollabRoom.findOne.mockResolvedValue({
      roomId: "r1",
      users: [],
      allowedUsers: [{ id: "u1", username: "alice" }],
    });

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u2" });

    expect(result).toEqual({ error: "User not allowed", data: null });
    expect(mockCollabRoom.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("allows join when user is in allowedUsers", async () => {
    const room = {
      roomId: "r1",
      users: [],
      allowedUsers: [{ id: "u1" }, { id: "u2" }],
    };
    const updatedRoom = { roomId: "r1", users: [{ id: "u1" }] };
    mockCollabRoom.findOne.mockResolvedValue(room);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u1" });

    expect(result.error).toBeNull();
  });

  test("skips allowedUsers check when allowedUsers is empty (here for backward compatibility)", async () => {
    const room = { roomId: "r1", users: [], allowedUsers: [] };
    const updatedRoom = { roomId: "r1", users: [{ id: "anyone" }] };
    mockCollabRoom.findOne.mockResolvedValue(room);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "anyone" });

    expect(result.error).toBeNull();
  });

  test("skips allowedUsers check when allowedUsers field is absent", async () => {
    const room = { roomId: "r1", users: [] };
    const updatedRoom = { roomId: "r1", users: [{ id: "anyone" }] };
    mockCollabRoom.findOne.mockResolvedValue(room);
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "anyone" });

    expect(result.error).toBeNull();
  });

  test("allowedUsers check comes after endedAt check (endedAt wins)", async () => {
    mockCollabRoom.findOne.mockResolvedValue({
      roomId: "r1",
      users: [],
      allowedUsers: [{ id: "u1" }],
      endedAt: new Date(),
    });

    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u2" });

    expect(result).toEqual({ error: "Room already ended", data: null });
  });

  test("allowedUsers check comes before duplicate-user check", async () => {
    mockCollabRoom.findOne.mockResolvedValue({
      roomId: "r1",
      users: [{ id: "u2" }],
      allowedUsers: [{ id: "u1" }],
    });

    // u2 is in users but not in allowedUsers -> should be rejected
    const result = await CollabRoomModel.addUserToRoom("r1", { id: "u2" });

    expect(result).toEqual({ error: "User not allowed", data: null });
  });
});

/////////////////////////////////////////////////////
// endRoom
/////////////////////////////////////////////////////
describe("CollabRoomModel.endRoom", () => {
  test("calls findOneAndUpdate with $set endedAt (a Date) and new: true", async () => {
    const updatedRoom = { roomId: "r1", endedAt: new Date() };
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(updatedRoom);

    const result = await CollabRoomModel.endRoom("r1");

    expect(mockCollabRoom.findOneAndUpdate).toHaveBeenCalledWith(
      { roomId: "r1" },
      { $set: { endedAt: expect.any(Date) } },
      { new: true },
    );
    expect(result).toEqual(updatedRoom);
  });

  test("returns null when room does not exist (findOneAndUpdate resolves null)", async () => {
    mockCollabRoom.findOneAndUpdate.mockResolvedValue(null);
    const result = await CollabRoomModel.endRoom("nonexistent");
    expect(result).toBeNull();
  });
});
