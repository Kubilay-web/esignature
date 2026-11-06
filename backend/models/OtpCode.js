const crypto = require("crypto");
const mongoose = require("mongoose");

const OTP_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_ATTEMPTS = 5;

const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");


const otpCodeSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    codeHash: { type: String, required: true },
    phone: { type: String, required: true, match: [/^5\d{9}$/, "Geçerli bir cep telefonu numarası girin."] },
    attempts: { type: Number, default: 0 },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + OTP_TTL_MS),
      expires: 0, // TTL: removed once expiresAt passes
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One active code per user per document; requesting a new one replaces it
otpCodeSchema.index({ document: 1, user: 1 }, { unique: true });

/** Creates (or replaces) a code and returns the plain code to send by SMS. */
otpCodeSchema.statics.issue = async function ({ document, user, phone }) {
  const code = String(crypto.randomInt(100000, 1000000));
  await this.findOneAndUpdate(
    { document, user },
    {
      codeHash: hashCode(code),
      phone,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return code;
};

/**
 * Checks a code. Returns true once (the code is deleted on success).
 * Too many wrong attempts or an expired code also deletes it.
 */
otpCodeSchema.statics.verify = async function ({ document, user, code }) {
  const otp = await this.findOne({ document, user });
  if (!otp) return false;

  if (otp.expiresAt < new Date() || otp.attempts >= MAX_ATTEMPTS) {
    await otp.deleteOne();
    return false;
  }

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(code), "hex");
  if (crypto.timingSafeEqual(expected, actual)) {
    await otp.deleteOne();
    return true;
  }

  otp.attempts += 1;
  await otp.save();
  return false;
};

module.exports = mongoose.model("OtpCode", otpCodeSchema);
module.exports.MAX_ATTEMPTS = MAX_ATTEMPTS;
