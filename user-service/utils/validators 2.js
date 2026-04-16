/**
 * Shared validation utilities for the user-service.
 */

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

/**
 * Returns true if `email` is a syntactically valid email address.
 * Uses the RFC-5322-inspired regex widely adopted in production apps.
 */
export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

/**
 * Common weak / dictionary-attack passwords to block outright.
 * Extend this list as needed.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "password1234", "password12345",
  "123456", "1234567", "12345678", "123456789", "1234567890",
  "qwerty", "qwerty123", "abc123", "letmein", "welcome",
  "monkey", "dragon", "master", "iloveyou", "admin",
  "login", "pass", "test", "user", "guest",
  "sunshine", "princess", "football", "shadow", "mustang",
]);

/**
 * Validates a password against the PeerPrep password policy.
 *
 * Rules:
 *  - At least 8 characters long
 *  - At least one uppercase letter (A-Z)
 *  - At least one lowercase letter (a-z)
 *  - At least one digit (0-9)
 *  - At least one special character (!@#$%^&*()_+-=[]{}|;':",.<>?/`~\)
 *  - Not a common/dictionary password
 *
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, message: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one digit." };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~\\]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one special character (e.g. !@#$%^&*).",
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, message: "Password is too common. Please choose a stronger password." };
  }

  return { valid: true, message: "Password is valid." };
}

// ---------------------------------------------------------------------------
// Username validation (F3.2.1)
// ---------------------------------------------------------------------------

/**
 * Validates a username against the PeerPrep username policy.
 *
 * Rules:
 *  - 3 to 30 characters long
 *  - Only alphanumeric characters, underscores (_) or hyphens (-)
 *  - Must not be entirely numeric (to avoid confusion with IDs)
 *
 * @param {string} username
 * @returns {{ valid: boolean, message: string }}
 */
export function validateUsername(username) {
  if (typeof username !== "string" || username.length === 0) {
    return { valid: false, message: "Username is required." };
  }

  if (username.length < 3) {
    return { valid: false, message: "Username must be at least 3 characters long." };
  }

  if (username.length > 30) {
    return { valid: false, message: "Username must not exceed 30 characters." };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      message: "Username may only contain letters, numbers, underscores (_), and hyphens (-).",
    };
  }

  if (/^[0-9]+$/.test(username)) {
    return { valid: false, message: "Username must not consist entirely of numbers." };
  }

  return { valid: true, message: "Username is valid." };
}
