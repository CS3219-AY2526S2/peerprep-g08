import { forgotPassword, resetPassword } from "../../controller/password-reset-controller.js";
import {
  findUserByEmail,
  createOtp,
  findLatestOtpByEmail,
  deleteOtpsByEmail,
  resetPasswordById,
} from "../../model/repository.js";
import { sendPasswordResetEmail } from "../../utils/mailer.js";

jest.mock("../../model/repository.js");
jest.mock("../../utils/mailer.js");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Password Reset Controller", () => {
  afterEach(() => jest.clearAllMocks());

  describe("forgotPassword", () => {
    test("400 – missing email", async () => {
      const req = { body: {} };
      const res = mockRes();
      await forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email is required." });
    });

    test("200 – sends reset OTP if user exists", async () => {
      findUserByEmail.mockResolvedValue({ email: "bob@t.com" });
      createOtp.mockResolvedValue({});
      sendPasswordResetEmail.mockResolvedValue({});

      const req = { body: { email: "bob@t.com" } };
      const res = mockRes();

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(createOtp).toHaveBeenCalledWith("bob@t.com", expect.any(String), "password_reset");
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    test("200 – silent no-op when email is not registered (prevents enumeration)", async () => {
      findUserByEmail.mockResolvedValue(null);
      const req = { body: { email: "fake@t.com" } };
      const res = mockRes();

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(createOtp).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    test("400 – missing required fields", async () => {
      const req = { body: { email: "bob@t.com", otp: "654321" } }; // newPassword missing
      const res = mockRes();
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("400 – weak new password", async () => {
      const req = { body: { email: "bob@t.com", otp: "654321", newPassword: "weak" } };
      const res = mockRes();
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Password must be at least 8 characters long.") }),
      );
    });

    test("404 – user not found", async () => {
      findUserByEmail.mockResolvedValue(null);
      findLatestOtpByEmail.mockResolvedValue({ otp: "654321" });

      const req = { body: { email: "ghost@t.com", otp: "654321", newPassword: "NewStrongPass1!" } };
      const res = mockRes();
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found." });
    });

    test("400 – no OTP record found", async () => {
      findUserByEmail.mockResolvedValue({ id: "u2" });
      findLatestOtpByEmail.mockResolvedValue(null);

      const req = { body: { email: "bob@t.com", otp: "654321", newPassword: "NewStrongPass1!" } };
      const res = mockRes();
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("400 – invalid OTP", async () => {
      findUserByEmail.mockResolvedValue({ id: "u2" });
      findLatestOtpByEmail.mockResolvedValue({ otp: "654321" });

      const req = { body: { email: "bob@t.com", otp: "000000", newPassword: "NewStrongPass1!" } };
      const res = mockRes();
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid OTP." });
    });

    test("200 – successful reset hashes and saves new password", async () => {
      findUserByEmail.mockResolvedValue({ id: "u2", email: "bob@t.com" });
      findLatestOtpByEmail.mockResolvedValue({ otp: "654321" });
      resetPasswordById.mockResolvedValue({});
      deleteOtpsByEmail.mockResolvedValue({});

      const req = { body: { email: "bob@t.com", otp: "654321", newPassword: "NewStrongPass1!" } };
      const res = mockRes();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(resetPasswordById).toHaveBeenCalledWith("u2", expect.any(String));
      expect(deleteOtpsByEmail).toHaveBeenCalledWith("bob@t.com", "password_reset");
    });
  });
});
