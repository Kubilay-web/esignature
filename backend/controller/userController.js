const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createSampleDocuments } = require("../services/sampleDocuments");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ message: "Ad, e-posta ve şifre zorunludur." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Şifre en az 8 karakter olmalıdır." });
    }

    const existingUsers = await User.findOne({ email });

    if (existingUsers) {
      return res.status(400).json({ message: "Bu e-posta adresiyle zaten bir hesap var." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashed });

    await user.save();

    // Sample contracts so a new account isn't empty. A failure here must not
    // fail the registration itself.
    try {
      await createSampleDocuments(user);
    } catch (sampleError) {
      console.error("Sample documents error:", sampleError);
    }

    res.status(201).json({ message: "Kayıt başarılı." });
  } catch (error) {
    console.error("Register error:", error);

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({ message: firstError?.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Bu e-posta adresiyle zaten bir hesap var." });
    }

    res
      .status(500)
      .json({ message: "Bir hata oluştu. Lütfen tekrar deneyin." });
  }
};

// Same options must be used when setting and clearing the cookie
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
});

// Only the fields the frontend needs — never the password hash
const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res
        .status(400)
        .json({ message: "E-posta ve şifre zorunludur." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({
        message: "E-posta veya şifre hatalı.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "E-posta veya şifre hatalı.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.TOKEN_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE,
      },
    );

    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Giriş başarılı.",
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Giriş yapılamadı.",
    });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("token", cookieOptions());
  res.status(200).json({ message: "Çıkış yapıldı." });
};

// GET /api/users/me — returns the logged-in user (req.user is set by protect)
const getMe = (req, res) => {
  res.status(200).json({ user: toPublicUser(req.user) });
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { name, email, phone, address, title, currentPassword, newPassword } = req.body ?? {};

    // password is select:false; it is needed to check the current password
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    // Güncellenecek alanlar ("role" bilerek yok: kullanıcı kendi rolünü değiştiremez)
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (title !== undefined) user.title = title;

    // Password change: only with the correct current password
    if (newPassword !== undefined && newPassword !== "") {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({ message: "Yeni şifre en az 8 karakter olmalıdır." });
      }
      const isMatch =
        typeof currentPassword === "string" && (await bcrypt.compare(currentPassword, user.password));
      if (!isMatch) {
        return res.status(400).json({ message: "Mevcut şifre hatalı." });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (address && typeof address === "object") {
      user.address = {
        city: address.city,
        district: address.district,
        postalCode: address.postalCode,
        detail: address.detail,
      };
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profil güncellendi.",
      user: {
        _id: updatedUser._id,
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        title : updatedUser.title,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error(error);

    // Schema validation (invalid email, empty name, ...) — tell the user what's wrong
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || "Profil bilgileri geçersiz.",
      });
    }

    // Duplicate email
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Bu e-posta adresi zaten kullanılıyor.",
      });
    }

    res.status(500).json({
      message: "Profil güncellenemedi.",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        title: user.title,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Profil yüklenemedi.",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
  getProfile,
};
