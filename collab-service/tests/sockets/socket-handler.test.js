jest.mock("../../model/collab-room-model.js", () => ({
  __esModule: true,
  default: {
    getMessages: jest.fn(),
    addMessage: jest.fn(),
    endRoom: jest.fn(),
    isRoomEnded: jest.fn(),
  },
}));

import CollabRoomModel from "../../model/collab-room-model.js";
import socketHandler, {
  clearActiveConnections,
} from "../../sockets/socket-handler.js";

afterEach(() => {
  jest.clearAllMocks();
  clearActiveConnections();
});

// Helpers

function buildMocks(socketId = "socket-id-1") {
  const mockSocketEmit = jest.fn();
  const mockSocket = {
    id: socketId,
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn(() => ({ emit: mockSocketEmit })),
  };
  const mockEmit = jest.fn();
  const mockIo = {
    on: jest.fn(),
    to: jest.fn(() => ({ emit: mockEmit })),
  };
  return { mockSocket, mockIo, mockEmit, mockSocketEmit };
}

// Wires up socketHandler and returns a helper that gets a registered
// event handler from the mock socket's `.on` list.
function connect(mockIo, mockSocket) {
  socketHandler(mockIo);
  const connectionHandler = mockIo.on.mock.calls[0][1];
  connectionHandler(mockSocket);

  function getHandler(eventName) {
    const call = mockSocket.on.mock.calls.find(([ev]) => ev === eventName);
    return call ? call[1] : null;
  }
  return getHandler;
}

/////////////////////////////////////////////////////
// connection
/////////////////////////////////////////////////////
describe("socketHandler — connection", () => {
  test("registers a 'connection' listener on io", () => {
    const { mockIo, mockSocket } = buildMocks();
    connect(mockIo, mockSocket);
    expect(mockIo.on).toHaveBeenCalledWith("connection", expect.any(Function));
  });

  test("registers join_room, send_message, leave_room, and disconnect listeners on the socket", () => {
    const { mockIo, mockSocket } = buildMocks();
    connect(mockIo, mockSocket);
    const registeredEvents = mockSocket.on.mock.calls.map(([ev]) => ev);
    expect(registeredEvents).toContain("join_room");
    expect(registeredEvents).toContain("send_message");
    expect(registeredEvents).toContain("leave_room");
    expect(registeredEvents).toContain("disconnect");
  });
});

/////////////////////////////////////////////////////
// join_room
/////////////////////////////////////////////////////
describe("join_room event", () => {
  test("calls socket.join with the given roomId", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("room-abc", { id: "u1" });

    expect(mockSocket.join).toHaveBeenCalledWith("room-abc");
  });

  test("loads persisted messages and emits load_messages to the socket", async () => {
    const messages = [
      { id: 1, text: "hello" },
      { id: 2, text: "world" },
    ];
    CollabRoomModel.getMessages.mockResolvedValue(messages);
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("room-abc", { id: "u1" });

    expect(CollabRoomModel.getMessages).toHaveBeenCalledWith("room-abc");
    expect(mockSocket.emit).toHaveBeenCalledWith("load_messages", messages);
  });

  test("emits load_messages with empty array when room has no messages", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("room-abc", { id: "u1" });

    expect(mockSocket.emit).toHaveBeenCalledWith("load_messages", []);
  });
});

