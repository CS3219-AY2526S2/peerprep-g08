import bcrypt from "bcrypt";
import crypto from "crypto";
import { isValidObjectId } from "mongoose";

import {
  createUser as _createUser,
  deleteUserById as _deleteUserById,
  validateAdminOperation as _validateAdminOperation,
  findAllUsers as _findAllUsers,
  findUserByEmail as _findUserByEmail,
  findUserById as _findUserById,
  findUserByUsername as _findUserByUsername,
  findUserByUsernameOrEmail as _findUserByUsernameOrEmail,
  updateUserById as _updateUserById,
  updateUserPrivilegeById as _updateUserPrivilegeById,
  createAdminCode as _createAdminCode,
  findAndUseAdminCode as _findAndUseAdminCode,
  updateUserProfilePicture as _updateUserProfilePicture,
} from "../model/repository.js";
import { queueAdminOperation } from "../utils/admin-operation-queue.js";
import jwt from "jsonwebtoken";

import { isValidEmail, validatePassword, validateUsername } from "../utils/validators.js";
import { bufferToDataUri } from "../middleware/profile-picture-upload.js";
import { createOtp as _createOtp } from "../model/repository.js";
import { sendOtpEmail } from "../utils/mailer.js";


export async function createUser(req, res) {
  try {
    const { username, email, password, code } = req.body;
    console.log(`[USER-SERVICE] Registration request received for: ${username} (${email})`);

    if (username && email && password) {
      // F1.1.1 – Validate email format
      if (!isValidEmail(email)) {
        console.warn(`[USER-SERVICE] Registration failed: Invalid email format (${email})`);
        return res.status(400).json({ message: "Invalid email format." });
      }

      // F3.2.1 – Validate username format
      const unValidation = validateUsername(username);
      if (!unValidation.valid) {
        console.warn(`[USER-SERVICE] Registration failed: Invalid username (${username}) - ${unValidation.message}`);
        return res.status(400).json({ message: unValidation.message });
      }

      // F1.2 – Validate password strength
      const pwValidation = validatePassword(password);
      if (!pwValidation.valid) {
        console.warn(`[USER-SERVICE] Registration failed: Weak password for user ${username}`);
        return res.status(400).json({ message: pwValidation.message });
      }

      // F1.1.1 – Uniqueness check
      const existingUser = await _findUserByUsernameOrEmail(username, email);
      if (existingUser) {
        console.warn(`[USER-SERVICE] Registration failed: Username or email already exists (${username}/${email})`);
        return res.status(409).json({ message: "username or email already exists" });
      }

      let isAdmin = false;
      if (code) {
        const adminCode = await _findAndUseAdminCode(code);
        if (!adminCode) {
          console.warn(`[USER-SERVICE] Registration failed: Invalid admin code (${code})`);
          return res.status(400).json({ message: "Invalid or expired admin code" });
        }
        isAdmin = true;
      }

      console.log(`[USER-SERVICE] Processing registration for ${username}...`);
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Generate OTP and store user details in the OTP record INSTEAD of the user collection
      try {
        const otp = String(crypto.randomInt(100000, 999999));
        
        const userData = {
          username,
          password: hashedPassword,
          isAdmin: isAdmin
        };

        console.log(`[USER-SERVICE] Saving temporary registration and generating OTP...`);
        await _createOtp(email, otp, "email_verification", userData);
        
        console.log(`[USER-SERVICE] Calling mailer to send OTP code...`);
        await sendOtpEmail(email, otp);

        console.log(`[USER-SERVICE] Registration initiation successful for ${username}.`);
        return res.status(201).json({
          message: `Registration initiated for ${username}. Please check your email for the verification code.`,
          data: { username, email }, // Return basic info, user ID doesn't exist yet
        });
      } catch (otpErr) {
        console.error("[USER-SERVICE] Error during OTP/Temporary registration phase:", otpErr);
        return res.status(500).json({
          message: "Failed to start registration process. Please try again later.",
        });
      }
    } else {
      console.warn("[USER-SERVICE] Registration failed: Missing required fields");
      return res.status(400).json({ message: "username and/or email and/or password are missing" });
    }
  } catch (err) {
    console.error("[USER-SERVICE] Unexpected Create User Error:", err);
    return res.status(500).json({ message: err.message || "Unknown error when creating new user!" });
  }
}

export async function getUser(req, res) {
  try {
    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    } else {
      return res.status(200).json({ message: `Found user`, data: formatUserResponse(user) });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting user!" });
  }
}

