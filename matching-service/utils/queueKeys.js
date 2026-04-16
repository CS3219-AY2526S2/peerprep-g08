// Separated queue logic into 3 levels based on relaxation level.
// Topic is the non-negotiable constraint — it is never relaxed.
// level 0:  queue:{topic}:{difficulty}:{lang}   full criteria
// level 1:  queue:{topic}:{lang}                difficulty relaxed (at 30 s)
// level 2:  queue:{topic}                       language relaxed   (at 60 s)

function getQueueKeys({ languages, topics, difficulty }, level) {
  const keys = [];
  for (const topic of topics) {
    if (level >= 2) {
      // Language dropped — one key per topic only.
      keys.push(`queue:${topic}`);
    } else {
      for (const lang of languages) {
        if (level === 0) {
          keys.push(`queue:${topic}:${difficulty}:${lang}`);
        } else {
          keys.push(`queue:${topic}:${lang}`);
        }
      }
    }
  }
  return [...new Set(keys)];
}

// parse out topic and difficulty based on relaxation level
function parseMatchedCriteria(queueKey) {
  const parts = queueKey.split(':');
  const topic      = parts[1] ?? null;
  // relax if it has 4 parts
  const difficulty = parts.length >= 4 ? parts[2] : null;
  return { topic, difficulty };
}

module.exports = { getQueueKeys, parseMatchedCriteria };
