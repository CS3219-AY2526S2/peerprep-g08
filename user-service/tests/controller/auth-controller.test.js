import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { handleLogin, handleVerifyToken, handleGetMe } from "../../controller/auth-controller.js";

// Mock repository and user-controller helpers
jest.mock("../../model/repository.js", () => ({
  findUserByEmail: jest.fn(),
}));

// formatUserResponse is imported by auth-controller from user-controller; mock that module
jest.mock("../../controller/user-controller.js", () => ({
  formatUserResponse: jest.fn((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    isEmailVerified: user.isEmailVerified,
    profilePicture: user.profilePicture ?? null,
    createdAt: user.createdAt,
  })),
}));

import { findUserByEmail } from "../../model/repository.js";

const JWT_SECRET = "test-secret";

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Precanned user objects
async function makeUser(overrides = {}) {
  const plainPassword = overrides.plainPassword ?? "ValidPass1!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  return {
    id: "user-1",
    username: "alice",
    email: "alice@test.com",
    password: hashedPassword,
    isAdmin: false,
    isEmailVerified: true,   // verified by default – needed to pass login guard
    profilePicture: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// handleLogin
// ---------------------------------------------------------------------------
describe("handleLogin", () => {
  test("400 – email or password missing", async () => {
    const req = { body: { email: "test@test.com" } }; // password missing
    const res = mockRes();
    await handleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing email and/or password" });
  });

  test("401 – user not found", async () => {
    findUserByEmail.mockResolvedValue(null);
    const req = { body: { email: "nobody@test.com", password: "pass" } };
    const res = mockRes();
    await handleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Wrong email and/or password" });
  });

  test("401 – password does not match", async () => {
    const user = await makeUser();
    findUserByEmail.mockResolvedValue(user);
    const req = { body: { email: "alice@test.com", password: "WrongPass9!" } };
    const res = mockRes();
    await handleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Wrong email and/or password" });
  });

  // F1.1.2 – email verification gate
  test("403 – email not yet verified", async () => {
    const user = await makeUser({ isEmailVerified: false });
    findUserByEmail.mockResolvedValue(user);
    const req = { body: { email: "alice@test.com", password: "ValidPass1!" } };
    const res = mockRes();
    await handleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expect(body.emailVerificationRequired).toBe(true);
  });

  test("200 – successful login returns accessToken", async () => {
    const plainPassword = "ValidPass1!";
    const user = await makeUser({ plainPassword, isEmailVerified: true });
    findUserByEmail.mockResolvedValue(user);
    const req = { body: { email: "alice@test.com", password: plainPassword } };
    const res = mockRes();
    await handleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe("User logged in");
    expect(body.data).toHaveProperty("accessToken");
    const decoded = jwt.verify(body.data.accessToken, JWT_SECRET);
    expect(decoded.id).toBe("user-1");
  });

  test("500 – repository throws", async () => {
    findUserByEmail.mockRejectedValue(new Error("DB error"));
    const req = { body: { email: "alice@test.com", password: "ValidPass1!" } };
    const res = mockRes();
    await handleLogin(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// handleVerifyToken
// ---------------------------------------------------------------------------
describe("handleVerifyToken", () => {
  test("200 – returns the verified user from req.user", async () => {
    const user = { id: "u1", username: "test", email: "t@t.com", isAdmin: false };
    const req = { user };
    const res = mockRes();
    await handleVerifyToken(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Token verified", data: user });
  });
});

// ---------------------------------------------------------------------------
// handleGetMe
// ---------------------------------------------------------------------------
describe("handleGetMe", () => {
  test("200 – returns full profile including profilePicture", async () => {
    const user = {
      id: "u1",
      username: "alice",
      email: "alice@test.com",
      isAdmin: false,
      isEmailVerified: true,
      profilePicture: "data:image/png;base64,abc123",
    };
    const req = { user };
    const res = mockRes();
    await handleGetMe(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "User profile fetched", data: user });
  });

  test("200 – returns null profilePicture when none is set", async () => {
    const user = {
      id: "u2",
      username: "bob",
      email: "bob@test.com",
      isAdmin: false,
      isEmailVerified: true,
      profilePicture: null,
    };
    const req = { user };
    const res = mockRes();
    await handleGetMe(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.profilePicture).toBeNull();
  });
});
