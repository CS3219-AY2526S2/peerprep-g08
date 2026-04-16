import multer from "multer";

/**
 * Multer middleware for profile picture uploads (F3.2.3).
 *
 * Policy:
 *  - Memory storage (buffer is converted to base64 before saving to MongoDB)
 *  - Accepted MIME types: image/jpeg, image/png
 *  - Maximum file size: 2 MB
 */

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG and PNG images are allowed."), false);
  }
}

/**
 * Single-file upload middleware for the 'profilePicture' field.
 * Attach to routes as: `uploadProfilePicture, handleProfilePictureError`
 */
export const uploadProfilePicture = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
}).single("profilePicture");

/**
 * Express error handler for multer errors.
 * Must be used as the middleware immediately AFTER uploadProfilePicture.
 */
export function handleProfilePictureError(err, req, res, next) {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Profile picture must not exceed 2 MB." });
    }
    return res.status(400).json({ message: err.message || "Invalid file upload." });
  }
  next();
}

/**
 * Converts the multer memory buffer to a base64 data URI string.
 * Call this inside your controller after the upload middleware succeeds.
 *
 * @param {Express.Multer.File} file - req.file from multer
 * @returns {string}  e.g. "data:image/jpeg;base64,/9j/4AAQ..."
 */
export function bufferToDataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}
