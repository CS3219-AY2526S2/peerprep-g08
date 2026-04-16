import bcrypt from "bcrypt";
import crypto from "crypto";

import {
  findUserByEmail as _findUserByEmail,
  createOtp as _createOtp,
  findLatestOtpByEmail as _findLatestOtpByEmail,
  deleteOtpsByEmail as _deleteOtpsByEmail,
  resetPasswordById as _resetPasswordById,
} from "../model/repository.js";

import { sendPasswordResetEmail } from "../utils/mailer.js";
import { validatePassword } from "../utils/validators.js";

/**
 * POST /auth/forgot-password
 * Body: { email }
 *
 * F3.3.1 – Entry point available at the login screen.
 * F3.3.2 – Sends a 6-digit OTP to the registered email to authenticate the reset request.
 *
 * For security, always returns 200 regardless of whether the email is in the system
 * so that attackers cannot enumerate registered addresses.
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await _findUserByEmail(email);

    if (user) {
      // Generate a cryptographically random 6-digit OTP
      const otp = String(crypto.randomInt(100000, 999999));
      await _createOtp(email, otp, "password_reset");
      await sendPasswordResetEmail(email, otp);
    }

    // Always respond the same way to prevent email enumeration
    return res.status(200).json({
      message: "If that email is registered, a password reset OTP has been sent. It expires in 10 minutes.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Failed to send reset OTP. Please try again later." });
  }
}

/**
 * POST /auth/reset-password
 * Body: { email, otp, newPassword }
 *
 * F3.3.2 – Validates the OTP before allowing the password change.
 *
 * On success:
 *   1. OTP is consumed and deleted.
 *   2. New password is hashed and saved.
 */
export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are all required." });
    }

    // F1.2 – Enforce password policy on the new password
    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.valid) {
      return res.status(400).json({ message: pwValidation.message });
    }

    const user = await _findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // F3.3.2 – Verify the OTP (scoped to password_reset)
    const storedOtp = await _findLatestOtpByEmail(email, "password_reset");
    if (!storedOtp) {
      return res.status(400).json({
        message: "No password reset OTP found for this email. Please request a new one.",
      });
    }

    if (storedOtp.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    // OTP is valid – hash the new password and save it
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await _resetPasswordById(user.id, hashedPassword);
    await _deleteOtpsByEmail(email, "password_reset");

    return res.status(200).json({ message: "Password reset successfully. You may now log in with your new password." });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Failed to reset password. Please try again later." });
  }
}
