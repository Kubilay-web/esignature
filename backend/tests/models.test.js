// Model rules, tested in memory (no database connection needed).
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const OtpCode = require("../models/OtpCode");

const id = () => new mongoose.Types.ObjectId();

const makeDocument = (signers) => {
  const sender = id();
  return new Document({
    title: "Test",
    sender,
    senderName: "Gönderen",
    dueDate: new Date(),
    signers,
  });
};

const signer = (user, extra = {}) => ({ user, name: "Kişi", email: "KISI@ornek.com", ...extra });

describe("Document", () => {
  it("lets only the next signer sign (sequential signing)", async () => {
    const [a, b] = [id(), id()];
    const doc = makeDocument([signer(a), signer(b)]);
    await doc.validate();

    assert.equal(doc.status, "pending");
    assert.equal(doc.isTurnOf(a), true);
    assert.equal(doc.isTurnOf(b), false);

    Object.assign(doc.signers[0], { status: "signed", method: "draw" });
    await doc.validate();
    assert.equal(doc.isTurnOf(a), false);
    assert.equal(doc.isTurnOf(b), true);
  });

  it("derives the document status from its signers", async () => {
    const [a, b] = [id(), id()];
    const doc = makeDocument([signer(a), signer(b)]);

    Object.assign(doc.signers[0], { status: "signed", method: "mobile" });
    Object.assign(doc.signers[1], { status: "signed", method: "draw" });
    await doc.validate();
    assert.equal(doc.status, "signed");
    assert.ok(doc.signers[1].signedAt, "signedAt is filled in");

    doc.signers[1].status = "rejected";
    await doc.validate();
    assert.equal(doc.status, "rejected");
    assert.equal(doc.isTurnOf(b), false, "closed documents can't be signed");
  });

  it("rejects a document without signers", async () => {
    await assert.rejects(makeDocument([]).validate(), /En az bir imzacı/);
  });

  it("accepts only PNG data URLs as drawn signatures", async () => {
    const doc = makeDocument([signer(id(), { signature: "javascript:alert(1)" })]);
    await assert.rejects(doc.validate(), /Geçersiz imza verisi/);
  });

  it("serializes to the frontend's DocumentItem shape", async () => {
    const a = id();
    const doc = makeDocument([signer(a)]);
    await doc.validate();
    const json = doc.toJSON();

    assert.equal(json.id, String(doc._id));
    assert.equal(json.sender, "Gönderen");
    assert.equal(json.signers[0].id, String(a), "signer id is the user id");
    assert.equal(json.signers[0].email, "kisi@ornek.com", "email is lowercased");
    assert.equal("_id" in json, false);
  });
});

describe("AuditLog", () => {
  it("hides request evidence (ip, user agent) from the JSON output", () => {
    const entry = new AuditLog({
      document: id(),
      documentTitle: "Test",
      actor: id(),
      actorName: "Kişi",
      action: "signed",
      ip: "10.0.0.1",
      userAgent: "test",
    });
    const json = entry.toJSON();
    assert.equal(json.actor, "Kişi");
    assert.equal("ip" in json, false);
    assert.equal("userAgent" in json, false);
  });

  it("refuses updates and deletes (append-only)", async () => {
    await assert.rejects(AuditLog.updateOne({}, { note: "x" }), /cannot be modified/);
    await assert.rejects(AuditLog.deleteMany({}), /cannot be modified/);
  });
});

describe("OtpCode", () => {
  it("validates the phone number", async () => {
    const otp = new OtpCode({ document: id(), user: id(), codeHash: "x", phone: "123" });
    await assert.rejects(otp.validate(), /cep telefonu/);
  });

  it("expires through a TTL index and allows one code per user per document", () => {
    const indexes = OtpCode.schema.indexes().map(([fields, options]) => ({ fields, options }));
    assert.ok(indexes.some((i) => i.fields.expiresAt === 1 && i.options.expireAfterSeconds === 0));
    assert.ok(indexes.some((i) => i.fields.document === 1 && i.fields.user === 1 && i.options.unique));
  });
});
