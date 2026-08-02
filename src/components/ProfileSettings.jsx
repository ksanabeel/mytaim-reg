import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next"; // ✨ استدعاء الترجمة

export default function ProfileSettings({ session, onUpdate }) {
  const { t, i18n } = useTranslation(); // ✨ تفعيل دالة الترجمة
  const isRTL = i18n.language === "ar"; // ✨ تحديد اتجاه اللغة

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [providerType, setProviderType] = useState("individual");
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [phone, setPhone] = useState("");

  // ✨ المتغيرات الخاصة باسم المستخدم والتسويق
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [marketingSource, setMarketingSource] = useState("");
  const [referredBy, setReferredBy] = useState("");

  // 🔒 المتغيرات الخاصة ببيانات الدخول والأمان
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

  // 🚨 متطلبات Apple الإجبارية للخصوصية (Guideline 5.1.1) 🚨
  const [isDeletingAccount, setIsDeletingAccount] = useState(false); // ✨ متغير حالة حذف الحساب

  const fileInputRef = useRef(null);

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
      if (session && session.user) {
        setEmail(session.user.email || "");
      }

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

  // ✨ دالة فحص اسم المستخدم الذكية والمحدثة بشرط الـ 4 خانات لحفظ اليوزرات الثمينة ✨
  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().trim();
    setUsername(val);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!val) {
      setUsernameStatus("idle");
      return;
    }

    const isValidFormat = /^[a-z0-9_]+$/.test(val);
    if (!isValidFormat) {
      setUsernameStatus("invalid");
      return;
    }

    // القفل الأمني المحدث: منع استخدام أقل من 4 خانات لحماية الحسابات النادرة والمميزة مستقبلاً
    if (val.length < 4) {
      setUsernameStatus("too_short");
      return;
    }

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
    }, 800);
  };

  const uploadAvatar = async (event) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0)
        throw new Error(t("must_choose_image", "يجب اختيار صورة."));
      const file = event.target.files[0];
      const fileName = `${session.user.id}-${Math.random()}.${file.name
        .split(".")
        .pop()}`;
      let { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      if (data) {
        setAvatarUrl(data.publicUrl);
        alert(
          t(
            "avatar_uploaded_temp",
            'تم رفع الصورة مؤقتاً! اضغط "حفظ التعديلات" لتثبيتها ✅',
          ),
        );
      }
    } catch (error) {
      alert(t("error_prefix", "خطأ: ") + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerificationRequest = async () => {
    if (!nationalId || !bankIban)
      return alert(
        t(
          "national_iban_required",
          "الرجاء إدخال رقم الهوية ورقم الآيبان البنكي لتقديم الطلب.",
        ),
      );

    if (
      window.confirm(
        t(
          "confirm_verification_data",
          "هل أنت متأكد من صحة البيانات؟ (لن تتمكن من تعديلها أثناء المراجعة)",
        ),
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
        alert(
          t(
            "verification_sent_success",
            "تم إرسال طلب التوثيق للإدارة بنجاح! سيتم مراجعته قريباً ✅",
          ),
        );
      } else {
        alert(
          t("send_error_prefix", "حدث خطأ أثناء الإرسال: ") + error.message,
        );
      }
    }
  };

  // ✨ دالة الحفظ المحدثة والمحمية ضد اليوزرات القصيرة لمنع تجاوز القيود المادية ✨
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (
      usernameStatus === "taken" ||
      usernameStatus === "checking" ||
      usernameStatus === "invalid" ||
      usernameStatus === "too_short" // منع الحفظ الصارم إذا كان اسم المستخدم المسجل غير مستوف للطول المطلوب
    ) {
      alert(
        t(
          "username_requirements_error",
          "يرجى اختيار اسم مستخدم (Username) صحيح ومتاح ومكون من 4 خانات على الأقل قبل الحفظ 🛑",
        ),
      );
      return;
    }

    setIsSubmitting(true);

    let authUpdateError = null;
    let emailConfirmationSent = false;

    // 1️⃣ تحديث كلمة المرور
    if (newPassword && newPassword.trim().length > 0) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        if (
          error.message.includes("different from the old password") ||
          error.status === 422
        ) {
          console.warn(
            t(
              "ignore_password_update",
              "تجاهل تحديث كلمة المرور (مطابقة للقديمة)",
            ),
          );
        } else {
          authUpdateError = error;
        }
      }
    }

    // 2️⃣ تحديث الإيميل
    if (!authUpdateError && email && email.trim() !== session.user.email) {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) {
        authUpdateError = error;
      } else {
        emailConfirmationSent = true;
      }
    }

    if (authUpdateError) {
      setIsSubmitting(false);
      alert(
        t("auth_update_error", "حدث خطأ أثناء تحديث بيانات الدخول: ") +
          authUpdateError.message,
      );
      return;
    }

    // 3️⃣ تحديث باقي البيانات في جدول Profiles
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username: username || null,
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
      setOriginalUsername(username);
      setNewPassword("");

      if (emailConfirmationSent) {
        alert(
          t(
            "profile_saved_email_notice",
            "تم حفظ البيانات الشاملة بنجاح ✅\n\n⚠️ تنبيه بخصوص الإيميل:\nلقد تم إرسال رابط تأكيد إلى بريدك الجديد.\nيجب عليك فتحه والضغط على الرابط ليتم التغيير الفعلي، وإلا سيبقى حسابك على الإيميل القديم.",
          ),
        );
      } else {
        alert(t("profile_updated_success", "تم تحديث الملف الشخصي بنجاح ✅"));
      }

      if (onUpdate) onUpdate();
    } else {
      if (error.code === "23505") {
        alert(
          t(
            "username_just_taken",
            "عذراً! اسم المستخدم هذا تم حجزه للتو، الرجاء اختيار اسم آخر.",
          ),
        );
        setUsernameStatus("taken");
      } else {
        alert(
          t("update_data_error", "خطأ في تحديث البيانات: ") + error.message,
        );
      }
    }
  };

  // 🚨 دالة حذف الحساب الإلزامية لاستيفاء Guideline 5.1.1 🚨
  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        t(
          "confirm_delete_account",
          "⚠️ هل أنت متأكد تماماً من حذف حسابك؟ هذا الإجراء نهائي ولا يمكن التراجع عنه سيتم حذف جميع بياناتك وحجوزاتك نهائياً!",
        ),
      )
    ) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      const { error } = await supabase.rpc("process_user_deletion", {
        user_id_param: session.user.id,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      alert(
        t(
          "account_deleted_success",
          "تم حذف حسابك وبياناتك بنجاح. نأسف لمغادرتك، ونتمنى رؤيتك مرة أخرى! 👋",
        ),
      );
    } catch (error) {
      alert(
        t("account_delete_error", "حدث خطأ أثناء محاولة حذف الحساب: ") +
          error.message,
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        {t("loading_text", "⏳ جاري التحميل...")}
      </div>
    );

  const defaultAvatar = `https://ui-avatars.com/api/?name=${
    fullName || "User"
  }&background=${themeColor.replace("#", "")}&color=fff&size=100`;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "30px",
        borderRadius: "20px",
        border: "1px solid #f1f5f9",
        maxWidth: "800px",
        margin: "0 auto",
        direction: isRTL ? "rtl" : "ltr", // ✨ تحديث الاتجاه الديناميكي
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
        <span style={{ fontSize: "2rem" }}>👤</span>{" "}
        {t("profile_settings_title", "إعدادات الحساب الشخصي")}
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
              right: isRTL ? "0" : "auto", // ✨ تحديث التموضع للغتين
              left: isRTL ? "auto" : "0", // ✨ تحديث التموضع للغتين
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
            title={t("change_avatar_tooltip", "تغيير الصورة")}
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
          {fullName || t("no_name", "بدون اسم")}
        </h3>
        {username &&
          usernameStatus !== "taken" &&
          usernameStatus !== "invalid" &&
          usernameStatus !== "too_short" && (
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
          {providerType === "institution"
            ? t("institution_desc", "/متعهد/قائد فريق او مجموعه/ مؤسسة / شركة")
            : t("individual_desc", "فرد (مستقل)")}
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
            🎨 {t("choose_theme_color", "اختر لون هويتك البصرية")}
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
        autoComplete="off"
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
            <span style={{ fontSize: "1.3rem" }}>🔗</span>{" "}
            {t("digital_identity_title", "الهوية الرقمية والانضمام")}
          </h3>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label
                style={{ fontWeight: "bold", color: "#475569", margin: 0 }}
              >
                {t("username_label", "اسم المستخدم (Username):")}
              </label>
              <div>
                {usernameStatus === "checking" && (
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    ⏳ {t("checking_username", "جاري الفحص...")}
                  </span>
                )}
                {usernameStatus === "available" &&
                  username !== originalUsername && (
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#10b981",
                        fontWeight: "bold",
                      }}
                    >
                      {t("username_available", "✅ متاح")}
                    </span>
                  )}
                {usernameStatus === "taken" && (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {t("username_taken", "❌ مستخدم مسبقاً")}
                  </span>
                )}
                {usernameStatus === "invalid" && (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {t("username_invalid", "⚠️ حروف إنجليزية وأرقام فقط")}
                  </span>
                )}
                {usernameStatus === "too_short" && (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {t(
                      "username_too_short",
                      "⚠️ يجب أن يتكون من 4 خانات على الأقل",
                    )}
                  </span>
                )}
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  right: isRTL ? "12px" : "auto", // ✨ تحديث RTL
                  left: isRTL ? "auto" : "12px", // ✨ تحديث LTR
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
                value={username}
                onChange={handleUsernameChange}
                placeholder="nabeel88"
                style={{
                  ...inpS,
                  paddingRight: isRTL ? "35px" : "15px", // ✨ تحديث RTL
                  paddingLeft: isRTL ? "15px" : "35px", // ✨ تحديث LTR
                  borderColor:
                    usernameStatus === "taken" ||
                    usernameStatus === "invalid" ||
                    usernameStatus === "too_short"
                      ? "#ef4444"
                      : usernameStatus === "available"
                      ? "#10b981"
                      : "#cbd5e1",
                }}
              />
            </div>

            {username !== originalUsername ? (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  backgroundColor: "#fef2f2",
                  borderRight: isRTL ? "4px solid #ef4444" : "none", // ✨ تحديث RTL
                  borderLeft: isRTL ? "none" : "4px solid #ef4444", // ✨ تحديث LTR
                  borderRadius: "8px",
                  color: "#991b1b",
                  fontSize: "0.85rem",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span>⚠️</span>
                <span>
                  <strong>تنبيه هام:</strong>{" "}
                  {t(
                    "username_change_warning",
                    "تغيير اسم المستخدم سيؤدي إلى تغيير الرابط الخاص بملفك، وسيتوقف الرابط القديم عن العمل.",
                  )}
                  <br />
                  <small>
                    {t(
                      "username_change_rule",
                      "* لا يمكنك تغيير اسم المستخدم مرة أخرى إلا بعد مرور 30 يوماً.",
                    )}
                  </small>
                </span>
              </div>
            ) : (
              <small
                style={{
                  color: "#64748b",
                  fontSize: "0.8rem",
                  display: "block",
                  marginTop: "6px",
                }}
              >
                {t(
                  "username_hint",
                  "* سيتم استخدامه كرابط مباشر لملفك الشخصي وللتسويق.",
                )}
              </small>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label style={lblS}>
                {t("how_did_you_know_us", "كيف تعرفت علينا؟")}
              </label>
              <select
                style={{ ...inpS, cursor: "pointer" }}
                value={marketingSource}
                onChange={(e) => setMarketingSource(e.target.value)}
              >
                <option value="">
                  {t("select_from_list", "اختر من القائمة...")}
                </option>
                <option value="twitter">
                  {t("source_twitter", "تويتر (X)")}
                </option>
                <option value="snapchat">
                  {t("source_snapchat", "سناب شات")}
                </option>
                <option value="friend">
                  {t("source_friend", "(المسوق)شريك Book On Map ")}
                </option>
                <option value="search">
                  {t("source_search", "محرك بحث (جوجل)")}
                </option>
                <option value="other">{t("source_other", "أخرى")}</option>
              </select>
            </div>
            <div>
              <label style={lblS}>
                {t("marketer_code_label", "كود المسوق (إذا دعاك شخص للمنصة):")}
              </label>
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
                placeholder={t(
                  "marketer_code_placeholder",
                  "أدخل Username الخاص بالمسوق",
                )}
              />
            </div>
          </div>
        </div>

        {/* 📝 البيانات الأساسية */}
        <div style={sectionS}>
          <h3 style={secTitle}>
            {t("basic_info_title", "البيانات الأساسية والتواصل")}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label style={lblS}>
                {t("full_name_org_label", "الاسم الكامل (أو اسم المؤسسة):")}
              </label>
              <input
                type="text"
                required
                style={inpS}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t(
                  "full_name_placeholder",
                  "الاسم الذي يظهر للعملاء",
                )}
              />
            </div>
            <div>
              <label style={lblS}>
                {t("phone_number_label", "رقم الجوال:")}
              </label>
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
            {t("social_links_title", "روابط السوشيال ميديا (اختياري):")}
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label style={lblS}>{t("youtube_label", "يوتيوب:")}</label>
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
              <label style={lblS}>{t("instagram_label", "انستقرام:")}</label>
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
              <label style={lblS}>{t("twitter_label", "تويتر (X):")}</label>
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
              <label style={lblS}>{t("tiktok_label", "تيك توك:")}</label>
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

        {/* 🛡️التوثيق المالي */}
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
              <span style={{ fontSize: "1.5rem" }}>🛡️</span>{" "}
              {t("financial_verification_title", "التوثيق المالي (اختياري)")}
            </h3>
            {verificationStatus === "verified" && (
              <span style={badgeS("#10b981")}>
                {t("verified_officially", "✅ موثق رسمياً")}
              </span>
            )}
            {verificationStatus === "pending" && (
              <span style={badgeS("#f59e0b")}>
                {t("pending_review", "⏳ قيد المراجعة")}
              </span>
            )}
            {verificationStatus === "rejected" && (
              <span style={badgeS("#ef4444")}>{t("rejected", "❌ مرفوض")}</span>
            )}
            {verificationStatus === "unverified" && (
              <span style={badgeS("#94a3b8")}>
                {t("unverified", "غير موثق")}
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
              }}
            >
              {t(
                "verification_success_msg",
                "حسابك موثق ومؤهل لاستقبال الحوالات المالية. ستظهر شارة التوثيق في صفحتك.",
              )}
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
                {t(
                  "verification_hint_msg",
                  "أكمل بيانات التوثيق لضمان سلاسة التحويلات المالية عند تنفيذ الخدمات.",
                )}
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
                    {t("national_id_label", "رقم الهوية / الإقامة:")}
                  </label>
                  <input
                    type="text"
                    style={{ ...inpS, borderColor: "#bfdbfe" }}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    disabled={verificationStatus === "pending"}
                    placeholder={t(
                      "national_id_placeholder",
                      "مثال: 10xxxxxxxxx",
                    )}
                  />
                </div>
                <div>
                  <label style={{ ...lblS, color: "#1e40af" }}>
                    {t("iban_label", "الآيبان (IBAN):")}
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
                  {isSubmitting
                    ? t("saving_btn", "⏳ جاري الحفظ...")
                    : t("send_verification_btn", "إرسال طلب التوثيق الآن 🚀")}
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
            <h3 style={secTitle}>
              {t("taxes_licenses_title", "الضرائب والتراخيص (اختياري)")}
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label style={lblS}>
                  {t("tax_number_optional", "الرقم الضريبي (إن وجد):")}
                </label>
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
                  {t(
                    "license_doc_optional",
                    "رقم الترخيص / وثيقة العمل الحر (إن وجد):",
                  )}
                </label>
                <input
                  type="text"
                  style={inpS}
                  value={licenseInfo}
                  onChange={(e) => setLicenseInfo(e.target.value)}
                  placeholder={t(
                    "license_placeholder_msg",
                    "سيظهر للعملاء لزيادة الثقة..",
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ✨ بطاقة بيانات الدخول والأمان ✨ */}
        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            marginBottom: "25px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px 0",
              color: "#1e293b",
              fontSize: "1.2rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {t(
              "login_security_title",
              "🔒 بيانات الدخول والأمان (اذا اردت تغيير البريد او كلمة المرور)",
            )}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
            }}
          >
            {/* حقل البريد الإلكتروني */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#475569",
                  fontSize: "0.95rem",
                }}
              >
                {t("email_address_label", "البريد الإلكتروني (Email):")}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                dir="ltr"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  fontSize: "1rem",
                  transition: "0.2s",
                  textAlign: "left",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              />
              <small
                style={{
                  color: "#64748b",
                  fontSize: "0.8rem",
                  display: "block",
                  marginTop: "6px",
                }}
              >
                {t(
                  "email_change_hint",
                  "* عند تغيير البريد، سيتم إرسال رابط تأكيد للإيميل الجديد.",
                )}
              </small>
            </div>

            {/* ✨ حقل كلمة المرور */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#475569",
                  fontSize: "0.95rem",
                }}
              >
                {t("new_password_label", "كلمة المرور الجديدة:")}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  fontSize: "1rem",
                  transition: "0.2s",
                  textAlign: "left",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              />
              <small
                style={{
                  color: "#64748b",
                  fontSize: "0.8rem",
                  display: "block",
                  marginTop: "6px",
                }}
              >
                {t(
                  "password_change_hint",
                  "* اترك الحقل فارغاً إذا لم ترغب في تغيير كلمة المرور.",
                )}
              </small>
            </div>
          </div>
        </div>

        {/* 🚨 قسم منطقة الخطر - حذف الحساب (متطلب Apple إجباري) 🚨 */}
        <div
          style={{
            ...sectionS,
            border: `1px solid #ef444450`, // استخدام لون الخطر الأحمر (للحدود)
            backgroundColor: `#fef2f2`, // استخدام لون الخطر الأحمر الخفيف (للخلفية)
            marginTop: "30px", // مسافة إضافية لفصله عن باقي الإعدادات
          }}
        >
          <h3
            style={{
              ...secTitle,
              color: "#dc2626", // لون خطر غامق للعيدوان
              borderBottomColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>{" "}
            {t("danger_zone_title", "منطقة الخطر - حذف الحساب")}
          </h3>

          <div
            style={{
              padding: "20px",
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "1px solid #fee2e2",
            }}
          >
            <p
              style={{
                fontSize: "1rem",
                fontWeight: "bold",
                color: "#1e293b",
                margin: "0 0 10px 0",
              }}
            >
              {t("final_warning", "⚠️ تحذير نهائي وحاسم:")}
            </p>
            <ul
              style={{
                margin: 0,
                paddingRight: isRTL ? "20px" : "0", // ✨ تحديث RTL
                paddingLeft: isRTL ? "0" : "20px", // ✨ تحديث LTR
                color: "#475569",
                fontSize: "0.9rem",
                lineHeight: "1.6",
                listStyleType: "disc",
              }}
            >
              <li>
                {t(
                  "delete_warning_1",
                  "سيتم حذف جميع بياناتك الشخصية وحجوزاتك وملفك التعريفي نهائياً.",
                )}
              </li>
              <li>
                {t(
                  "delete_warning_2",
                  "لن تتمكن من استعادة بياناتك أو الوصول إلى حسابك مرة أخرى بعد هذه الخطوة.",
                )}
              </li>
              <li>
                {t(
                  "delete_warning_3",
                  "هذا الإجراء ضروري لاستيفاء شروط متجر تطبيقات آبل للخصوصية (Guideline 5.1.1).",
                )}
              </li>
            </ul>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || isSubmitting} // منع الضغط أثناء الحذف أو الحفظ العادي
              style={{
                marginTop: "20px",
                backgroundColor:
                  isDeletingAccount || isSubmitting ? "#cbd5e1" : "#dc2626", // أحمر للخطر
                color: "white",
                border: "none",
                padding: "14px 24px",
                borderRadius: "10px",
                fontWeight: "900",
                fontSize: "1rem",
                cursor:
                  isDeletingAccount || isSubmitting ? "not-allowed" : "pointer",
                transition: "0.2s",
                boxShadow:
                  isDeletingAccount || isSubmitting
                    ? "none"
                    : `0 4px 10px rgba(220, 38, 38, 0.2)`,
                width: "auto", // ليظهر كزر محدد وليس بعرض الصفحة
              }}
            >
              {isDeletingAccount
                ? t("deleting_account_btn", "⏳ جاري حذف الحساب...")
                : t("confirm_delete_account_btn", "تأكيد حذف حسابي نهائياً 🗑️")}
            </button>
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
            {isSubmitting
              ? t("saving_btn", "⏳ جاري الحفظ...")
              : t("save_all_changes_btn", "حفظ التعديلات الشاملة ✅")}
          </button>
        </div>
      </form>
    </div>
  );
}

// التنسيقات العامة والثابتة
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
