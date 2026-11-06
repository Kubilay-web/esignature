const express = require("express");
const documentController = require("../controller/documentController");
const { protect } = require("../middleware/authMiddleware");
const { MAX_FILE_SIZE } = require("../models/DocumentFile");

// Raw PDF bytes; the controller also checks the %PDF- file signature
const pdfBody = express.raw({ type: "application/pdf", limit: MAX_FILE_SIZE });

const router = express.Router();

// All routes require authentication
router.use(protect);

// Custom lists (two segments, so they never collide with /:id)
router.get("/sent/list", documentController.getSentDocuments);
router.get("/waiting/list", documentController.getWaitingDocuments);

// CRUD
router.post("/", documentController.createDocument);
router.get("/", documentController.getDocuments);
router.get("/:id", documentController.getDocumentById);
router.put("/:id", documentController.updateDocument);
router.delete("/:id", documentController.deleteDocument);

// PDF file
router.put("/:id/file", pdfBody, documentController.uploadFile);
router.delete("/:id/file", documentController.deleteFile);
router.get("/:id/file", documentController.getFile);
router.get("/:id/signed-pdf", documentController.getSignedPdf);

// Signing (POST, as the frontend calls them)
router.post("/:id/otp", documentController.requestOtp);
router.post("/:id/sign", documentController.signDocument);
router.post("/:id/reject", documentController.rejectDocument);

module.exports = router;
