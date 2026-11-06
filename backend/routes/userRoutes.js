const express = require("express");
const userController = require("../controller/userController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/security");
const router = express.Router();

router.post("/register", authLimiter, userController.registerUser);
router.post("/login", authLimiter, userController.loginUser);
router.post("/logout", userController.logoutUser);
router.get("/me", protect, userController.getMe);
router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);

module.exports = router;
