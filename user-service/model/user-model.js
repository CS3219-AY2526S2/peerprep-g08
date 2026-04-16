import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UserModelSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Setting default to the current date/time
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  // F3.1.2 – Profile picture stored as a base64 data URI (jpg/png, max 2 MB)
  profilePicture: {
    type: String,
    default: null,
  },
});

export default mongoose.model("UserModel", UserModelSchema);
