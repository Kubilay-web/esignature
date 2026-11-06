const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const OtpCode = require("../models/OtpCode");
const User = require("../models/User");
const DocumentFile = require("../models/DocumentFile");
const crypto = require("crypto");
const { buildSignedPdf } = require("../services/pdf");
const { HttpError, handleError } = require("../utils/httpError");

// mongoose.isValidObjectId accepts any 12-character string, so check the hex form
const isObjectId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const REASON_MIN = 10;
const REASON_MAX = 500;

// Documents a user may see: ones they sent or ones they sign
const visibleTo = (user) => ({
  $or: [{ sender: user._id }, { "signers.user": user._id }],
});

const assertId = (id) => {
  if (!isObjectId(id)) throw new HttpError(400, "Geçersiz belge numarası.");
};

const assertContent = (content) => {
  if (content !== undefined && (!Array.isArray(content) || content.some((p) => typeof p !== "string"))) {
    throw new HttpError(400, "Belge içeriği madde listesi olmalıdır.");
  }
};

/** A document the sender may still change: pending and nobody has signed yet. */
const loadEditable = async (id, user) => {
  assertId(id);
  return Document.findOne({
    _id: id,
    sender: user._id,
    status: "pending",
    "signers.status": { $ne: "signed" },
  });
};

/** Content-Disposition with an ASCII fallback name and the full UTF-8 name. */
const contentDisposition = (type, name) => {
  const ascii = name.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "document.pdf";
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

/** Appends an audit entry (with request evidence) and returns it. */
const addAudit = (req, document, action, note) =>
  AuditLog.create({
    document: document._id,
    documentTitle: document.title,
    actor: req.user._id,
    actorName: req.user.name,
    action,
    note: note || undefined,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

/**
 * Loads a document for a sign/reject/otp action and checks that it is still
 * open and that it is this user's turn.
 */
const loadForAction = async (id, user) => {
  assertId(id);
  const document = await Document.findOne({ _id: id, ...visibleTo(user) });
  if (!document) throw new HttpError(404, "Belge bulunamadı.");
  if (document.status !== "pending") {
    throw new HttpError(409, "Bu belge artık işleme açık değil.");
  }
  if (!document.isTurnOf(user._id)) {
    throw new HttpError(403, "İmza sırası sizde değil.");
  }
  return document;
};

/**
 * Signers come in as user ids or emails. Name, title and email are always
 * taken from the database, never from the request.
 */
const resolveSigners = async (input) => {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
    throw new HttpError(400, "1 ile 20 arasında imzacı eklenmelidir.");
  }

  const keys = input.map((item) =>
    typeof item === "string" ? item : (item?.user ?? item?.email),
  );
  if (keys.some((key) => typeof key !== "string" || !key.trim())) {
    throw new HttpError(400, "Her imzacı bir kullanıcı numarası ya da e-posta olmalıdır.");
  }

  const normalized = keys.map((key) => (isObjectId(key) ? key : key.trim().toLowerCase()));
  if (new Set(normalized).size !== normalized.length) {
    throw new HttpError(400, "Bir imzacı listeye yalnızca bir kez eklenebilir.");
  }

  const users = await User.find({
    $or: [
      { _id: { $in: normalized.filter(isObjectId) } },
      { email: { $in: normalized.filter((key) => !isObjectId(key)) } },
    ],
  });

  return normalized.map((key) => {
    const user = users.find((u) => String(u._id) === key || u.email === key);
    if (!user) throw new HttpError(400, `İmzacı bulunamadı: ${key}`);
    return { user: user._id, name: user.name, title: user.title || "", email: user.email };
  });
};

// POST /api/documents
exports.createDocument = async (req, res) => {
  try {
    const { title, description, content, pages, dueDate, signers } = req.body ?? {};

    if (typeof title !== "string" || !title.trim() || !dueDate) {
      throw new HttpError(400, "Başlık ve son imza tarihi zorunludur.");
    }
    assertContent(content);

    const document = await Document.create({
      title,
      description,
      content,
      pages,
      dueDate,
      sender: req.user._id,
      senderName: req.user.name,
      signers: await resolveSigners(signers),
    });
    const audit = await addAudit(req, document, "created");

    return res.status(201).json({ document, audit });
  } catch (error) {
    return handleError(res, error, "Belge oluşturulamadı.");
  }
};

// GET /api/documents — returns an array (frontend: DocumentItem[])
exports.getDocuments = async (req, res) => {
  try {
    // No .lean(): toJSON must run so the response has the frontend's shape (id, sender, ...)
    const documents = await Document.find(visibleTo(req.user)).sort({ createdAt: -1 });
    return res.status(200).json(documents);
  } catch (error) {
    return handleError(res, error, "Belgeler yüklenemedi.");
  }
};

// GET /api/documents/:id — returns the document itself
exports.getDocumentById = async (req, res) => {
  try {
    assertId(req.params.id);
    const document = await Document.findOne({ _id: req.params.id, ...visibleTo(req.user) });
    if (!document) throw new HttpError(404, "Belge bulunamadı.");
    return res.status(200).json(document);
  } catch (error) {
    return handleError(res, error, "Belge yüklenemedi.");
  }
};

// PUT /api/documents/:id — only the sender, only before anyone has signed
exports.updateDocument = async (req, res) => {
  try {
    const document = await loadEditable(req.params.id, req.user);
    if (!document) throw new HttpError(404, "Belge bulunamadı ya da artık düzenlenemez.");
    assertContent(req.body?.content);

    for (const field of ["title", "description", "content", "pages", "dueDate"]) {
      if (req.body?.[field] !== undefined) document[field] = req.body[field];
    }
    await document.save();
    await addAudit(req, document, "updated");

    return res.status(200).json(document);
  } catch (error) {
    return handleError(res, error, "Belge güncellenemedi.");
  }
};

// DELETE /api/documents/:id — only the sender, only before anyone has signed
exports.deleteDocument = async (req, res) => {
  try {
    const document = await loadEditable(req.params.id, req.user);
    if (!document) throw new HttpError(404, "Belge bulunamadı ya da artık silinemez.");

    await document.deleteOne();
    await DocumentFile.deleteOne({ document: document._id });
    return res.status(200).json({ message: "Belge silindi." });
  } catch (error) {
    return handleError(res, error, "Belge silinemedi.");
  }
};

// GET /api/documents/sent/list
exports.getSentDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ sender: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(documents);
  } catch (error) {
    return handleError(res, error, "Belgeler yüklenemedi.");
  }
};

