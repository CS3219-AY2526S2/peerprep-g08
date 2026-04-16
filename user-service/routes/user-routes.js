import express from "express";

import {
  createUser,
  deleteUser,
  getAllUsers,
  getUser,
  updateUser,
  updateUserPrivilege,
  generateAdminCode,
  upgradeUserToAdmin,
  updateProfilePicture,
} from "../controller/user-controller.js";

import { verifyAccessToken, verifyIsAdmin, verifyIsOwnerOrAdmin } from "../middleware/basic-access-control.js";
import { uploadProfilePicture, handleProfilePictureError } from "../middleware/profile-picture-upload.js";

const router = express.Router();

router.get("/", verifyAccessToken, verifyIsAdmin, getAllUsers);

router.patch("/:id/privilege", verifyAccessToken, verifyIsAdmin, updateUserPrivilege);

router.post("/admin-code", verifyAccessToken, verifyIsAdmin, generateAdminCode);

router.patch("/upgrade", verifyAccessToken, upgradeUserToAdmin);

router.post("/", createUser);

router.get("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, getUser);

router.patch("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, updateUser);

router.delete("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, deleteUser);

// F3.1.2 / F3.2.3 – Profile picture upload (jpg/png, max 2 MB)
router.patch(
  "/:id/profile-picture",
  verifyAccessToken,
  verifyIsOwnerOrAdmin,
  uploadProfilePicture,
  handleProfilePictureError,
  updateProfilePicture,
);

export default router;
