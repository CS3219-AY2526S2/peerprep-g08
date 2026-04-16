import crypto from "crypto";

import {
  findUserByEmail as _findUserByEmail,
  createUser as _createUser,
  createOtp as _createOtp,
  findLatestOtpByEmail as _findLatestOtpByEmail,
  deleteOtpsByEmail as _deleteOtpsByEmail,
  verifyEmailById as _verifyEmailById,
  updateUserPrivilegeById as _updateUserPrivilegeById,
  incrementOtpAttempt as _incrementOtpAttempt,
  isOtpLocked as _isOtpLocked,
} from "../model/repository.js";

import { sendOtpEmail } from "../utils/mailer.js";

/**
 * POST /auth/send-otp
 * Body: { email }
 *
 * Generates a 6-digit OTP and emails it to the supplied address.
 * The user account must already exist (registered) and must NOT yet be verified.
 */
export async function sendOtp(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // First check if there is a pending registration (OTP with userData)
    const storedOtp = await _findLatestOtpByEmail(email, "email_verification");
    
    // If no pending registration and no existing user, we can't send an OTP
    const user = await _findUserByEmail(email);
    if (!user && (!storedOtp || !storedOtp.userData)) {
      // Return 200 for security – don't reveal whether the email is registered
      return res.status(200).json({ message: "If that email is registered, an OTP has been sent." });
    }

    if (user && user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    // Generate a cryptographically random 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));

    // Preserve userData if it was a pending registration
    const userData = (storedOtp && storedOtp.userData) ? storedOtp.userData : null;

    await _createOtp(email, otp, "email_verification", userData);
    await sendOtpEmail(email, otp);

    return res.status(200).json({ message: "OTP sent to your email address. It expires in 10 minutes." });
  } catch (err) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ message: "Failed to send OTP. Please try again later." });
  }
}

/**
 * POST /auth/verify-otp
 * Body: { email, otp }
 *
 * Verifies the OTP submitted by the user.
 * On success, marks the user's email as verified and removes stored OTPs.
 */
export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    // Check if email is locked due to too many failed attempts
    const isLocked = await _isOtpLocked(email, "email_verification");
    if (isLocked) {
      return res.status(429).json({
        message: "Too many failed attempts. Please try again in 15 minutes.",
      });
    }

    const storedOtp = await _findLatestOtpByEmail(email, "email_verification");
    if (!storedOtp) {
      return res.status(400).json({ message: "No OTP found for this email. Please request a new one." });
    }

    if (storedOtp.otp !== String(otp)) {
      // Increment failed attempt counter
      const updatedOtp = await _incrementOtpAttempt(email, "email_verification");

      // Delete the current OTP so user must request a new one
      await _deleteOtpsByEmail(email, "email_verification");

      // After 2 failures, email is locked
      if (updatedOtp.attemptCount >= 2) {
        return res.status(429).json({
          message: "Too many failed attempts. Email locked for 15 minutes. Please try again later.",
        });
      }

      // After 1st failure, ask for new OTP
      return res.status(400).json({
        message: "Invalid OTP. Please request a new code and try again.",
      });
    }

    // Handle deferred user creation if userData exists in the OTP record
    if (storedOtp.userData && storedOtp.userData.username) {
      const { username, password, isAdmin } = storedOtp.userData;
      
      // Double check uniqueness before final creation (to be safe)
      const existingUser = await _findUserByEmail(email);
      if (existingUser) {
        await _deleteOtpsByEmail(email, "email_verification");
        return res.status(400).json({ message: "User already exists." });
      }

      const createdUser = await _createUser(username, email, password);
      if (isAdmin) {
        await _updateUserPrivilegeById(createdUser.id, true);
      }
      
      // Automatically verify the newly created user
      await _verifyEmailById(createdUser.id);
      await _deleteOtpsByEmail(email, "email_verification");

      return res.status(201).json({ 
        message: "Email verified and account created successfully. You may now log in.",
        username: username 
      });
    }

    // If no userData, handle it as a verification for an already existing user (legacy/normal flow)
    const user = await _findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isEmailVerified) {
      await _deleteOtpsByEmail(email, "email_verification");
      return res.status(400).json({ message: "Email is already verified." });
    }

    await _verifyEmailById(user.id);
    await _deleteOtpsByEmail(email, "email_verification");

    return res.status(200).json({ message: "Email verified successfully. You may now log in." });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ message: "Failed to verify OTP. Please try again later." });
  }
}

