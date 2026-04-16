'use strict';

const { getQueueKeys, parseMatchedCriteria } = require('../utils/queueKeys');


describe('getQueueKeys', () => {
  const criteria = {
    languages: ['javascript', 'python'],
    topics: ['arrays', 'trees'],
    difficulty: 'easy',
  };

  test('level 0 produces queue:{topic}:{difficulty}:{lang} for every topic×lang pair', () => {
    const keys = getQueueKeys(criteria, 0);
    expect(keys).toEqual(
      expect.arrayContaining([
        'queue:arrays:easy:javascript',
        'queue:arrays:easy:python',
        'queue:trees:easy:javascript',
        'queue:trees:easy:python',
      ])
    );
    expect(keys).toHaveLength(4);
  });

  test('level 1 produces queue:{topic}:{lang}, no difficulty segment', () => {
    const keys = getQueueKeys(criteria, 1);
    expect(keys).toEqual(
      expect.arrayContaining([
        'queue:arrays:javascript',
        'queue:arrays:python',
        'queue:trees:javascript',
        'queue:trees:python',
      ])
    );
    expect(keys).toHaveLength(4);
    keys.forEach(k => expect(k.split(':').length).toBe(3));
  });

  test('level 2 produces queue:{topic} only — language and difficulty dropped', () => {
    const keys = getQueueKeys(criteria, 2);
    expect(keys).toEqual(
      expect.arrayContaining(['queue:arrays', 'queue:trees'])
    );
    expect(keys).toHaveLength(2);
    keys.forEach(k => expect(k.split(':').length).toBe(2));
  });

  test('level >= 2 also produces topic-only keys', () => {
    const keys = getQueueKeys(criteria, 3);
    expect(keys).toEqual(expect.arrayContaining(['queue:arrays', 'queue:trees']));
    expect(keys).toHaveLength(2);
  });

  test('duplicate keys are deduplicated', () => {
    const dupCriteria = { languages: ['javascript'], topics: ['arrays', 'arrays'], difficulty: 'easy' };
    const keys = getQueueKeys(dupCriteria, 0);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe('queue:arrays:easy:javascript');
  });

  test('single topic and single language produces exactly one key per level', () => {
    const single = { languages: ['java'], topics: ['graphs'], difficulty: 'hard' };
    expect(getQueueKeys(single, 0)).toEqual(['queue:graphs:hard:java']);
    expect(getQueueKeys(single, 1)).toEqual(['queue:graphs:java']);
    expect(getQueueKeys(single, 2)).toEqual(['queue:graphs']);
  });
});

// ---------------------------------------------------------------------------
// parseMatchedCriteria
// ---------------------------------------------------------------------------
describe('parseMatchedCriteria', () => {
  test('level-0 key (4 parts) returns correct topic and difficulty', () => {
    const result = parseMatchedCriteria('queue:arrays:easy:javascript');
    expect(result).toEqual({ topic: 'arrays', difficulty: 'easy' });
  });

  test('level-1 key (3 parts) returns topic and null difficulty', () => {
    const result = parseMatchedCriteria('queue:arrays:javascript');
    expect(result).toEqual({ topic: 'arrays', difficulty: null });
  });

  test('level-2 key (2 parts) returns topic and null difficulty', () => {
    const result = parseMatchedCriteria('queue:trees');
    expect(result).toEqual({ topic: 'trees', difficulty: null });
  });

  test('topic is always the second segment regardless of level', () => {
    const keys = [
      'queue:graphs:medium:python',
      'queue:graphs:python',
      'queue:graphs',
    ];
    keys.forEach(k => {
      expect(parseMatchedCriteria(k).topic).toBe('graphs');
    });
  });
});
