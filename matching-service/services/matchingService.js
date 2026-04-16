const redisClient = require('../config/redis');
const { acquireLock, releaseLock } = require('../utils/lock');
const { parseMatchedCriteria } = require('../utils/queueKeys');

// In-memory state tracking for connected sockets.
// key: socket.id
// value: {
//   userId           {string}  - user identifier
//   serializedEntry  {string}  - JSON.stringify({socketId, userId}) - allows quick removal
//   queues           {Set}     - every queue key this socket is enlisted in
//   relaxationTimers {Array}   - setTimeout IDs for the 30s / 60s / 120s phases;
//   statusInterval   {*}       - ID for setInterval function
//   startedAt        {number}  - Date.now() to compute elapsed time
//   relaxationLevel  {number}  - 0 = full criteria, 1 = difficulty relaxed, 2 = topic relaxed
//   criteria         {object}  - { languages, topics, difficulty }
// }
const socketState = new Map();

// Reverse map: userId → socketId
// Tracks the latest active socket for each user so stale sockets (e.g. from
// Arc browser tab restoration / reconnects) can be evicted before the new
// socket registers itself in the queue.
const userSocketMap = new Map();


// Attempt to find a match for socket in specified queues. 
// Returns boolean indicating whether a match was made.
async function findQueues(io, socket, queueKeys) {
  for (const key of queueKeys) {
    const matched = await tryMatching(io, socket, key);
    if (matched) return true;
  }

  const state = socketState.get(socket.id);
  for (const key of queueKeys) {
    await redisClient.rPush(key, state.serializedEntry);
    state.queues.add(key);
  }

  return false;
}

// Attempt to find a matching user within the sockets
async function tryMatching(io, socket, queueKey) {
  const state = socketState.get(socket.id);
  if (!state) return false;

  // Limit to 10 candidates per queue. Else queues could be too long. 
  const queueLen = await redisClient.lLen(queueKey);
  const maxAttempts = Math.min(queueLen, 10);

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const raw = await redisClient.lPop(queueKey);
    if (!raw) break;

    const candidate = JSON.parse(raw);

    // self-check: same socket OR same user on a different tab
    if (candidate.socketId === socket.id || candidate.userId === state.userId) {
      await redisClient.lPush(queueKey, raw);
      break;
    }

    const candidateUserState = await redisClient.get(`user_state:${candidate.userId}`);
    if (candidateUserState !== 'WAITING') continue;


    // sort to prevent deadlock by ensuring lock order is always the same
    // eg. if userId is 5 and candidate is 10, acquire lock on 5 then 10. 
    const [firstId, secondId] = [state.userId, candidate.userId].sort();
    const token1 = await acquireLock(firstId);

    // these two checks is for null case.
    if (!token1) {
      await redisClient.lPush(queueKey, raw);
      break;
    }

    const token2 = await acquireLock(secondId);
    if (!token2) {
      await releaseLock(firstId, token1);
      await redisClient.lPush(queueKey, raw);
      break;
    }

    // Both locks acquired : Check if both users are still waiting. (Cancellation Case)
    const [s1, s2] = await Promise.all([
      redisClient.get(`user_state:${state.userId}`),
      redisClient.get(`user_state:${candidate.userId}`),
    ]);

    if (s1 !== 'WAITING' || s2 !== 'WAITING') {
      await releaseLock(firstId, token1);
      await releaseLock(secondId, token2);
      // Push back to queue if waiting. 
      if (s2 === 'WAITING') await redisClient.lPush(queueKey, raw);
      break;
    }

    // Confirm the match atomically. 
    await Promise.all([
      redisClient.set(`user_state:${state.userId}`, 'MATCHED', { EX: 60 }),
      redisClient.set(`user_state:${candidate.userId}`, 'MATCHED', { EX: 60 }),
    ]);

    await releaseLock(firstId, token1);
    await releaseLock(secondId, token2);

    await finalizeMatch(io, socket, candidate, queueKey);
    return true;
  }

  return false;
}

// This function performs all the steps after a match is found.
// Cleaning up state/queues, getting question from question-service, creating collaboration room, and notifying users.
async function finalizeMatch(io, socket, candidate, queueKey) {
  const state = socketState.get(socket.id);

  // cleanup socket's states, timer and queues.
  if (state) {
    state.relaxationTimers.forEach(clearTimeout);
    clearInterval(state.statusInterval);
  }

  const candidateState = socketState.get(candidate.socketId);
  if (candidateState) {
    candidateState.relaxationTimers.forEach(clearTimeout);
    clearInterval(candidateState.statusInterval);
  }
  await cleanupQueues(socket.id);
  await cleanupQueues(candidate.socketId);


  const { topic, difficulty } = parseMatchedCriteria(queueKey);

  // Future api calls to question repo and collab service.
  const { fetchQuestion, createCollaborationRoom } = require('./externalServices');
  const question = await fetchQuestion(topic, difficulty);

  const allowedUsers = [
    { id: state?.userId, username: state?.username || '' },
    { id: candidate.userId, username: candidate.username || '' },
  ];
  const roomUrl  = await createCollaborationRoom(question, allowedUsers);


  // If collab room has an issue, ensure that users are disconnected. 
  if (!question || !roomUrl) {
    console.error(`Match finalisation failed for ${state?.userId} and ${candidate.userId}: external service error.`);

    await redisClient.set(`user_state:${state?.userId}`, 'DISCONNECTED', { EX: 60 });
    await redisClient.set(`user_state:${candidate.userId}`, 'DISCONNECTED', { EX: 60 });
    socketState.delete(socket.id);
    socketState.delete(candidate.socketId);

    io.to(socket.id).emit('match-error', { message: 'Failed to set up a collaboration room. Please try again.' });
    io.to(candidate.socketId).emit('match-error', { message: 'Failed to set up a collaboration room. Please try again.' });
    return;
  }

  const matchPayload = {
    roomUrl,
    questionId: question?._id ?? null,
    matchedOn:  { topic, difficulty },
  };

  // Notify both users. Each receives the other's userId as partnerUserId.
  io.to(socket.id).emit('match-found', { ...matchPayload, partnerUserId: candidate.userId });
  io.to(candidate.socketId).emit('match-found', { ...matchPayload, partnerUserId: state?.userId });

  console.log(`Match finalised: ${state?.userId} and ${candidate.userId} on ${queueKey}`);

  // Delete user and socket states after match.
  await redisClient.del(`user_state:${state?.userId}`);
  await redisClient.del(`user_state:${candidate.userId}`);

  socketState.delete(socket.id);
  socketState.delete(candidate.socketId);
}


async function cleanupQueues(socketId) {
  const state = socketState.get(socketId);
  if (!state) return;
  for (const key of state.queues) {
    await redisClient.lRem(key, 0, state.serializedEntry);
  }
}

async function cleanupSocket(socketId) {
  const state = socketState.get(socketId);
  if (!state) return;

  state.relaxationTimers.forEach(clearTimeout);
  clearInterval(state.statusInterval);

  await cleanupQueues(socketId);
  await redisClient.set(`user_state:${state.userId}`, 'DISCONNECTED', { EX: 60 });

  // Remove from reverse map only if this socket is still the registered one.
  if (userSocketMap.get(state.userId) === socketId) {
    userSocketMap.delete(state.userId);
  }

  socketState.delete(socketId);
}

module.exports = { socketState, userSocketMap, findQueues, cleanupSocket };