/////////////////////////////////////////////////////
// join_room edge case handling
/////////////////////////////////////////////////////
describe("join_room input guards", () => {
  test("emits join_error and returns when roomId is missing", async () => {
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")(undefined, { id: "u1" });

    expect(mockSocket.emit).toHaveBeenCalledWith("join_error", {
      message: "Room ID is required",
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(CollabRoomModel.getMessages).not.toHaveBeenCalled();
  });

  test("emits join_error and returns when roomId is an empty string", async () => {
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("", { id: "u1" });

    expect(mockSocket.emit).toHaveBeenCalledWith("join_error", {
      message: "Room ID is required",
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
  });

  test("emits join_error and returns when userData has no id", async () => {
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("room-guard-1", { username: "alice" });

    expect(mockSocket.emit).toHaveBeenCalledWith("join_error", {
      message: "User ID is required",
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
  });

  test("emits join_error and returns when userData is null", async () => {
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("room-guard-2", null);

    expect(mockSocket.emit).toHaveBeenCalledWith("join_error", {
      message: "User ID is required",
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
  });

  test("emits join_error and returns when userData is omitted entirely", async () => {
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("join_room")("room-guard-3");

    expect(mockSocket.emit).toHaveBeenCalledWith("join_error", {
      message: "User ID is required",
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
  });
});

/////////////////////////////////////////////////////
// send_message
/////////////////////////////////////////////////////
describe("send_message event", () => {
  test("broadcasts receive_message to the correct room with full message shape", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    const { mockIo, mockSocket, mockEmit } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({
      roomId: "r1",
      message: "hello",
      senderUsername: "alice",
      senderId: "u1",
    });

    expect(mockIo.to).toHaveBeenCalledWith("r1");
    expect(mockEmit).toHaveBeenCalledWith(
      "receive_message",
      expect.objectContaining({
        text: "hello",
        senderUsername: "alice",
        senderId: "u1",
      }),
    );
  });

  test("message id is set to Date.now()", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    jest.spyOn(Date, "now").mockReturnValue(99999);
    const { mockIo, mockSocket, mockEmit } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({
      roomId: "r1",
      message: "hi",
      senderUsername: "alice",
      senderId: "u1",
    });

    expect(mockEmit).toHaveBeenCalledWith(
      "receive_message",
      expect.objectContaining({ id: 99999 }),
    );
    Date.now.mockRestore();
  });

  test("defaults senderUsername to 'Unknown' when not provided", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    const { mockIo, mockSocket, mockEmit } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({ roomId: "r1", message: "hello" });

    expect(mockEmit).toHaveBeenCalledWith(
      "receive_message",
      expect.objectContaining({ senderUsername: "Unknown" }),
    );
  });

  test("defaults senderId to socket.id when not provided", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    const { mockIo, mockSocket, mockEmit } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({ roomId: "r1", message: "hello" });

    expect(mockEmit).toHaveBeenCalledWith(
      "receive_message",
      expect.objectContaining({ senderId: "socket-id-1" }),
    );
  });

  test("persists the message via CollabRoomModel.addMessage before broadcasting", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    const { mockIo, mockSocket, mockEmit } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({
      roomId: "r1",
      message: "hello",
      senderUsername: "alice",
      senderId: "u1",
    });

    expect(CollabRoomModel.addMessage).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({
        text: "hello",
        senderUsername: "alice",
        senderId: "u1",
      }),
    );
    expect(CollabRoomModel.addMessage).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  test("empty string message is still persisted and broadcast", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    const { mockIo, mockSocket, mockEmit } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({ roomId: "r1", message: "" });

    expect(mockEmit).toHaveBeenCalledWith(
      "receive_message",
      expect.objectContaining({ text: "" }),
    );
    expect(CollabRoomModel.addMessage).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ text: "" }),
    );
  });

  test("broadcasts to the correct room when multiple messages use different roomIds", async () => {
    CollabRoomModel.addMessage.mockResolvedValue(undefined);
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);

    await getHandler("send_message")({ roomId: "r1", message: "m1" });
    await getHandler("send_message")({ roomId: "r2", message: "m2" });

    expect(mockIo.to.mock.calls[0][0]).toBe("r1");
    expect(mockIo.to.mock.calls[1][0]).toBe("r2");
  });
});

/////////////////////////////////////////////////////
// duplicate tab detection
/////////////////////////////////////////////////////
describe("join_room — duplicate tab detection", () => {
  test("emits join_error and does not call socket.join for a duplicate user connection", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    // Socket 1 joins successfully
    const { mockIo, mockSocket: socket1 } = buildMocks("sid-1");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-j3-1", { id: "u1" });
    expect(socket1.join).toHaveBeenCalledWith("room-j3-1");

    // Socket 2 (same user, same room) — duplicate tab
    const socket2 = {
      id: "sid-2",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-j3-1", { id: "u1" });

    expect(socket2.emit).toHaveBeenCalledWith("join_error", {
      message: "Already connected in another tab",
    });
    expect(socket2.join).not.toHaveBeenCalled();
  });

  test("allows a different user to join the same room (no false positive)", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket: socket1 } = buildMocks("sid-3");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-j3-2", { id: "u1" });

    const socket2 = {
      id: "sid-4",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-j3-2", { id: "u2" });

    expect(socket2.join).toHaveBeenCalledWith("room-j3-2");
    expect(socket2.emit).not.toHaveBeenCalledWith(
      "join_error",
      expect.anything(),
    );
  });

  test("allows same user in a different room (no cross-room interference)", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket: socket1 } = buildMocks("sid-5");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-j3-3", { id: "u1" });

    const socket2 = {
      id: "sid-6",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-j3-4", { id: "u1" });

    expect(socket2.join).toHaveBeenCalledWith("room-j3-4");
    expect(socket2.emit).not.toHaveBeenCalledWith(
      "join_error",
      expect.anything(),
    );
  });

  test("allows rejoin after prior session has disconnected", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket: socket1 } = buildMocks("sid-7");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-j3-5", { id: "u1" });

    // Disconnect socket1 to free the slot
    getHandler1("disconnect")();

    // New socket for same user
    const socket2 = {
      id: "sid-8",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-j3-5", { id: "u1" });

    expect(socket2.join).toHaveBeenCalledWith("room-j3-5");
    expect(socket2.emit).not.toHaveBeenCalledWith(
      "join_error",
      expect.anything(),
    );
  });
});

