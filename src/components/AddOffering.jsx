import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

// --- التنسيقات العامة للمكون ---
const labelS = {
  display: "block",
  fontSize: "0.8rem",
  color: "#475569",
  marginBottom: "5px",
  fontWeight: "bold",
};
const inputS = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  backgroundColor: "#fff",
};
const dayBtn = {
  padding: "6px 12px",
  borderRadius: "8px",
  border: "1px solid",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.8rem",
  transition: "0.2s",
};
const submitBtn = (disabled) => ({
  width: "100%",
  backgroundColor: disabled ? "#94a3b8" : "#10b981",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "1.1rem",
  marginTop: "10px",
  transition: "0.3s",
});

export default function AddOffering({
  session,
  editData,
  onSuccess,
  onCancel,
}) {
  const { t, i18n } = useTranslation();

  // 1. البيانات الأساسية
  const [providerName, setProviderName] = useState(
    editData?.provider_name || "",
  ); // ✨ حقل الاسم
  const [nickname, setNickname] = useState(editData?.nickname || ""); // ✨ حقل اسم الشهرة
  const [title, setTitle] = useState(editData?.title || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [price, setPrice] = useState(editData?.price || "");
  const [category, setCategory] = useState(editData?.category || "");
  const [dbCategories, setDbCategories] = useState([]);

  // إضافة العملة
  const [currency, setCurrency] = useState(editData?.currency || "SAR");

  // الحقول: الدولة والمدينة
  const [country, setCountry] = useState(editData?.country || "السعودية");
  const [city, setCity] = useState(editData?.city || "");

  // 2. التسعير والتفاصيل
  const [pricingModel, setPricingModel] = useState(
    editData?.pricing_model || "fixed",
  );
  const [durationDetails, setDurationDetails] = useState(
    editData?.duration_details || "",
  );

  // 3. أوقات وأيام العمل
  const [is24x7, setIs24x7] = useState(editData?.is_24_7 ?? false);
  const [workStart, setWorkStart] = useState(
    editData?.work_start_time || "08:00",
  );
  const [workEnd, setWorkEnd] = useState(editData?.work_end_time || "22:00");
  const [availableDays, setAvailableDays] = useState(
    editData?.available_days || [
      "sun",
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
    ],
  );

  // 4. السوشيال ميديا الخاصة بالخدمة
  const [instagramUrl, setInstagramUrl] = useState(
    editData?.instagram_url || "",
  );
  const [youtubeUrl, setYoutubeUrl] = useState(editData?.youtube_url || "");
  const [twitterUrl, setTwitterUrl] = useState(editData?.twitter_url || "");
  const [tiktokUrl, setTiktokUrl] = useState(editData?.tiktok_url || "");
  const [snapchatUrl, setSnapchatUrl] = useState(editData?.snapchat_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(editData?.website_url || "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    editData?.whatsapp_number || "",
  );

  // 5. الإقرار القانوني
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // قاموس الأيام
  const dayMap = [
    { id: "sun", label: "الأحد" },
    { id: "mon", label: "الإثنين" },
    { id: "tue", label: "الثلاثاء" },
    { id: "wed", label: "الأربعاء" },
    { id: "thu", label: "الخميس" },
    { id: "fri", label: "الجمعة" },
    { id: "sat", label: "السبت" },
  ];

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("created_at");
      if (data) {
        setDbCategories(data);
        if (!category && !editData && data.length > 0) {
          setCategory(data[0].id);
        }
      }
    }
    fetchCategories();
  }, [category, editData]);

  useEffect(() => {
    if (!editData) setDurationDetails("");
  }, [pricingModel]);

  const toggleDay = (dayId) => {
    setAvailableDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    );
  };

  const loadFromProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    if (data) {
      setInstagramUrl(data.instagram_url || "");
      setYoutubeUrl(data.youtube_url || "");
      setTwitterUrl(data.twitter_url || "");
      setTiktokUrl(data.tiktok_url || "");
      setSnapchatUrl(data.snapchat_url || "");
      setWebsiteUrl(data.website_url || "");
      setWhatsappNumber(data.phone || "");
      alert(
        i18n.language === "ar"
          ? "تم جلب الروابط من البروفايل بنجاح ✅"
          : "Links fetched successfully ✅",
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!city) {
      return alert(
        i18n.language === "ar"
          ? "الرجاء تحديد المدينة لتسهيل وصول العملاء لخدمتك."
          : "Please specify the city.",
      );
    }

    if (!legalAccepted)
      return alert(
        i18n.language === "ar"
          ? "يجب الموافقة على الإقرار القانوني أولاً."
          : "Legal agreement is required.",
      );
    if (availableDays.length === 0)
      return alert(
        i18n.language === "ar"
          ? "يجب اختيار يوم عمل واحد على الأقل."
          : "Select at least one working day.",
      );
    if (
      ["period", "daily", "monthly", "yearly", "free"].includes(pricingModel) &&
      !durationDetails
    ) {
      return alert(
        i18n.language === "ar"
          ? "الرجاء تحديد تفاصيل المدة/ساعات العمل لهذا النوع من التسعير."
          : "Please select duration details.",
      );
    }

    setIsSubmitting(true);
    const finalPrice = pricingModel === "free" ? 0 : parseFloat(price);

    const payload = {
      provider_id: session.user.id,
      provider_name: providerName, // ✨ إضافة حقل الاسم للـ payload
      nickname: nickname, // ✨ إضافة حقل اسم الشهرة للـ payload
      title,
      description,
      price: finalPrice,
      currency, // إضافة العملة ليتم حفظها
      category,
      pricing_model: pricingModel,
      duration_details: durationDetails,
      is_24_7: is24x7,
      work_start_time: is24x7 ? null : workStart,
      work_end_time: is24x7 ? null : workEnd,
      available_days: availableDays,
      instagram_url: instagramUrl,
      youtube_url: youtubeUrl,
      twitter_url: twitterUrl,
      tiktok_url: tiktokUrl,
      snapchat_url: snapchatUrl,
      website_url: websiteUrl,
      whatsapp_number: whatsappNumber,
      country,
      city,
    };

    let error;
    if (editData) {
      const { error: updateError } = await supabase
        .from("offerings")
        .update(payload)
        .eq("id", editData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("offerings")
        .insert([payload]);
      error = insertError;
    }

    setIsSubmitting(false);
    if (!error) {
      alert(
        i18n.language === "ar"
          ? "تم حفظ الخدمة بنجاح ✅"
          : "Service saved successfully ✅",
      );
      onSuccess();
    } else {
      alert(t("error_prefix", "خطأ: ") + error.message);
    }
  };

  return (
    <div
      style={{
        direction: i18n.language === "ar" ? "rtl" : "ltr",
        display: "flex",
        flexDirection: "column",
        maxHeight: "75vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          borderBottom: "2px solid #f1f5f9",
          paddingBottom: "10px",
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, color: "#7c3aed" }}>
          {editData
            ? t("edit_service", "تعديل الخدمة")
            : t("add_service", "إضافة خدمة جديدة")}{" "}
          ✨
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            color: "#ef4444",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          overflowY: "auto",
          paddingRight: "5px",
          paddingLeft: "5px",
          flex: 1,
          paddingBottom: "15px",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          {/* 1. البيانات الأساسية */}

          {/* ✨ حقول الاسم واسم الشهرة الجديدة ✨ */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={labelS}>اسم مقدم الخدمة (اختياري):</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                style={inputS}
                placeholder="مثال: أحمد محمد"
              />
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={labelS}>اسم الشهرة / اللقب (اختياري):</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={inputS}
                placeholder="مثال: أبو طلال"
              />
            </div>
          </div>

          <div>
            <label style={labelS}>{t("service_title", "عنوان الخدمة")}:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputS}
              placeholder={t("title_placeholder", "مثال: صيانة مكيفات سبليت")}
            />
          </div>

          <div>
            <label style={labelS}>{t("service_category", "القسم")}:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputS}
            >
              {dbCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {i18n.language === "ar" ? c.label_ar : c.label_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelS}>
              {t("service_description", "وصف الخدمة")}:
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputS, height: "70px", resize: "none" }}
              placeholder={t(
                "desc_placeholder",
                "اشرح ما تقدمه في هذه الخدمة بالتفصيل...",
              )}
            />
          </div>

          {/* الموقع (الدولة والمدينة)  */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              backgroundColor: "#f8fafc",
              padding: "15px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={labelS}>الدولة:</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={inputS}
                required
              >
                <option value="السعودية">المملكة العربية السعودية</option>
                <option value="الإمارات">الإمارات العربية المتحدة</option>
                <option value="الكويت">الكويت</option>
                <option value="قطر">قطر</option>
                <option value="البحرين">البحرين</option>
                <option value="عمان">عُمان</option>
                <option value="مصر">مصر</option>
                <option value="أخرى">دولة أخرى</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={labelS}>المدينة (مهم للبحث):</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="مثال: الرياض، جدة، الدمام..."
                style={inputS}
                required
              />
            </div>
          </div>

          {/* 2. التسعير وتفاصيل المدة */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <label style={labelS}>{t("pricing_type", "نوع التسعير")}:</label>
              <select
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value)}
                style={inputS}
              >
                <option value="fixed">
                  {t("fixed_task", "مهمة (مقطوعية)")}
                </option>
                <option value="hourly">{t("hour", "بالساعة")}</option>
                <option value="period">{t("period", "بالفترة")}</option>
                <option value="daily">{t("day", "باليوم")}</option>
                <option value="monthly">{t("month", "بالشهر")}</option>
                <option value="yearly">{t("year", "بالسنة")}</option>
                <option value="free">{t("volunteer", "تطوع (مجاني)")}</option>
              </select>
            </div>

            {pricingModel !== "free" && (
              <>
                <div style={{ flex: 1 }}>
                  <label style={labelS}>{t("price", "السعر")}:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={inputS}
                    placeholder="مثال: 150"
                  />
                </div>
                {/* خيار العملة الجديد  */}
                <div style={{ flex: 1 }}>
                  <label style={labelS}>العملة:</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={inputS}
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                    <option value="KWD">دينار كويتي (KWD)</option>
                    <option value="QAR">ريال قطري (QAR)</option>
                    <option value="BHD">دينار بحريني (BHD)</option>
                    <option value="OMR">ريال عماني (OMR)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                    <option value="EUR">يورو (EUR)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* تفاصيل المدة بناءً على اختيار نوع التسعير */}
          {(pricingModel === "period" || pricingModel === "daily") && (
            <div
              style={{
                backgroundColor: "#eff6ff",
                padding: "10px",
                borderRadius: "10px",
                border: "1px dashed #3b82f6",
              }}
            >
              <label style={{ ...labelS, color: "#2563eb" }}>
                كم مدة {pricingModel === "period" ? "هذه الفترة" : "هذا اليوم"}؟
              </label>
              <select
                value={durationDetails}
                onChange={(e) => setDurationDetails(e.target.value)}
                style={inputS}
                required
              >
                <option value="">-- اختر المدة --</option>
                <option value="ساعة واحدة">ساعة واحدة</option>
                <option value="ساعتان">ساعتان</option>
                <option value="4 ساعات">4 ساعات</option>
                <option value="5 ساعات">5 ساعات</option>
                <option value="8 ساعات (دوام كامل)">8 ساعات (دوام كامل)</option>
                <option value="12 ساعة">12 ساعة</option>
                <option value="مفتوح (حسب الإنجاز)">مفتوح (حسب الإنجاز)</option>
              </select>
            </div>
          )}

          {(pricingModel === "monthly" || pricingModel === "yearly") && (
            <div
              style={{
                backgroundColor: "#eff6ff",
                padding: "10px",
                borderRadius: "10px",
                border: "1px dashed #3b82f6",
              }}
            >
              <label style={{ ...labelS, color: "#2563eb" }}>
                معدل ساعات العمل اليومية؟
              </label>
              <select
                value={durationDetails}
                onChange={(e) => setDurationDetails(e.target.value)}
                style={inputS}
                required
              >
                <option value="">-- اختر معدل العمل --</option>
                <option value="ساعتان يومياً">ساعتان يومياً</option>
                <option value="4 ساعات يومياً (نصف دوام)">
                  4 ساعات يومياً (نصف دوام)
                </option>
                <option value="5 ساعات يومياً">5 ساعات يومياً</option>
                <option value="8 ساعات يومياً (دوام كامل)">
                  8 ساعات يومياً (دوام كامل)
                </option>
                <option value="مرن (حسب الاتفاق)">مرن (حسب الاتفاق)</option>
              </select>
            </div>
          )}

          {pricingModel === "free" && (
            <div
              style={{
                backgroundColor: "#ecfdf5",
                padding: "10px",
                borderRadius: "10px",
                border: "1px dashed #10b981",
              }}
            >
              <label style={{ ...labelS, color: "#059669" }}>
                نوع التطوع والمدة:
              </label>
              <select
                value={durationDetails}
                onChange={(e) => setDurationDetails(e.target.value)}
                style={inputS}
                required
              >
                <option value="">-- اختر نوع التطوع --</option>
                <option value="مهمة ثابتة (إنجاز عمل محدد)">
                  مهمة ثابتة (إنجاز عمل محدد)
                </option>
                <option value="ساعة واحدة">ساعة واحدة</option>
                <option value="ساعتان">ساعتان</option>
                <option value="4 ساعات يومياً">4 ساعات يومياً</option>
                <option value="عمل مرن (حسب الحاجة)">
                  عمل مرن (حسب الحاجة)
                </option>
              </select>
            </div>
          )}

          {/* 3. أيام وساعات العمل */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "15px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h4
              style={{
                margin: "0 0 10px 0",
                fontSize: "0.9rem",
                color: "#1e293b",
              }}
            >
              📅 أيام وساعات العمل المتاحة
            </h4>

            <div
              style={{
                display: "flex",
                gap: "5px",
                flexWrap: "wrap",
                marginBottom: "15px",
              }}
            >
              {dayMap.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => toggleDay(d.id)}
                  style={{
                    ...dayBtn,
                    backgroundColor: availableDays.includes(d.id)
                      ? "#7c3aed"
                      : "#fff",
                    color: availableDays.includes(d.id) ? "#fff" : "#64748b",
                    borderColor: availableDays.includes(d.id)
                      ? "#7c3aed"
                      : "#cbd5e1",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: "10px",
                color: "#475569",
              }}
            >
              <input
                type="checkbox"
                checked={is24x7}
                onChange={(e) => setIs24x7(e.target.checked)}
                style={{ transform: "scale(1.2)", accentColor: "#10b981" }}
              />
              متاح 24 ساعة (طوارئ أو لا يوجد وقت محدد)
            </label>

            {!is24x7 && (
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelS}>تبدأ من الساعة:</label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    style={inputS}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelS}>تنتهي الساعة:</label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    style={inputS}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. السوشيال ميديا الخاصة بالخدمة */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "15px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b" }}>
                📱 السوشيال ميديا والتواصل (اختياري)
              </h4>
              <button
                type="button"
                onClick={loadFromProfile}
                style={{
                  fontSize: "0.7rem",
                  backgroundColor: "#eff6ff",
                  color: "#3b82f6",
                  border: "1px solid #bfdbfe",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🔄 جلب من البروفايل
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label style={labelS}>رقم الواتساب:</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="05XXXXXXXX"
                />
              </div>
              <div>
                <label style={labelS}>انستقرام:</label>
                <input
                  type="url"
                  dir="ltr"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label style={labelS}>تويتر (X):</label>
                <input
                  type="url"
                  dir="ltr"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label style={labelS}>تيك توك:</label>
                <input
                  type="url"
                  dir="ltr"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://tiktok.com/..."
                />
              </div>
              <div>
                <label style={labelS}>سناب شات:</label>
                <input
                  type="url"
                  dir="ltr"
                  value={snapchatUrl}
                  onChange={(e) => setSnapchatUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://snapchat.com/add/..."
                />
              </div>
              <div>
                <label style={labelS}>الموقع الإلكتروني:</label>
                <input
                  type="url"
                  dir="ltr"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* 5. الإقرار القانوني */}
          <div
            style={{
              backgroundColor: "#fffbeb",
              padding: "15px",
              borderRadius: "12px",
              border: "1px dashed #f59e0b",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                required
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                style={{
                  transform: "scale(1.3)",
                  marginTop: "4px",
                  accentColor: "#d97706",
                }}
              />
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#92400e",
                  fontWeight: "bold",
                  lineHeight: "1.5",
                }}
              >
                أقر وأتعهد بأنني أتحمل المسؤولية القانونية الكاملة عن هذه
                الخدمة، وأوافق على أن المنصة وسيط إعلاني فقط وتخلي مسؤوليتها عن
                جودة التنفيذ أو النزاعات.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={submitBtn(isSubmitting)}
          >
            {isSubmitting
              ? "⏳ جاري الحفظ..."
              : t("save_btn", "حفظ الخدمة ونشرها ✅")}
          </button>
        </form>
      </div>
    </div>
  );
}
