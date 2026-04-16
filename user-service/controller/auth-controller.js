import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail as _findUserByEmail } from "../model/repository.js";
import { formatUserResponse } from "./user-controller.js";

export async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const user = await _findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Wrong email and/or password" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Wrong email and/or password" });
      }

      // F1.1.2 – Block login for unverified email addresses
      if (!user.isEmailVerified) {
        return res.status(403).json({
          message: "Email not verified. Please verify your email before logging in.",
          emailVerificationRequired: true,
        });
      }

      const accessToken = jwt.sign({
        id: user.id,
      }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      return res.status(200).json({ message: "User logged in", data: { accessToken, ...formatUserResponse(user) } });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  } else {
    return res.status(400).json({ message: "Missing email and/or password" });
  }
}

export async function handleVerifyToken(req, res) {
  try {
    const verifiedUser = req.user;
    return res.status(200).json({ message: "Token verified", data: verifiedUser });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function handleGetMe(req, res) {
  try {
    const user = req.user;

    return res.status(200).json({
      message: "User profile fetched",
      data: user,
    }); 
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}