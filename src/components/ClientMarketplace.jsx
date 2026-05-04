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

  // فلاتر البحث
  const [localSearch, setLocalSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");

  const [reviews, setReviews] = useState([]);

  const [bookingData, setBookingData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
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

  const filtered = offerings.filter((item) => {
    const s = localSearch.toLowerCase();
    const matchesSearch =
      (item.title || "").toLowerCase().includes(s) ||
      (item.nickname || "").toLowerCase().includes(s) ||
      (item.provider_name || "").toLowerCase().includes(s) ||
      (item.profiles?.full_name || "").toLowerCase().includes(s) ||
      (item.description || "").toLowerCase().includes(s);
    const itemCat = item.category || "other";
    const matchesCategory =
      activeCategory === "all" || itemCat === activeCategory;
    const matchesCountry =
      filterCountry === "all" || item.country === filterCountry;
    const matchesCity = filterCity === "all" || item.city === filterCity;

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
      if (pEnd <= pStart) pEnd += 24 * 60;

      let fStart = filterStartTime ? toMins(filterStartTime) : pStart;
      let fEnd = filterEndTime ? toMins(filterEndTime) : pEnd;

      if (fEnd <= fStart && filterStartTime && filterEndTime) fEnd += 24 * 60;
      if (fStart < pStart && pEnd > 24 * 60) fStart += 24 * 60;
      if (fEnd < pStart && pEnd > 24 * 60) fEnd += 24 * 60;

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
      bookingData.startDate &&
      bookingData.endDate
    ) {
      const startStr = `${bookingData.startDate}T${bookingData.startTime || "00:00"}`;
      const endStr = `${bookingData.endDate}T${bookingData.endTime || "23:59"}`;
      const start = new Date(startStr);
      const end = new Date(endStr);
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

  const handleDateChange = (field, value) => {
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
          ? `⛔ عذراً! المزود لا يعمل في يوم (${dayLabels[dayId] || dayId}). الرجاء اختيار يوم آخر.`
          : "⛔ The provider does not work on this day.",
      );
      setBookingData({ ...bookingData, [field]: "" });
      return;
    }

    setBookingData({ ...bookingData, [field]: value });
  };

  const handleSuggestNextSlot = () => {
    if (!selected) return;

    const now = new Date();
    let proposedStart = new Date(now.getTime() + 60 * 60 * 1000);

    const mins = proposedStart.getMinutes();
    if (mins > 0 && mins <= 30) {
      proposedStart.setMinutes(30, 0, 0);
    } else if (mins > 30) {
      proposedStart.setHours(proposedStart.getHours() + 1);
      proposedStart.setMinutes(0, 0, 0);
    }

    const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const activeDays =
      Array.isArray(selected.available_days) &&
      selected.available_days.length > 0
        ? selected.available_days
        : dayMap;

    let foundDate = null;

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(proposedStart);
      checkDate.setDate(checkDate.getDate() + i);
      const dayId = dayMap[checkDate.getDay()];

      if (activeDays.includes(dayId)) {
        if (selected.is_24_7) {
          if (i === 0) {
            foundDate = checkDate;
          } else {
            checkDate.setHours(8, 0, 0, 0);
            foundDate = checkDate;
          }
          break;
        } else {
          const pStartStr = selected.work_start_time || "08:00";
          const pEndStr = selected.work_end_time || "22:00";
          const startH = parseInt(pStartStr.split(":")[0]);
          const startM = parseInt(pStartStr.split(":")[1]);

          if (i === 0) {
            const currentMins =
              checkDate.getHours() * 60 + checkDate.getMinutes();
            const pStartMins = startH * 60 + startM;
            let pEndMins =
              parseInt(pEndStr.split(":")[0]) * 60 +
              parseInt(pEndStr.split(":")[1]);
            if (pEndMins <= pStartMins) pEndMins += 24 * 60;

            if (currentMins >= pStartMins && currentMins < pEndMins - 60) {
              foundDate = checkDate;
              break;
            } else if (currentMins < pStartMins) {
              checkDate.setHours(startH, startM, 0, 0);
              foundDate = checkDate;
              break;
            }
          } else {
            checkDate.setHours(startH, startM, 0, 0);
            foundDate = checkDate;
            break;
          }
        }
      }
    }

    if (foundDate) {
      const pad = (num) => String(num).padStart(2, "0");
      const fmtDate = (d) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

      const startDateStr = fmtDate(foundDate);
      const startTimeStr = fmtTime(foundDate);

      const endDateObj = new Date(foundDate.getTime() + 60 * 60 * 1000);
      const endDateStr = fmtDate(endDateObj);
      const endTimeStr = fmtTime(endDateObj);

      setBookingData({
        ...bookingData,
        startDate: startDateStr,
        startTime: startTimeStr,
        endDate: endDateStr,
        endTime: endTimeStr,
      });
    } else {
      alert(
        i18n.language === "ar"
          ? "لا يمكن تحديد موعد تلقائي، يرجى الاختيار يدوياً."
          : "Cannot auto-suggest a slot.",
      );
    }
  };

  const handleBook = async () => {
    const isTimeOptional =
      ["fixed", "daily"].includes(selected?.pricing_model) ||
      selected?.price_upon_agreement;

    const finalLocation = bookingData.manualLocation || bookingData.gpsLocation;

    if (
      !bookingData.startDate ||
      !bookingData.endDate ||
      (!isTimeOptional && (!bookingData.startTime || !bookingData.endTime)) ||
      !finalLocation ||
      !bookingData.clientContact
    ) {
      return alert(
        i18n.language === "ar"
          ? "يرجى إكمال جميع التفاصيل المطلوبة (الموقع، التواريخ، ورقم التواصل) 📍📞"
          : "Please complete all details.",
      );
    }

    const requestedStart = new Date(
      `${bookingData.startDate}T${bookingData.startTime || "00:00"}`,
    );
    let requestedEnd = new Date(
      `${bookingData.endDate}T${bookingData.endTime || "23:59"}`,
    );
    const now = new Date();

    if (requestedStart < now && bookingData.startTime)
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

    const hasTime = bookingData.startTime && bookingData.endTime;
    if (
      selected.is_24_7 === false &&
      selected.work_start_time &&
      selected.work_end_time &&
      hasTime
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

    const payloadStatus = selected.price_upon_agreement
      ? "awaiting_pricing"
      : "pending";

    const { error } = await supabase.from("bookings").insert([
      {
        offering_id: selected.id,
        customer_id: session.user.id,
        appointment_date: requestedStart.toISOString(),
        end_time: requestedEnd.toISOString(),
        location: finalLocation,
        quantity: calculatedData.quantity,
        status: payloadStatus,
        client_contact: bookingData.clientContact,
      },
    ]);

    if (!error) {
      alert(
        i18n.language === "ar"
          ? selected.price_upon_agreement
            ? "تم إرسال طلب التسعير للمزود بنجاح 📨"
            : "تم إرسال الطلب للمزود بنجاح ✅"
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
  const renderStars = (rating) => "⭐ " + (rating ? rating.toFixed(1) : "5.0");

  const defaultAvatar = (name, hexColor = "#7c3aed") => {
    const cleanHex = hexColor.replace("#", "");
    return `https://ui-avatars.com/api/?name=${name || "User"}&background=${cleanHex}20&color=${cleanHex}&bold=true`;
  };

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          color: "#7c3aed",
          fontWeight: "bold",
        }}
      >
        ⏳ {i18n.language === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );

  const isTimeOptional =
    selected &&
    (["fixed", "daily"].includes(selected.pricing_model) ||
      selected.price_upon_agreement);
  const isRTL = i18n.language === "ar";

  // ✨ استخراج لون الهوية الخاص بالمزود بمجرد الضغط على بطاقته ✨
  const themeColor = selected?.profiles?.theme_color || "#7c3aed";

  return (
    <div style={{ direction: isRTL ? "rtl" : "ltr" }}>
      {/* ✨ أكواد CSS المدمجة لتأثيرات الـ Hover وإخفاء شريط التمرير ✨ */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .smart-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); top: 0; }
        .smart-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); }
        .search-container { position: relative; z-index: 10; margin-top: -35px; margin-bottom: 30px; }
      `}</style>

      {/* 1. البانر الترحيبي (Hero Section) */}
      <div style={heroSectionS}>
        <h1 style={heroTitleS}>{welcomeMsg}</h1>
        <p style={heroSubTitleS}>{heroSubtitle}</p>
      </div>

      {/* 2. شريط البحث العائم (Floating Search Bar) */}
      <div className="search-container" style={{ padding: "0 15px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            backgroundColor: "#fff",
            borderRadius: "20px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            border: "1px solid #f1f5f9",
            overflow: "hidden",
          }}
        >
          {/* حقل البحث الرئيسي */}
          <div
            style={{
              flex: "2 1 250px",
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              borderRight: isRTL ? "none" : "1px solid #f1f5f9",
              borderLeft: isRTL ? "1px solid #f1f5f9" : "none",
            }}
          >
            <span
              style={{
                fontSize: "1.2rem",
                margin: isRTL ? "0 0 0 10px" : "0 10px 0 0",
                color: "#7c3aed",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder={
                isRTL ? "ابحث عن خدمة، مزود، أو تخصص..." : "Search..."
              }
              style={searchField}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          {/* فلاتر الدول والمدن */}
          <div
            style={{ flex: "1 1 120px", display: "flex", alignItems: "center" }}
          >
            <select
              value={filterCountry}
              onChange={(e) => {
                setFilterCountry(e.target.value);
                setFilterCity("all");
              }}
              style={floatingSelectS(isRTL)}
            >
              <option value="all">🌍 {t("filter_country", "كل الدول")}</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{ flex: "1 1 120px", display: "flex", alignItems: "center" }}
          >
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              style={floatingSelectS(isRTL)}
            >
              <option value="all">🏙️ {t("filter_city", "كل المدن")}</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر التاريخ والوقت */}
          <div
            style={{
              flex: "1.5 1 150px",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
            }}
          >
            <input
              type="date"
              min={todayDate}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ ...floatingSelectS(isRTL), border: "none" }}
              title={isRTL ? "تاريخ الحجز (اختياري)" : "Date (Optional)"}
            />
          </div>

          {/* زر تفريغ الفلاتر */}
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
                backgroundColor: "#fef2f2",
                color: "#ef4444",
                border: "none",
                padding: "0 20px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "0.2s",
              }}
              title="مسح الفلاتر"
            >
              ✖ مسح
            </button>
          )}
        </div>
      </div>

      {/* 3. شريط الأقسام الأفقي (Horizontal Scrollable Categories) */}
      <div className="hide-scrollbar" style={categoryScrollWrapperS}>
        {displayCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                ...catBtnS,
                backgroundColor: isActive ? "#1e293b" : "#f8fafc",
                color: isActive ? "#fff" : "#475569",
                border: isActive ? "1px solid #1e293b" : "1px solid #e2e8f0",
                boxShadow: isActive
                  ? "0 4px 10px rgba(30, 41, 59, 0.2)"
                  : "none",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{cat.icon}</span> {cat.label}
            </button>
          );
        })}
      </div>

      {/* تنبيه نتيجة البحث */}
      {(filterDate || filterStartTime || filterEndTime) && (
        <div style={searchAlertS}>
          ✅{" "}
          {i18n.language === "ar"
            ? `نعرض لك فقط المزودين المتاحين للعمل ${filterDate ? `يوم (${filterDate})` : ""} ${filterStartTime ? `من (${filterStartTime})` : ""} ${filterEndTime ? `إلى (${filterEndTime})` : ""}`
            : "Showing available providers for selected date/time."}
        </div>
      )}

      {/* 4. شبكة البطاقات الذكية (Smart Cards Grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "25px",
          alignItems: "stretch",
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const isFree = item.pricing_model === "free";
            const isAgreement = item.price_upon_agreement;
            const itemThemeColor = item.profiles?.theme_color || "#7c3aed"; // لون خاص بكل بطاقة لو أردنا

            return (
              <div key={item.id} className="smart-card" style={smartCardS}>
                {/* الجزء العلوي: الغطاء (Cover) والأوسمة */}
                <div style={cardCoverS(isFree)}>
                  <div
                    style={{
                      display: "flex",
                      gap: "5px",
                      padding: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    {item.profiles?.provider_type === "institution" && (
                      <span style={coverBadgeS("#1e293b", "#fff")}>
                        🏢 {t("institution")}
                      </span>
                    )}
                    {(item.license_number || item.profiles?.license_info) && (
                      <span style={coverBadgeS("#ecfdf5", "#059669")}>
                        🛡️ {t("verified", "موثق")}
                      </span>
                    )}
                  </div>
                </div>

                {/* الجزء الأوسط: البيانات */}
                <div style={cardBodyS}>
                  {/* الصورة والتقييم */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginTop: "-45px",
                      marginBottom: "10px",
                      position: "relative",
                      zIndex: 10,
                    }}
                  >
                    <img
                      src={
                        item.profiles?.avatar_url ||
                        defaultAvatar(item.profiles?.full_name, itemThemeColor)
                      }
                      style={cardAvatarS}
                      alt="avatar"
                    />
                    <div
                      style={{
                        marginTop: "40px",
                        fontSize: "0.85rem",
                        color: "#f59e0b",
                        fontWeight: "900",
                        backgroundColor: "#fffbeb",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {renderStars(item.profiles?.rating)}
                    </div>
                  </div>

                  {/* اسم المزود */}
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#64748b",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    {item.nickname ||
                      item.provider_name ||
                      item.profiles?.full_name}
                  </div>

                  {/* اسم الخدمة */}
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "1.1rem",
                      color: "#1e293b",
                      fontWeight: "900",
                      lineHeight: "1.4",
                    }}
                  >
                    {item.title}
                  </h3>

                  {/* الوصف (محدود بـ 3 أسطر) */}
                  <p style={cardDescriptionS} title={item.description}>
                    {item.description}
                  </p>

                  {/* الموقع الجغرافي */}
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      marginTop: "auto",
                      marginBottom: "15px",
                      fontWeight: "bold",
                    }}
                  >
                    📍 {item.country || "-"}, {item.city || "-"}
                  </div>

                  {/* الجزء السفلي: السعر وزر الحجز */}
                  <div style={cardFooterS}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: isAgreement ? "0.95rem" : "1.2rem",
                          color: isAgreement
                            ? "#3b82f6"
                            : isFree
                              ? "#10b981"
                              : "#7c3aed",
                        }}
                      >
                        {isAgreement
                          ? "حسب الاتفاق 🤝"
                          : isFree
                            ? t("free")
                            : `${item.price} SAR`}
                      </span>
                      {!isAgreement && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "#64748b",
                            fontWeight: "bold",
                          }}
                        >
                          {t("per")}{" "}
                          {modelLabels[item.pricing_model || "fixed"]}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelected(item)}
                      style={smartBookBtnS}
                    >
                      {t("view_book", "احجز الآن")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={noResultsS}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🕵️‍♂️</div>
            {i18n.language === "ar"
              ? "لم نجد خدمات تطابق بحثك حالياً.."
              : "No services match your search.."}
          </div>
        )}
      </div>

      {/* النافذة المنبثقة الذكية المتفاعلة مع لون المزود 🎨 */}
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
                  color: "#94a3b8",
                  transition: "0.2s",
                }}
                onMouseOver={(e) => (e.target.style.color = "#ef4444")}
                onMouseOut={(e) => (e.target.style.color = "#94a3b8")}
              >
                ✖
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
                  defaultAvatar(selected.profiles?.full_name, themeColor)
                }
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${themeColor}`, // ✨ إطار صورة المزود بلونه ✨
                }}
                alt="avatar"
              />
              <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
                <h3
                  style={{
                    margin: "0 0 5px 0",
                    color: "#1e293b",
                    fontSize: "1.2rem",
                    fontWeight: "900",
                  }}
                >
                  {selected.nickname ||
                    selected.provider_name ||
                    selected.profiles?.full_name}
                </h3>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#f59e0b",
                    fontWeight: "bold",
                  }}
                >
                  {renderStars(selected.profiles?.rating)}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginTop: "10px",
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
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                marginBottom: "20px",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px 0",
                  color: themeColor, // ✨ عنوان الخدمة بلون المزود ✨
                  fontSize: "1.1rem",
                  fontWeight: "900",
                }}
              >
                📌 {selected.title}
              </h4>
              <p
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "0.9rem",
                  color: "#475569",
                  lineHeight: "1.6",
                }}
              >
                {selected.description}
              </p>

              <div
                style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "12px" }}
              >
                <strong
                  style={{
                    fontSize: "0.85rem",
                    color: "#1e293b",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  🕒 أوقات الدوام المتاحة:
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
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
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
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
                      fontSize: "0.8rem",
                      color: "#059669",
                      backgroundColor: "#ecfdf5",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    متاح 24 ساعة 🟢
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#d97706",
                      backgroundColor: "#fffbeb",
                      padding: "4px 10px",
                      borderRadius: "8px",
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
                marginBottom: "15px",
                fontSize: "1.1rem",
                textAlign: isRTL ? "right" : "left",
                fontWeight: "900",
              }}
            >
              📝 نموذج الحجز المباشر:
            </h4>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              <div style={{ textAlign: isRTL ? "right" : "left" }}>
                <label style={labelS}>
                  {isRTL ? "رقم الجوال للتواصل:" : "Contact Number:"}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                  style={{
                    ...inputS,
                    textAlign: "left",
                    border: "2px solid #bfdbfe",
                    backgroundColor: "#eff6ff",
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

              <div style={{ textAlign: isRTL ? "right" : "left" }}>
                <label style={labelS}>
                  {isRTL ? "الموقع (كتابة أو GPS):" : "Location:"}
                </label>
                <input
                  type="text"
                  placeholder={
                    isRTL ? "اسم الحي، القاعة، أو رابط.." : "Location details.."
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
                    {isRTL
                      ? "تم التقاط الموقع بنجاح ✅"
                      : "Location captured ✅"}
                  </div>
                ) : (
                  <button onClick={handleGetLocation} style={gpsBtn}>
                    📍 {isRTL ? "استخدام موقعي الحالي" : "Use current location"}
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <div style={dateTimeCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <label
                    style={{
                      ...labelS,
                      color: "#059669",
                      fontSize: "0.9rem",
                      margin: 0,
                    }}
                  >
                    🟢 موعد البدء:
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestNextSlot}
                    style={{
                      backgroundColor: themeColor, // ✨ زر اقتراح موعد بلون المزود ✨
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "10px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "0.2s",
                      boxShadow: `0 2px 8px ${themeColor}40`,
                    }}
                  >
                    ✨ اقتراح موعد
                  </button>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        fontWeight: "bold",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      التاريخ:
                    </label>
                    <input
                      type="date"
                      min={todayDate}
                      style={fancyDateTimeInput}
                      value={bookingData.startDate}
                      onChange={(e) =>
                        handleDateChange("startDate", e.target.value)
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        fontWeight: "bold",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      الوقت {isTimeOptional && "(اختياري)"}:
                    </label>
                    <input
                      type="time"
                      style={fancyDateTimeInput}
                      value={bookingData.startTime}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div style={dateTimeCard}>
                <label
                  style={{
                    ...labelS,
                    color: "#ef4444",
                    fontSize: "0.9rem",
                    marginBottom: "12px",
                  }}
                >
                  🏁 موعد الانتهاء:
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        fontWeight: "bold",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      التاريخ:
                    </label>
                    <input
                      type="date"
                      min={bookingData.startDate || todayDate}
                      style={fancyDateTimeInput}
                      value={bookingData.endDate}
                      onChange={(e) =>
                        handleDateChange("endDate", e.target.value)
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        fontWeight: "bold",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      الوقت {isTimeOptional && "(اختياري)"}:
                    </label>
                    <input
                      type="time"
                      style={fancyDateTimeInput}
                      value={bookingData.endTime}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: selected.price_upon_agreement
                  ? "#f0fdf4"
                  : "#f8fafc",
                padding: "18px",
                borderRadius: "16px",
                border: `1px dashed ${selected.price_upon_agreement ? "#10b981" : themeColor}`, // ✨ إطار الصندوق بلون المزود ✨
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              {selected.price_upon_agreement ? (
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "900",
                    color: "#059669",
                  }}
                >
                  🤝 سيتم تحديد السعر لاحقاً من قبل المزود (حسب الاتفاق)
                </span>
              ) : (
                <>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "#475569",
                      fontWeight: "bold",
                    }}
                  >
                    {t("total")} {calculatedData.quantity} {calculatedData.text}
                    :{" "}
                  </span>
                  <span
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: "900",
                      color:
                        selected.pricing_model === "free"
                          ? "#10b981"
                          : themeColor, // ✨ السعر يظهر بلون المزود ✨
                    }}
                  >
                    {selected.pricing_model === "free"
                      ? `${t("free")} 💚`
                      : `${calculatedData.price} SAR`}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleBook}
              style={{
                ...confirmBtn,
                backgroundColor: themeColor, // ✨ الزر الرئيسي بلون المزود ✨
                boxShadow: `0 4px 15px ${themeColor}40`,
              }}
            >
              {selected.price_upon_agreement
                ? "إرسال طلب تسعير للمزود 📨"
                : isRTL
                  ? "تأكيد وإرسال الطلب ✅"
                  : "Confirm Booking ✅"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ✨ التنسيقات العصرية الجديدة ✨
const heroSectionS = {
  background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", // تدرج بنفسجي متناسق ومشرق 100%
  padding: "55px 20px 85px", // زدنا المساحة السفلية ليتنفس شريط البحث
  borderRadius: "24px",
  textAlign: "center",
  color: "#ffffff",
  boxShadow: "0 10px 30px rgba(109, 40, 217, 0.25)", // ظل بنفسجي ناعم
  marginTop: "25px",
};

const heroTitleS = {
  fontSize: "2.4rem", // تكبير الخط قليلاً ليكون أفخم
  color: "#ffffff", // إجبار النص على اللون الأبيض الناصع (بدل الأسود)
  margin: "0 0 18px 0", // زيادة المسافة السفلية لتباعد الأسطر
  fontWeight: "900",
  lineHeight: "1.4",
  textShadow: "0 2px 10px rgba(0,0,0,0.15)", // ظل خفيف جداً للنص ليفصل عن الخلفية
};

const heroSubTitleS = {
  fontSize: "1.15rem",
  color: "#f1f5f9", // أبيض مائل للرمادي الفاتح ليعطي تبايناً مع العنوان الرئيسي
  opacity: "0.95",
  margin: 0,
  lineHeight: "1.6", // إعطاء مساحة تنفس للسطر نفسه
  fontWeight: "500",
};
const searchField = {
  border: "none",
  outline: "none",
  width: "100%",
  background: "transparent",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  fontWeight: "bold",
  color: "#1e293b",
};
const floatingSelectS = (isRTL) => ({
  width: "100%",
  padding: "12px",
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
  color: "#475569",
  fontWeight: "bold",
  fontSize: "0.85rem",
  borderRight: isRTL ? "none" : "1px solid #f1f5f9",
  borderLeft: isRTL ? "1px solid #f1f5f9" : "none",
  cursor: "pointer",
});

const categoryScrollWrapperS = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  gap: "12px",
  padding: "10px 5px 15px",
  marginBottom: "20px",
};
const catBtnS = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  borderRadius: "25px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
};

