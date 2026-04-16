'use strict';

// Mock redis before requiring any module that imports it
jest.mock('../config/redis', () => ({
  set: jest.fn(),
  eval: jest.fn(),
}));

const redisClient = require('../config/redis');
const { acquireLock, releaseLock } = require('../utils/lock');

afterEach(() => jest.clearAllMocks());

// acquireLock should attempt to set a Redis key with NX and PX options, returning a token if successful
describe('acquireLock', () => {
  test('returns a token string when the lock is acquired (Redis returns OK)', async () => {
    redisClient.set.mockResolvedValue('OK');

    const token = await acquireLock('user1');

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('calls Redis SET with NX and PX options on the correct key', async () => {
    redisClient.set.mockResolvedValue('OK');

    await acquireLock('user1');

    expect(redisClient.set).toHaveBeenCalledWith(
      'lock:match:user1',
      expect.any(String),
      { NX: true, PX: 5000 }
    );
  });

  test('returns null when the lock is already held (Redis returns null)', async () => {
    redisClient.set.mockResolvedValue(null);

    const token = await acquireLock('user1');

    expect(token).toBeNull();
  });

  test('each call generates a unique token', async () => {
    redisClient.set.mockResolvedValue('OK');

    const token1 = await acquireLock('user1');
    const token2 = await acquireLock('user1');

    expect(token1).not.toBe(token2);
  });
});


// release the lock by verifying the token and deleting the key if it matches
describe('releaseLock', () => {
  test('calls Redis EVAL with the correct key and token as arguments', async () => {
    redisClient.eval.mockResolvedValue(1);

    await releaseLock('user1', 'my-token');

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.any(String),           // Lua script
      expect.objectContaining({
        keys: ['lock:match:user1'],
        arguments: ['my-token'],
      })
    );
  });

  test('does not throw when Redis returns 0 (token mismatch — lock not owned)', async () => {
    redisClient.eval.mockResolvedValue(0);

    await expect(releaseLock('user1', 'wrong-token')).resolves.not.toThrow();
  });

  test('does not throw when Redis returns 1 (lock released successfully)', async () => {
    redisClient.eval.mockResolvedValue(1);

    await expect(releaseLock('user1', 'correct-token')).resolves.not.toThrow();
  });
});
