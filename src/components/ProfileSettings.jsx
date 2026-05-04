import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function ProfileSettings({ session, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [providerType, setProviderType] = useState("individual");
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [phone, setPhone] = useState("");

  // ✨ اللون المخصص لهوية المزود ✨
  const [themeColor, setThemeColor] = useState("#7c3aed");

  // 📱 روابط السوشيال ميديا
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  const [is24x7, setIs24x7] = useState(true);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("22:00");

  const [taxNumber, setTaxNumber] = useState("");
  const [licenseInfo, setLicenseInfo] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [providerNote, setProviderNote] = useState("");

  // 🛡️ حالات نظام التوثيق الجديد
  const [nationalId, setNationalId] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 🎨 قائمة الألوان المتاحة للمزودين (موسعة)
  const availableColors = [
    "#7c3aed", // بنفسجي (الافتراضي)
    "#2563eb", // أزرق أساسي
    "#0ea5e9", // أزرق سماوي (Cyan)
    "#059669", // أخضر زمردي
    "#84cc16", // أخضر ليموني (Lime)
    "#eab308", // أصفر مشرق 💛
    "#f97316", // برتقالي (Orange)
    "#dc2626", // أحمر
    "#db2777", // وردي
    "#d946ef", // فوشيا
    "#57534e", // بني/رمادي دافئ (Stone)
    "#1e293b", // كحلي داكن/أسود
  ];

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
        setThemeColor(data.theme_color || "#7c3aed"); // جلب اللون
        setProviderType(data.provider_type || "individual");
        setMaxCapacity(data.max_concurrent_bookings || 1);
        setPhone(data.phone || "");

        setInstagramUrl(data.instagram_url || "");
        setYoutubeUrl(data.youtube_url || "");
        setTwitterUrl(data.twitter_url || "");
        setTiktokUrl(data.tiktok_url || "");

        setIs24x7(data.is_24_7 !== false);
        setWorkStart(data.work_start_time?.substring(0, 5) || "08:00");
        setWorkEnd(data.work_end_time?.substring(0, 5) || "22:00");

        setTaxNumber(data.tax_number || "");
        setLicenseInfo(data.license_info || "");
        setAdminNote(data.admin_note || "");
        setProviderNote(data.provider_note || "");

        setNationalId(data.national_id || "");
        setBankIban(data.bank_iban || "");
        setVerificationStatus(data.verification_status || "unverified");
      }
      setLoading(false);
    }
    loadProfile();
  }, [session]);

  const uploadAvatar = async (event) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0)
        throw new Error("يجب اختيار صورة.");
      const file = event.target.files[0];
      const fileName = `${session.user.id}-${Math.random()}.${file.name.split(".").pop()}`;
      let { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      if (data) {
        setAvatarUrl(data.publicUrl);
        alert('تم رفع الصورة مؤقتاً! اضغط "حفظ التعديلات" لتثبيتها ✅');
      }
    } catch (error) {
      alert("خطأ: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendReply = async () => {
    if (!providerNote.trim()) return alert("الرجاء كتابة رد أولاً ✍️");
    setIsSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ provider_note: providerNote })
      .eq("id", session.user.id);
    setIsSubmitting(false);
    if (!error) alert("تم إرسال الرد للإدارة بنجاح ✅");
    else alert("خطأ في إرسال الرد: " + error.message);
  };

  const handleVerificationRequest = async () => {
    if (!nationalId || !bankIban)
      return alert("الرجاء إدخال رقم الهوية ورقم الآيبان البنكي لتقديم الطلب.");

    if (
      window.confirm(
        "هل أنت متأكد من صحة البيانات؟ (لن تتمكن من تعديلها أثناء المراجعة)",
      )
    ) {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          national_id: nationalId,
          bank_iban: bankIban,
          verification_status: "pending",
        })
        .eq("id", session.user.id);

      setIsSubmitting(false);

      if (!error) {
        setVerificationStatus("pending");
        alert("تم إرسال طلب التوثيق للإدارة بنجاح! سيتم مراجعته قريباً ✅");
      } else {
        alert("حدث خطأ أثناء الإرسال: " + error.message);
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
        theme_color: themeColor, // حفظ اللون
        provider_type: providerType,
        max_concurrent_bookings:
          providerType === "individual" ? 1 : Number(maxCapacity),
        phone,
        instagram_url: instagramUrl,
        youtube_url: youtubeUrl,
        twitter_url: twitterUrl,
        tiktok_url: tiktokUrl,
        is_24_7: is24x7,
        work_start_time: workStart,
        work_end_time: workEnd,
        tax_number: taxNumber,
        license_info: licenseInfo,
        provider_note: providerNote,
      })
      .eq("id", session.user.id);
    setIsSubmitting(false);
    if (!error) {
      alert("تم التحديث بنجاح ✅");
      if (onUpdate) onUpdate();
    } else {
      alert("خطأ: " + error.message);
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ⏳ جاري التحميل...
      </div>
    );

  const defaultAvatar = `https://ui-avatars.com/api/?name=${fullName || "User"}&background=${themeColor.replace("#", "")}&color=fff&size=100`;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "30px",
        borderRadius: "20px",
        border: "1px solid #f1f5f9",
        maxWidth: "800px",
        margin: "0 auto",
        direction: "rtl",
      }}
    >
      <h2
        style={{
          color: "#1e293b",
          marginBottom: "30px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "1.5rem",
          fontWeight: "900",
        }}
      >
        <span style={{ fontSize: "2rem" }}>👤</span> إعدادات الحساب الشخصي
      </h2>

      {/* ✨ بطاقة الهوية الذكية وتخصيص اللون ✨ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "30px",
          backgroundColor: "#f8fafc",
          padding: "30px",
          borderRadius: "20px",
          border: `2px solid ${themeColor}30`, // ظل إطار خفيف بناءً على اللون المختار
          boxShadow: `0 4px 20px ${themeColor}15`,
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ position: "relative", marginBottom: "15px" }}>
          <img
            src={avatarUrl || defaultAvatar}
            alt="Avatar"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              border: `4px solid ${themeColor}`, // يتغير لون الإطار حسب اللون المختار
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
            style={{
              position: "absolute",
              bottom: "0",
              right: "0",
              backgroundColor: themeColor,
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: "35px",
              height: "35px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: isUploading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
            }}
            title="تغيير الصورة"
          >
            {isUploading ? "⏳" : "📷"}
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={isUploading}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
        </div>
        <h3
          style={{
            margin: "0 0 5px 0",
            color: "#1e293b",
            fontSize: "1.2rem",
            fontWeight: "900",
          }}
        >
          {fullName || "بدون اسم"}
        </h3>
        <p
          style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "0.9rem" }}
        >
          {providerType === "institution" ? "مؤسسة / شركة" : "فرد (مستقل)"}
        </p>

        {/* 🎨 شريط اختيار لون الهوية */}
        <div
          style={{
            width: "100%",
            borderTop: "1px dashed #cbd5e1",
            paddingTop: "20px",
            textAlign: "center",
          }}
        >
          <h4
            style={{
              margin: "0 0 15px 0",
              color: "#475569",
              fontSize: "0.95rem",
            }}
          >
            🎨 اختر لون هويتك (سيظهر للعملاء في خدماتك)
          </h4>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setThemeColor(color)}
                style={{
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: themeColor === color ? `3px solid #fff` : "none",
                  boxShadow:
                    themeColor === color
                      ? `0 0 0 3px ${color}`
                      : "0 2px 5px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  transform: themeColor === color ? "scale(1.15)" : "scale(1)",
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 🛡️ قسم التوثيق الذكي 🛡️ */}
      <div
        style={{
          background:
            verificationStatus === "verified"
              ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
              : "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
          padding: "25px",
          borderRadius: "20px",
          border:
            verificationStatus === "verified"
              ? "1px solid #10b981"
              : "1px solid #3b82f6",
          marginBottom: "30px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: verificationStatus === "verified" ? "#065f46" : "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "900",
              fontSize: "1.2rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🛡️</span> التوثيق المالي
            (Nafath)
          </h3>
          {/* شارات الحالة */}
          {verificationStatus === "verified" && (
            <span
              style={{
                backgroundColor: "#10b981",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                fontWeight: "bold",
                boxShadow: "0 2px 5px rgba(16,185,129,0.3)",
              }}
            >
              ✅ موثق رسمياً
            </span>
          )}
          {verificationStatus === "pending" && (
            <span
              style={{
                backgroundColor: "#f59e0b",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                fontWeight: "bold",
                boxShadow: "0 2px 5px rgba(245,158,11,0.3)",
              }}
            >
              ⏳ قيد المراجعة
            </span>
          )}
          {verificationStatus === "rejected" && (
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                fontWeight: "bold",
                boxShadow: "0 2px 5px rgba(239,68,68,0.3)",
              }}
            >
              ❌ مرفوض
            </span>
          )}
          {verificationStatus === "unverified" && (
            <span
              style={{
                backgroundColor: "#94a3b8",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "10px",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              غير موثق
            </span>
          )}
        </div>

        {verificationStatus === "verified" ? (
          <p
            style={{
              fontSize: "0.9rem",
              color: "#065f46",
              margin: 0,
              fontWeight: "bold",
              lineHeight: "1.6",
            }}
          >
            تهانينا! حسابك موثق ومؤهل لاستقبال الحوالات المالية. ستظهر شارة
            التوثيق في صفحتك لزيادة ثقة العملاء.
          </p>
        ) : (
          <div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#1e40af",
                marginBottom: "20px",
                lineHeight: "1.6",
                fontWeight: "bold",
              }}
            >
              ارفع مستوى ثقة عملائك! أكمل بيانات التوثيق لضمان سلاسة التحويلات
              المالية عند تنفيذ الخدمات. (البيانات مشفرة وآمنة تماماً).
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
                marginBottom: verificationStatus !== "pending" ? "15px" : "0",
              }}
            >
              <div>
                <label style={{ ...lblS, color: "#1e40af" }}>
                  رقم الهوية الوطنية / الإقامة:
                </label>
                <input
                  type="text"
                  style={{
                    ...inpS,
                    borderColor: "#bfdbfe",
                    backgroundColor: "#fff",
                  }}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={verificationStatus === "pending"}
                  placeholder="مثال: 10xxxxxxxxx"
                />
              </div>
              <div>
                <label style={{ ...lblS, color: "#1e40af" }}>
                  رقم الحساب البنكي (IBAN):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  style={{
                    ...inpS,
                    textAlign: "left",
                    borderColor: "#bfdbfe",
                    backgroundColor: "#fff",
                  }}
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  disabled={verificationStatus === "pending"}
                  placeholder="SAxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
            </div>
            {verificationStatus !== "pending" && (
              <button
                type="button"
                onClick={handleVerificationRequest}
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontWeight: "900",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  boxShadow: "0 4px 10px rgba(37,99,235,0.3)",
                  transition: "0.2s",
                }}
              >
                {isSubmitting
                  ? "⏳ جاري الإرسال..."
                  : "إرسال طلب التوثيق الآن 🚀"}
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleUpdate}
        style={{ display: "flex", flexDirection: "column", gap: "25px" }}
      >
        {/* 📩 قسم الرسائل الإدارية */}
        <div
          style={{
            ...sectionS,
            borderColor: adminNote ? "#fca5a5" : "#e2e8f0",
            backgroundColor: adminNote ? "#fef2f2" : "#f8fafc",
          }}
        >
          <h3 style={{ ...secTitle, color: adminNote ? "#ef4444" : "#1e293b" }}>
            📩 تواصل مع إدارة المنصة
          </h3>
          {adminNote && (
            <div
              style={{
                backgroundColor: "#fff",
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid #fecaca",
                marginBottom: "15px",
              }}
            >
              <strong
                style={{
                  color: "#dc2626",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                رسالة من الإدارة:
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  color: "#7f1d1d",
                  fontWeight: "bold",
                  lineHeight: "1.5",
                }}
              >
                {adminNote}
              </p>
            </div>
          )}
          <div>
            <label style={lblS}>ردك / رسالتك للإدارة (اختياري):</label>
            <textarea
              style={{
                ...inpS,
                height: "80px",
                marginBottom: "10px",
                resize: "vertical",
              }}
              value={providerNote}
              onChange={(e) => setProviderNote(e.target.value)}
              placeholder="اكتب ملاحظاتك أو ردك للإدارة هنا..."
            />
            <button
              type="button"
              onClick={handleSendReply}
              disabled={isSubmitting}
              style={{
                width: "100%",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: "900",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              {isSubmitting ? "⏳ جاري الإرسال..." : "📤 إرسال الرد للإدارة"}
            </button>
          </div>
        </div>

        {/* 📝 البيانات الأساسية */}
        <div style={sectionS}>
          <h3 style={secTitle}>البيانات الأساسية والتواصل</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label style={lblS}>الاسم الكامل:</label>
              <input
                type="text"
                required
                style={inpS}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم ثلاثي أو اسم المؤسسة"
              />
            </div>
            <div>
              <label style={lblS}>رقم الجوال:</label>
              <input
                type="tel"
                style={{ ...inpS, textAlign: "left" }}
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
              />
            </div>
          </div>

          <h4
            style={{
              margin: "20px 0 10px 0",
              fontSize: "0.95rem",
              color: "#3b82f6",
              fontWeight: "900",
            }}
          >
            روابط السوشيال ميديا (اختياري):
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label style={lblS}>يوتيوب:</label>
              <input
                type="url"
                dir="ltr"
                style={{ ...inpS, textAlign: "left" }}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div>
              <label style={lblS}>انستقرام:</label>
              <input
                type="url"
                dir="ltr"
                style={{ ...inpS, textAlign: "left" }}
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label style={lblS}>تويتر (X):</label>
              <input
                type="url"
                dir="ltr"
                style={{ ...inpS, textAlign: "left" }}
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/..."
              />
            </div>
            <div>
              <label style={lblS}>تيك توك:</label>
              <input
                type="url"
                dir="ltr"
                style={{ ...inpS, textAlign: "left" }}
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/..."
              />
            </div>
          </div>
        </div>

        {/* 📜 الوثائق الرسمية والنوع */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "25px",
          }}
        >
          <div style={sectionS}>
            <h3 style={secTitle}>نوع الحساب</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={lblS}>تصنيف الحساب:</label>
              <select
                style={{ ...inpS, cursor: "pointer" }}
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
              >
                <option value="individual">👤 فرد (مستقل)</option>
                <option value="institution">🏢 مؤسسة / شركة</option>
              </select>
            </div>
            {providerType === "institution" && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px dashed #3b82f6",
                }}
              >
                <label style={{ ...lblS, color: "#1e40af" }}>
                  الطاقة الاستيعابية (حجوزات متزامنة):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  style={{ ...inpS, borderColor: "#bfdbfe" }}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                />
                <p
                  style={{
                    margin: "5px 0 0 0",
                    fontSize: "0.75rem",
                    color: "#64748b",
                  }}
                >
                  * لتتمكن من استقبال أكثر من حجز في نفس الوقت.
                </p>
              </div>
            )}
          </div>

          <div style={sectionS}>
            <h3 style={secTitle}>الضرائب والتراخيص</h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label style={lblS}>الرقم الضريبي (إن وجد):</label>
                <input
                  type="text"
                  style={inpS}
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="مثال: 300012345600003"
                />
              </div>
              <div>
                <label style={lblS}>رقم الترخيص / وثيقة العمل الحر:</label>
                <input
                  type="text"
                  style={inpS}
                  value={licenseInfo}
                  onChange={(e) => setLicenseInfo(e.target.value)}
                  placeholder="سيظهر للعملاء لزيادة الثقة.."
                />
              </div>
            </div>
          </div>
        </div>

        {/* زر الحفظ العائم (يتغير لونه ليتناسب مع لون المزود!) */}
        <div
          style={{
            position: "sticky",
            bottom: "20px",
            zIndex: 1000,
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            padding: "15px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            style={{
              width: "100%",
              backgroundColor:
                isSubmitting || isUploading ? "#94a3b8" : themeColor, // يتغير مع اختيار المزود
              color: "white",
              border: "none",
              padding: "16px",
              borderRadius: "14px",
              fontWeight: "900",
              fontSize: "1.1rem",
              cursor: isSubmitting || isUploading ? "not-allowed" : "pointer",
              transition: "0.3s",
              boxShadow:
                isSubmitting || isUploading
                  ? "none"
                  : `0 4px 15px ${themeColor}50`,
            }}
          >
            {isSubmitting
              ? "⏳ جاري الحفظ والتحديث..."
              : "حفظ التعديلات الشاملة ✅"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ✨ التنسيقات العصرية ✨
const sectionS = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
  flex: 1,
};
const secTitle = {
  margin: "0 0 20px 0",
  fontSize: "1.1rem",
  color: "#1e293b",
  borderBottom: "2px solid #f1f5f9",
  paddingBottom: "10px",
  fontWeight: "900",
};
const lblS = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  fontSize: "0.85rem",
  color: "#475569",
};
const inpS = {
  width: "100%",
  padding: "12px 15px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "0.95rem",
  transition: "all 0.2s ease",
  backgroundColor: "#f8fafc",
};
