require("dotenv").config();

const express = require("express");
const connectDB = require("./db/db");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const auditRoutes = require("./routes/auditRoutes");

const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const {
  apiLimiter,
  sanitizeBody,
  csrfProtection,
} = require("./middleware/security");
const { i18n } = require("./middleware/i18n");

const app = express();


// Request log: short colored lines in dev, Apache-style lines in production
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
// Before the limiter, so rate-limit messages are translated too
app.use(i18n);
app.use("/api", apiLimiter);

app.use(express.json({ limit: "100kb" }));
app.use(sanitizeBody);
app.use(cookieParser());
app.use(csrfProtection);

app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/audit", auditRoutes);

connectDB();

// Hosting platforms set PORT themselves
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
