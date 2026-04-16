import OpenAI from "openai";
import "dotenv/config";

// Lazily-initialized OpenAI client — constructed on first use so that
// importing this module in tests (where OPENAI_API_KEY is absent) does not
// throw at module-load time.
let _openai = null;
function getOpenAIClient() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// Rate limiting configuration
const RATE_LIMITS = {
  MAX_REQUESTS_PER_USER_PER_HOUR: 20,
  MAX_REQUESTS_PER_SESSION_PER_MINUTE: 5,
  MAX_INPUT_LENGTH: 2000, // characters
  REQUEST_TIMEOUT: 30000, // milliseconds
};

// In-memory stores for rate limiting (in production, use Redis)
const userRateLimitStore = new Map(); // userId -> { count, resetTime }
const sessionRateLimitStore = new Map(); // roomId -> { count, resetTime }

/**
 * Check rate limits for a user
 */
function checkUserRateLimit(userId) {
  const now = Date.now();
  const userLimit = userRateLimitStore.get(userId) || {
    count: 0,
    resetTime: now + 3600000, // 1 hour
  };

  // Reset if time has passed
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + 3600000;
  }

  if (userLimit.count >= RATE_LIMITS.MAX_REQUESTS_PER_USER_PER_HOUR) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Max ${RATE_LIMITS.MAX_REQUESTS_PER_USER_PER_HOUR} requests per hour.`,
    };
  }

  userLimit.count++;
  userRateLimitStore.set(userId, userLimit);
  return { allowed: true };
}

/**
 * Check rate limits for a session/room
 */
function checkSessionRateLimit(roomId) {
  const now = Date.now();
  const sessionLimit = sessionRateLimitStore.get(roomId) || {
    count: 0,
    resetTime: now + 60000, // 1 minute
  };

  // Reset if time has passed
  if (now > sessionLimit.resetTime) {
    sessionLimit.count = 0;
    sessionLimit.resetTime = now + 60000;
  }

  if (
    sessionLimit.count >=
    RATE_LIMITS.MAX_REQUESTS_PER_SESSION_PER_MINUTE
  ) {
    return {
      allowed: false,
      error: `Session rate limit exceeded. Max ${RATE_LIMITS.MAX_REQUESTS_PER_SESSION_PER_MINUTE} requests per minute per room.`,
    };
  }

  sessionLimit.count++;
  sessionRateLimitStore.set(roomId, sessionLimit);
  return { allowed: true };
}

/**
 * Validate input for safety
 */
function validateInput(message) {
  if (!message || typeof message !== "string") {
    return {
      valid: false,
      error: "Invalid message format.",
    };
  }

  if (message.trim().length === 0) {
    return {
      valid: false,
      error: "Message cannot be empty.",
    };
  }

  if (message.length > RATE_LIMITS.MAX_INPUT_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${RATE_LIMITS.MAX_INPUT_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

/**
 * Extract the actual query from the @AI mention
 */
function extractQuery(message) {
  // Remove @AI or @ai from the beginning and trim
  return message
    .replace(/^@ai\s+/i, "")
    .trim();
}

/**
 * Get AI help using OpenAI
 */
export async function getAIHelp(message, userId, roomId, codeContext = "") {
  try {
    // Validate input
    const validation = validateInput(message);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Check user rate limit
    const userLimitCheck = checkUserRateLimit(userId);
    if (!userLimitCheck.allowed) {
      return {
        success: false,
        error: userLimitCheck.error,
      };
    }

    // Check session rate limit
    const sessionLimitCheck = checkSessionRateLimit(roomId);
    if (!sessionLimitCheck.allowed) {
      return {
        success: false,
        error: sessionLimitCheck.error,
      };
    }

    // Extract the actual query
    const query = extractQuery(message);

    // Build the context for the AI
    const systemPrompt = `You are an expert coding tutor in a collaborative programming environment. Your role is to help users learn and debug code.

Guidelines:
- Provide step-by-step explanations of concepts
- Offer hints and guidance rather than complete solutions
- Only provide full solutions if explicitly requested by saying "show me the solution"
- Break down complex problems into smaller, manageable parts
- Encourage critical thinking and problem-solving
- Be encouraging and supportive
- Keep responses concise but informative
- Use markdown formatting for code snippets and clarity

When debugging:
- Help identify the root cause
- Guide the user through the debugging process
- Suggest testing approaches

Important: Always prioritize teaching over just fixing code.`;

    const userPrompt = codeContext
      ? `User's question: ${query}\n\nCurrent code context:\n\`\`\`\n${codeContext}\n\`\`\``
      : `User's question: ${query}`;

    console.log(`[AI Service] Processing query for user ${userId} in room ${roomId}`);

    // Call OpenAI API with timeout
    const response = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("AI request timeout")),
          RATE_LIMITS.REQUEST_TIMEOUT
        )
      ),
    ]);

    const aiResponse =
      response.choices[0]?.message?.content ||
      "Unable to generate response. Please try again.";

    console.log(`[AI Service] Response generated successfully`);

    return {
      success: true,
      response: aiResponse,
    };
  } catch (error) {
    console.error("[AI Service] Error:", error.message);

    // Handle specific error cases
    if (error.message === "AI request timeout") {
      return {
        success: false,
        error:
          "AI request timed out. Please try again with a shorter question.",
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        error: "AI service is not properly configured. Contact support.",
      };
    }

    if (error.status === 429) {
      return {
        success: false,
        error:
          "OpenAI rate limit exceeded. Please wait a moment and try again.",
      };
    }

    return {
      success: false,
      error: "An error occurred while processing your request. Please try again.",
    };
  }
}

/**
 * Clear rate limit data for a user (useful for testing)
 */
export function clearUserRateLimit(userId) {
  userRateLimitStore.delete(userId);
}

/**
 * Clear rate limit data for a session
 */
export function clearSessionRateLimit(roomId) {
  sessionRateLimitStore.delete(roomId);
}

/**
 * Get rate limit status for diagnostics
 */
export function getRateLimitStatus(userId, roomId) {
  return {
    userLimit: userRateLimitStore.get(userId) || null,
    sessionLimit: sessionRateLimitStore.get(roomId) || null,
    config: RATE_LIMITS,
  };
}


