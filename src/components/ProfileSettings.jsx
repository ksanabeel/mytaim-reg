import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function ProfileSettings({ session, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [providerType, setProviderType] = useState("individual");
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [phone, setPhone] = useState("");

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

        // استرجاع بيانات التوثيق
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

  // 🛡️ دالة إرسال طلب التوثيق للإدارة
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
          verification_status: "pending", // تغيير الحالة إلى "قيد المراجعة"
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

  const defaultAvatar = `https://ui-avatars.com/api/?name=${fullName || "User"}&background=7c3aed&color=fff&size=100`;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "30px",
        borderRadius: "20px",
        border: "1px solid #f1f5f9",
        maxWidth: "700px",
        margin: "0 auto",
        direction: "rtl",
      }}
    >
      <h2
        style={{
          color: "#7c3aed",
          marginBottom: "20px",
          borderBottom: "2px solid #f1f5f9",
          paddingBottom: "10px",
        }}
      >
        👤 إعدادات الحساب الشخصي
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "25px",
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "15px",
          border: "1px dashed #cbd5e1",
        }}
      >
        <img
          src={avatarUrl || defaultAvatar}
          alt="Avatar"
          style={{
            width: "85px",
            height: "85px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #7c3aed",
          }}
        />
        <div style={{ flex: 1 }}>
          <label style={lblS}>الصورة الشخصية:</label>
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={isUploading}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
            style={uploadBtn(isUploading)}
          >
            {isUploading ? "⏳ جاري الرفع..." : "📂 اختر صورة من الجهاز"}
          </button>
        </div>
      </div>

      {/* 🛡️ قسم التوثيق الجديد (محفز وجذاب) 🛡️ */}
      <div
        style={{
          backgroundColor:
            verificationStatus === "verified" ? "#ecfdf5" : "#fffbeb",
          padding: "20px",
          borderRadius: "15px",
          border:
            verificationStatus === "verified"
              ? "2px solid #10b981"
              : "1px solid #fcd34d",
          marginBottom: "25px",
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
              color: verificationStatus === "verified" ? "#059669" : "#d97706",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            🛡️ توثيق الحساب (Nafath)
          </h3>
          {/* شارات الحالة */}
          {verificationStatus === "verified" && (
            <span
              style={{
                backgroundColor: "#10b981",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              ✅ حساب موثق
            </span>
          )}
          {verificationStatus === "pending" && (
            <span
              style={{
                backgroundColor: "#f59e0b",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              ⏳ قيد المراجعة الإدارية
            </span>
          )}
          {verificationStatus === "rejected" && (
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              ❌ مرفوض (راجع البيانات)
            </span>
          )}
          {verificationStatus === "unverified" && (
            <span
              style={{
                backgroundColor: "#94a3b8",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "0.75rem",
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
              fontSize: "0.85rem",
              color: "#065f46",
              margin: 0,
              fontWeight: "bold",
            }}
          >
            تهانينا! حسابك موثق رسمياً. ستظهر علامة التوثيق الخضراء للعملاء
            بجانب اسمك مما يزيد من المبيعات والثقة.
          </p>
        ) : (
          <div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#92400e",
                marginBottom: "15px",
                lineHeight: "1.5",
              }}
            >
              احصل على شارة التوثيق الخضراء لزيادة ثقة العملاء بك ومضاعفة
              حجوزاتك! 🚀
              <br />
              يرجى إدخال بياناتك الرسمية لمطابقتها من قبل الإدارة. (هذه البيانات
              سرية ولن تظهر للعامة).
            </p>
            <div
              style={{ display: "flex", gap: "10px", flexDirection: "column" }}
            >
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...lblS, color: "#92400e" }}>
                    رقم الهوية الوطنية / الإقامة:
                  </label>
                  <input
                    type="text"
                    style={inpS}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    disabled={verificationStatus === "pending"}
                    placeholder="مثال: 10xxxxxxxxx"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...lblS, color: "#92400e" }}>
                    رقم الحساب البنكي (IBAN):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    style={{ ...inpS, textAlign: "left" }}
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
                    backgroundColor: "#d97706",
                    color: "#fff",
                    border: "none",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginTop: "5px",
                  }}
                >
                  {isSubmitting
                    ? "⏳ جاري الإرسال..."
                    : "إرسال طلب التوثيق الآن 🚀"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleUpdate}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        <div
          style={{
            ...sectionS,
            borderColor: adminNote ? "#ef4444" : "#e2e8f0",
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
                borderRadius: "10px",
                border: "1px solid #fecaca",
                marginBottom: "15px",
              }}
            >
              <strong style={{ color: "#dc2626", fontSize: "0.85rem" }}>
                رسالة من الإدارة:
              </strong>
              <p
                style={{
                  margin: "5px 0 0 0",
                  fontSize: "0.9rem",
                  color: "#7f1d1d",
                  fontWeight: "bold",
                }}
              >
                {adminNote}
              </p>
            </div>
          )}
          <div>
            <label style={lblS}>ردك / رسالتك للإدارة (اختياري):</label>
            <textarea
              style={{ ...inpS, height: "60px", marginBottom: "10px" }}
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
                padding: "10px",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {isSubmitting ? "⏳ جاري الإرسال..." : "📤 إرسال الرد للإدارة"}
            </button>
          </div>
        </div>

        <div style={sectionS}>
          <h3 style={secTitle}>البيانات الأساسية والتواصل</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 2 }}>
              <label style={lblS}>الاسم الكامل:</label>
              <input
                type="text"
                required
                style={inpS}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
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
              margin: "15px 0 10px 0",
              fontSize: "0.9rem",
              color: "#3b82f6",
            }}
          >
            روابط السوشيال ميديا (اختياري):
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
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

        <div style={sectionS}>
          <h3 style={secTitle}>الوثائق الرسمية والضرائب (اختياري)</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={lblS}>الرقم الضريبي (يظهر بالفواتير):</label>
              <input
                type="text"
                style={inpS}
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="مثال: 300012345600003"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lblS}>رقم الترخيص / وثيقة العمل الحر:</label>
              <input
                type="text"
                style={inpS}
                value={licenseInfo}
                onChange={(e) => setLicenseInfo(e.target.value)}
                placeholder="رقم الترخيص يظهر للعملاء.."
              />
            </div>
          </div>
        </div>

        <div style={sectionS}>
          <h3 style={secTitle}>نوع الحساب والسعة</h3>
          <div>
            <label style={lblS}>النوع:</label>
            <select
              style={inpS}
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
            >
              <option value="individual">👤 فرد (مستقل)</option>
              <option value="institution">
                🏢 مؤسسة / شركة (حجوزات متزامنة)
              </option>
            </select>
          </div>
          {providerType === "institution" && (
            <div
              style={{
                marginTop: "10px",
                backgroundColor: "#ecfdf5",
                padding: "15px",
                borderRadius: "10px",
                border: "1px dashed #10b981",
              }}
            >
              <label style={lblS}>السعة المتزامنة:</label>
              <input
                type="number"
                min="1"
                required
                style={inpS}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          style={{
            width: "100%",
            backgroundColor:
              isSubmitting || isUploading ? "#94a3b8" : "#10b981",
            color: "white",
            border: "none",
            padding: "15px",
            borderRadius: "12px",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: isSubmitting || isUploading ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "⏳ جاري الحفظ..." : "حفظ التعديلات الشاملة ✅"}
        </button>
      </form>
    </div>
  );
}

const sectionS = {
  backgroundColor: "#f8fafc",
  padding: "20px",
  borderRadius: "15px",
  border: "1px solid #e2e8f0",
};
const secTitle = {
  margin: "0 0 15px 0",
  fontSize: "1rem",
  color: "#1e293b",
  borderBottom: "2px solid #cbd5e1",
  paddingBottom: "5px",
};
const lblS = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  fontSize: "0.85rem",
  color: "#475569",
};
const inpS = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const uploadBtn = (disabled) => ({
  width: "100%",
  backgroundColor: disabled ? "#cbd5e1" : "#3b82f6",
  color: "white",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: disabled ? "not-allowed" : "pointer",
});
