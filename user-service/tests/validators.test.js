import { isValidEmail, validatePassword, validateUsername } from "../utils/validators.js";

describe("Validators Utility", () => {
  describe("isValidEmail", () => {
    test("returns true for valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
    });

    test("returns false for invalid emails", () => {
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe("validatePassword", () => {
    test("validates a strong password", () => {
      const result = validatePassword("StrongPass123!");
      expect(result.valid).toBe(true);
    });

    test("fails if too short", () => {
      expect(validatePassword("Short1!").valid).toBe(false);
    });

    test("fails if no uppercase", () => {
      expect(validatePassword("lowercase1!").valid).toBe(false);
    });

    test("fails if no special char", () => {
      expect(validatePassword("NoSpecialChar1").valid).toBe(false);
    });

    test("fails if common password", () => {
      expect(validatePassword("password123!").valid).toBe(false);
    });
  });

  describe("validateUsername", () => {
    test("validates a standard username", () => {
      expect(validateUsername("valid_user").valid).toBe(true);
      expect(validateUsername("user-name").valid).toBe(true);
    });

    test("fails for invalid lengths", () => {
      expect(validateUsername("ab").valid).toBe(false);
      expect(validateUsername("a".repeat(31)).valid).toBe(false);
    });

    test("fails for invalid characters", () => {
      expect(validateUsername("user name").valid).toBe(false);
      expect(validateUsername("user@123").valid).toBe(false);
    });

    test("fails if purely numeric", () => {
      expect(validateUsername("12345").valid).toBe(false);
    });
  });
});
