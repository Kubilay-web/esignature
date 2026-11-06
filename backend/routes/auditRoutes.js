const express = require("express");
const auditController = require("../controller/auditController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, auditController.getAudit);

module.exports = router;
