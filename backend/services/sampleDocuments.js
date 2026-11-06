// Sample contracts sent to every new user, so the app isn't empty after sign-up.
// The new user is the next signer on every document and can try signing right away.
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Document = require("../models/Document");
const DocumentFile = require("../models/DocumentFile");
const AuditLog = require("../models/AuditLog");
const { buildContentPdf } = require("./pdf");

// Senders of the sample documents
const DEMO_USERS = [
  { name: "Ayşe Yılmaz", email: "ayse@demo.com", title: "Genel Müdür" },
  { name: "Mehmet Demir", email: "mehmet@demo.com", title: "Finans Müdürü" },
  { name: "Zeynep Kara", email: "zeynep@demo.com", title: "Hukuk Müşaviri" },
];

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// before: demo users who already signed before the new user (sequential flow demo)
// after:  demo users who sign after the new user
const SAMPLE_DOCUMENTS = [
  {
    title: "Gizlilik Sözleşmesi (NDA)",
    description: "Proje kapsamında paylaşılacak bilgiler için karşılıklı gizlilik sözleşmesi.",
    sender: "ayse@demo.com",
    after: [],
    dueInDays: 7,
    content: [
      "1. TARAFLAR: Bu sözleşme, İmzala A.Ş. ile aşağıda imzası bulunan kişi arasında akdedilmiştir.",
      "2. KONU: Taraflar, iş birliği süresince edindikleri ticari ve teknik bilgileri gizli tutmayı kabul eder.",
      "3. SÜRE: Gizlilik yükümlülüğü, sözleşmenin sona ermesinden itibaren 2 yıl devam eder.",
      "4. YAPTIRIM: Bu sözleşmeye aykırılık halinde doğan zararlar ihlal eden tarafça tazmin edilir.",
    ],
  },
  {
    title: "İş Sözleşmesi — Frontend Geliştirici",
    description: "Belirsiz süreli tam zamanlı iş sözleşmesi.",
    sender: "ayse@demo.com",
    after: ["zeynep@demo.com"],
    dueInDays: 5,
    content: [
      "1. GÖREV: Çalışan, Frontend Geliştirici olarak Vue.js ve TypeScript ile web uygulamaları geliştirecektir.",
      "2. ÇALIŞMA SÜRESİ: Haftalık çalışma süresi 45 saattir; hibrit çalışma modeli uygulanır.",
      "3. DENEME SÜRESİ: İlk 2 ay deneme süresidir.",
      "4. ÜCRET: Ücret, her ayın son iş günü çalışanın banka hesabına yatırılır.",
      "5. FESİH: Taraflar, İş Kanunu'nda belirtilen bildirim sürelerine uyarak sözleşmeyi feshedebilir.",
    ],
  },
  {
    title: "Satın Alma Onay Formu — Dizüstü Bilgisayar",
    description: "Yazılım ekibi için 3 adet dizüstü bilgisayar alımı.",
    sender: "mehmet@demo.com",
    before: ["ayse@demo.com"],
    after: [],
    dueInDays: 3,
    content: [
      "Talep eden birim: Yazılım Geliştirme",
      "Ürün: 14 inç dizüstü bilgisayar, 32 GB RAM, 1 TB SSD — 3 adet",
      "Toplam tutar: 165.000 TL + KDV",
      "Gerekçe: Yeni katılan ekip üyelerinin donanım ihtiyacı.",
      "Onay sırası: Genel Müdür, ardından Yazılım Ekip Lideri.",
    ],
  },
  {
    title: "KVKK Aydınlatma Metni ve Açık Rıza Onayı",
    description: "Kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
    sender: "zeynep@demo.com",
    after: [],
    dueInDays: 10,
    content: [
      "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla sizi bilgilendiririz.",
      "İşlenen veriler: kimlik, iletişim, özlük ve işlem güvenliği verileri.",
      "Amaç: İş sözleşmesinin ifası, yasal yükümlülüklerin yerine getirilmesi ve bilgi güvenliğinin sağlanması.",
      "Haklarınız: KVKK m.11 kapsamındaki haklarınızı yazılı başvuru ile kullanabilirsiniz.",
    ],
  },
  {
    title: "Bulut E-İmza Hizmet Sözleşmesi",
    description: "Kurumsal bulut e-imza platformu yıllık lisans ve hizmet sözleşmesi.",
    sender: "zeynep@demo.com",
    after: ["mehmet@demo.com"],
    dueInDays: 21,
    content: [
      "1. HİZMET: Sağlayıcı, müşteriye bulut tabanlı elektronik ve mobil imza platformunu 12 ay süreyle sunar.",
      "2. KAPSAM: 250 kullanıcı lisansı, sınırsız belge gönderimi ve denetim kaydı raporlaması.",
      "3. HİZMET SEVİYESİ: Aylık %99,9 erişilebilirlik taahhüt edilir; planlı bakımlar önceden bildirilir.",
      "4. VERİ GÜVENLİĞİ: Veriler Türkiye'deki veri merkezlerinde şifreli olarak saklanır.",
      "5. ÜCRET: Yıllık lisans bedeli fatura tarihinden itibaren 30 gün içinde ödenir.",
    ],
  },
  {
    title: "Proje Teslim Tutanağı — E-İmza Modülü v1.0",
    description: "E-imza modülünün kabul testlerinin tamamlandığını gösteren tutanak.",
    sender: "mehmet@demo.com",
    after: ["zeynep@demo.com", "ayse@demo.com"],
    dueInDays: 14,
    content: [
      "Teslim edilen: E-İmza Modülü v1.0 (sıralı imza, ekran imzası, mobil imza, denetim kaydı).",
      "Kabul testleri: 42 senaryonun tamamı başarıyla geçmiştir.",
      "Güvenlik: OWASP Top 10 kontrolleri yapılmış, kritik bulgu tespit edilmemiştir.",
      "Bu tutanak, imzacıların tamamı tarafından imzalandığında yürürlüğe girer.",
    ],
  },
];

