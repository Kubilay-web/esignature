const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT from the httpOnly cookie and attaches the user to req.user
const protect = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ message: "Oturum açmanız gerekiyor." });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Load from the DB so deleted users / changed roles take effect immediately
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı artık mevcut değil." });
    }

    req.user = user;
    next();
  } catch (error) {
    // Expired or tampered token
    return res.status(401).json({ message: "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın." });
  }
};

// Like protect, but never rejects: sets req.user when a valid token exists, otherwise continues anonymously
const optionalAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (token) {
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch {
    // Invalid / expired token — treat as a guest
  }
  next();
};

// Use after protect: only lets admins through
const admin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Bu işlem için yönetici yetkisi gerekir." });
  }
  next();
};

module.exports = { protect, optionalAuth, admin };