// GET /api/documents/waiting/list — documents where it's my turn
exports.getWaitingDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      status: "pending",
      signers: { $elemMatch: { user: req.user._id, status: "waiting" } },
    }).sort({ createdAt: -1 });

    return res.status(200).json(documents.filter((doc) => doc.isTurnOf(req.user._id)));
  } catch (error) {
    return handleError(res, error, "Belgeler yüklenemedi.");
  }
};

// POST /api/documents/:id/otp — body: { phone: "5XXXXXXXXX" }
exports.requestOtp = async (req, res) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    if (!/^5\d{9}$/.test(phone)) throw new HttpError(422, "Geçerli bir cep telefonu numarası girin.");

    const document = await loadForAction(req.params.id, req.user);
    const code = await OtpCode.issue({ document: document._id, user: req.user._id, phone });

    // TODO: send `code` by SMS. Until an SMS provider is connected, the code is
    // returned to the client in development only (the frontend shows it as a demo hint).
    return res.status(200).json({
      maskedPhone: `0${phone.slice(0, 3)} *** ** ${phone.slice(-2)}`,
      ...(process.env.NODE_ENV !== "production" ? { demoCode: code } : {}),
    });
  } catch (error) {
    return handleError(res, error, "Doğrulama kodu gönderilemedi.");
  }
};

// POST /api/documents/:id/sign — body: { method: "draw", signature } | { method: "mobile", code }
exports.signDocument = async (req, res) => {
  try {
    const { method, signature, code } = req.body ?? {};

    if (method === "draw") {
      if (typeof signature !== "string" || !signature) {
        throw new HttpError(422, "İmza zorunludur.");
      }
    } else if (method === "mobile") {
      if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        throw new HttpError(422, "6 haneli doğrulama kodunu girin.");
      }
    } else {
      throw new HttpError(422, "Geçersiz imza yöntemi.");
    }

    const document = await loadForAction(req.params.id, req.user);

    // Mobile signing only counts after the SMS code is verified
    if (method === "mobile") {
      const valid = await OtpCode.verify({ document: document._id, user: req.user._id, code });
      if (!valid) throw new HttpError(422, "Doğrulama kodu hatalı ya da süresi dolmuş.");
    }

    const signer = document.nextSigner();
    signer.status = "signed";
    signer.method = method;
    signer.signedAt = new Date();
    if (method === "draw") signer.signature = signature;

    await document.save(); // schema validates the signature and updates document.status
    const audit = await addAudit(
      req,
      document,
      "signed",
      method === "mobile" ? "Mobil imza ile imzalandı" : "Ekran imzası ile imzalandı",
    );

    return res.status(200).json({ document, audit });
  } catch (error) {
    return handleError(res, error, "Belge imzalanamadı.");
  }
};

