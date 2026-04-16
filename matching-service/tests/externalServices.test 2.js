'use strict';

const { fetchQuestion, createCollaborationRoom } = require('../services/externalServices');

// Minimal mock response helper for fetch
function mockResponse({ ok = true, body = {} } = {}) {
  return {
    ok,
    json: jest.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

 
describe('fetchQuestion', () => {
  test('returns a question that matches the requested difficulty (case-insensitive)', async () => {
    const questions = [
      { _id: '1', title: 'Easy Q', difficulty: 'Easy' },
      { _id: '2', title: 'Hard Q', difficulty: 'Hard' },
    ];
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: questions }));

    const result = await fetchQuestion('arrays', 'easy');

    expect(result).toEqual({ _id: '1', title: 'Easy Q', difficulty: 'Easy' });
  });

  test('returns null when no questions match the requested difficulty', async () => {
    const questions = [{ _id: '1', title: 'Hard Q', difficulty: 'Hard' }];
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: questions }));

    const result = await fetchQuestion('arrays', 'easy');

    expect(result).toBeNull();
  });

  test('returns null when the HTTP response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ ok: false }));

    const result = await fetchQuestion('arrays', 'easy');

    expect(result).toBeNull();
  });

  test('returns null when fetch throws a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network failure'));

    const result = await fetchQuestion('arrays', 'easy');

    expect(result).toBeNull();
  });

  test('calls the category endpoint when a category is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: [] }));

    await fetchQuestion('trees', 'medium');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/questions/category/trees')
    );
  });

  test('calls the generic questions endpoint when no category is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: [] }));

    await fetchQuestion(null, 'easy');

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/api\/questions$/);
  });

  test('returns one of the matching questions at random', async () => {
    const questions = [
      { _id: '1', difficulty: 'easy' },
      { _id: '2', difficulty: 'easy' },
      { _id: '3', difficulty: 'easy' },
    ];
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: questions }));

    const result = await fetchQuestion('arrays', 'easy');

    expect(questions).toContainEqual(result);
  });
});

// ---------------------------------------------------------------------------
// createCollaborationRoom
// ---------------------------------------------------------------------------
describe('createCollaborationRoom', () => {
  const question = { _id: 'q123' };
  const roomData = { roomId: 'room-abc', roomUrl: 'http://collab/room-abc' };

  test('POSTs to /rooms/create with the questionId in the body', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: roomData }));

    await createCollaborationRoom(question, 'user1', 'user2');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rooms/create'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: 'q123' }),
      })
    );
  });

  test('returns the room data on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: roomData }));

    const result = await createCollaborationRoom(question, 'user1', 'user2');

    expect(result).toEqual(roomData);
  });

  test('returns null when the HTTP response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ ok: false }));

    const result = await createCollaborationRoom(question, 'user1', 'user2');

    expect(result).toBeNull();
  });

  test('returns null when fetch throws a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused'));

    const result = await createCollaborationRoom(question, 'user1', 'user2');

    expect(result).toBeNull();
  });

  test('handles a null question gracefully (sends questionId: undefined)', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: roomData }));

    await createCollaborationRoom(null, 'user1', 'user2');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ questionId: undefined }),
      })
    );
  });
});
