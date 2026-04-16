const { io } = require('socket.io-client');

const GATEWAY_URL = 'http://localhost:3002';

// Creates a socket client and emits find-match with the new array-based payload.
// onMatch, onTimeout, onCancelled, onRelaxed are optional callbacks for assertions.
const createClient = (name, userId, languages, topics, difficulty, { onMatch, onTimeout, onCancelled, onRelaxed } = {}) => {
  const socket = io(GATEWAY_URL, { reconnection: false, transports: ['websocket'] });

  socket.on('connect', () => {
    console.log(`  [${name}] Searching.`);
    socket.emit('find-match', { userId, languages, topics, difficulty });
  });

  socket.on('match-found', (data) => {
    console.log(`  [${name}] match-found | partner: ${data.partnerUserId} | topic: ${data.matchedOn?.topic} | difficulty: ${data.matchedOn?.difficulty}
       | questionId: ${data.questionId} | roomId: ${data.roomUrl?.roomId}`);
    if (onMatch) onMatch(data);
    socket.disconnect();
  });

  socket.on('criteria-relaxed', (data) => {
    console.log(`  [${name}] criteria-relaxed | level ${data.level}: ${data.message}`);
    if (onRelaxed) onRelaxed(data);
  });

  socket.on('match-timeout', (data) => {
    console.log(`  [${name}] match-timeout: ${data.message}`);
    if (onTimeout) onTimeout(data);
    socket.disconnect();
  });

  socket.on('match-cancelled', (data) => {
    console.log(`  [${name}] match-cancelled: ${data.message}`);
    if (onCancelled) onCancelled(data);
    socket.disconnect();
  });

  socket.on('error', (data) => {
    console.log(`  [${name}] error: ${data.message}`);
    socket.disconnect();
  });

  socket.on('connect_error', (err) => {
    console.log(`  [${name}] connect_error: ${err.message}`);
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      console.log(`  [${name}] disconnected unexpectedly: ${reason}`);
    }
  });

  return socket;
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

async function runTests() {
  
  // ─── TEST 1: Immediate match on identical criteria ───────────────────────────
  console.log('\n━━━ TEST 1: Immediate match (same criteria) ━━━');
  createClient('T1_User1', 'u1', ['javascript'], ['algorithms'], 'easy');
  await wait(500);
  createClient('T1_User2', 'u2', ['javascript'], ['algorithms'], 'easy');

  await wait(1000);

  // ─── TEST 2: Multi-language match ────────────────────────────────────────────
  console.log('\n━━━ TEST 2: Multi-language match ━━━');
  createClient('T2_User1', 'u3', ['python', 'typescript'], ['sorting'], 'medium');
  await wait(500);
  createClient('T2_User2', 'u4', ['typescript'], ['sorting'], 'medium');

  await wait(1000);

  // ─── TEST 3: Multi-topic match ────────────────────────────────────────────────
  console.log('\n━━━ TEST 3: Multi-topic match ━━━');
  createClient('T3_User1', 'u5', ['python'], ['trees', 'graphs'], 'hard');
  await wait(500);
  createClient('T3_User2', 'u6', ['python'], ['graphs'], 'hard');

  await wait(1000);

  // ─── TEST 4: Difficulty relaxation match (30s) ───────────────────────────────
  console.log('\n━━━ TEST 4: Difficulty relaxation match (~30s) ━━━');
  createClient('T4_User1', 'u7', ['rust'], ['arrays'], 'easy');
  await wait(500);
  createClient('T4_User2', 'u8', ['rust'], ['arrays'], 'hard');

  await wait(31000);

  // ─── TEST 5: Topic relaxation match (60s) ────────────────────────────────────
  console.log('\n━━━ TEST 5: Topic relaxation match (~60s) ━━━');
  createClient('T5_User1', 'u9',  ['go'], ['arrays'],  'easy');
  await wait(500);
  createClient('T5_User2', 'u10', ['go'], ['strings'], 'hard');

  await wait(61000);

  // ─── TEST 6: Cancel search ────────────────────────────────────────────────────
  console.log('\n━━━ TEST 6: Cancel search ━━━');
  const t6 = createClient('T6_User1', 'u11', ['kotlin'], ['dp'], 'medium');
  setTimeout(() => {
    t6.emit('cancel-match');
  }, 3000);

  await wait(5000);

  // ─── TEST 7: Disconnect mid-search ───────────────────────────────────────────
  console.log('\n━━━ TEST 7: Disconnect mid-search ━━━');
  const t7 = createClient('T7_Ghost', 'u12', ['swift'], ['trees'], 'easy');
  await wait(3000);
  console.log('  [T7_Ghost] disconnected');
  t7.disconnect();
  await wait(1000);
  createClient('T7_User2', 'u13', ['swift'], ['trees'], 'easy', {
    onMatch: () => console.log('  [T7_User2] ERROR: should not have matched with ghost socket'),
  });

  await wait(1000);

  // ─── TEST 8: Timeout ─────────────────────────────────────────────────────────
  console.log('\n━━━ TEST 8: Timeout (2 minutes — grab a coffee) ━━━');
  createClient('T8_User1', 'u14', ['cobol'], ['legacy'], 'hard');

  await wait(121000);

  console.log('\n━━━ All tests complete ━━━\n');
}

runTests();
