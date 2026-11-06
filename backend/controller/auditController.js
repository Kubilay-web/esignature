const AuditLog = require("../models/AuditLog");
const Document = require("../models/Document");
const { handleError } = require("../utils/httpError");

// GET /api/audit — audit entries of the documents this user sent or signs
exports.getAudit = async (req, res) => {
  try {
    const documentIds = await Document.find({
      $or: [{ sender: req.user._id }, { "signers.user": req.user._id }],
    }).distinct("_id");

    const entries = await AuditLog.find({ document: { $in: documentIds } })
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json(entries);
  } catch (error) {
    return handleError(res, error, "Denetim kaydı yüklenemedi.");
  }
};
