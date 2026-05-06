import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function ProfileSettings({ session, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [providerType, setProviderType] = useState("individual");
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [phone, setPhone] = useState("");

  // ✨ المتغيرات الجديدة الخاصة باسم المستخدم والتسويق ✨
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState(""); // لمعرفة اسم المستخدم الحالي وتجاهله في الفحص
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle, checking, available, taken, invalid
  const [marketingSource, setMarketingSource] = useState("");
  const [referredBy, setReferredBy] = useState("");

  const [themeColor, setThemeColor] = useState("#7c3aed");

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

  const [nationalId, setNationalId] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // مؤقت للتحقق من اسم المستخدم (Debounce)
  const typingTimeoutRef = useRef(null);

  const availableColors = [
    "#7c3aed",
    "#2563eb",
    "#0ea5e9",
    "#059669",
    "#84cc16",
    "#eab308",
    "#f97316",
    "#dc2626",
    "#db2777",
    "#d946ef",
    "#57534e",
    "#1e293b",
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
        setThemeColor(data.theme_color || "#7c3aed");
        setProviderType(data.provider_type || "individual");
        setMaxCapacity(data.max_concurrent_bookings || 1);
        setPhone(data.phone || "");

        // تحميل بيانات التسويق واسم المستخدم
        setUsername(data.username || "");
        setOriginalUsername(data.username || "");
        setMarketingSource(data.marketing_source || "");
        setReferredBy(data.referred_by || "");

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

  // ✨ دالة التحقق من توفر اسم المستخدم (تعمل تلقائياً عند الكتابة) ✨
  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().trim();
    setUsername(val);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!val) {
      setUsernameStatus("idle");
      return;
    }

    // التحقق من الصيغة (حروف إنجليزية وأرقام فقط بدون مسافات)
    const isValidFormat = /^[a-z0-9_]+$/.test(val);
    if (!isValidFormat) {
      setUsernameStatus("invalid");
      return;
    }

    // إذا كان هو نفس اسمه القديم، لا داعي للتحقق من قاعدة البيانات
    if (val === originalUsername) {
      setUsernameStatus("available");
      return;
    }

    setUsernameStatus("checking");
    typingTimeoutRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", val)
        .neq("id", session.user.id);

      if (data && data.length > 0) {
        setUsernameStatus("taken");
      } else {
        setUsernameStatus("available");
      }
    }, 800); // ينتظر 800 جزء من الثانية بعد التوقف عن الكتابة ليفحص
  };

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
    if (
      usernameStatus === "taken" ||
      usernameStatus === "checking" ||
      usernameStatus === "invalid"
    ) {
      alert("يرجى اختيار اسم مستخدم (Username) صحيح ومتاح قبل الحفظ 🛑");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username: username || null, // لتجنب الأخطاء إذا كان فارغاً
        marketing_source: marketingSource,
        referred_by: referredBy,
        avatar_url: avatarUrl,
        theme_color: themeColor,
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
      setOriginalUsername(username); // تحديث الاسم الأصلي بعد الحفظ الناجح
      alert("تم التحديث بنجاح ✅");
      if (onUpdate) onUpdate();
    } else {
      if (error.code === "23505") {
        // كود الخطأ الخاص بتكرار البيانات الفريدة في قاعدة البيانات
        alert(
          "عذراً! اسم المستخدم هذا تم حجزه في هذه اللحظة، الرجاء اختيار اسم آخر.",
        );
        setUsernameStatus("taken");
      } else {
        alert("خطأ: " + error.message);
      }
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

      {/* ✨ بطاقة الهوية الذكية ✨ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "30px",
          backgroundColor: "#f8fafc",
          padding: "30px",
          borderRadius: "20px",
          border: `2px solid ${themeColor}30`,
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
              border: `4px solid ${themeColor}`,
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
        {username &&
          usernameStatus !== "taken" &&
          usernameStatus !== "invalid" && (
            <div
              style={{
                color: themeColor,
                fontWeight: "bold",
                direction: "ltr",
                backgroundColor: `${themeColor}15`,
                padding: "4px 12px",
                borderRadius: "15px",
                fontSize: "0.9rem",
                marginBottom: "10px",
              }}
            >
              @{username}
            </div>
          )}
        <p
          style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "0.9rem" }}
        >
          {providerType === "institution" ? "مؤسسة / شركة" : "فرد (مستقل)"}
        </p>

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
            🎨 اختر لون هويتك البصرية
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

      <form
        onSubmit={handleUpdate}
        style={{ display: "flex", flexDirection: "column", gap: "25px" }}
      >
        {/* 🚀 قسم الهوية الرقمية والتسويق 🚀 */}
        <div
          style={{
            ...sectionS,
            border: `1px solid ${themeColor}40`,
            backgroundColor: `${themeColor}05`,
          }}
        >
          <h3
            style={{
              ...secTitle,
              color: themeColor,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>🔗</span> الهوية الرقمية
            والانضمام
          </h3>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ ...lblS, color: "#1e293b" }}>
              اسم المستخدم (Username):
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "12px",
                  color: "#94a3b8",
                  fontWeight: "bold",
                }}
              >
                @
              </span>
              <input
                type="text"
                dir="ltr"
                style={{
                  ...inpS,
                  paddingLeft: "35px",
                  borderColor:
                    usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "#ef4444"
                      : usernameStatus === "available"
                        ? "#10b981"
                        : "#cbd5e1",
                }}
                value={username}
                onChange={handleUsernameChange}
                placeholder="nabeel88"
              />
              {usernameStatus === "checking" && (
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "12px",
                    fontSize: "0.9rem",
                  }}
                >
                  ⏳ جاري الفحص...
                </span>
              )}
              {usernameStatus === "available" && (
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "12px",
                    color: "#10b981",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                >
                  ✅ متاح
                </span>
              )}
              {usernameStatus === "taken" && (
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "12px",
                    color: "#ef4444",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                >
                  ❌ مستخدم مسبقاً
                </span>
              )}
              {usernameStatus === "invalid" && (
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "12px",
                    color: "#ef4444",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                >
                  ⚠️ حروف إنجليزية وأرقام فقط
                </span>
              )}
            </div>
            <p
              style={{
                margin: "5px 0 0 0",
                fontSize: "0.75rem",
                color: "#64748b",
              }}
            >
              * سيتم استخدامه كرابط مباشر لملفك الشخصي.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label style={lblS}>كيف تعرفت علينا؟</label>
              <select
                style={{ ...inpS, cursor: "pointer" }}
                value={marketingSource}
                onChange={(e) => setMarketingSource(e.target.value)}
              >
                <option value="">اختر من القائمة...</option>
                <option value="twitter">تويتر (X)</option>
                <option value="snapchat">سناب شات</option>
                <option value="friend">صديق / شخص مسوق</option>
                <option value="search">محرك بحث (جوجل)</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label style={lblS}>كود المسوق (إذا دعاك شخص للمنصة):</label>
              <input
                type="text"
                dir="ltr"
                style={{
                  ...inpS,
                  textAlign: "left",
                  backgroundColor:
                    marketingSource === "friend" ? "#fff" : "#f8fafc",
                }}
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="أدخل Username الخاص بالمسوق"
              />
            </div>
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
              <label style={lblS}>الاسم الكامل (أو اسم المؤسسة):</label>
              <input
                type="text"
                required
                style={inpS}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم الذي يظهر للعملاء"
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

        {/* 🛡️ التوثيق المالي */}
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
                color:
                  verificationStatus === "verified" ? "#065f46" : "#1e40af",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "900",
                fontSize: "1.2rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>🛡️</span> التوثيق المالي
            </h3>
            {verificationStatus === "verified" && (
              <span style={badgeS("#10b981")}>✅ موثق رسمياً</span>
            )}
            {verificationStatus === "pending" && (
              <span style={badgeS("#f59e0b")}>⏳ قيد المراجعة</span>
            )}
            {verificationStatus === "rejected" && (
              <span style={badgeS("#ef4444")}>❌ مرفوض</span>
            )}
            {verificationStatus === "unverified" && (
              <span style={badgeS("#94a3b8")}>غير موثق</span>
            )}
          </div>

          {verificationStatus === "verified" ? (
            <p
              style={{
                fontSize: "0.9rem",
                color: "#065f46",
                margin: 0,
                fontWeight: "bold",
              }}
            >
              حسابك موثق ومؤهل لاستقبال الحوالات المالية. ستظهر شارة التوثيق في
              صفحتك.
            </p>
          ) : (
            <div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#1e40af",
                  marginBottom: "20px",
                  fontWeight: "bold",
                }}
              >
                أكمل بيانات التوثيق لضمان سلاسة التحويلات المالية عند تنفيذ
                الخدمات.
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
                    رقم الهوية / الإقامة:
                  </label>
                  <input
                    type="text"
                    style={{ ...inpS, borderColor: "#bfdbfe" }}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    disabled={verificationStatus === "pending"}
                    placeholder="مثال: 10xxxxxxxxx"
                  />
                </div>
                <div>
                  <label style={{ ...lblS, color: "#1e40af" }}>
                    الآيبان (IBAN):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    style={{
                      ...inpS,
                      textAlign: "left",
                      borderColor: "#bfdbfe",
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
                    transition: "0.2s",
                  }}
                >
                  {isSubmitting ? "⏳ جاري..." : "إرسال طلب التوثيق الآن 🚀"}
                </button>
              )}
            </div>
          )}
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
                  الطاقة الاستيعابية (حجوزات מתزامنة):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  style={{ ...inpS, borderColor: "#bfdbfe" }}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                />
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
                <label style={lblS}>
                  رقم الترخيص / وثيقة العمل الحر (إن وجد):
                </label>
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

        {/* زر الحفظ العائم */}
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
            disabled={
              isSubmitting || isUploading || usernameStatus === "checking"
            }
            style={{
              width: "100%",
              backgroundColor:
                isSubmitting || isUploading || usernameStatus === "checking"
                  ? "#94a3b8"
                  : themeColor,
              color: "white",
              border: "none",
              padding: "16px",
              borderRadius: "14px",
              fontWeight: "900",
              fontSize: "1.1rem",
              cursor:
                isSubmitting || isUploading || usernameStatus === "checking"
                  ? "not-allowed"
                  : "pointer",
              transition: "0.3s",
              boxShadow:
                isSubmitting || isUploading
                  ? "none"
                  : `0 4px 15px ${themeColor}50`,
            }}
          >
            {isSubmitting ? "⏳ جاري الحفظ..." : "حفظ التعديلات الشاملة ✅"}
          </button>
        </div>
      </form>
    </div>
  );
}

// التنسيقات
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
const badgeS = (bgColor) => ({
  backgroundColor: bgColor,
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "10px",
  fontSize: "0.8rem",
  fontWeight: "bold",
  boxShadow: `0 2px 5px ${bgColor}40`,
});
