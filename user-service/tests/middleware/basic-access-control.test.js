import jwt from "jsonwebtoken";
import { verifyAccessToken, verifyIsAdmin, verifyIsOwnerOrAdmin } from "../../middleware/basic-access-control.js";

// Mock the repository module so tests never touch the database
jest.mock("../../model/repository.js", () => ({
  findUserById: jest.fn(),
}));

import { findUserById } from "../../model/repository.js";

const JWT_SECRET = "test-secret";

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

// ---------------------------------------------------------------------------
// Helper to build a mock Express res object
// ---------------------------------------------------------------------------
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// verifyAccessToken
// ---------------------------------------------------------------------------
describe("verifyAccessToken", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns 401 when Authorization header is missing", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication failed" });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 when token is invalid / malformed", (done) => {
    const req = { headers: { authorization: "Bearer not-a-real-token" } };
    const res = mockRes();
    const next = jest.fn();

    verifyAccessToken(req, res, next);

    // jwt.verify is async via callback; give it a tick to settle
    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Authentication failed" });
      expect(next).not.toHaveBeenCalled();
      done();
    });
  });

  test("returns 401 when user not found in DB after valid token", (done) => {
    const token = jwt.sign({ id: "user-id-123" }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    findUserById.mockResolvedValue(null);

    verifyAccessToken(req, res, next);

    setImmediate(async () => {
      // wait one more tick for the async DB call inside the jwt callback
      await Promise.resolve();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Authentication failed" });
      expect(next).not.toHaveBeenCalled();
      done();
    });
  });

  test("calls next() and populates req.user when token and DB user are valid", (done) => {
    const token = jwt.sign({ id: "user-id-123" }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    const dbUser = {
      id: "user-id-123",
      username: "alice",
      email: "alice@example.com",
      isAdmin: false,
      isEmailVerified: true,
      profilePicture: null,
    };
    findUserById.mockResolvedValue(dbUser);

    verifyAccessToken(req, res, next);

    setImmediate(async () => {
      await Promise.resolve();
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: "user-id-123",
        username: "alice",
        email: "alice@example.com",
        isAdmin: false,
        isEmailVerified: true,
        profilePicture: null,
      });
      done();
    });
  });

  test("populates req.user with profilePicture when one is set", (done) => {
    const token = jwt.sign({ id: "user-id-456" }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    findUserById.mockResolvedValue({
      id: "user-id-456",
      username: "bob",
      email: "bob@example.com",
      isAdmin: false,
      isEmailVerified: true,
      profilePicture: "data:image/png;base64,abc123",
    });

    verifyAccessToken(req, res, next);

    setImmediate(async () => {
      await Promise.resolve();
      expect(next).toHaveBeenCalled();
      expect(req.user.profilePicture).toBe("data:image/png;base64,abc123");
      done();
    });
  });
});

// ---------------------------------------------------------------------------
// verifyIsAdmin
// ---------------------------------------------------------------------------
describe("verifyIsAdmin", () => {
  test("calls next() when user is admin", () => {
    const req = { user: { isAdmin: true } };
    const res = mockRes();
    const next = jest.fn();

    verifyIsAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 403 when user is not admin", () => {
    const req = { user: { isAdmin: false } };
    const res = mockRes();
    const next = jest.fn();

    verifyIsAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized to access this resource",
    });
  });
});

// ---------------------------------------------------------------------------
// verifyIsOwnerOrAdmin
// ---------------------------------------------------------------------------
describe("verifyIsOwnerOrAdmin", () => {
  test("calls next() when user is admin (regardless of id mismatch)", () => {
    const req = {
      user: { isAdmin: true, id: "admin-id" },
      params: { id: "other-user-id" },
    };
    const res = mockRes();
    const next = jest.fn();

    verifyIsOwnerOrAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("calls next() when non-admin user accesses their own resource", () => {
    const req = {
      user: { isAdmin: false, id: "user-id-123" },
      params: { id: "user-id-123" },
    };
    const res = mockRes();
    const next = jest.fn();

    verifyIsOwnerOrAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns 403 when non-admin user accesses someone else's resource", () => {
    const req = {
      user: { isAdmin: false, id: "user-id-123" },
      params: { id: "other-user-id" },
    };
    const res = mockRes();
    const next = jest.fn();

    verifyIsOwnerOrAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized to access this resource",
    });
  });
});