export async function getAllUsers(req, res) {
  try {
    const users = await _findAllUsers();

    return res.status(200).json({ message: `Found users`, data: users.map(formatUserResponse) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting all users!" });
  }
}

export async function updateUser(req, res) {
  try {
    const { username, email, password } = req.body;
    if (username || email || password) {
      const userId = req.params.id;
      if (!isValidObjectId(userId)) {
        return res.status(404).json({ message: `User ${userId} not found` });
      }
      const user = await _findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: `User ${userId} not found` });
      }

      // F1.1.1 – Validate updated email format
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      // F3.2.1 – Validate updated username format
      if (username) {
        const unValidation = validateUsername(username);
        if (!unValidation.valid) {
          return res.status(400).json({ message: unValidation.message });
        }
      }

      // F1.2 – Validate updated password strength
      if (password) {
        const pwValidation = validatePassword(password);
        if (!pwValidation.valid) {
          return res.status(400).json({ message: pwValidation.message });
        }
      }

      if (username || email) {
        let existingUser = await _findUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: "username already exists" });
        }
        existingUser = await _findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: "email already exists" });
        }
      }

      let hashedPassword;
      if (password) {
        const salt = bcrypt.genSaltSync(10);
        hashedPassword = bcrypt.hashSync(password, salt);
      }
      const updatedUser = await _updateUserById(userId, username, email, hashedPassword);
      return res.status(200).json({
        message: `Updated data for user ${userId}`,
        data: formatUserResponse(updatedUser),
      });
    } else {
      return res.status(400).json({ message: "No field to update: username and email and password are all missing!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user!" });
  }
}

export async function updateUserPrivilege(req, res) {
  try {
    const { isAdmin } = req.body;

    if (isAdmin !== undefined) {  // isAdmin can have boolean value true or false
      const userId = req.params.id;
      if (!isValidObjectId(userId)) {
        return res.status(404).json({ message: `User ${userId} not found` });
      }
      const user = await _findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: `User ${userId} not found` });
      }

      if (req.user.id === userId && isAdmin === false) {
          return res.status(403).json({
              message: "Cannot remove own admin privileges!",
          });
      }

      // Demotion operations (admin -> non-admin) are queued to prevent race conditions
      // Promotion operations don't need queuing
      if (user.isAdmin && isAdmin === false) {
        // Attempting to demote an admin - queue it to prevent race conditions
        try {
          let updatedUser;
          await queueAdminOperation(async () => {
            // Validate that demotion won't leave system with zero admins
            await _validateAdminOperation(userId, "demote");
            // Now update privilege
            updatedUser = await _updateUserPrivilegeById(userId, false);
          });
          return res.status(200).json({
            message: `Updated privilege for user ${userId}`,
            data: formatUserResponse(updatedUser),
          });
        } catch (err) {
          if (err.message.includes("Cannot demote the last admin")) {
            return res.status(403).json({
              message: "Cannot demote the last admin. Promote another user to admin before demoting this one.",
            });
          }
          throw err;
        }
      } else {
        // Promotion or no-op (already has same privilege)
        const updatedUser = await _updateUserPrivilegeById(userId, isAdmin === true);
        return res.status(200).json({
          message: `Updated privilege for user ${userId}`,
          data: formatUserResponse(updatedUser),
        });
      }
    } else {
      return res.status(400).json({ message: "isAdmin is missing!" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user privilege!" });
  }
}

export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    const requesterId = req.user.id;

    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    // Prevent admins from deleting themselves
    if (user.isAdmin && userId === requesterId) {
      return res.status(403).json({
        message: "Cannot delete yourself as an admin. Ask another admin to remove your privileges first.",
      });
    }

    // Admin deletions are queued to prevent race conditions
    // Non-admin deletions are direct (no need for queue)
    if (user.isAdmin) {
      try {
        await queueAdminOperation(async () => {
          // Validate that deletion won't leave system with zero admins
          await _validateAdminOperation(userId, "delete");
          // Now delete
          await _deleteUserById(userId);
        });
      } catch (err) {
        if (err.message.includes("Cannot delete the last admin")) {
          return res.status(403).json({
            message: "Cannot delete the last admin. Promote another user to admin before removing this one.",
          });
        }
        throw err;
      }
    } else {
      // Non-admin deletion is direct
      await _deleteUserById(userId);
    }

    return res.status(200).json({ message: `Deleted user ${userId} successfully` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when deleting user!" });
  }
}

export function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    isEmailVerified: user.isEmailVerified,
    profilePicture: user.profilePicture ?? null,
    createdAt: user.createdAt,
  };
}

/**
 * PATCH /users/:id/profile-picture
 * Multipart form-data field: profilePicture (image/jpeg or image/png, max 2 MB)
 *
 * Stores the uploaded image as a base64 data URI in MongoDB.
 */
export async function updateProfilePicture(req, res) {
  try {
    const userId = req.params.id;

    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No profile picture file provided." });
    }

    const dataUri = bufferToDataUri(req.file);
    const updatedUser = await _updateUserProfilePicture(userId, dataUri);

    return res.status(200).json({
      message: `Profile picture updated for user ${userId}`,
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating profile picture!" });
  }
}

export async function generateAdminCode(req, res) {
  try {
    const adminId = req.user.id;
    const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 char OTP

    await _createAdminCode(code, adminId);

    return res.status(201).json({
      message: "Admin signup code generated successfully",
      data: { code },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when generating admin code!" });
  }
}

export async function upgradeUserToAdmin(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ message: "Admin code is required" });
    }

    const adminCode = await _findAndUseAdminCode(code);
    if (!adminCode) {
      return res.status(400).json({ message: "Invalid or expired admin code" });
    }

    const updatedUser = await _updateUserPrivilegeById(userId, true);
    return res.status(200).json({
      message: `User ${updatedUser.username} upgraded to admin successfully`,
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when upgrading user!" });
  }
}