const smartCardS = {
  display: "flex",
  flexDirection: "column",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
  backgroundColor: "#fff",
  border: "1px solid #f1f5f9",
};
const cardCoverS = (isFree) => ({
  height: "90px",
  background: isFree
    ? "linear-gradient(135deg, #a7f3d0, #10b981)"
    : "linear-gradient(135deg, #ddd6fe, #8b5cf6)",
  position: "relative",
});
const coverBadgeS = (bg, color) => ({
  backgroundColor: bg,
  color: color,
  padding: "4px 10px",
  borderRadius: "12px",
  fontSize: "0.7rem",
  fontWeight: "bold",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
});
const cardBodyS = {
  padding: "0 20px 20px",
  display: "flex",
  flexDirection: "column",
  flex: 1,
};
const cardAvatarS = {
  width: "70px",
  height: "70px",
  borderRadius: "50%",
  border: "4px solid #fff",
  backgroundColor: "#fff",
  objectFit: "cover",
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
};
const cardDescriptionS = {
  margin: "0 0 15px 0",
  fontSize: "0.85rem",
  color: "#64748b",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: "1.6",
};
const cardFooterS = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTop: "1px solid #f1f5f9",
  paddingTop: "15px",
};
const smartBookBtnS = {
  backgroundColor: "#1e293b",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: "bold",
  transition: "0.2s",
};
smartBookBtnS[":hover"] = { backgroundColor: "#0f172a" };

