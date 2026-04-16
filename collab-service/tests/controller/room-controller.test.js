jest.mock("uuid", () => ({ v4: jest.fn() }));

jest.mock("../../model/collab-room-model.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    addUserToRoom: jest.fn(),
    endRoom: jest.fn(),
    isRoomEnded: jest.fn(),
  },
}));

jest.mock("../../yjs/yjs-handler.js", () => ({
  finalizeRoom: jest.fn(),
}));

import { v4 as uuidv4 } from "uuid";
import CollabRoomModel from "../../model/collab-room-model.js";
import { finalizeRoom } from "../../yjs/yjs-handler.js";
import { createRoomController } from "../../controller/room-controller.js";

afterEach(() => jest.clearAllMocks());

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function buildControllers() {
  const mockEmit = jest.fn();
  const mockIo = { to: jest.fn(() => ({ emit: mockEmit })) };
  const { createRoom, joinRoom, getRoom, endRoom } =
    createRoomController(mockIo);
  return { createRoom, joinRoom, getRoom, endRoom, mockIo, mockEmit };
}

/////////////////////////////////////////////////////
// createRoom
/////////////////////////////////////////////////////
describe("createRoom", () => {
  test("generates a uuid, creates the room, and returns 200 with roomId and questionId", async () => {
    uuidv4.mockReturnValue("test-uuid");
    CollabRoomModel.create.mockResolvedValue({
      roomId: "test-uuid",
      questionId: "q1",
    });

    const { createRoom } = buildControllers();
    const req = { body: { questionId: "q1" } };
    const res = mockRes();

    await createRoom(req, res);

    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(CollabRoomModel.create).toHaveBeenCalledWith("test-uuid", "q1", []);
    expect(res.json).toHaveBeenCalledWith({
      roomId: "test-uuid",
      questionId: "q1",
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  test("passes allowedUsers from request body to CollabRoomModel.create", async () => {
    uuidv4.mockReturnValue("test-uuid");
    CollabRoomModel.create.mockResolvedValue({
      roomId: "test-uuid",
      questionId: "q1",
    });

    const { createRoom } = buildControllers();
    const req = {
      body: {
        questionId: "q1",
        allowedUsers: [{ id: "u1", username: "alice" }],
      },
    };
    const res = mockRes();

    await createRoom(req, res);

    expect(CollabRoomModel.create).toHaveBeenCalledWith("test-uuid", "q1", [
      { id: "u1", username: "alice" },
    ]);
  });

  test("defaults allowedUsers to [] when not provided in body", async () => {
    uuidv4.mockReturnValue("test-uuid");
    CollabRoomModel.create.mockResolvedValue({
      allowedUsers: [],
      roomId: "test-uuid",
      questionId: null,
    });

    const { createRoom } = buildControllers();
    await createRoom({ body: {} }, mockRes());

    expect(CollabRoomModel.create).toHaveBeenCalledWith("test-uuid", null, []);
  });

  test("propagates errors from CollabRoomModel.create (no try/catch)", async () => {
    uuidv4.mockReturnValue("test-uuid");
    CollabRoomModel.create.mockRejectedValue(new Error("DB failure"));

    const { createRoom } = buildControllers();
    await expect(createRoom({ body: {} }, mockRes())).rejects.toThrow(
      "DB failure",
    );
  });
});

/////////////////////////////////////////////////////
// joinRoom
/////////////////////////////////////////////////////
describe("joinRoom", () => {
  test("returns 200 success when user is added to room", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: null,
      data: { roomId: "r1", questionId: "q1" },
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom({ body: { roomId: "r1", user: { id: "u1" } } }, res);

    expect(CollabRoomModel.addUserToRoom).toHaveBeenCalledWith("r1", {
      id: "u1",
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      roomId: "r1",
      questionId: "q1",
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 200 success when user is already in room (idempotent join)", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: null,
      data: { roomId: "r1", questionId: "q1" },
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom({ body: { roomId: "r1", user: { id: "u1" } } }, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      roomId: "r1",
      questionId: "q1",
    });
  });

  test("returns 403 when room is full (third user trying to join)", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: "Room is full",
      data: null,
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom({ body: { roomId: "r1", user: { id: "u3" } } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Room full" });
  });

  test("returns 404 when room does not exist", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: "Room not found",
      data: null,
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom(
      { body: { roomId: "nonexistent", user: { id: "u1" } } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Room not found" });
  });

  test("returns 403 when user is not in allowedUsers", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: "User not allowed",
      data: null,
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom({ body: { roomId: "r1", user: { id: "u2" } } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "User not allowed" });
  });

  test("returns 410 when room has already ended", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: "Room already ended",
      data: null,
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom({ body: { roomId: "r1", user: { id: "u1" } } }, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith({ error: "Room already ended" });
  });

  test("returns 404 for any other error (else branch)", async () => {
    CollabRoomModel.addUserToRoom.mockResolvedValue({
      error: "Unexpected error",
      data: null,
    });

    const { joinRoom } = buildControllers();
    const res = mockRes();
    await joinRoom({ body: { roomId: "r1", user: { id: "u1" } } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

/////////////////////////////////////////////////////
// getRoom
/////////////////////////////////////////////////////
describe("getRoom", () => {
  test("returns 200 with roomId and questionId when room exists", async () => {
    CollabRoomModel.findById.mockResolvedValue({
      roomId: "r1",
      questionId: "q1",
    });

    const { getRoom } = buildControllers();
    const res = mockRes();
    await getRoom({ params: { roomId: "r1" } }, res);

    expect(CollabRoomModel.findById).toHaveBeenCalledWith("r1");
    expect(res.json).toHaveBeenCalledWith({ roomId: "r1", questionId: "q1" });
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 404 when room does not exist", async () => {
    CollabRoomModel.findById.mockResolvedValue(null);

    const { getRoom } = buildControllers();
    const res = mockRes();
    await getRoom({ params: { roomId: "nonexistent" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Room not found" });
  });
});

/////////////////////////////////////////////////////
// endRoom
/////////////////////////////////////////////////////
describe("endRoom", () => {
  test("returns 404 when room does not exist", async () => {
    CollabRoomModel.findById.mockResolvedValue(null);

    const { endRoom } = buildControllers();
    const res = mockRes();
    await endRoom({ params: { roomId: "nonexistent" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Room not found" });
    expect(finalizeRoom).not.toHaveBeenCalled();
    expect(CollabRoomModel.endRoom).not.toHaveBeenCalled();
  });

  test("emits room_ended via io, calls finalizeRoom and endRoom, returns 200", async () => {
    CollabRoomModel.findById.mockResolvedValue({ roomId: "r1" });
    finalizeRoom.mockResolvedValue(undefined);
    CollabRoomModel.endRoom.mockResolvedValue({ roomId: "r1" });

    const { endRoom, mockIo, mockEmit } = buildControllers();
    await endRoom({ params: { roomId: "r1" } }, mockRes());

    expect(mockIo.to).toHaveBeenCalledWith("r1");
    expect(mockEmit).toHaveBeenCalledWith("room_ended");
    expect(finalizeRoom).toHaveBeenCalledWith("r1");
    expect(CollabRoomModel.endRoom).toHaveBeenCalledWith("r1");
  });

  test("call order: emit → endRoom → finalizeRoom", async () => {
    CollabRoomModel.findById.mockResolvedValue({ roomId: "r1" });
    const callOrder = [];
    const mockEmit = jest.fn(() => callOrder.push("emit"));
    const mockIo = { to: jest.fn(() => ({ emit: mockEmit })) };
    CollabRoomModel.endRoom.mockImplementation(async () => {
      callOrder.push("endRoom");
      return {};
    });
    finalizeRoom.mockImplementation(async () => {
      callOrder.push("finalizeRoom");
    });

    const { endRoom } = createRoomController(mockIo);
    await endRoom({ params: { roomId: "r1" } }, mockRes());

    expect(callOrder).toEqual(["emit", "endRoom", "finalizeRoom"]);
  });

  test("endedAt is persisted even if finalizeRoom rejects", async () => {
    CollabRoomModel.findById.mockResolvedValue({ roomId: "r1" });
    CollabRoomModel.endRoom.mockResolvedValue({});
    finalizeRoom.mockRejectedValue(new Error("Redis down"));

    const { endRoom } = buildControllers();
    await expect(
      endRoom({ params: { roomId: "r1" } }, mockRes()),
    ).rejects.toThrow("Redis down");

    expect(CollabRoomModel.endRoom).toHaveBeenCalledWith("r1");
  });

  test("propagates error if CollabRoomModel.endRoom rejects", async () => {
    CollabRoomModel.findById.mockResolvedValue({ roomId: "r1" });
    finalizeRoom.mockResolvedValue(undefined);
    CollabRoomModel.endRoom.mockRejectedValue(new Error("DB down"));

    const { endRoom } = buildControllers();
    await expect(
      endRoom({ params: { roomId: "r1" } }, mockRes()),
    ).rejects.toThrow("DB down");
  });
});