/////////////////////////////////////////////////////
// disconnect's cleanup and notification
/////////////////////////////////////////////////////
describe("disconnect event — cleanup and notification", () => {
  test("emits user_disconnected to the room with the userId on disconnect", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket, mockSocketEmit } = buildMocks("sid-d1-1");
    const getHandler = connect(mockIo, mockSocket);
    await getHandler("join_room")("room-d1-1", { id: "u1" });

    getHandler("disconnect")();

    expect(mockSocket.to).toHaveBeenCalledWith("room-d1-1");
    expect(mockSocketEmit).toHaveBeenCalledWith("user_disconnected", {
      userId: "u1",
    });
  });

  test("removes user from activeConnections allowing rejoin on a new socket", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket: socket1 } = buildMocks("sid-d1-2");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-d1-2", { id: "u1" });
    getHandler1("disconnect")();

    const socket2 = {
      id: "sid-d1-2b",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-d1-2", { id: "u1" });

    expect(socket2.join).toHaveBeenCalledWith("room-d1-2");
    expect(socket2.emit).not.toHaveBeenCalledWith(
      "join_error",
      expect.anything(),
    );
  });

  test("cleans up room entry from activeConnections when last user disconnects", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket } = buildMocks("sid-d1-3");
    const getHandler = connect(mockIo, mockSocket);
    await getHandler("join_room")("room-d1-3", { id: "u1" });
    getHandler("disconnect")();

    const socket2 = {
      id: "sid-d1-3b",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-d1-3", { id: "u2" });

    expect(socket2.join).toHaveBeenCalledWith("room-d1-3");
  });

  test("does not emit user_disconnected when socket never called join_room", () => {
    const { mockIo, mockSocket } = buildMocks("sid-d1-4");
    const getHandler = connect(mockIo, mockSocket);

    // Disconnect without ever joining
    getHandler("disconnect")();

    expect(mockSocket.to).not.toHaveBeenCalled();
  });

  test("does not call CollabRoomModel.endRoom on disconnect", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket } = buildMocks("sid-d1-5");
    const getHandler = connect(mockIo, mockSocket);
    await getHandler("join_room")("room-d1-4", { id: "u1" });

    getHandler("disconnect")();

    expect(CollabRoomModel.endRoom).not.toHaveBeenCalled();
  });
});

