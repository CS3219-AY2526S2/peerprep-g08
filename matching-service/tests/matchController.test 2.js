'use strict';


jest.mock('../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
}));

const mockFindQueues = jest.fn().mockResolvedValue(undefined);
const mockCleanupSocket = jest.fn().mockResolvedValue(undefined);
const mockSocketState = new Map();

jest.mock('../services/matchingService', () => ({
  get socketState() { return mockSocketState; },
  findQueues: (...args) => mockFindQueues(...args),
  cleanupSocket: (...args) => mockCleanupSocket(...args),
}));

const redisClient = require('../config/redis');
const { handleFindMatch, handleCancelMatch, handleDisconnect } = require('../controllers/matchController');


function makeSocket(overrides = {}) {
  return {
    id: 'socket-1',
    userId: 'user-1',
    emit: jest.fn(),
    ...overrides,
  };
}

function makeIo() {
  return { to: jest.fn().mockReturnThis(), emit: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSocketState.clear();
  redisClient.set.mockResolvedValue('OK');
});

// no empty criteria 
describe('handleFindMatch — input validation', () => {
  test('emits error when languages array is empty', async () => {
    const socket = makeSocket();
    await handleFindMatch(makeIo(), socket, {
      languages: [],
      topics: ['arrays'],
      difficulty: 'easy',
    });
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
    expect(redisClient.set).not.toHaveBeenCalled();
  });

  test('emits error when topics array is empty', async () => {
    const socket = makeSocket();
    await handleFindMatch(makeIo(), socket, {
      languages: ['javascript'],
      topics: [],
      difficulty: 'easy',
    });
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
    expect(redisClient.set).not.toHaveBeenCalled();
  });

  test('emits error when difficulty is missing', async () => {
    const socket = makeSocket();
    await handleFindMatch(makeIo(), socket, {
      languages: ['javascript'],
      topics: ['arrays'],
      difficulty: '',
    });
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
    expect(redisClient.set).not.toHaveBeenCalled();
  });

  test('emits error when userId is missing from socket (failed JWT)', async () => {
    const socket = makeSocket({ userId: undefined });
    await handleFindMatch(makeIo(), socket, {
      languages: ['javascript'],
      topics: ['arrays'],
      difficulty: 'easy',
    });
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
  });
});

// happy path should set state and call findQueues with correct keys
describe('handleFindMatch — happy path', () => {
  const validData = { languages: ['javascript'], topics: ['arrays'], difficulty: 'easy' };

  test('sets user_state to WAITING in Redis with a 300s TTL', async () => {
    await handleFindMatch(makeIo(), makeSocket(), validData);
    expect(redisClient.set).toHaveBeenCalledWith(
      'user_state:user-1',
      'WAITING',
      { EX: 300 }
    );
  });

  test('stores the socket state entry with correct fields', async () => {
    const socket = makeSocket();
    await handleFindMatch(makeIo(), socket, validData);

    const state = mockSocketState.get(socket.id);
    expect(state).toMatchObject({
      userId: 'user-1',
      relaxationLevel: 0,
      criteria: validData,
    });
    expect(state.queues).toBeInstanceOf(Set);
    expect(Array.isArray(state.relaxationTimers)).toBe(true);
  });

  test('calls findQueues immediately with level-0 keys', async () => {
    await handleFindMatch(makeIo(), makeSocket(), validData);
    expect(mockFindQueues).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.arrayContaining(['queue:arrays:easy:javascript'])
    );
  });

  test('clears previous state when the same socket calls find-match again', async () => {
    const socket = makeSocket();
    // Seed an existing entry so re-join path triggers
    mockSocketState.set(socket.id, { userId: 'user-1', relaxationTimers: [], queues: new Set() });

    await handleFindMatch(makeIo(), socket, validData);

    expect(mockCleanupSocket).toHaveBeenCalledWith(socket.id);
  });
});

// cancellation should clean up state and emit cancellation message
describe('handleCancelMatch', () => {
  test('calls cleanupSocket with the socket id', async () => {
    const socket = makeSocket();
    await handleCancelMatch(socket);
    expect(mockCleanupSocket).toHaveBeenCalledWith(socket.id);
  });

  test('emits match-cancelled to the socket', async () => {
    const socket = makeSocket();
    await handleCancelMatch(socket);
    expect(socket.emit).toHaveBeenCalledWith(
      'match-cancelled',
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});

// disconnect should clean up state
describe('handleDisconnect', () => {
  test('calls cleanupSocket with the socket id', async () => {
    const socket = makeSocket();
    await handleDisconnect(socket);
    expect(mockCleanupSocket).toHaveBeenCalledWith(socket.id);
  });
});
