import {
  createOtp,
  findLatestOtpByEmail,
  incrementOtpAttempt,
  isOtpLocked,
  deleteOtpsByEmail,
} from "../../model/repository.js";

// Mock MongoDB for unit tests
jest.mock("../../model/otp-model.js");
jest.mock("../../model/user-model.js");
jest.mock("../../model/admin-code-model.js");

import OtpModel from "../../model/otp-model.js";

const VALID_EMAIL = "test@example.com";
const PURPOSE = "email_verification";

function mockOtpDoc(overrides = {}) {
  return {
    _id: "oid1",
    email: VALID_EMAIL,
    otp: "123456",
    purpose: PURPOSE,
    attemptCount: 0,
    lastAttemptTime: null,
    isLocked: false,
    lockedUntil: null,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
    ...overrides,
  };
}

describe("OTP Repository – Rate Limiting", () => {
  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // incrementOtpAttempt
  // -------------------------------------------------------------------------
  describe("incrementOtpAttempt", () => {
    test("increments attemptCount from 0 to 1", async () => {
      const doc = mockOtpDoc({ attemptCount: 0 });
      OtpModel.findOneAndUpdate.mockResolvedValue({ ...doc, attemptCount: 1 });

      const result = await incrementOtpAttempt(VALID_EMAIL, PURPOSE);

      expect(OtpModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email: VALID_EMAIL, purpose: PURPOSE },
        {
          $inc: { attemptCount: 1 },
          $set: { lastAttemptTime: expect.any(Date) },
        },
        { new: true }
      );
      expect(result.attemptCount).toBe(1);
    });

    test("increments attemptCount from 1 to 2 and locks email", async () => {
      const doc = mockOtpDoc({ attemptCount: 1 });
      OtpModel.findOneAndUpdate
        .mockResolvedValueOnce({ ...doc, attemptCount: 2 })
        .mockResolvedValueOnce({ isLocked: true });

      const result = await incrementOtpAttempt(VALID_EMAIL, PURPOSE);

      expect(OtpModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
      // First call increments
      expect(OtpModel.findOneAndUpdate).toHaveBeenNthCalledWith(1, expect.any(Object), expect.any(Object), { new: true });
      // Second call locks (because attemptCount >= 2)
      expect(OtpModel.findOneAndUpdate).toHaveBeenNthCalledWith(
        2,
        { email: VALID_EMAIL, purpose: PURPOSE },
        {
          $set: {
            isLocked: true,
            lockedUntil: expect.any(Date),
          },
        }
      );
      expect(result.attemptCount).toBe(2);
    });

    test("sets lastAttemptTime to current time", async () => {
      const beforeCall = new Date();
      OtpModel.findOneAndUpdate.mockResolvedValue(mockOtpDoc({ attemptCount: 1 }));

      await incrementOtpAttempt(VALID_EMAIL, PURPOSE);

      const call = OtpModel.findOneAndUpdate.mock.calls[0];
      const lastAttemptTime = call[1].$set.lastAttemptTime;
      const afterCall = new Date();

      expect(lastAttemptTime).toBeInstanceOf(Date);
      expect(lastAttemptTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(lastAttemptTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    test("locks email for 15 minutes on 2nd attempt", async () => {
      OtpModel.findOneAndUpdate
        .mockResolvedValueOnce({ attemptCount: 2 })
        .mockResolvedValueOnce({ isLocked: true, lockedUntil: new Date() });

      await incrementOtpAttempt(VALID_EMAIL, PURPOSE);

      const lockCall = OtpModel.findOneAndUpdate.mock.calls[1];
      const lockedUntil = lockCall[1].$set.lockedUntil;

      // Should be ~15 minutes from now
      const expectedLockout = 15 * 60 * 1000; // 15 minutes in milliseconds
      const actualLockout = lockedUntil.getTime() - new Date().getTime();

      expect(actualLockout).toBeGreaterThan(14 * 60 * 1000); // At least 14 minutes
      expect(actualLockout).toBeLessThanOrEqual(15 * 60 * 1000 + 1000); // At most 15 min + 1 sec
    });
  });

  // -------------------------------------------------------------------------
  // isOtpLocked
  // -------------------------------------------------------------------------
  describe("isOtpLocked", () => {
    test("returns false when OTP document doesn't exist", async () => {
      OtpModel.findOne.mockResolvedValue(null);

      const result = await isOtpLocked(VALID_EMAIL, PURPOSE);

      expect(result).toBe(false);
    });

    test("returns false when isLocked is false", async () => {
      OtpModel.findOne.mockResolvedValue(mockOtpDoc({ isLocked: false }));

      const result = await isOtpLocked(VALID_EMAIL, PURPOSE);

      expect(result).toBe(false);
    });

    test("returns true when email is currently locked", async () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
      OtpModel.findOne.mockResolvedValue(
        mockOtpDoc({ isLocked: true, lockedUntil: futureTime })
      );

      const result = await isOtpLocked(VALID_EMAIL, PURPOSE);

      expect(result).toBe(true);
    });

    test("returns false and unlocks when lockout period has expired", async () => {
      const pastTime = new Date(Date.now() - 1000); // 1 second ago
      OtpModel.findOne.mockResolvedValue(
        mockOtpDoc({ isLocked: true, lockedUntil: pastTime })
      );
      OtpModel.findOneAndUpdate.mockResolvedValue({
        isLocked: false,
        lockedUntil: null,
        attemptCount: 0,
      });

      const result = await isOtpLocked(VALID_EMAIL, PURPOSE);

      expect(result).toBe(false);
      // Verify it unlocked by calling findOneAndUpdate
      expect(OtpModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email: VALID_EMAIL, purpose: PURPOSE },
        {
          $set: { isLocked: false, lockedUntil: null, attemptCount: 0 },
        }
      );
    });

    test("resets attemptCount to 0 when unlocking", async () => {
      const pastTime = new Date(Date.now() - 1000);
      OtpModel.findOne.mockResolvedValue(
        mockOtpDoc({ isLocked: true, lockedUntil: pastTime, attemptCount: 2 })
      );
      OtpModel.findOneAndUpdate.mockResolvedValue({
        isLocked: false,
        attemptCount: 0,
      });

      await isOtpLocked(VALID_EMAIL, PURPOSE);

      const call = OtpModel.findOneAndUpdate.mock.calls[0];
      expect(call[1].$set.attemptCount).toBe(0);
    });

    test("checks lockout time against current time", async () => {
      const now = new Date();
      const locked5MinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      OtpModel.findOne.mockResolvedValue(
        mockOtpDoc({ isLocked: true, lockedUntil: locked5MinutesFromNow })
      );

      const result = await isOtpLocked(VALID_EMAIL, PURPOSE);

      expect(result).toBe(true);
      expect(OtpModel.findOneAndUpdate).not.toHaveBeenCalled(); // Should not unlock
    });
  });

  // -------------------------------------------------------------------------
  // Integration: attempt flow
  // -------------------------------------------------------------------------
  describe("Rate limiting flow", () => {
    test("simulates full brute force prevention: 1st attempt → delete OTP, 2nd attempt → lock", async () => {
      const otpRecord = mockOtpDoc({ attemptCount: 0 });

      // 1st wrong attempt: increment to 1, delete OTP
      OtpModel.findOneAndUpdate.mockResolvedValueOnce({ ...otpRecord, attemptCount: 1 });
      const result1 = await incrementOtpAttempt(VALID_EMAIL, PURPOSE);
      expect(result1.attemptCount).toBe(1);

      // Now email is not locked yet
      OtpModel.findOne.mockResolvedValueOnce(mockOtpDoc({ isLocked: false }));
      const locked1 = await isOtpLocked(VALID_EMAIL, PURPOSE);
      expect(locked1).toBe(false);

      // 2nd wrong attempt: increment to 2, lock email
      OtpModel.findOneAndUpdate
        .mockResolvedValueOnce({ ...otpRecord, attemptCount: 2 })
        .mockResolvedValueOnce({ isLocked: true });
      const result2 = await incrementOtpAttempt(VALID_EMAIL, PURPOSE);
      expect(result2.attemptCount).toBe(2);

      // Now email should be locked
      const futureTime = new Date(Date.now() + 15 * 60 * 1000);
      OtpModel.findOne.mockResolvedValueOnce(
        mockOtpDoc({ isLocked: true, lockedUntil: futureTime })
      );
      const locked2 = await isOtpLocked(VALID_EMAIL, PURPOSE);
      expect(locked2).toBe(true);
    });
  });
});
