import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

export default function ClientMarketplace({
  session,
  allowTextReviews = true,
  welcomeMsg = "",
  heroSubtitle = "",
}) {
  const { t, i18n } = useTranslation();
  const [offerings, setOfferings] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // ✨ فلاتر البحث الأساسية والمطورة ✨
  const [localSearch, setLocalSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState(""); // ✨ فلتر بداية الوقت
  const [filterEndTime, setFilterEndTime] = useState(""); // ✨ فلتر نهاية الوقت

  const [reviews, setReviews] = useState([]);
  const [bookingData, setBookingData] = useState({
    startDateTime: "",
    endDateTime: "",
    manualLocation: "",
    gpsLocation: "",
    manualQuantity: 1,
    clientContact: "",
  });

  const [calculatedData, setCalculatedData] = useState({
    price: 0,
    quantity: 1,
    text: "",
  });

  const nowStr = new Date().toISOString().slice(0, 16);
  const todayDate = new Date().toISOString().split("T")[0];

  const dayLabels = {
    sun: "الأحد",
    mon: "الإثنين",
    tue: "الثلاثاء",
    wed: "الأربعاء",
    thu: "الخميس",
    fri: "الجمعة",
    sat: "السبت",
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("created_at");
      if (cats) setDbCategories(cats);
      const { data: offs } = await supabase
        .from("offerings")
        .select("*, profiles!inner(*)")
        .eq("profiles.is_active", true)
        .order("rating", { foreignTable: "profiles", ascending: false });
      if (offs) setOfferings(offs);
      setLoading(false);
    };
    fetchData();
  }, []);

  const displayCategories = [
    { id: "all", label: t("cat_all", "الكل"), icon: "🌟" },
    ...dbCategories.map((c) => ({
      id: c.id,
      label: i18n.language === "ar" ? c.label_ar : c.label_en,
      icon: c.icon,
    })),
  ];

  const availableCountries = [
    ...new Set(offerings.map((item) => item.country).filter(Boolean)),
  ];
  const availableCities = [
    ...new Set(
      offerings
        .filter(
          (item) => filterCountry === "all" || item.country === filterCountry,
        )
        .map((item) => item.city)
        .filter(Boolean),
    ),
  ];

  // ✨ الفلتر الذكي المطور (يطابق فترة العمل من - إلى) ✨
  const filtered = offerings.filter((item) => {
    // 1. فلاتر النص، القسم، الدولة، المدينة
    const s = localSearch.toLowerCase();
    const matchesSearch =
      (item.title || "").toLowerCase().includes(s) ||
      (item.provider_name || "").toLowerCase().includes(s) ||
      (item.profiles?.full_name || "").toLowerCase().includes(s) ||
      (item.description || "").toLowerCase().includes(s);
    const itemCat = item.category || "other";
    const matchesCategory =
      activeCategory === "all" || itemCat === activeCategory;
    const matchesCountry =
      filterCountry === "all" || item.country === filterCountry;
    const matchesCity = filterCity === "all" || item.city === filterCity;

    // 2. فلتر التاريخ (الأيام المتاحة)
    let matchesDate = true;
    if (filterDate) {
      const selectedDay = new Date(filterDate);
      const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const dayId = dayMap[selectedDay.getDay()];
      const activeDays =
        Array.isArray(item.available_days) && item.available_days.length > 0
          ? item.available_days
          : dayMap;
      if (!activeDays.includes(dayId)) {
        matchesDate = false;
      }
    }

    // 3. فلتر الوقت الدقيق (من ساعة - إلى ساعة)
    let matchesTime = true;
    if (
      (filterStartTime || filterEndTime) &&
      matchesDate &&
      !item.is_24_7 &&
      item.work_start_time &&
      item.work_end_time
    ) {
      const toMins = (tStr) => {
        const [h, m] = tStr.split(":").map(Number);
        return h * 60 + m;
      };

      const pStart = toMins(item.work_start_time.substring(0, 5));
      let pEnd = toMins(item.work_end_time.substring(0, 5));
      if (pEnd <= pStart) pEnd += 24 * 60; // معالجة الدوام لليوم التالي

      // إذا لم يحدد العميل وقتاً نعتبره وقت عمل المزود الافتراضي
      let fStart = filterStartTime ? toMins(filterStartTime) : pStart;
      let fEnd = filterEndTime ? toMins(filterEndTime) : pEnd;

      // إذا اختار العميل فترة تمتد لليوم التالي (مثلاً من 23:00 إلى 02:00)
      if (fEnd <= fStart && filterStartTime && filterEndTime) fEnd += 24 * 60;

      // مطابقة توقيت العميل مع توقيت المزود (حتى لو كان المزود يعمل بعد منتصف الليل)
      if (fStart < pStart && pEnd > 24 * 60) fStart += 24 * 60;
      if (fEnd < pStart && pEnd > 24 * 60) fEnd += 24 * 60;

      // إذا كان وقت بداية العميل قبل دوام المزود، أو وقت نهاية العميل بعد انتهاء دوام المزود = استبعاد
      if (fStart < pStart || fEnd > pEnd) {
        matchesTime = false;
      }
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesCountry &&
      matchesCity &&
      matchesDate &&
      matchesTime
    );
  });

  useEffect(() => {
    if (!selected) {
      setReviews([]);
      return;
    }
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("rating, review, profiles!bookings_customer_id_fkey(full_name)")
        .eq("offering_id", selected.id)
        .not("rating", "is", null)
        .order("id", { ascending: false })
        .limit(5);
      setReviews(data || []);
    };
    fetchReviews();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const model = selected.pricing_model || "fixed";
    const price = Number(selected.price);
    let qty = 1;
    let label = t("task", "مهمة");

    if (model === "period") {
      qty = Number(bookingData.manualQuantity) || 1;
      label = t("period", "فترة");
    } else if (
      model !== "fixed" &&
      model !== "free" &&
      bookingData.startDateTime &&
      bookingData.endDateTime
    ) {
      const start = new Date(bookingData.startDateTime);
      const end = new Date(bookingData.endDateTime);
      let diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours <= 0) diffHours += 24;

      if (model === "hourly") {
        qty = Math.round(diffHours * 100) / 100;
        label = t("hour", "ساعة");
      } else if (model === "daily") {
        qty = Math.max(1, Math.ceil(diffHours / 24));
        label = t("day", "يوم");
      } else if (model === "monthly") {
        qty = Math.max(1, Math.ceil(diffHours / (24 * 30)));
        label = t("month", "شهر");
      } else if (model === "yearly") {
        qty = Math.max(1, Math.ceil(diffHours / (24 * 365)));
        label = t("year", "سنة");
      }
    } else if (model === "fixed" || model === "free") {
      qty = 1;
      label =
        model === "free"
          ? t("volunteer", "تطوع")
          : t("fixed_task", "مهمة ثابتة");
    }
    setCalculatedData({ price: price * qty, quantity: qty, text: label });
  }, [bookingData, selected, t]);

  const handleGetLocation = () => {
    if (!navigator.geolocation)
      return alert(
        i18n.language === "ar"
          ? "جهازك لا يدعم تحديد الموقع."
          : "Your device doesn't support geolocation.",
      );
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBookingData({
          ...bookingData,
          gpsLocation: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
          manualLocation: "",
        });
      },
      () =>
        alert(
          i18n.language === "ar"
            ? "يرجى السماح بالوصول للـ GPS 📍"
            : "Please allow GPS access 📍",
        ),
    );
  };

  const handleDateTimeChange = (field, value) => {
    if (!value) {
      setBookingData({ ...bookingData, [field]: value });
      return;
    }

    const selectedDate = new Date(value);
    const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayId = dayMap[selectedDate.getDay()];

    const activeDays =
      Array.isArray(selected.available_days) &&
      selected.available_days.length > 0
        ? selected.available_days
        : dayMap;

    if (!activeDays.includes(dayId)) {
      alert(
        i18n.language === "ar"
          ? `⛔ عذراً! المزود لا يعمل في يوم (${dayLabels[dayId] || dayId}). الرجاء اختيار وقت آخر.`
          : "⛔ The provider does not work on this day.",
      );
      setBookingData({ ...bookingData, [field]: "" });
      return;
    }

    setBookingData({ ...bookingData, [field]: value });
  };

  const handleBook = async () => {
    const finalLocation = bookingData.manualLocation || bookingData.gpsLocation;

    if (
      !bookingData.startDateTime ||
      !bookingData.endDateTime ||
      !finalLocation ||
      !bookingData.clientContact
    ) {
      return alert(
        i18n.language === "ar"
          ? "يرجى إكمال جميع التفاصيل المطلوبة (الموقع، التواريخ، ورقم التواصل) 📍📞"
          : "Please complete all details.",
      );
    }

    const requestedStart = new Date(bookingData.startDateTime);
    let requestedEnd = new Date(bookingData.endDateTime);
    const now = new Date();

    if (requestedStart < now)
      return alert(
        i18n.language === "ar"
          ? "⛔ لا يمكن الحجز في الماضي."
          : "⛔ Cannot book in the past.",
      );
    if (requestedEnd <= requestedStart)
      return alert(
        i18n.language === "ar"
          ? "⛔ وقت الانتهاء يجب أن يكون بعد وقت البدء."
          : "⛔ End time must be after start time.",
      );

    if (
      selected.is_24_7 === false &&
      selected.work_start_time &&
      selected.work_end_time
    ) {
      const getMins = (dateObj) =>
        dateObj.getHours() * 60 + dateObj.getMinutes();
      const rStartMins = getMins(requestedStart);

      const pStartMins =
        parseInt(selected.work_start_time.split(":")[0]) * 60 +
        parseInt(selected.work_start_time.split(":")[1]);
      let pEndMins =
        parseInt(selected.work_end_time.split(":")[0]) * 60 +
        parseInt(selected.work_end_time.split(":")[1]);

      if (pEndMins <= pStartMins) pEndMins += 24 * 60;
      const normRStart =
        rStartMins < pStartMins && pEndMins > 24 * 60
          ? rStartMins + 24 * 60
          : rStartMins;

      if (normRStart < pStartMins || normRStart > pEndMins) {
        return alert(
          i18n.language === "ar"
            ? `⛔ الوقت المحدد خارج أوقات الدوام! ساعات العمل من ${selected.work_start_time.substring(0, 5)} إلى ${selected.work_end_time.substring(0, 5)}.`
            : "⛔ Outside working hours.",
        );
      }
    }

    const { data: existing } = await supabase
      .from("bookings")
      .select("appointment_date, end_time")
      .eq("offering_id", selected.id)
      .neq("status", "cancelled");
    let overlaps = 0;
    existing?.forEach((b) => {
      if (
        requestedStart < new Date(b.end_time) &&
        requestedEnd > new Date(b.appointment_date)
      )
        overlaps++;
    });
    if (overlaps >= (selected.profiles?.max_concurrent_bookings || 1)) {
      return alert(
        i18n.language === "ar"
          ? "⚠️ هذا الوقت محجوز مسبقاً، لا توجد سعة."
          : "⚠️ This time is already booked.",
      );
    }

    const { error } = await supabase.from("bookings").insert([
      {
        offering_id: selected.id,
        customer_id: session.user.id,
        appointment_date: requestedStart.toISOString(),
        end_time: requestedEnd.toISOString(),
        location: finalLocation,
        quantity: calculatedData.quantity,
        status: "pending",
        client_contact: bookingData.clientContact,
      },
    ]);

    if (!error) {
      alert(
        i18n.language === "ar"
          ? "تم إرسال الطلب للمزود بنجاح ✅"
          : "Request sent successfully ✅",
      );
      setSelected(null);
    } else {
      alert("Error: " + error.message);
    }
  };

  const modelLabels = {
    fixed: t("task"),
    hourly: t("hour"),
    period: t("period"),
    daily: t("day"),
    monthly: t("month"),
    yearly: t("year"),
    free: t("volunteer"),
  };
  const renderStars = (rating) =>
    "⭐".repeat(Math.round(rating || 5)) + ` (${(rating || 5).toFixed(1)})`;
  const defaultAvatar = (name) =>
    `https://ui-avatars.com/api/?name=${name || "User"}&background=7c3aed&color=fff`;

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ⏳ {i18n.language === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );

  return (
    <div style={{ direction: i18n.language === "ar" ? "rtl" : "ltr" }}>
      <div style={heroSectionS}>
        <h1 style={heroTitleS}>{welcomeMsg}</h1>
        <p style={heroSubTitleS}>{heroSubtitle}</p>
      </div>

      {/* ✨ شريط الفلاتر والبحث (من ساعة / إلى ساعة) ✨ */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
          backgroundColor: "#fff",
          padding: "15px",
          borderRadius: "20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            flex: "1 1 250px",
            display: "flex",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            padding: "10px 15px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
          }}
        >
          <span style={{ margin: "0 10px" }}>🔍</span>
          <input
            type="text"
            placeholder={
              i18n.language === "ar" ? "ابحث عن خدمة، مزود..." : "Search..."
            }
            style={searchField}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <select
          value={filterCountry}
          onChange={(e) => {
            setFilterCountry(e.target.value);
            setFilterCity("all");
          }}
          style={filterSelectS}
        >
          <option value="all">{t("filter_country", "البلد")}</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          style={filterSelectS}
        >
          <option value="all">{t("filter_city", "المدينة")}</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* فلاتر التاريخ والوقت المطورة */}
        <input
          type="date"
          min={todayDate}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={filterSelectS}
          title={
            i18n.language === "ar" ? "تاريخ الحجز (اختياري)" : "Date (Optional)"
          }
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flex: "1 1 200px",
          }}
        >
          <input
            type="time"
            value={filterStartTime}
            onChange={(e) => setFilterStartTime(e.target.value)}
            style={{ ...filterSelectS, flex: 1 }}
            title={i18n.language === "ar" ? "من الساعة (اختياري)" : "From Time"}
          />
          <span style={{ color: "#64748b", fontWeight: "bold" }}>-</span>
          <input
            type="time"
            value={filterEndTime}
            onChange={(e) => setFilterEndTime(e.target.value)}
            style={{ ...filterSelectS, flex: 1 }}
            title={i18n.language === "ar" ? "إلى الساعة (اختياري)" : "To Time"}
          />
        </div>

        {/* زر مسح الفلاتر */}
        {(filterDate ||
          filterStartTime ||
          filterEndTime ||
          filterCountry !== "all" ||
          filterCity !== "all" ||
          localSearch) && (
          <button
            onClick={() => {
              setFilterDate("");
              setFilterStartTime("");
              setFilterEndTime("");
              setFilterCountry("all");
              setFilterCity("all");
              setLocalSearch("");
            }}
            style={{
              backgroundColor: "#fee2e2",
              color: "#ef4444",
              border: "none",
              padding: "10px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ✖
          </button>
        )}
      </div>

      <div style={categoryBarS}>
        {displayCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              ...catBtnS,
              backgroundColor:
                activeCategory === cat.id ? "#7c3aed" : "#f1f5f9",
              color: activeCategory === cat.id ? "#fff" : "#475569",
              borderColor:
                activeCategory === cat.id ? "#7c3aed" : "transparent",
            }}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* رسالة توضيحية لنتائج الفلتر */}
      {(filterDate || filterStartTime || filterEndTime) && (
        <div
          style={{
            marginBottom: "15px",
            fontSize: "0.85rem",
            color: "#059669",
            backgroundColor: "#ecfdf5",
            padding: "10px 15px",
            borderRadius: "10px",
            border: "1px dashed #10b981",
          }}
        >
          ✅{" "}
          {i18n.language === "ar"
            ? `نعرض لك فقط المزودين المتاحين للعمل ${filterDate ? `يوم (${filterDate})` : ""} ${filterStartTime ? `من (${filterStartTime})` : ""} ${filterEndTime ? `إلى (${filterEndTime})` : ""}`
            : "Showing available providers for selected date/time."}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div key={item.id} style={cardS}>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <img
                  src={
                    item.profiles?.avatar_url ||
                    defaultAvatar(item.profiles?.full_name)
                  }
                  style={avS}
                  alt="avatar"
                />
                <div
                  style={{
                    flex: 1,
                    textAlign: i18n.language === "ar" ? "right" : "left",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {item.provider_name || item.profiles?.full_name}
                    {(item.license_number || item.profiles?.license_info) && (
                      <span
                        style={{
                          fontSize: "0.55rem",
                          backgroundColor: "#ecfdf5",
                          color: "#059669",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          fontWeight: "bold",
                          border: "1px solid #10b981",
                        }}
                      >
                        {t("verified", "موثق")}
                      </span>
                    )}
                  </h4>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#f59e0b",
                      fontWeight: "bold",
                    }}
                  >
                    {renderStars(item.profiles?.rating)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#475569",
                      marginTop: "2px",
                      fontWeight: "bold",
                    }}
                  >
                    📍 {item.country || "-"}, {item.city || "-"}
                  </div>
                </div>
                {item.profiles?.provider_type === "institution" && (
                  <span style={instBadge(i18n.language)}>
                    {t("institution")}
                  </span>
                )}
              </div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  margin: "10px 0",
                  color: "#1e293b",
                  height: "40px",
                  overflow: "hidden",
                  textAlign: i18n.language === "ar" ? "right" : "left",
                }}
              >
                {item.title}
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    textAlign: i18n.language === "ar" ? "right" : "left",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color:
                        item.pricing_model === "free" ? "#10b981" : "#7c3aed",
                      fontSize: "1.1rem",
                    }}
                  >
                    {item.pricing_model === "free"
                      ? t("free")
                      : `${item.price} SAR`}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    {t("per")} {modelLabels[item.pricing_model || "fixed"]}
                  </span>
                </div>
                <button onClick={() => setSelected(item)} style={bookB}>
                  {t("view_book")}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "40px",
              color: "#94a3b8",
            }}
          >
            {i18n.language === "ar"
              ? "لا توجد خدمات متاحة تطابق بحثك.."
              : "No services available.."}
          </div>
        )}
      </div>

      {selected && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "-10px",
              }}
            >
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "flex-start",
                marginBottom: "15px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px",
              }}
            >
              <img
                src={
                  selected.profiles?.avatar_url ||
                  defaultAvatar(selected.profiles?.full_name)
                }
                style={{
                  width: "65px",
                  height: "65px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #7c3aed",
                }}
                alt="avatar"
              />
              <div
                style={{
                  flex: 1,
                  textAlign: i18n.language === "ar" ? "right" : "left",
                }}
              >
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.1rem" }}>
                  {selected.provider_name || selected.profiles?.full_name}
                </h3>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#f59e0b",
                    margin: "3px 0",
                  }}
                >
                  {renderStars(selected.profiles?.rating)}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {(selected.whatsapp_number || selected.profiles?.phone) && (
                    <a
                      href={`https://wa.me/${(selected.whatsapp_number || selected.profiles?.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#25d366")}
                    >
                      واتساب
                    </a>
                  )}
                  {selected.profiles?.phone && (
                    <a
                      href={`tel:${selected.profiles.phone}`}
                      style={socialBtn("#10b981")}
                    >
                      {t("call")}
                    </a>
                  )}
                  {(selected.twitter_url || selected.profiles?.twitter_url) && (
                    <a
                      href={
                        selected.twitter_url || selected.profiles.twitter_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#0f1419")}
                    >
                      𝕏 تويتر
                    </a>
                  )}
                  {(selected.instagram_url ||
                    selected.profiles?.instagram_url) && (
                    <a
                      href={
                        selected.instagram_url ||
                        selected.profiles.instagram_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#db2777")}
                    >
                      إنستغرام
                    </a>
                  )}
                  {(selected.youtube_url || selected.profiles?.youtube_url) && (
                    <a
                      href={
                        selected.youtube_url || selected.profiles.youtube_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#ef4444")}
                    >
                      يوتيوب
                    </a>
                  )}
                  {(selected.tiktok_url || selected.profiles?.tiktok_url) && (
                    <a
                      href={selected.tiktok_url || selected.profiles.tiktok_url}
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#000000")}
                    >
                      تيك توك
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                marginBottom: "15px",
                textAlign: i18n.language === "ar" ? "right" : "left",
              }}
            >
              <h4 style={{ margin: "0 0 5px 0", color: "#7c3aed" }}>
                📌 {selected.title}
              </h4>
              <p
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "0.85rem",
                  color: "#475569",
                  lineHeight: "1.5",
                }}
              >
                {selected.description}
              </p>

              <div
                style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "10px" }}
              >
                <strong
                  style={{
                    fontSize: "0.8rem",
                    color: "#1e293b",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  🕒 أوقات الدوام المتاحة:
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    flexWrap: "wrap",
                    marginBottom: "8px",
                  }}
                >
                  {(Array.isArray(selected.available_days) &&
                  selected.available_days.length > 0
                    ? selected.available_days
                    : ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
                  ).map((dayId) => (
                    <span
                      key={dayId}
                      style={{
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        padding: "2px 8px",
                        borderRadius: "5px",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                      }}
                    >
                      {dayLabels[dayId] || dayId}
                    </span>
                  ))}
                </div>
                {selected.is_24_7 ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#059669",
                      backgroundColor: "#ecfdf5",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                    }}
                  >
                    متاح 24 ساعة 🟢
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#d97706",
                      backgroundColor: "#fffbeb",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                    }}
                  >
                    من {selected.work_start_time?.substring(0, 5)} إلى{" "}
                    {selected.work_end_time?.substring(0, 5)}
                  </span>
                )}
              </div>
            </div>

            <h4
              style={{
                color: "#1e293b",
                marginBottom: "10px",
                fontSize: "1rem",
                textAlign: i18n.language === "ar" ? "right" : "left",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "5px",
              }}
            >
              📝 نموذج الحجز المباشر:
            </h4>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "15px",
              }}
            >
              <div
                style={{ textAlign: i18n.language === "ar" ? "right" : "left" }}
              >
                <label style={labelS}>
                  {i18n.language === "ar"
                    ? "رقم الجوال للتواصل:"
                    : "Contact Number:"}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                  style={{
                    ...inputS,
                    textAlign: "left",
                    border: "1px solid #3b82f6",
                  }}
                  value={bookingData.clientContact}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      clientContact: e.target.value,
                    })
                  }
                />
              </div>
              <div
                style={{ textAlign: i18n.language === "ar" ? "right" : "left" }}
              >
                <label style={labelS}>
                  {i18n.language === "ar"
                    ? "الموقع (كتابة أو GPS):"
                    : "Location:"}
                </label>
                <input
                  type="text"
                  placeholder={
                    i18n.language === "ar"
                      ? "اسم الحي، القاعة، أو رابط.."
                      : "Location details.."
                  }
                  style={{ ...inputS, marginBottom: "8px" }}
                  value={bookingData.manualLocation}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      manualLocation: e.target.value,
                      gpsLocation: "",
                    })
                  }
                />
                {bookingData.gpsLocation ? (
                  <div style={locOk}>
                    {i18n.language === "ar"
                      ? "تم التقاط الموقع بنجاح ✅"
                      : "Location captured ✅"}
                  </div>
                ) : (
                  <button onClick={handleGetLocation} style={gpsBtn}>
                    📍{" "}
                    {i18n.language === "ar"
                      ? "استخدام موقعي الحالي"
                      : "Use current location"}
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div style={dateTimeCard}>
                <label
                  style={{ ...labelS, color: "#059669", fontSize: "0.85rem" }}
                >
                  🟢 موعد البدء (اليوم والساعة):
                </label>
                <input
                  type="datetime-local"
                  min={nowStr}
                  style={fancyDateTimeInput}
                  value={bookingData.startDateTime}
                  onChange={(e) =>
                    handleDateTimeChange("startDateTime", e.target.value)
                  }
                />
              </div>
              <div style={dateTimeCard}>
                <label
                  style={{ ...labelS, color: "#ef4444", fontSize: "0.85rem" }}
                >
                  🏁 موعد الانتهاء (اليوم والساعة):
                </label>
                <input
                  type="datetime-local"
                  min={bookingData.startDateTime || nowStr}
                  style={fancyDateTimeInput}
                  value={bookingData.endDateTime}
                  onChange={(e) =>
                    handleDateTimeChange("endDateTime", e.target.value)
                  }
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#eff6ff",
                padding: "15px",
                borderRadius: "12px",
                border: "1px dashed #3b82f6",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>
                {t("total")} {calculatedData.quantity} {calculatedData.text}
                :{" "}
              </span>
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color:
                    selected.pricing_model === "free" ? "#10b981" : "#2563eb",
                }}
              >
                {selected.pricing_model === "free"
                  ? `${t("free")} 💚`
                  : `${calculatedData.price} SAR`}
              </span>
            </div>

            <button onClick={handleBook} style={confirmBtn}>
              {i18n.language === "ar"
                ? "تأكيد وإرسال الطلب ✅"
                : "Confirm Booking ✅"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const heroSectionS = {
  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  padding: "40px 20px",
  borderRadius: "24px",
  textAlign: "center",
  color: "white",
  marginBottom: "20px",
  boxShadow: "0 10px 25px rgba(79, 70, 229, 0.2)",
};
const heroTitleS = {
  fontSize: "1.8rem",
  margin: "0 0 10px 0",
  fontWeight: "800",
};
const heroSubTitleS = { fontSize: "1rem", opacity: "0.9", margin: 0 };
const searchField = {
  border: "none",
  outline: "none",
  width: "100%",
  background: "transparent",
  fontSize: "0.95rem",
  fontFamily: "inherit",
};
const filterSelectS = {
  flex: "1 1 120px",
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  outline: "none",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontWeight: "bold",
  fontSize: "0.85rem",
};
const categoryBarS = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  marginBottom: "20px",
};
const catBtnS = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  padding: "8px 16px",
  borderRadius: "20px",
  border: "1px solid",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.85rem",
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
};
const cardS = {
  backgroundColor: "#fff",
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f1f5f9",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
};
const avS = {
  width: "45px",
  height: "45px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #f1f5f9",
};
const bookB = {
  backgroundColor: "#7c3aed",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: "bold",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 3000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "25px",
  width: "100%",
  maxWidth: "450px",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
};
const labelS = {
  display: "block",
  fontSize: "0.8rem",
  color: "#475569",
  marginBottom: "6px",
  fontWeight: "bold",
};
const inputS = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.9rem",
  fontFamily: "inherit",
};
const confirmBtn = {
  width: "100%",
  backgroundColor: "#059669",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "15px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "1.1rem",
  transition: "0.3s",
  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
};
const gpsBtn = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px dashed #3b82f6",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "0.85rem",
};
const instBadge = (lang) => ({
  fontSize: "0.6rem",
  backgroundColor: "#1e293b",
  color: "#fff",
  padding: "2px 6px",
  borderRadius: "10px",
  fontWeight: "bold",
  marginLeft: lang === "ar" ? "auto" : "0",
  marginRight: lang === "en" ? "auto" : "0",
});
const locOk = {
  padding: "10px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #10b981",
  borderRadius: "10px",
  textAlign: "center",
  color: "#059669",
  fontWeight: "bold",
  fontSize: "0.85rem",
};
const socialBtn = (bg) => ({
  backgroundColor: bg,
  color: "#fff",
  padding: "4px 8px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "0.7rem",
  fontWeight: "bold",
});
const dateTimeCard = {
  backgroundColor: "#f8fafc",
  padding: "15px",
  borderRadius: "15px",
  border: "1px solid #e2e8f0",
};
const fancyDateTimeInput = {
  width: "100%",
  padding: "12px 15px",
  borderRadius: "10px",
  border: "2px solid #cbd5e1",
  fontSize: "1rem",
  color: "#1e293b",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  cursor: "pointer",
};
