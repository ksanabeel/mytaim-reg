import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

export default function AddOffering({
  session,
  editData,
  onSuccess,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // 1. البيانات الأساسية
  const [providerName, setProviderName] = useState(
    editData?.provider_name || "",
  );
  const [nickname, setNickname] = useState(editData?.nickname || "");

  // ✨ الحقول الجديدة: المسمى والطاقة الاستيعابية ✨
  const [providerRole, setProviderRole] = useState(
    editData?.provider_role || "",
  );
  const [maxCapacity, setMaxCapacity] = useState(editData?.max_capacity || 1);

  const [title, setTitle] = useState(editData?.title || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [price, setPrice] = useState(editData?.price || "");

  // ✨ السعر حسب الاتفاق
  const [priceUponAgreement, setPriceUponAgreement] = useState(
    editData?.price_upon_agreement || false,
  );

  const [category, setCategory] = useState(editData?.category || "");
  const [dbCategories, setDbCategories] = useState([]);

  // العملة
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
    editData?.available_days || [],
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

  // مسح السعر الإجباري إذا اختار (مجاني) أو (حسب الاتفاق)
  useEffect(() => {
    if (pricingModel === "free" || priceUponAgreement) {
      setPrice("");
    }
  }, [pricingModel, priceUponAgreement]);

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
        isRTL
          ? "تم جلب الروابط من البروفايل بنجاح ✅"
          : "Links fetched successfully ✅",
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!city) {
      return alert(
        isRTL
          ? "الرجاء تحديد المدينة لتسهيل وصول العملاء لخدمتك."
          : "Please specify the city.",
      );
    }
    if (!legalAccepted)
      return alert(
        isRTL
          ? "يجب الموافقة على الإقرار القانوني أولاً."
          : "Legal agreement is required.",
      );
    if (availableDays.length === 0)
      return alert(
        isRTL
          ? "يجب اختيار يوم عمل واحد على الأقل."
          : "Select at least one working day.",
      );
    if (
      ["period", "daily", "monthly", "yearly", "free"].includes(pricingModel) &&
      !durationDetails
    ) {
      return alert(
        isRTL
          ? "الرجاء تحديد تفاصيل المدة/ساعات العمل لهذا النوع من التسعير."
          : "Please select duration details.",
      );
    }

    setIsSubmitting(true);

    // تحديد السعر النهائي بناءً على الاختيارات
    let finalPrice = parseFloat(price);
    if (pricingModel === "free" || priceUponAgreement) {
      finalPrice = 0;
    }

    const payload = {
      provider_id: session.user.id,
      provider_name: providerName,
      nickname: nickname,
      provider_role: providerRole, // ✨ إضافة المسمى
      max_capacity: maxCapacity, // ✨ إضافة الطاقة الاستيعابية
      title,
      description,
      price: finalPrice,
      price_upon_agreement: priceUponAgreement,
      currency,
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
      alert(isRTL ? "تم حفظ الخدمة بنجاح ✅" : "Service saved successfully ✅");
      onSuccess();
    } else {
      alert(t("error_prefix", "خطأ: ") + error.message);
    }
  };

  return (
    <div
      style={{
        direction: isRTL ? "rtl" : "ltr",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "85vh",
        backgroundColor: "#f8fafc",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      {/* ✨ أكواد CSS المدمجة للتأثيرات والتمرير المخفي ✨ */}
      <style>{`
        .smart-input { transition: all 0.3s ease; border: 1px solid #cbd5e1; background-color: #fff; }
        .smart-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1) !important; outline: none; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* الرأس (Header) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 25px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e2e8f0",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: "1.3rem",
            fontWeight: "900",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>✨</span>
          {editData
            ? t("edit_service", "تعديل الخدمة")
            : t("add_service", "إضافة خدمة جديدة")}
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: "#fef2f2",
            border: "none",
            width: "35px",
            height: "35px",
            borderRadius: "50%",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "1.2rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          ✕
        </button>
      </div>

      {/* منطقة التمرير للنموذج (Body) */}
      <div
        className="custom-scroll"
        style={{ overflowY: "auto", padding: "25px", flex: 1 }}
      >
        <form
          id="offeringForm"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* 📝 بطاقة: البيانات الأساسية */}
          <div style={cardS}>
            <h3 style={cardTitleS}>📝 البيانات الأساسية للخدمة</h3>
            <div
              style={{
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "15px",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={labelS}>اسم مقدم الخدمة (اختياري):</label>
                <input
                  type="text"
                  className="smart-input"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  style={inputS}
                  placeholder="مثال: أحمد محمد"
                />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={labelS}>اسم الشهرة / اللقب (اختياري):</label>
                <input
                  type="text"
                  className="smart-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  style={inputS}
                  placeholder="مثال: أبو طلال"
                />
              </div>
            </div>

            {/* ✨ الحقول الجديدة: المسمى المهني والطاقة الاستيعابية للخدمة ✨ */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "15px",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={labelS}>مسمى مقدم الخدمة (اختياري):</label>
                <input
                  type="text"
                  className="smart-input"
                  value={providerRole}
                  onChange={(e) => setProviderRole(e.target.value)}
                  style={inputS}
                  placeholder="مثال: طبيب، ممرض، فرقة شعبية، شاعر..."
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: "200px",
                  backgroundColor: "#eff6ff",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px dashed #3b82f6",
                }}
              >
                <label
                  style={{ ...labelS, color: "#1e40af", marginBottom: "4px" }}
                >
                  👥 عدد مقدمي الخدمة المتاحين (الطاقة الاستيعابية):
                </label>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    lineHeight: "1.5",
                  }}
                >
                  إذا كنت تعمل بمفردك اترك الرقم (1). وإذا كنت متعهداً أو فريق
                  عمل، حدد أقصى عدد متوفر لديك ليتمكن العميل من طلبهم معاً.
                </p>
                <input
                  type="number"
                  min="1"
                  className="smart-input"
                  value={maxCapacity}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1) val = 1; // إجبار ألا يقل عن 1
                    setMaxCapacity(val);
                  }}
                  style={{
                    ...inputS,
                    borderColor: "#bfdbfe",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                  placeholder="1"
                />
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={labelS}>
                {t("service_title", "عنوان الخدمة (يظهر بشكل بارز)")}{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                className="smart-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ ...inputS, fontSize: "1.05rem", fontWeight: "bold" }}
                placeholder={t(
                  "title_placeholder",
                  "مثال: صيانة مكيفات سبليت احترافية",
                )}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={labelS}>
                {t("service_category", "القسم التصنيفي")}{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="smart-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputS}
                required
              >
                {dbCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {isRTL ? c.label_ar : c.label_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelS}>
                {t("service_description", "وصف الخدمة (التفاصيل والمميزات)")}{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                required
                className="smart-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  ...inputS,
                  height: "100px",
                  resize: "vertical",
                  lineHeight: "1.5",
                }}
                placeholder={t(
                  "desc_placeholder",
                  "اشرح للعميل بدقة ماذا تقدم، وما يميز خدمتك عن غيرك...",
                )}
              />
            </div>
          </div>

          {/* 🌍 بطاقة: الموقع الجغرافي */}
          <div style={cardS}>
            <h3 style={cardTitleS}>🌍 نطاق تقديم الخدمة</h3>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={labelS}>الدولة:</label>
                <select
                  className="smart-input"
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
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={labelS}>
                  المدينة (مهم للبحث والاستكشاف):{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="smart-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: الرياض، جدة، الدمام..."
                  style={inputS}
                  required
                />
              </div>
            </div>
          </div>

          {/* 💰 بطاقة: التسعير والمدة */}
          <div style={cardS}>
            <h3 style={cardTitleS}>💰 خطة التسعير والمدة</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelS}>
                {t("pricing_type", "آلية احتساب السعر")}:
              </label>
              <select
                className="smart-input"
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value)}
                style={inputS}
              >
                <option value="fixed">
                  {t("fixed_task", "مهمة (مقطوعية ثابتة)")}
                </option>
                <option value="hourly">{t("hour", "بالساعة")}</option>
                <option value="period">
                  {t("period", "بالفترة (شفت/حدث)")}
                </option>
                <option value="daily">{t("day", "يومي")}</option>
                <option value="monthly">{t("month", "شهري")}</option>
                <option value="yearly">{t("year", "سنوي")}</option>
                <option value="free">{t("volunteer", "تطوع (مجانياً)")}</option>
              </select>
            </div>

            {/* تفاصيل المدة تظهر فقط لبعض النماذج */}
            {["period", "daily", "monthly", "yearly", "free"].includes(
              pricingModel,
            ) && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px dashed #3b82f6",
                  marginBottom: "15px",
                }}
              >
                <label style={{ ...labelS, color: "#1e40af" }}>
                  {pricingModel === "free"
                    ? "تحديد طبيعة التطوع:"
                    : "تفاصيل المدة / معدل العمل:"}{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  className="smart-input"
                  value={durationDetails}
                  onChange={(e) => setDurationDetails(e.target.value)}
                  style={{ ...inputS, borderColor: "#bfdbfe" }}
                  required
                >
                  <option value="">-- يرجى الاختيار --</option>
                  {(pricingModel === "period" || pricingModel === "daily") && (
                    <>
                      <option value="ساعة واحدة">ساعة واحدة</option>
                      <option value="ساعتان">ساعتان</option>
                      <option value="4 ساعات">4 ساعات</option>
                      <option value="5 ساعات">5 ساعات</option>
                      <option value="8 ساعات (دوام كامل)">
                        8 ساعات (دوام كامل)
                      </option>
                      <option value="12 ساعة">12 ساعة</option>
                      <option value="مفتوح (حسب الإنجاز)">
                        مفتوح (حسب الإنجاز)
                      </option>
                    </>
                  )}
                  {(pricingModel === "monthly" ||
                    pricingModel === "yearly") && (
                    <>
                      <option value="ساعتان يومياً">ساعتان يومياً</option>
                      <option value="4 ساعات يومياً (نصف دوام)">
                        4 ساعات يومياً (نصف دوام)
                      </option>
                      <option value="8 ساعات يومياً (دوام كامل)">
                        8 ساعات يومياً (دوام كامل)
                      </option>
                      <option value="مرن (حسب الاتفاق)">
                        مرن (حسب الاتفاق)
                      </option>
                    </>
                  )}
                  {pricingModel === "free" && (
                    <>
                      <option value="مهمة ثابتة (إنجاز عمل محدد)">
                        مهمة ثابتة (إنجاز عمل محدد)
                      </option>
                      <option value="ساعتان">ساعتان</option>
                      <option value="4 ساعات يومياً">4 ساعات يومياً</option>
                      <option value="عمل مرن (حسب الحاجة)">
                        عمل مرن (حسب الحاجة)
                      </option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* تحديد السعر الفعلي */}
            {pricingModel !== "free" && (
              <div
                style={{
                  backgroundColor: priceUponAgreement ? "#f0fdf4" : "#f8fafc",
                  padding: "15px",
                  borderRadius: "12px",
                  border: priceUponAgreement
                    ? "1px solid #10b981"
                    : "1px solid #e2e8f0",
                  transition: "0.3s",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: "900",
                    color: priceUponAgreement ? "#059669" : "#334155",
                    cursor: "pointer",
                    marginBottom: priceUponAgreement ? "0" : "15px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={priceUponAgreement}
                    onChange={(e) => setPriceUponAgreement(e.target.checked)}
                    style={{ transform: "scale(1.3)", accentColor: "#10b981" }}
                  />
                  🤝 السعر حسب الاتفاق (تحديد السعر لاحقاً بعد تواصل العميل)
                </label>

                {!priceUponAgreement && (
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      flexWrap: "wrap",
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: "15px",
                    }}
                  >
                    <div style={{ flex: 2 }}>
                      <label style={labelS}>
                        {t("price", "السعر المطلوب")}:{" "}
                        <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required={!priceUponAgreement}
                        className="smart-input"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        style={{
                          ...inputS,
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          color: "#7c3aed",
                        }}
                        placeholder="مثال: 150"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelS}>العملة:</label>
                      <select
                        className="smart-input"
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
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ⏰ بطاقة: أوقات وأيام العمل */}
          <div style={cardS}>
            <h3 style={cardTitleS}>⏰ التواجد وأوقات العمل</h3>
            <label style={labelS}>
              الأيام المتاحة لتقديم الخدمة:{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                {dayMap.map((d) => {
                  const isSelected = availableDays.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggleDay(d.id)}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "20px",
                        border: isSelected
                          ? "2px solid #7c3aed"
                          : "1px solid #cbd5e1",
                        backgroundColor: isSelected ? "#f3e8ff" : "#fff",
                        color: isSelected ? "#7c3aed" : "#64748b",
                        fontWeight: "900",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelected
                          ? "0 4px 12px rgba(124, 58, 237, 0.2)"
                          : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isSelected ? "✅" : "➕"} {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: "bold",
                  color: is24x7 ? "#10b981" : "#475569",
                  cursor: "pointer",
                  marginBottom: is24x7 ? "0" : "15px",
                }}
              >
                <input
                  type="checkbox"
                  checked={is24x7}
                  onChange={(e) => setIs24x7(e.target.checked)}
                  style={{ transform: "scale(1.3)", accentColor: "#10b981" }}
                />
                🟢 الخدمة متاحة 24 ساعة (أو لا ترتبط بوقت محدد)
              </label>

              {!is24x7 && (
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    flexWrap: "wrap",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "15px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label style={labelS}>تبدأ من الساعة:</label>
                    <input
                      type="time"
                      className="smart-input"
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
                      className="smart-input"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      style={inputS}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 📱 بطاقة: السوشيال ميديا */}
          <div style={cardS}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
                marginBottom: "15px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#1e293b",
                  fontSize: "1.1rem",
                  fontWeight: "900",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                📱 وسائل التواصل للخدمة (اختياري)
              </h3>
              <button
                type="button"
                onClick={loadFromProfile}
                style={{
                  fontSize: "0.75rem",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#dbeafe")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#eff6ff")
                }
              >
                🔄 استيراد من ملفي
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
              }}
            >
              <div>
                <label style={labelS}>رقم الواتساب:</label>
                <input
                  type="tel"
                  dir="ltr"
                  className="smart-input"
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
                  className="smart-input"
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
                  className="smart-input"
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
                  className="smart-input"
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
                  className="smart-input"
                  value={snapchatUrl}
                  onChange={(e) => setSnapchatUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://snapchat.com/add/..."
                />
              </div>
              <div>
                <label style={labelS}>قناة اليوتيوب:</label>
                <input
                  type="url"
                  dir="ltr"
                  className="smart-input"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  style={{ ...inputS, textAlign: "left" }}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </div>

          {/* ⚖️ الإقرار القانوني */}
          <div
            style={{
              backgroundColor: "#fffbeb",
              padding: "20px",
              borderRadius: "16px",
              border: "1px dashed #f59e0b",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                required
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                style={{
                  transform: "scale(1.4)",
                  marginTop: "4px",
                  accentColor: "#d97706",
                }}
              />
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "#92400e",
                  fontWeight: "bold",
                  lineHeight: "1.6",
                }}
              >
                أقر وأتعهد بأنني أتحمل المسؤولية القانونية والمهنية الكاملة عن
                تقديم هذه الخدمة، وأوافق على أن المنصة تُعتبر وسيطاً تقنياً
                وإعلانياً فقط، وتخلي مسؤوليتها تماماً عن جودة التنفيذ أو أي
                نزاعات تنشأ مع العملاء.{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </span>
            </label>
          </div>
        </form>
      </div>

      {/* تذييل النافذة (Footer) مع زر الحفظ العائم */}
      <div
        style={{
          padding: "20px 25px",
          backgroundColor: "#fff",
          borderTop: "1px solid #e2e8f0",
          zIndex: 10,
        }}
      >
        <button
          type="submit"
          form="offeringForm"
          disabled={isSubmitting}
          style={{
            width: "100%",
            backgroundColor: isSubmitting ? "#94a3b8" : "#10b981",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontWeight: "900",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "1.1rem",
            transition: "all 0.3s ease",
            boxShadow: isSubmitting
              ? "none"
              : "0 6px 20px rgba(16, 185, 129, 0.3)",
          }}
        >
          {isSubmitting
            ? "⏳ جاري المعالجة والحفظ..."
            : t("save_btn", "حفظ الخدمة ونشرها في المنصة 🚀")}
        </button>
      </div>
    </div>
  );
}

// ستايلات مصغرة متكررة
const cardS = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
};
const cardTitleS = {
  margin: "0 0 20px 0",
  color: "#1e293b",
  fontSize: "1.15rem",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderBottom: "2px solid #f1f5f9",
  paddingBottom: "12px",
};
const labelS = {
  display: "block",
  fontSize: "0.85rem",
  color: "#475569",
  marginBottom: "8px",
  fontWeight: "bold",
};
const inputS = {
  width: "100%",
  padding: "12px 15px",
  borderRadius: "12px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "0.95rem",
  backgroundColor: "#f8fafc",
};
