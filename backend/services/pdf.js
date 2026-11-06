// PDF generation with pdf-lib.
// - buildContentPdf: turns a text document (title + paragraphs) into a PDF
// - buildSignedPdf:  original PDF + footer stamp on every page + signature certificate page
//
// Standard PDF fonts can't draw Turkish letters (ş, ğ, ı, İ), so DejaVu Sans is embedded.
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FONT_DIR = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
let fontBytes; // read once, reused for every PDF
const readFonts = () => {
  fontBytes ??= {
    regular: fs.readFileSync(path.join(FONT_DIR, "ttf", "DejaVuSans.ttf")),
    bold: fs.readFileSync(path.join(FONT_DIR, "ttf", "DejaVuSans-Bold.ttf")),
  };
  return fontBytes;
};

const A4 = [595.28, 841.89];
const MARGIN = 50;

const COLORS = {
  text: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.55),
  line: rgb(0.89, 0.91, 0.94),
  brand: rgb(0.31, 0.27, 0.9),
  signed: rgb(0.02, 0.59, 0.41),
  rejected: rgb(0.86, 0.15, 0.15),
  pending: rgb(0.85, 0.47, 0.02),
};

const LABELS = {
  tr: {
    certificate: "İmza Sertifikası",
    certificateNote: "Bu sayfa, belgenin elektronik imza sürecinin kaydıdır.",
    document: "Belge",
    documentNo: "Belge No",
    sender: "Gönderen",
    created: "Oluşturulma",
    dueDate: "Son imza tarihi",
    status: "Durum",
    fingerprint: "Orijinal dosya SHA-256",
    signers: "İmzacılar",
    audit: "Denetim Kaydı",
    method: { draw: "Ekran imzası", mobile: "Mobil imza (SMS doğrulama)" },
    docStatus: { pending: "İmza bekliyor", signed: "Tamamlandı", rejected: "Reddedildi" },
    signerStatus: { waiting: "Bekliyor", signed: "İmzaladı", rejected: "Reddetti" },
    action: { created: "Oluşturdu", updated: "Düzenledi", signed: "İmzaladı", rejected: "Reddetti" },
    reason: "Gerekçe",
    page: "Sayfa",
    footer: "İmzala ile elektronik olarak imzalanmıştır",
    noContent: "Bu belgenin metin içeriği yok.",
  },
  en: {
    certificate: "Signature Certificate",
    certificateNote: "This page records the electronic signing process of the document.",
    document: "Document",
    documentNo: "Document ID",
    sender: "Sender",
    created: "Created",
    dueDate: "Due date",
    status: "Status",
    fingerprint: "Original file SHA-256",
    signers: "Signers",
    audit: "Audit Trail",
    method: { draw: "Screen signature", mobile: "Mobile signature (SMS verification)" },
    docStatus: { pending: "Awaiting signatures", signed: "Completed", rejected: "Rejected" },
    signerStatus: { waiting: "Waiting", signed: "Signed", rejected: "Rejected" },
    action: { created: "Created", updated: "Edited", signed: "Signed", rejected: "Rejected" },
    reason: "Reason",
    page: "Page",
    footer: "Electronically signed with İmzala",
    noContent: "This document has no text content.",
  },
};

const formatDate = (value, lang, withTime = true) =>
  value
    ? new Date(value).toLocaleString(lang === "en" ? "en-GB" : "tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "long",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "-";

/** Breaks a word that is wider than maxWidth (hashes, long ids) into pieces. */
const splitLongWord = (word, font, size, maxWidth) => {
  const pieces = [];
  let piece = "";
  for (const char of word) {
    if (piece && font.widthOfTextAtSize(piece + char, size) > maxWidth) {
      pieces.push(piece);
      piece = "";
    }
    piece += char;
  }
  if (piece) pieces.push(piece);
  return pieces;
};

/** Splits text into lines that fit maxWidth. */
const wrap = (text, font, size, maxWidth) => {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    const words = paragraph
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((word) =>
        font.widthOfTextAtSize(word, size) > maxWidth ? splitLongWord(word, font, size, maxWidth) : [word],
      );
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
};

/** Writes flowing text top to bottom and adds pages when needed. */
class Writer {
  constructor(pdf, fonts) {
    this.pdf = pdf;
    this.fonts = fonts;
    this.width = A4[0] - MARGIN * 2;
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage(A4);
    this.y = A4[1] - MARGIN;
  }

  ensure(height) {
    if (this.y - height < MARGIN + 20) this.newPage();
  }

  gap(height) {
    this.y -= height;
  }

  text(value, { size = 10, bold = false, color = COLORS.text, x = MARGIN, width } = {}) {
    const font = bold ? this.fonts.bold : this.fonts.regular;
    for (const line of wrap(value, font, size, width ?? this.width - (x - MARGIN))) {
      this.ensure(size * 1.5);
      this.page.drawText(line, { x, y: this.y - size, size, font, color });
      this.y -= size * 1.5;
    }
  }

  rule() {
    this.ensure(12);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 4 },
      end: { x: A4[0] - MARGIN, y: this.y - 4 },
      thickness: 0.8,
      color: COLORS.line,
    });
    this.y -= 12;
  }

  /** "Label: value" on one row */
  field(label, value) {
    this.ensure(15);
    this.page.drawText(label, { x: MARGIN, y: this.y - 9, size: 9, font: this.fonts.regular, color: COLORS.muted });
    this.text(value, { size: 9.5, bold: true, x: MARGIN + 140 });
  }
}

const embedFonts = async (pdf) => {
  pdf.registerFontkit(fontkit);
  const bytes = readFonts();
  return {
    regular: await pdf.embedFont(bytes.regular, { subset: true }),
    bold: await pdf.embedFont(bytes.bold, { subset: true }),
  };
};

