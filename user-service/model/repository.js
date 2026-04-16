import UserModel from "./user-model.js";
import AdminCodeModel from "./admin-code-model.js";
import OtpModel from "./otp-model.js";

import "dotenv/config";
import { connect } from "mongoose";

export async function connectToDB() {
  let mongoDBUri =
    process.env.ENV === "PROD"
      ? process.env.DB_CLOUD_URI
      : process.env.DB_LOCAL_URI;

  await connect(mongoDBUri);
}

export async function createUser(username, email, password) {
  return new UserModel({ username, email, password }).save();
}

export async function findUserByEmail(email) {
  return UserModel.findOne({ email });
}

export async function findUserById(userId) {
  return UserModel.findById(userId);
}

export async function findUserByUsername(username) {
  return UserModel.findOne({ username });
}

export async function findUserByUsernameOrEmail(username, email) {
  return UserModel.findOne({
    $or: [
      { username },
      { email },
    ],
  });
}

export async function findAllUsers() {
  return UserModel.find();
}

export async function updateUserById(userId, username, email, password) {
  // Build the $set object dynamically so undefined fields are not overwritten
  const fields = {};
  if (username !== undefined) fields.username = username;
  if (email !== undefined) fields.email = email;
  if (password !== undefined) fields.password = password;

  return UserModel.findByIdAndUpdate(
    userId,
    { $set: fields },
    { new: true },  // return the updated user
  );
}

export async function updateUserPrivilegeById(userId, isAdmin) {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        isAdmin,
      },
    },
    { new: true },  // return the updated user
  );
}

export async function deleteUserById(userId) {
  return UserModel.findByIdAndDelete(userId);
}

/**
 * Validates that deleting or demoting an admin won't leave the system with zero admins.
 * This function is always called within the admin operation queue to prevent race conditions.
 * @param {string} userId
 * @param {'delete'|'demote'} operation - Type of operation being performed
 * @throws {Error} if operation would leave system with zero admins
 */
export async function validateAdminOperation(userId, operation = "delete") {
  const user = await UserModel.findById(userId);
  if (!user || !user.isAdmin) {
    return user;
  }

  const adminCount = await UserModel.countDocuments({ isAdmin: true });
  if (adminCount === 1) {
    const actionText = operation === "delete" ? "delete" : "demote";
    throw new Error(`Cannot ${actionText} the last admin`);
  }

  return user;
}

export async function createAdminCode(code, createdBy) {
  return new AdminCodeModel({ code, createdBy }).save();
}


export async function findAndUseAdminCode(code) {
  return AdminCodeModel.findOneAndUpdate(
    { code, isUsed: false },
    { $set: { isUsed: true } },
    { new: true }
  );
}

// ---------------------------------------------------------------------------
// OTP functions (F1.1.2 – email confirmation, F3.3.2 – password reset)
// ---------------------------------------------------------------------------

/**
 * Deletes all existing OTPs for (email, purpose) then saves a new one.
 * @param {string} email
 * @param {string} otp
 * @param {'email_verification'|'purpose_reset'} purpose
 * @param {object} [userData] - Optional registration data for account verification
 */
export async function createOtp(email, otp, purpose = "email_verification", userData = null) {
  await OtpModel.deleteMany({ email, purpose });
  return new OtpModel({ email, otp, purpose, userData }).save();
}

/**
 * Finds the most recent unexpired OTP for the given email and purpose.
 * @param {string} email
 * @param {'email_verification'|'password_reset'} purpose
 */
export async function findLatestOtpByEmail(email, purpose = "email_verification") {
  return OtpModel.findOne({ email, purpose }).sort({ createdAt: -1 });
}

/**
 * Removes all OTP documents for a given (email, purpose).
 * @param {string} email
 * @param {'email_verification'|'password_reset'} [purpose] - omit to delete all purposes
 */
export async function deleteOtpsByEmail(email, purpose) {
  const filter = purpose ? { email, purpose } : { email };
  return OtpModel.deleteMany(filter);
}

/**
 * Increments the failed attempt count for an OTP and potentially locks it.
 * Returns the updated OTP document.
 * @param {string} email
 * @param {'email_verification'|'password_reset'} purpose
 * @returns {object} Updated OTP document with incremented attemptCount
 */
export async function incrementOtpAttempt(email, purpose = "email_verification") {
  const now = new Date();
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

  const otp = await OtpModel.findOneAndUpdate(
    { email, purpose },
    {
      $inc: { attemptCount: 1 },
      $set: { lastAttemptTime: now },
    },
    { new: true }
  );

  // If this is the 2nd failed attempt, lock the email
  if (otp && otp.attemptCount >= 2) {
    await OtpModel.findOneAndUpdate(
      { email, purpose },
      {
        $set: {
          isLocked: true,
          lockedUntil: new Date(now.getTime() + lockoutDuration),
        },
      }
    );
  }

  return otp;
}

/**
 * Checks if an email is currently locked for OTP verification.
 * Unlocks if lockout period has expired.
 * @param {string} email
 * @param {'email_verification'|'password_reset'} purpose
 * @returns {boolean} true if email is locked, false otherwise
 */
export async function isOtpLocked(email, purpose = "email_verification") {
  const otp = await OtpModel.findOne({ email, purpose });

  if (!otp || !otp.isLocked) {
    return false;
  }

  const now = new Date();

  // If lockout period has expired, unlock
  if (otp.lockedUntil && otp.lockedUntil <= now) {
    await OtpModel.findOneAndUpdate(
      { email, purpose },
      {
        $set: { isLocked: false, lockedUntil: null, attemptCount: 0 },
      }
    );
    return false;
  }

  return true;
}

/**
 * Marks the user's email as verified.
 */
export async function verifyEmailById(userId) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $set: { isEmailVerified: true } },
    { new: true }
  );
}

// ---------------------------------------------------------------------------
// Profile picture (F3.1.2 / F3.2.3)
// ---------------------------------------------------------------------------

/**
 * Saves a base64-encoded profile picture for a user.
 * @param {string} userId
 * @param {string} base64DataUri  e.g. "data:image/jpeg;base64,..."
 */
export async function updateUserProfilePicture(userId, base64DataUri) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $set: { profilePicture: base64DataUri } },
    { new: true }
  );
}

// ---------------------------------------------------------------------------
// Password reset (F3.3)
// ---------------------------------------------------------------------------

/**
 * Sets a new (already hashed) password for the given user.
 * @param {string} userId
 * @param {string} hashedPassword
 */
export async function resetPasswordById(userId, hashedPassword) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $set: { password: hashedPassword } },
    { new: true }
  );
}

// ---------------------------------------------------------------------------
// Admin management (F2.2.3 – prevent last admin deletion)
// ---------------------------------------------------------------------------

/**
 * Counts the total number of active admins in the system.
 * @returns {number} Count of users with isAdmin=true
 */
export async function countAdmins() {
  return UserModel.countDocuments({ isAdmin: true });
}
