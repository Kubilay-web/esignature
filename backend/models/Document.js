const mongoose = require("mongoose");

const MAX_SIGNATURE_LENGTH = 500_000; // ~500 KB PNG data URL

// One signer inside a document. Embedded (not a separate collection) because a
// document is always read together with its signers. Array order = signing order.
const signerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Snapshot at the time the document was created: the document is a legal
    // record, so later profile changes must not rewrite it.
    name: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true },

    status: {
      type: String,
      enum: ["waiting", "signed", "rejected"],
      default: "waiting",
    },
    signedAt: Date,
    method: { type: String, enum: ["draw", "mobile"] },

    // Screen signature as a PNG data URL (only for method "draw")
    signature: {
      type: String,
      maxlength: [MAX_SIGNATURE_LENGTH, "İmza verisi çok büyük."],
      validate: {
        validator: (v) => !v || v.startsWith("data:image/png;base64,"),
        message: "Geçersiz imza verisi.",
      },
    },

    // Rejection reason
    note: { type: String, trim: true, maxlength: [500, "Açıklama en fazla 500 karakter olabilir."] },
  },
  { _id: false },
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Başlık zorunludur."],
      trim: true,
      maxlength: [200, "Başlık çok uzun."],
    },
    description: { type: String, trim: true, maxlength: 1000, default: "" },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true, trim: true }, // snapshot

    // Document body paragraphs (later: a stored PDF path instead)
    content: { type: [String], default: [] },
    pages: { type: Number, min: 1, default: 1 },

    // Metadata of the uploaded PDF (bytes live in the DocumentFile collection).
    // sha256 is the fingerprint of the original file, printed on the signed PDF.
    file: {
      name: { type: String, trim: true, maxlength: 200 },
      size: Number,
      sha256: String,
    },
    dueDate: { type: Date, required: [true, "Son imza tarihi zorunludur."] },

    status: {
      type: String,
      enum: ["pending", "signed", "rejected"],
      default: "pending",
    },

    signers: {
      type: [signerSchema],
      validate: {
        validator: (list) => Array.isArray(list) && list.length > 0,
        message: "En az bir imzacı eklenmelidir.",
      },
    },
  },
  {
    timestamps: true,
    // Every save checks __v: two simultaneous sign/reject requests can't both win
    optimisticConcurrency: true,
    toJSON: {
      // Same shape as the frontend's DocumentItem type
      transform: (_doc, ret) => ({
        id: String(ret._id),
        title: ret.title,
        description: ret.description,
        sender: ret.senderName,
        senderId: String(ret.sender),
        createdAt: ret.createdAt,
        dueDate: ret.dueDate,
        pages: ret.pages,
        status: ret.status,
        content: ret.content,
        file: ret.file?.name ? { name: ret.file.name, size: ret.file.size, sha256: ret.file.sha256 } : null,
        editable: ret.status === "pending" && !(ret.signers ?? []).some((s) => s.status === "signed"),
        signers: (ret.signers ?? []).map(({ user, ...signer }) => ({
          id: String(user),
          ...signer,
        })),
      }),
    },
  },
);

// "Documents waiting for me" and per-status lists
documentSchema.index({ "signers.user": 1, status: 1 });
documentSchema.index({ createdAt: -1 });

/** First signer who hasn't signed yet (sequential signing). */
documentSchema.methods.nextSigner = function () {
  return this.signers.find((s) => s.status === "waiting");
};

/** Is it this user's turn to sign? */
documentSchema.methods.isTurnOf = function (userId) {
  const next = this.nextSigner();
  return this.status === "pending" && !!next && next.user.equals(userId);
};

// Keep the document status consistent with its signers on every save
documentSchema.pre("validate", function () {
  for (const s of this.signers) {
    if (s.status !== "waiting" && !s.signedAt) s.signedAt = new Date();
    if (s.status === "signed" && !s.method) {
      this.invalidate("signers", "İmzalayan kişi için imza yöntemi zorunludur.");
    }
  }

  if (this.signers.some((s) => s.status === "rejected")) this.status = "rejected";
  else if (this.signers.length && this.signers.every((s) => s.status === "signed")) {
    this.status = "signed";
  } else this.status = "pending";
});

module.exports = mongoose.model("Document", documentSchema);
module.exports.MAX_SIGNATURE_LENGTH = MAX_SIGNATURE_LENGTH;
