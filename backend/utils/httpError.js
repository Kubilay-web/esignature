const mongoose = require("mongoose");

/** An error with an HTTP status, safe to show to the user. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Turns any error into a response. Known errors get their own status and
 * message; anything else is logged and answered with a generic 500 so
 * internal details never reach the client.
 */
const handleError = (res, error, fallbackMessage = "Bir hata oluştu. Lütfen tekrar deneyin.") => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const first = Object.values(error.errors)[0];
    return res.status(400).json({ message: first?.message || "Gönderilen bilgiler geçersiz." });
  }
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Geçersiz değer: ${error.path}` });
  }
  if (error instanceof mongoose.Error.VersionError) {
    return res
      .status(409)
      .json({ message: "Belge bu sırada başka bir işlemle değişti. Sayfayı yenileyip tekrar deneyin." });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
};

module.exports = { HttpError, handleError };
