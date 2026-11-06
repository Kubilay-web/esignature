// Response language: the controllers write Turkish messages. When the client asks
// for English (Accept-Language: en...), the `message` field of every JSON response
// is translated here, so controllers stay simple and unchanged.

const EN = {
  // auth / profile
  "Ad, e-posta ve şifre zorunludur.": "Name, email and password are required.",
  "Şifre en az 8 karakter olmalıdır.": "Password must be at least 8 characters.",
  "Bu e-posta adresiyle zaten bir hesap var.": "An account with this email already exists.",
  "Kayıt başarılı.": "Registration successful.",
  "E-posta ve şifre zorunludur.": "Email and password are required.",
  "E-posta veya şifre hatalı.": "Incorrect email or password.",
  "Giriş başarılı.": "Logged in successfully.",
  "Giriş yapılamadı.": "Could not log in.",
  "Çıkış yapıldı.": "Logged out.",
  "Kullanıcı bulunamadı.": "User not found.",
  "Profil güncellendi.": "Profile updated.",
  "Profil güncellenemedi.": "Could not update the profile.",
  "Profil yüklenemedi.": "Could not load the profile.",
  "Profil bilgileri geçersiz.": "Profile information is invalid.",
  "Yeni şifre en az 8 karakter olmalıdır.": "The new password must be at least 8 characters.",
  "Mevcut şifre hatalı.": "The current password is incorrect.",
  "Bu e-posta adresi zaten kullanılıyor.": "This email address is already in use.",
  "Oturum açmanız gerekiyor.": "You need to log in.",
  "Kullanıcı artık mevcut değil.": "This user no longer exists.",
  "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.": "Your session has expired. Please log in again.",
  "Bu işlem için yönetici yetkisi gerekir.": "Administrator permission is required.",

  // validation (mongoose)
  "Ad zorunludur.": "Name is required.",
  "Ad en fazla 100 karakter olabilir.": "Name can be at most 100 characters.",
  "E-posta zorunludur.": "Email is required.",
  "Geçerli bir e-posta adresi girin.": "Enter a valid email address.",
  "Unvan en fazla 100 karakter olabilir.": "Title can be at most 100 characters.",
  "Başlık zorunludur.": "Title is required.",
  "Başlık çok uzun.": "Title is too long.",
  "Son imza tarihi zorunludur.": "Due date is required.",
  "En az bir imzacı eklenmelidir.": "Add at least one signer.",
  "İmza verisi çok büyük.": "Signature data is too large.",
  "Geçersiz imza verisi.": "Invalid signature data.",
  "Açıklama en fazla 500 karakter olabilir.": "Note can be at most 500 characters.",
  "İmzalayan kişi için imza yöntemi zorunludur.": "A signing method is required for the signer.",
  "Gönderilen bilgiler geçersiz.": "The submitted data is invalid.",

  // documents
  "Geçersiz belge numarası.": "Invalid document id.",
  "Belge bulunamadı.": "Document not found.",
  "Bu belge artık işleme açık değil.": "This document is no longer open for action.",
  "İmza sırası sizde değil.": "It is not your turn to sign.",
  "1 ile 20 arasında imzacı eklenmelidir.": "Add between 1 and 20 signers.",
  "Her imzacı bir kullanıcı numarası ya da e-posta olmalıdır.": "Each signer must be a user id or an email.",
  "Bir imzacı listeye yalnızca bir kez eklenebilir.": "A signer can be added only once.",
  "Başlık ve son imza tarihi zorunludur.": "Title and due date are required.",
  "Belge içeriği madde listesi olmalıdır.": "Document content must be a list of paragraphs.",
  "Belge oluşturulamadı.": "Could not create the document.",
  "Belgeler yüklenemedi.": "Could not load documents.",
  "Belge yüklenemedi.": "Could not load the document.",
  "Belge bulunamadı ya da artık düzenlenemez.": "Document not found or can no longer be edited.",
  "Belge güncellenemedi.": "Could not update the document.",
  "Belge bulunamadı ya da artık silinemez.": "Document not found or can no longer be deleted.",
  "Belge silindi.": "Document deleted.",
  "Belge silinemedi.": "Could not delete the document.",
  "Geçerli bir cep telefonu numarası girin.": "Enter a valid mobile phone number.",
  "Doğrulama kodu gönderilemedi.": "Could not send the verification code.",
  "İmza zorunludur.": "A signature is required.",
  "6 haneli doğrulama kodunu girin.": "Enter the 6-digit verification code.",
  "Geçersiz imza yöntemi.": "Invalid signing method.",
  "Doğrulama kodu hatalı ya da süresi dolmuş.": "The verification code is wrong or has expired.",
  "Belge imzalanamadı.": "Could not sign the document.",
  "Belge reddedilemedi.": "Could not reject the document.",
  "Belge bu sırada başka bir işlemle değişti. Sayfayı yenileyip tekrar deneyin.":
    "The document was changed by another action. Refresh the page and try again.",
  "Denetim kaydı yüklenemedi.": "Could not load the audit log.",

  // files
  "Yalnızca PDF dosyası yüklenebilir.": "Only PDF files can be uploaded.",
  "PDF dosyası en fazla 10 MB olabilir.": "The PDF can be at most 10 MB.",
  "PDF yüklendi.": "PDF uploaded.",
  "PDF kaldırıldı.": "PDF removed.",
  "PDF yüklenemedi.": "Could not upload the PDF.",
  "PDF kaldırılamadı.": "Could not remove the PDF.",
  "Bu belgeye ait PDF yok.": "This document has no PDF.",
  "PDF oluşturulamadı.": "Could not generate the PDF.",

  // security / general
  "İstek kaynağı geçersiz.": "Invalid request origin.",
  "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.": "Too many requests. Please try again later.",
  "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.": "Too many attempts. Please try again later.",
  "Bir hata oluştu. Lütfen tekrar deneyin.": "Something went wrong. Please try again.",
};

// Messages with a variable part
const PATTERNS = [
  [/^İmzacı bulunamadı: (.+)$/, (m) => `Signer not found: ${m[1]}`],
  [/^Geçersiz değer: (.+)$/, (m) => `Invalid value: ${m[1]}`],
  [
    /^Red gerekçesi (\d+)–(\d+) karakter arasında olmalıdır\.$/,
    (m) => `The rejection reason must be ${m[1]}–${m[2]} characters.`,
  ],
];

/** Translates one Turkish message to English; unknown messages are returned unchanged. */
const toEnglish = (message) => {
  if (EN[message]) return EN[message];
  for (const [regex, build] of PATTERNS) {
    const match = message.match(regex);
    if (match) return build(match);
  }
  return message;
};

/** "en", "en-US,en;q=0.9" -> "en"; anything else -> "tr" */
const languageOf = (req) => (/^en\b/i.test(req.get?.("accept-language") ?? "") ? "en" : "tr");

const i18n = (req, res, next) => {
  req.lang = languageOf(req);
  if (req.lang === "en") {
    const json = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body.message === "string") {
        body = { ...body, message: toEnglish(body.message) };
      }
      return json(body);
    };
  }
  next();
};

module.exports = { i18n, toEnglish, languageOf };
