import mongoose from "mongoose";

const Schema = mongoose.Schema;

/**
 * Stores a one-time password (OTP) for email verification or password reset.
 * Each document expires automatically via MongoDB TTL index after 10 minutes.
 */
const OtpModelSchema = new Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  /**
   * purpose: discriminates between OTP flows so they cannot cross-pollinate.
   *   'email_verification' – confirming a new account's email address (F1.1.2)
   *   'password_reset'     – authenticating a forgot-password request (F3.3.2)
   */
  purpose: {
    type: String,
    enum: ["email_verification", "password_reset"],
    required: true,
    default: "email_verification",
  },
  /**
   * Optional field to store user data during the 'email_verification' flow.
   * This allows us to defer user creation until the email is actually verified.
   */
  userData: {
    username: String,
    password: { type: String },
    isAdmin: { type: Boolean, default: false },
  },
  /**
   * Track failed verification attempts to implement rate limiting.
   * - 1st failure: delete OTP, require new send
   * - 2nd failure: lock email for 15 minutes
   */
  attemptCount: {
    type: Number,
    default: 0,
  },
  lastAttemptTime: {
    type: Date,
    default: null,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  // TTL index: MongoDB will automatically delete documents after 600 seconds (10 min)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

export default mongoose.model("OtpModel", OtpModelSchema);