const searchAlertS = {
  marginBottom: "20px",
  fontSize: "0.9rem",
  color: "#059669",
  backgroundColor: "#ecfdf5",
  padding: "12px 20px",
  borderRadius: "12px",
  border: "1px dashed #10b981",
  fontWeight: "bold",
};
const noResultsS = {
  gridColumn: "1 / -1",
  textAlign: "center",
  padding: "60px 20px",
  color: "#64748b",
  backgroundColor: "#f8fafc",
  borderRadius: "20px",
  border: "2px dashed #cbd5e1",
  fontWeight: "bold",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 4000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "30px",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "500px",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
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
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.95rem",
  fontFamily: "inherit",
};
const confirmBtn = {
  width: "100%",
  color: "white",
  border: "none",
  padding: "16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "1.1rem",
  transition: "0.3s",
};
const gpsBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px dashed #3b82f6",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "0.9rem",
};
const locOk = {
  padding: "12px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #10b981",
  borderRadius: "12px",
  textAlign: "center",
  color: "#059669",
  fontWeight: "bold",
  fontSize: "0.9rem",
};
const socialBtn = (bg) => ({
  backgroundColor: bg,
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "0.75rem",
  fontWeight: "bold",
});
const dateTimeCard = {
  backgroundColor: "#f8fafc",
  padding: "18px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
};
const fancyDateTimeInput = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "0.95rem",
  color: "#1e293b",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  cursor: "pointer",
};
