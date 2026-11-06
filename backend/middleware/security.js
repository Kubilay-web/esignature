const rateLimit = require("express-rate-limit");

// General limit for every /api request
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin." },
});

// Stricter limit for login/register (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." },
});

// Strips MongoDB operator keys ($gt, $where, a.b) from the body to block NoSQL injection
const stripOperators = (value) => {
  if (Array.isArray(value)) return value.map(stripOperators);
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = stripOperators(v);
    }
    return clean;
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = stripOperators(req.body);
  }
  next();
};

// Cookie auth CSRF guard: state-changing requests coming from a browser
// must originate from the frontend's origin
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  // No Origin header => not a cross-site browser request (curl, server-to-server)
  if (!origin || origin === process.env.FRONTEND_URL) return next();

  return res.status(403).json({ message: "İstek kaynağı geçersiz." });
};

module.exports = { apiLimiter, authLimiter, sanitizeBody, csrfProtection };