// POST /api/documents/:id/reject — body: { reason } (10–500 characters)
exports.rejectDocument = async (req, res) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
      throw new HttpError(422, `Red gerekçesi ${REASON_MIN}–${REASON_MAX} karakter arasında olmalıdır.`);
    }

    const document = await loadForAction(req.params.id, req.user);

    const signer = document.nextSigner();
    signer.status = "rejected";
    signer.note = reason;
    signer.signedAt = new Date();

    await document.save(); // pre-validate hook marks the document as rejected
    const audit = await addAudit(req, document, "rejected", reason);

    return res.status(200).json({ document, audit });
  } catch (error) {
    return handleError(res, error, "Belge reddedilemedi.");
  }
};

// PUT /api/documents/:id/file — raw PDF body (Content-Type: application/pdf),
// file name in the X-File-Name header. Only the sender, only before anyone has signed.
exports.uploadFile = async (req, res) => {
  try {
    const document = await loadEditable(req.params.id, req.user);
    if (!document) throw new HttpError(404, "Belge bulunamadı ya da artık düzenlenemez.");

    const data = req.body;
    // Check the file signature, not only the Content-Type the client claims
    if (!Buffer.isBuffer(data) || data.length < 5 || data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new HttpError(415, "Yalnızca PDF dosyası yüklenebilir.");
    }

    let name = "belge.pdf";
    try {
      name = decodeURIComponent(req.get("x-file-name") || name);
    } catch {
      // malformed header: keep the default name
    }
    name = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").slice(0, 200);
    if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";

    await DocumentFile.findOneAndUpdate(
      { document: document._id },
      { data, contentType: "application/pdf" },
      { upsert: true },
    );
    document.file = { name, size: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex") };
    await document.save();
    await addAudit(req, document, "updated", `PDF: ${name}`);

    return res.status(200).json(document);
  } catch (error) {
    return handleError(res, error, "PDF yüklenemedi.");
  }
};

// DELETE /api/documents/:id/file
exports.deleteFile = async (req, res) => {
  try {
    const document = await loadEditable(req.params.id, req.user);
    if (!document) throw new HttpError(404, "Belge bulunamadı ya da artık düzenlenemez.");

    await DocumentFile.deleteOne({ document: document._id });
    document.file = undefined;
    await document.save();
    await addAudit(req, document, "updated", "PDF kaldırıldı");

    return res.status(200).json(document);
  } catch (error) {
    return handleError(res, error, "PDF kaldırılamadı.");
  }
};

// GET /api/documents/:id/file — the original PDF, shown inline
exports.getFile = async (req, res) => {
  try {
    assertId(req.params.id);
    const document = await Document.findOne({ _id: req.params.id, ...visibleTo(req.user) });
    if (!document) throw new HttpError(404, "Belge bulunamadı.");

    const file = await DocumentFile.findOne({ document: document._id });
    if (!file) throw new HttpError(404, "Bu belgeye ait PDF yok.");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("inline", document.file?.name || "belge.pdf"),
      "Cache-Control": "private, no-store",
    });
    return res.send(file.data);
  } catch (error) {
    return handleError(res, error, "Belge yüklenemedi.");
  }
};

// GET /api/documents/:id/signed-pdf?lang=tr|en — footer stamp on every page + signature certificate
exports.getSignedPdf = async (req, res) => {
  try {
    assertId(req.params.id);
    const document = await Document.findOne({ _id: req.params.id, ...visibleTo(req.user) });
    if (!document) throw new HttpError(404, "Belge bulunamadı.");

    const [file, audit] = await Promise.all([
      DocumentFile.findOne({ document: document._id }),
      AuditLog.find({ document: document._id }).sort({ createdAt: 1 }),
    ]);
    const lang = ["tr", "en"].includes(req.query.lang) ? req.query.lang : req.lang;
    const pdf = await buildSignedPdf({ doc: document, file: file?.data, audit, lang });

    const base = (document.file?.name || `${document.title}.pdf`).replace(/\.pdf$/i, "");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("attachment", `${base}-${lang === "en" ? "signed" : "imzali"}.pdf`),
      "Cache-Control": "private, no-store",
    });
    return res.send(pdf);
  } catch (error) {
    return handleError(res, error, "PDF oluşturulamadı.");
  }
};