/** Renders a text document onto new pages of `pdf`. */
const renderContent = (pdf, fonts, { title, description, content, senderName, createdAt }, lang) => {
  const w = new Writer(pdf, fonts);
  w.text(title.toLocaleUpperCase(lang === "en" ? "en-US" : "tr-TR"), { size: 15, bold: true });
  w.gap(4);
  w.text(`${senderName} · ${formatDate(createdAt, lang, false)}`, { size: 9, color: COLORS.muted });
  if (description) w.text(description, { size: 9.5, color: COLORS.muted });
  w.rule();
  w.gap(6);
  if (content?.length) {
    for (const paragraph of content) {
      w.text(paragraph, { size: 11 });
      w.gap(8);
    }
  } else {
    w.text(LABELS[lang].noContent, { size: 10, color: COLORS.muted });
  }
};

/** A text document as a standalone PDF (used for the sample contracts). */
const buildContentPdf = async (doc, lang = "tr") => {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title);
  pdf.setProducer("İmzala");
  const fonts = await embedFonts(pdf);
  renderContent(pdf, fonts, doc, lang);
  return Buffer.from(await pdf.save());
};

const statusColor = (status) =>
  status === "signed" ? COLORS.signed : status === "rejected" ? COLORS.rejected : COLORS.pending;

/**
 * The document as a PDF with its signing record:
 * original pages (or the text content) + a footer stamp on each page + certificate page(s).
 * @param {object} doc     Document (mongoose doc or plain object)
 * @param {Buffer} [file]  original uploaded PDF, if any
 * @param {object[]} audit AuditLog entries, oldest first
 */
const buildSignedPdf = async ({ doc, file, audit = [], lang = "tr" }) => {
  const L = LABELS[lang] ?? LABELS.tr;
  const pdf = file ? await PDFDocument.load(file, { ignoreEncryption: true }) : await PDFDocument.create();
  pdf.setTitle(doc.title);
  pdf.setProducer("İmzala");
  const fonts = await embedFonts(pdf);

  if (!file) renderContent(pdf, fonts, doc, lang);
  const originalPageCount = pdf.getPageCount();

  // --- certificate page(s)
  const w = new Writer(pdf, fonts);
  w.page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: COLORS.brand });
  w.text(L.certificate, { size: 18, bold: true, color: COLORS.brand });
  w.text(L.certificateNote, { size: 9, color: COLORS.muted });
  w.gap(8);

  w.field(L.document, doc.title);
  w.field(L.documentNo, String(doc._id ?? doc.id));
  w.field(L.sender, doc.senderName);
  w.field(L.created, formatDate(doc.createdAt, lang));
  w.field(L.dueDate, formatDate(doc.dueDate, lang, false));
  w.field(L.status, L.docStatus[doc.status]);
  if (doc.file?.sha256) w.field(L.fingerprint, doc.file.sha256);
  w.gap(10);

  w.text(L.signers, { size: 13, bold: true });
  w.rule();
  for (const [index, s] of doc.signers.entries()) {
    w.ensure(s.signature ? 120 : 60);
    const top = w.y;
    w.text(`${index + 1}. ${s.name}`, { size: 11, bold: true });
    w.text([s.title, s.email].filter(Boolean).join(" · "), { size: 9, color: COLORS.muted });
    w.text(
      [L.signerStatus[s.status], s.signedAt && formatDate(s.signedAt, lang), s.method && L.method[s.method]]
        .filter(Boolean)
        .join(" · "),
      { size: 9.5, bold: true, color: statusColor(s.status) },
    );
    if (s.note) w.text(`${L.reason}: ${s.note}`, { size: 9.5, color: COLORS.rejected, width: w.width - 190 });

    // Drawn signature on the right side of the signer block
    if (s.signature?.startsWith("data:image/png;base64,")) {
      try {
        const image = await pdf.embedPng(Buffer.from(s.signature.split(",")[1], "base64"));
        const scale = Math.min(170 / image.width, 60 / image.height);
        w.page.drawImage(image, {
          x: A4[0] - MARGIN - image.width * scale,
          y: top - 8 - image.height * scale,
          width: image.width * scale,
          height: image.height * scale,
        });
        w.y = Math.min(w.y, top - 14 - image.height * scale);
      } catch {
        // an unreadable image must not break the whole PDF
      }
    }
    w.gap(6);
    w.rule();
  }

  if (audit.length) {
    w.gap(10);
    w.text(L.audit, { size: 13, bold: true });
    w.rule();
    for (const entry of audit) {
      w.text(
        `${formatDate(entry.createdAt, lang)} — ${entry.actorName}: ${L.action[entry.action] ?? entry.action}` +
          (entry.note ? ` (${entry.note})` : ""),
        { size: 9 },
      );
    }
  }

  // --- footer stamp on every page
  const pages = pdf.getPages();
  const docNo = String(doc._id ?? doc.id);
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const label =
      `${L.footer} · ${L.documentNo}: ${docNo} · ${L.docStatus[doc.status]} · ` +
      `${L.page} ${i + 1}/${pages.length}` +
      (i >= originalPageCount ? ` · ${L.certificate}` : "");
    const size = 6.5;
    page.drawText(label, {
      x: Math.max(10, (width - fonts.regular.widthOfTextAtSize(label, size)) / 2),
      y: 14,
      size,
      font: fonts.regular,
      color: COLORS.muted,
    });
  });

  return Buffer.from(await pdf.save());
};

module.exports = { buildContentPdf, buildSignedPdf, wrap };