/**
 * Makes sure the demo senders exist. Accounts created here get a random,
 * unknown password: nobody can log in as a demo user and read other users'
 * sample documents.
 */
const ensureDemoUsers = async ({ password } = {}) => {
  const users = {};
  for (const demo of DEMO_USERS) {
    let user = await User.findOne({ email: demo.email });
    if (!user) {
      const secret = password ?? crypto.randomBytes(32).toString("hex");
      user = await User.create({ ...demo, password: await bcrypt.hash(secret, 10) });
    }
    users[demo.email] = user;
  }
  return users;
};

const signerOf = (user, extra = {}) => ({
  user: user._id,
  name: user.name,
  title: user.title || "",
  email: user.email,
  ...extra,
});

const audit = (document, actor, action, note) => ({
  document: document._id,
  documentTitle: document.title,
  actor: actor._id,
  actorName: actor.name,
  action,
  note,
});

// Sample PDFs are identical for every user on the same day, so they're built once
// (font embedding takes ~0.5 s per PDF) and reused. Key: title + date.
const pdfCache = new Map();
const samplePdf = async (sample, sender, createdAt) => {
  const key = `${sample.title}|${createdAt.toDateString()}`;
  if (!pdfCache.has(key)) {
    if (pdfCache.size > 50) pdfCache.clear();
    pdfCache.set(
      key,
      await buildContentPdf({
        title: sample.title,
        description: sample.description,
        content: sample.content,
        senderName: sender.name,
        createdAt,
      }),
    );
  }
  return pdfCache.get(key);
};

/** Creates the sample documents for `user`. Skips documents the user already has. */
const createSampleDocuments = async (user) => {
  const demo = await ensureDemoUsers();
  const created = [];

  for (const sample of SAMPLE_DOCUMENTS) {
    const sender = demo[sample.sender];
    if (await Document.exists({ title: sample.title, sender: sender._id, "signers.user": user._id })) continue;

    const signedBefore = (sample.before ?? []).map((email, i) =>
      signerOf(demo[email], {
        status: "signed",
        method: "mobile",
        signedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
      }),
    );

    const createdAt = new Date();
    const pdf = await samplePdf(sample, sender, createdAt);
    const fileName = `${sample.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.pdf`;

    const document = await Document.create({
      title: sample.title,
      description: sample.description,
      content: sample.content,
      pages: 1,
      dueDate: daysFromNow(sample.dueInDays),
      sender: sender._id,
      senderName: sender.name,
      file: { name: fileName, size: pdf.length, sha256: crypto.createHash("sha256").update(pdf).digest("hex") },
      signers: [...signedBefore, signerOf(user), ...sample.after.map((email) => signerOf(demo[email]))],
    });
    await DocumentFile.create({ document: document._id, data: pdf });

    await AuditLog.create(audit(document, sender, "created", "Örnek belge"));
    for (const email of sample.before ?? []) {
      await AuditLog.create(audit(document, demo[email], "signed", "Mobil imza ile imzalandı"));
    }
    created.push(document);
  }
  return created;
};

module.exports = { DEMO_USERS, SAMPLE_DOCUMENTS, ensureDemoUsers, createSampleDocuments };
