const mongoose = require("mongoose");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (MongoDB document limit is 16 MB)

// The uploaded PDF of a document. Kept in its own collection so that listing
// documents never loads file bytes; Document only stores the metadata.
const documentFileSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true, // one PDF per document; uploading again replaces it
    },
    data: { type: Buffer, required: true },
    contentType: { type: String, default: "application/pdf" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DocumentFile", documentFileSchema);
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