/////////////////////////////////////////////////////
// both users disconnect -> room should not auto-end
/////////////////////////////////////////////////////
describe("disconnect — room not auto-ended when users disconnect", () => {
  test("does not call endRoom when one of two users disconnects", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket: socket1 } = buildMocks("sid-d2-1");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-d2-1", { id: "u1" });

    const socket2 = {
      id: "sid-d2-1b",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-d2-1", { id: "u2" });

    getHandler1("disconnect")();

    expect(CollabRoomModel.endRoom).not.toHaveBeenCalled();
  });

  test("does not call endRoom when both users disconnect sequentially", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);

    const { mockIo, mockSocket: socket1 } = buildMocks("sid-d2-2");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-d2-2", { id: "u1" });

    const socket2 = {
      id: "sid-d2-2b",
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-d2-2", { id: "u2" });

    getHandler1("disconnect")();
    getHandler2("disconnect")();

    expect(CollabRoomModel.endRoom).not.toHaveBeenCalled();
  });
});

/////////////////////////////////////////////////////
// leave_room
/////////////////////////////////////////////////////
describe("leave_room event", () => {
  test("emits user_disconnected to the room with the userId", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);
    const { mockIo, mockSocket, mockSocketEmit } = buildMocks("sid-lr-1");
    const getHandler = connect(mockIo, mockSocket);
    await getHandler("join_room")("room-lr-1", { id: "u1" });

    getHandler("leave_room")();

    expect(mockSocket.to).toHaveBeenCalledWith("room-lr-1");
    expect(mockSocketEmit).toHaveBeenCalledWith("user_disconnected", {
      userId: "u1",
    });
  });

  test("calls socket.leave(roomId) to exit the Socket.IO room namespace", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);
    const mockSocket = {
      id: "sid-lr-2",
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const { mockIo } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);
    await getHandler("join_room")("room-lr-2", { id: "u1" });

    getHandler("leave_room")();

    expect(mockSocket.leave).toHaveBeenCalledWith("room-lr-2");
  });

  test("removes user from activeConnections so the same user can rejoin", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);
    const { mockIo, mockSocket: socket1 } = buildMocks("sid-lr-3");
    const getHandler1 = connect(mockIo, socket1);
    await getHandler1("join_room")("room-lr-3", { id: "u1" });

    getHandler1("leave_room")();

    const socket2 = {
      id: "sid-lr-3b",
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    const connectionHandler = mockIo.on.mock.calls[0][1];
    connectionHandler(socket2);
    const getHandler2 = (eventName) => {
      const call = socket2.on.mock.calls.find(([ev]) => ev === eventName);
      return call ? call[1] : null;
    };
    await getHandler2("join_room")("room-lr-3", { id: "u1" });

    expect(socket2.join).toHaveBeenCalledWith("room-lr-3");
    expect(socket2.emit).not.toHaveBeenCalledWith(
      "join_error",
      expect.anything(),
    );
  });

  test("subsequent disconnect is a no-op (no double user_disconnected)", async () => {
    CollabRoomModel.getMessages.mockResolvedValue([]);
    const { mockIo, mockSocket, mockSocketEmit } = buildMocks("sid-lr-4");
    const getHandler = connect(mockIo, mockSocket);
    await getHandler("join_room")("room-lr-4", { id: "u1" });

    getHandler("leave_room")();
    getHandler("disconnect")();

    // user_disconnected should have been emitted exactly once (from leave_room)
    expect(mockSocketEmit).toHaveBeenCalledTimes(1);
  });

  test("does nothing when socket never joined a room", () => {
    const { mockIo, mockSocket } = buildMocks("sid-lr-5");
    const getHandler = connect(mockIo, mockSocket);

    // leave_room with no prior join_room — should not throw
    expect(() => getHandler("leave_room")()).not.toThrow();
    expect(mockSocket.to).not.toHaveBeenCalled();
  });
});

/////////////////////////////////////////////////////
// disconnect
/////////////////////////////////////////////////////
describe("disconnect event", () => {
  test("does not throw when the disconnect handler is called", () => {
    const { mockIo, mockSocket } = buildMocks();
    const getHandler = connect(mockIo, mockSocket);
    expect(() => getHandler("disconnect")()).not.toThrow();
  });
});
