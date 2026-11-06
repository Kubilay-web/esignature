const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    detail: { type: String, trim: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ad zorunludur."],
      trim: true,
      maxlength: [100, "Ad en fazla 100 karakter olabilir."],
    },
    email: {
      type: String,
      required: [true, "E-posta zorunludur."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Geçerli bir e-posta adresi girin."],
    },
    // Hidden by default; login selects it explicitly with .select("+password")
    password: { type: String, required: true, select: false },
    // Job title shown on signer cards ("Genel Müdür")
    title: { type: String, trim: true, maxlength: [100, "Unvan en fazla 100 karakter olabilir."], default: "" },
    phone: { type: String, trim: true },
    address: addressSchema,
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
