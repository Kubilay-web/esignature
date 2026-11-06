const mongoose = require("mongoose");

// Append-only audit trail: entries are created, never updated or deleted.
// Kept separate from Document so it can be listed across all documents
// and stays intact even if a document is removed.


const auditLogSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    documentTitle: { type: String, required: true }, // snapshot

    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true }, // snapshot

    action: {
      type: String,
      enum: ["created", "updated", "signed", "rejected"],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 500 },

    // Evidence for the e-signature record; not sent to the frontend
    ip: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      // Same shape as the frontend's AuditEntry type
      transform: (_doc, ret) => ({
        id: String(ret._id),
        documentId: String(ret.document),
        documentTitle: ret.documentTitle,
        actor: ret.actorName,
        action: ret.action,
        date: ret.createdAt,
        ...(ret.note ? { note: ret.note } : {}),
      }),
    },
  },
);

auditLogSchema.index({ createdAt: -1 });

// Block edits at the model level
const readOnly = function () {
  throw new Error("Audit log entries cannot be modified");
};
for (const op of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "findOneAndReplace",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
]) {
  auditLogSchema.pre(op, readOnly);
}
auditLogSchema.pre("save", function () {
  if (!this.isNew) readOnly();
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
