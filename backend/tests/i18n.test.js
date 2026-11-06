// Response translation (Accept-Language: en)
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { i18n, toEnglish, languageOf } = require("../middleware/i18n");

const mockReq = (acceptLanguage) => ({ get: (h) => (h === "accept-language" ? acceptLanguage : undefined) });
const mockRes = () => {
  const res = { body: undefined };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

describe("i18n", () => {
  it("detects the language from Accept-Language", () => {
    assert.equal(languageOf(mockReq("en-US,en;q=0.9")), "en");
    assert.equal(languageOf(mockReq("en")), "en");
    assert.equal(languageOf(mockReq("tr-TR")), "tr");
    assert.equal(languageOf(mockReq(undefined)), "tr");
  });

  it("translates fixed and parameterized messages", () => {
    assert.equal(toEnglish("E-posta veya şifre hatalı."), "Incorrect email or password.");
    assert.equal(toEnglish("İmzacı bulunamadı: a@b.com"), "Signer not found: a@b.com");
    assert.equal(
      toEnglish("Red gerekçesi 10–500 karakter arasında olmalıdır."),
      "The rejection reason must be 10–500 characters.",
    );
    assert.equal(toEnglish("Bilinmeyen mesaj"), "Bilinmeyen mesaj");
  });

  it("rewrites only the message field of English responses", () => {
    const req = mockReq("en");
    const res = mockRes();
    i18n(req, res, () => {});
    res.json({ message: "Belge silindi.", id: 1 });
    assert.deepEqual(res.body, { message: "Document deleted.", id: 1 });
    assert.equal(req.lang, "en");
  });

  it("leaves Turkish responses untouched", () => {
    const res = mockRes();
    i18n(mockReq("tr"), res, () => {});
    res.json({ message: "Belge silindi." });
    assert.equal(res.body.message, "Belge silindi.");
  });
});
