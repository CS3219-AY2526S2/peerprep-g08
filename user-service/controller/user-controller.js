import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { isValidObjectId } from "mongoose";

import {
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
  createOtp as _createOtp
} from "../model/repository.js";
import { queueAdminOperation } from "../utils/admin-operation-queue.js";

import { isValidEmail, validatePassword, validateUsername } from "../utils/validators.js";
import { bufferToDataUri } from "../middleware/profile-picture-upload.js";
import { sendOtpEmail } from "../utils/mailer.js";

const ADMIN_OPERATION_CONFLICTS = {
  demote: {
    errorText: "Cannot demote the last admin",
    responseMessage: "Cannot demote the last admin. Promote another user to admin before demoting this one.",
  },
  delete: {
    errorText: "Cannot delete the last admin",
    responseMessage: "Cannot delete the last admin. Promote another user to admin before removing this one.",
  },
};

async function executeAdminOperation(userId, operation, mutation, ...mutationArgs) {
  let result;

  try {
    await queueAdminOperation(async () => {
      await _validateAdminOperation(userId, operation);
      result = await mutation(userId, ...mutationArgs);
    });

    return { result };
  } catch (err) {
    const conflict = ADMIN_OPERATION_CONFLICTS[operation];
    if (err.message.includes(conflict.errorText)) {
      return { conflictMessage: conflict.responseMessage };
    }

    throw err;
  }
}

function getRegistrationValidationError({ username, email, password }) {
  const usernameValidation = validateUsername(username);
  const passwordValidation = validatePassword(password);

  return [
    {
      invalid: [username, email, password].some((field) => !field),
      message: "username and/or email and/or password are missing",
    },
    { invalid: !isValidEmail(email), message: "Invalid email format." },
    { invalid: !usernameValidation.valid, message: usernameValidation.message },
    { invalid: !passwordValidation.valid, message: passwordValidation.message },
  ].find(({ invalid }) => invalid)?.message;
}

async function initiateEmailVerification({ username, email, hashedPassword, isAdmin }, res) {
  try {
    const otp = String(crypto.randomInt(100000, 999999));
    const userData = {
      username,
      password: hashedPassword,
      isAdmin,
    };

    console.log("[USER-SERVICE] Saving temporary registration and generating OTP...");
    await _createOtp(email, otp, "email_verification", userData);

    console.log("[USER-SERVICE] Calling mailer to send OTP code...");
    await sendOtpEmail(email, otp);

    console.log(`[USER-SERVICE] Registration initiation successful for ${username}.`);
    return res.status(201).json({
      message: `Registration initiated for ${username}. Please check your email for the verification code.`,
      data: { username, email },
    });
  } catch (err) {
    console.error("[USER-SERVICE] Error during OTP/Temporary registration phase:", err);
    return res.status(500).json({
      message: "Failed to start registration process. Please try again later.",
    });
  }
}

async function findRequestedUser(userId, res) {
  if (!isValidObjectId(userId)) {
    res.status(404).json({ message: `User ${userId} not found` });
    return null;
  }

  const user = await _findUserById(userId);
  if (!user) {
    res.status(404).json({ message: `User ${userId} not found` });
    return null;
  }

  return user;
}

export async function createUser(req, res) {
  try {
    const { username, email, password, code } = req.body;
    console.log(`[USER-SERVICE] Registration request received for: ${username} (${email})`);

    const validationError = getRegistrationValidationError({ username, email, password });
    if (validationError) {
      console.warn(`[USER-SERVICE] Registration failed for ${username}: ${validationError}`);
      return res.status(400).json({ message: validationError });
    }

    const existingUser = await _findUserByUsernameOrEmail(username, email);
    if (existingUser) {
      console.warn(`[USER-SERVICE] Registration failed: Username or email already exists (${username}/${email})`);
      return res.status(409).json({ message: "username or email already exists" });
    }

    const adminCode = code ? await _findAndUseAdminCode(code) : null;
    if (code && !adminCode) {
      console.warn(`[USER-SERVICE] Registration failed: Invalid admin code (${code})`);
      return res.status(400).json({ message: "Invalid or expired admin code" });
    }

    console.log(`[USER-SERVICE] Processing registration for ${username}...`);
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    return initiateEmailVerification({
      username,
      email,
      hashedPassword,
      isAdmin: Boolean(adminCode),
    }, res);
  } catch (err) {
    console.error("[USER-SERVICE] Unexpected Create User Error:", err);
    return res.status(500).json({ message: err.message || "Unknown error when creating new user!" });
  }
}

