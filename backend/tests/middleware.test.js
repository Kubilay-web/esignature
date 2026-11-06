// Security middleware and error mapping, tested without a server.
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { sanitizeBody, csrfProtection } = require("../middleware/security");
const { HttpError, handleError } = require("../utils/httpError");

// Minimal Express-like response double
const mockRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

describe("sanitizeBody (NoSQL injection)", () => {
  it("removes $ operators and dotted keys at any depth", () => {
    const req = {
      body: {
        email: { $ne: null },
        password: "x",
        nested: { ok: 1, "a.b": 2, list: [{ $where: "1" }, "keep"] },
      },
    };
    let called = false;
    sanitizeBody(req, mockRes(), () => (called = true));

    assert.equal(called, true);
    assert.deepEqual(req.body, { email: {}, password: "x", nested: { ok: 1, list: [{}, "keep"] } });
  });
});

describe("csrfProtection", () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = "http://localhost:5173";
  });

  const run = (method, origin) => {
    const req = { method, get: (h) => (h === "origin" ? origin : undefined) };
    const res = mockRes();
    let passed = false;
    csrfProtection(req, res, () => (passed = true));
    return { passed, res };
  };

  it("allows safe methods from anywhere", () => {
    assert.equal(run("GET", "http://evil.example").passed, true);
  });

  it("allows state changes from the frontend origin or without an Origin header", () => {
    assert.equal(run("POST", "http://localhost:5173").passed, true);
    assert.equal(run("POST", undefined).passed, true);
  });

  it("blocks state changes from another origin", () => {
    const { passed, res } = run("POST", "http://evil.example");
    assert.equal(passed, false);
    assert.equal(res.statusCode, 403);
  });
});

describe("handleError", () => {
  it("passes HttpError status and message through", () => {
    const res = mockRes();
    handleError(res, new HttpError(409, "Kapalı"));
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, "Kapalı");
  });

  it("maps validation errors to 400 with the first message", () => {
    const err = new mongoose.Error.ValidationError();
    err.addError("title", new mongoose.Error.ValidatorError({ message: "Başlık zorunludur." }));
    const res = mockRes();
    handleError(res, err);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Başlık zorunludur.");
  });

  it("hides unexpected errors behind a generic 500", (t) => {
    t.mock.method(console, "error", () => {});
    const res = mockRes();
    handleError(res, new Error("connection string leaked"), "Belge yüklenemedi.");
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Belge yüklenemedi.");
  });
});
