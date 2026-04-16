const redisClient = require('../config/redis');
const crypto = require('crypto');

// Lua script for atomic lock release.
const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

// Acquire a lock for a user. Returns a token if successful, or null if lock is already held.
async function acquireLock(userId) {
  const token = crypto.randomUUID();
  const result = await redisClient.set(
    `lock:match:${userId}`,
    token,
    // NX = checks if key exists; PX = expire after 5 seconds
    { NX: true, PX: 5000 }
  );
  return result === 'OK' ? token : null;
}

// Release a lock for a user, but only if the token matches. 
async function releaseLock(userId, token) {
  await redisClient.eval(RELEASE_LOCK_SCRIPT, {
    keys: [`lock:match:${userId}`],
    arguments: [token],
  });
}

module.exports = { acquireLock, releaseLock };