export async function getUser(req, res) {
  try {
    const userId = req.params.id;
    const user = await findRequestedUser(userId, res);
    if (!user) {
      return res;
    }

    return res.status(200).json({ message: `Found user`, data: formatUserResponse(user) });
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

function getUserUpdateValidationError({ username, email, password }) {
  const usernameValidation = validateUsername(username);
  const passwordValidation = validatePassword(password);
  const validations = [
    { provided: email, valid: isValidEmail(email), message: "Invalid email format." },
    { provided: username, ...usernameValidation },
    { provided: password, ...passwordValidation },
  ];

  return validations.find(({ provided, valid }) => provided && !valid)?.message ?? null;
}

async function getUserUpdateConflict({ username, email, userId }) {
  const checks = [
    { value: username, findUser: _findUserByUsername, message: "username already exists" },
    { value: email, findUser: _findUserByEmail, message: "email already exists" },
  ];

  for (const check of checks.filter(({ value }) => value)) {
    const matchingUser = await check.findUser(check.value);
    if (matchingUser && matchingUser.id !== userId) {
      return check.message;
    }
  }

  return null;
}

function hashPassword(password) {
  if (!password) {
    return undefined;
  }

  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export async function updateUser(req, res) {
  try {
    const { username, email, password } = req.body;

    const updateFields = [username, email, password];
    if (updateFields.every((field) => !field)) {
      return res.status(400).json({ message: "No field to update: username and email and password are all missing!" });
    }

    const userId = req.params.id;
    const user = await findRequestedUser(userId, res);
    if (!user) {
      return res;
    }

    const validationError = getUserUpdateValidationError({ username, email, password });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const conflict = await getUserUpdateConflict({ username, email, userId });
    if (conflict) {
      return res.status(409).json({ message: conflict });
    }

    const hashedPassword = hashPassword(password);

    const updatedUser = await _updateUserById(userId, username, email, hashedPassword);
    return res.status(200).json({
      message: `Updated data for user ${userId}`,
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user!" });
  }
}

export async function updateUserPrivilege(req, res) {
  try {
    const { isAdmin } = req.body;

    // Refatorado: Early Return para verificar ausência de isAdmin logo de cara
    if (isAdmin === undefined) {
      return res.status(400).json({ message: "isAdmin is missing!" });
    }

    const userId = req.params.id;
    const user = await findRequestedUser(userId, res);
    if (!user) {
      return res;
    }

    if (req.user.id === userId && isAdmin === false) {
        return res.status(403).json({
            message: "Cannot remove own admin privileges!",
        });
    }

    let updatedUser;

    if (user.isAdmin && isAdmin === false) {
      const operation = await executeAdminOperation(
        userId,
        "demote",
        _updateUserPrivilegeById,
        false,
      );

      if (operation.conflictMessage) {
        return res.status(403).json({ message: operation.conflictMessage });
      }

      updatedUser = operation.result;
    } else {
      updatedUser = await _updateUserPrivilegeById(userId, isAdmin === true);
    }

    return res.status(200).json({
      message: `Updated privilege for user ${userId}`,
      data: formatUserResponse(updatedUser),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user privilege!" });
  }
}

export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    const requesterId = req.user.id;

    const user = await findRequestedUser(userId, res);
    if (!user) {
      return res;
    }

    // Prevent admins from deleting themselves
    if (user.isAdmin && userId === requesterId) {
      return res.status(403).json({
        message: "Cannot delete yourself as an admin. Ask another admin to remove your privileges first.",
      });
    }

    if (user.isAdmin) {
      const operation = await executeAdminOperation(userId, "delete", _deleteUserById);

      if (operation.conflictMessage) {
        return res.status(403).json({ message: operation.conflictMessage });
      }
    } else {
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

    const user = await findRequestedUser(userId, res);
    if (!user) {
      return res;
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
