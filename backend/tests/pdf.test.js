// PDF generation (no database needed)
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { PDFDocument } = require("pdf-lib");
const { buildContentPdf, buildSignedPdf, wrap } = require("../services/pdf");

const PNG_1x1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const doc = {
  _id: "6aedd013d8266bdaf59ee8a8",
  title: "Gizlilik Sözleşmesi — Şirket İçi",
  description: "Türkçe karakter testi: ğüşıöç İĞÜŞÖÇ",
  content: ["1. Taraflar ...", "2. Konu ..."],
  senderName: "Ayşe Yılmaz",
  createdAt: new Date(),
  dueDate: new Date(),
  status: "pending",
  file: { sha256: "ab".repeat(32) },
  signers: [
    { name: "Ali Işık", email: "ali@x.com", status: "signed", method: "draw", signedAt: new Date(), signature: PNG_1x1 },
    { name: "Can Öz", email: "can@x.com", status: "signed", method: "mobile", signedAt: new Date() },
    { name: "Ece Şen", email: "ece@x.com", status: "waiting" },
  ],
};

const pageCount = async (bytes) => (await PDFDocument.load(bytes)).getPageCount();

describe("PDF", () => {
  it("renders a text document with Turkish characters", async () => {
    const pdf = await buildContentPdf(doc);
    assert.equal(pdf.subarray(0, 5).toString("latin1"), "%PDF-");
    assert.equal(await pageCount(pdf), 1);
  });

  it("adds a certificate page after the original pages", async () => {
    const original = await buildContentPdf(doc);
    const signed = await buildSignedPdf({
      doc,
      file: original,
      audit: [{ createdAt: new Date(), actorName: "Ayşe Yılmaz", action: "created" }],
    });
    assert.equal(await pageCount(signed), 2);
  });

  it("works without an uploaded file and in English", async () => {
    const signed = await buildSignedPdf({ doc, lang: "en" });
    assert.equal(await pageCount(signed), 2);
  });

  it("breaks words that are wider than the line (e.g. a SHA-256 hash)", async () => {
    const { PDFDocument: P, StandardFonts } = require("pdf-lib");
    const font = await (await P.create()).embedFont(StandardFonts.Helvetica);
    const lines = wrap(`Hash: ${"a".repeat(200)}`, font, 10, 200);
    assert.ok(lines.length > 2);
    for (const line of lines) assert.ok(font.widthOfTextAtSize(line, 10) <= 200, line);
  });

  it("does not fail on a broken signature image", async () => {
    const broken = { ...doc, signers: [{ ...doc.signers[0], signature: "data:image/png;base64,AAAA" }] };
    const signed = await buildSignedPdf({ doc: broken });
    assert.ok(signed.length > 0);
  });
});
