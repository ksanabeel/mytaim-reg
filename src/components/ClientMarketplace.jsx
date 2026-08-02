import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

// استيرادات مكتبة التقويم
import DatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_ar from "react-date-object/locales/gregorian_ar";
import "react-multi-date-picker/styles/layouts/mobile.css";

const SmartDatePicker = DatePicker.default || DatePicker;
const SmartTimePicker = TimePicker.default || TimePicker;

export default function ClientMarketplace({
  session,
  onRequireLogin,
  allowTextReviews = true,
  welcomeMsg = "",
  heroSubtitle = "",
  announcementText,
  announcementLink,
  isAnnouncementActive,
  appleStoreLink,
  playStoreLink,
}) {
  const { t, i18n } = useTranslation();
  const { storeUsername } = useParams();
  const username = storeUsername ? storeUsername.replace("@", "") : null;
  const isRTL = i18n.language === "ar";
  const userId = session?.user?.id;

  const [liveTime, setLiveTime] = useState(new Date());
  const [offerings, setOfferings] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [isSpecialManualBooking, setIsSpecialManualBooking] = useState(false);
  const [availableCapacity, setAvailableCapacity] = useState(null);
  const [storeProfile, setStoreProfile] = useState(null);

  const [localSearch, setLocalSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");

  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observer = useRef();
  const ITEMS_PER_PAGE = 12;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    manualLocation: "",
    gpsLocation: "",
    manualQuantity: 1,
    clientContact: "",
    clientMessage: "",
  });

  const [calculatedData, setCalculatedData] = useState({
    price: 0,
    quantity: 1,
    timeMultiplier: 1,
    requestedCount: 1,
    text: "",
  });

  const dayLabels = {
    sun: "الأحد",
    mon: "الإثنين",
    tue: "الثلاثاء",
    wed: "الأربعاء",
    thu: "الخميس",
    fri: "الجمعة",
    sat: "السبت",
  };

  const fetchInitialData = async () => {
    setLoading(true);

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("created_at");
    if (cats) setDbCategories(cats);

    if (username) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      if (prof) setStoreProfile(prof);
    }

    if (userId) {
      const { data: favs } = await supabase
        .from("favorites")
        .select("provider_id")
        .eq("user_id", userId);
      if (favs) setFavorites(favs.map((f) => f.provider_id));
    }

    let query = supabase
      .from("offerings")
      .select("*, profiles!inner(*)")
      .eq("profiles.is_active", true);

    if (username) query = query.eq("profiles.username", username);

    // 🔥 ترتيب سريع ومباشر من قاعدة البيانات بدون حسابات معقدة 🔥
    query = query.order("rating", {
      referencedTable: "profiles",
      ascending: false,
    });

    const { data: offs } = await query.range(0, ITEMS_PER_PAGE - 1);

    if (offs && offs.length > 0) {
      setOfferings(offs);
      if (offs.length < ITEMS_PER_PAGE) setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchInitialData();
  }, [username, userId]);

  const fetchMoreData = async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);

    const nextPage = page + 1;
    let query = supabase
      .from("offerings")
      .select("*, profiles!inner(*)")
      .eq("profiles.is_active", true);

    if (username) query = query.eq("profiles.username", username);
    query = query.order("rating", {
      referencedTable: "profiles",
      ascending: false,
    });

    const { data: newOffs } = await query.range(
      nextPage * ITEMS_PER_PAGE,
      (nextPage + 1) * ITEMS_PER_PAGE - 1,
    );

    if (newOffs && newOffs.length > 0) {
      setOfferings((prev) => [...prev, ...newOffs]);
      setPage(nextPage);
      if (newOffs.length < ITEMS_PER_PAGE) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setIsFetchingMore(false);
  };

  const lastElementRef = useCallback(
    (node) => {
      if (loading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreData();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, isFetchingMore, hasMore],
  );

  const toggleFavorite = async (e, providerId) => {
    e.stopPropagation();
    if (!session)
      return alert(
        isRTL
          ? "يرجى تسجيل الدخول لاستخدام المفضلة 🔐"
          : "Please login first to use favorites 🔐",
      );

    if (favorites.includes(providerId)) {
      setFavorites(favorites.filter((id) => id !== providerId));
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("provider_id", providerId);
    } else {
      setFavorites([...favorites, providerId]);
      await supabase
        .from("favorites")
        .insert({ user_id: userId, provider_id: providerId });
    }
  };

  const renderTextWithLinks = (text) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#fef08a",
              textDecoration: "underline",
              fontWeight: "bold",
              margin: "0 4px",
              direction: "ltr",
              display: "inline-block",
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const displayCategories = [
    { id: "all", label: t("cat_all", "الكل"), icon: "🌟" },
    ...dbCategories.map((c) => ({
      id: c.id,
      label: isRTL ? c.label_ar : c.label_en,
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
      (item.provider_role || "").toLowerCase().includes(s) ||
      (item.profiles?.full_name || "").toLowerCase().includes(s) ||
      (item.profiles?.username || "").toLowerCase().includes(s) ||
      (item.description || "").toLowerCase().includes(s);
    const itemCat = item.category || "other";
    const matchesCategory =
      activeCategory === "all" ||
      activeCategory === "favorites" ||
      itemCat === activeCategory;
    const matchesCountry =
      filterCountry === "all" || item.country === filterCountry;
    const matchesCity = filterCity === "all" || item.city === filterCity;
    const matchesFavorites =
      activeCategory !== "favorites" || favorites.includes(item.provider_id);

    let matchesDate = true;
    if (filterDate) {
      const selectedDay = new Date(filterDate);
      const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const dayId = dayMap[selectedDay.getDay()];
      const activeDays =
        Array.isArray(item.available_days) && item.available_days.length > 0
          ? item.available_days
          : dayMap;
      if (!activeDays.includes(dayId)) matchesDate = false;
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
      if (fStart < pStart || fEnd > pEnd) matchesTime = false;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesCountry &&
      matchesCity &&
      matchesDate &&
      matchesTime &&
      matchesFavorites
    );
  });

  useEffect(() => {
    if (!selected) {
      setReviews([]);
      setBookingData((prev) => ({
        ...prev,
        manualQuantity: 1,
        clientMessage: "",
      }));
      setAvailableCapacity(null);
      return;
    }
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "rating, review, review_text, client_review, profiles(full_name)",
        )
        .eq("offering_id", selected.id)
        .eq("status", "completed")
        .not("rating", "is", null)
        .order("id", { ascending: false })
        .limit(10);
      setReviews(data || []);
    };
    fetchReviews();
    setAvailableCapacity(selected.max_capacity || 1);
  }, [selected]);

  useEffect(() => {
    const fetchRealTimeCapacity = async () => {
      if (!selected) return;
      const maxCap = selected.max_capacity || 1;

      if (!bookingData.startDate) {
        setAvailableCapacity(maxCap);
        return;
      }

      const requestedStart = new Date(
        `${bookingData.startDate}T${bookingData.startTime || "00:00"}:00`,
      );
      const requestedEnd = new Date(
        `${bookingData.endDate || bookingData.startDate}T${
          bookingData.endTime || "23:59"
        }:00`,
      );

      try {
        const { data: existing } = await supabase
          .from("bookings")
          .select("appointment_date, end_time, quantity, status")
          .eq("offering_id", selected.id)
          .in("status", ["confirmed", "completed"]);

        let usedCapacity = 0;

        existing?.forEach((b) => {
          const bStart = new Date(b.appointment_date);
          const bEnd = b.end_time
            ? new Date(b.end_time)
            : new Date(bStart.getTime() + 60 * 60 * 1000);

          if (requestedStart < bEnd && requestedEnd > bStart) {
            usedCapacity += b.quantity || 1;
          }
        });

        const available = Math.max(0, maxCap - usedCapacity);
        setAvailableCapacity(available);

        if (bookingData.manualQuantity > available) {
          setBookingData((prev) => ({
            ...prev,
            manualQuantity: available > 0 ? available : 1,
          }));
        }
      } catch (err) {
        console.error("Error fetching dynamic capacity:", err);
      }
    };

    fetchRealTimeCapacity();
  }, [
    selected,
    bookingData.startDate,
    bookingData.startTime,
    bookingData.endDate,
    bookingData.endTime,
  ]);

  useEffect(() => {
    if (!selected) return;
    const model = selected.pricing_model || "fixed";
    const basePrice = Number(selected.price) || 0;

    let timeMultiplier = 1;
    let label = t("task", "مهمة");

    if (
      model !== "fixed" &&
      model !== "free" &&
      bookingData.startDate &&
      bookingData.endDate &&
      bookingData.startTime &&
      bookingData.endTime
    ) {
      const startStr = `${bookingData.startDate}T${bookingData.startTime}:00`;
      const endStr = `${bookingData.endDate}T${bookingData.endTime}:00`;
      const start = new Date(startStr);
      const end = new Date(endStr);

      let diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours <= 0 && bookingData.startDate === bookingData.endDate)
        diffHours += 24;

      if (diffHours > 0) {
        if (model === "hourly") {
          timeMultiplier = Math.round(diffHours * 100) / 100;
          label = t("hour", "ساعة");
        } else if (model === "daily") {
          timeMultiplier = Math.max(1, Math.ceil(diffHours / 24));
          label = t("day", "يوم");
        } else if (model === "monthly") {
          timeMultiplier = Math.max(1, Math.ceil(diffHours / (24 * 30)));
          label = t("month", "شهر");
        } else if (model === "yearly") {
          timeMultiplier = Math.max(1, Math.ceil(diffHours / (24 * 365)));
          label = t("year", "سنة");
        } else if (model === "period") {
          let periodLengthInHours = 4;
          if (selected.duration) {
            const extractedNumber = parseInt(
              String(selected.duration).replace(/\D/g, ""),
            );
            if (!isNaN(extractedNumber) && extractedNumber > 0)
              periodLengthInHours = extractedNumber;
          }
          timeMultiplier = Math.max(
            1,
            Math.ceil(diffHours / periodLengthInHours),
          );
          label = t("period", "فترة");
        }
      }
    } else {
      if (model === "period") {
        timeMultiplier = 1;
        label = t("period", "فترة");
      } else if (model === "fixed" || model === "free") {
        timeMultiplier = 1;
        label =
          model === "free"
            ? t("volunteer", "تطوع")
            : t("fixed_task", "مهمة ثابتة");
      }
    }

    const requestedCount = bookingData.manualQuantity || 1;
    const finalTotalPrice = basePrice * timeMultiplier * requestedCount;

    setCalculatedData({
      price: finalTotalPrice,
      quantity: timeMultiplier * requestedCount,
      timeMultiplier: timeMultiplier,
      requestedCount: requestedCount,
      text: label,
    });
  }, [bookingData, selected, t]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return alert(
        isRTL
          ? "جهازك لا يدعم تحديد الموقع."
          : "Your device doesn't support geolocation.",
      );
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setBookingData({
          ...bookingData,
          gpsLocation: `https://maps.google.com/?q=${lat},${lng}`,
          manualLocation: "",
        });
      },
      (err) => {
        alert(
          isRTL
            ? "يرجى السماح بالوصول للـ GPS من إعدادات الجهاز 📍"
            : "Please allow GPS access 📍",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const handleSuggestNextSlot = () => {
    if (!selected) return;
    const now = new Date();
    let proposedStart = new Date(now.getTime() + 60 * 60 * 1000);
    const mins = proposedStart.getMinutes();
    if (mins > 0 && mins <= 30) proposedStart.setMinutes(30, 0, 0);
    else if (mins > 30) {
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
          if (i === 0) foundDate = checkDate;
          else {
            checkDate.setHours(8, 0, 0, 0);
            foundDate = checkDate;
          }
          break;
        } else {
          const startH = parseInt(
            (selected.work_start_time || "08:00").split(":")[0],
          );
          const startM = parseInt(
            (selected.work_start_time || "08:00").split(":")[1],
          );
          if (i === 0) {
            const currentMins =
              checkDate.getHours() * 60 + checkDate.getMinutes();
            const pStartMins = startH * 60 + startM;
            let pEndMins =
              parseInt((selected.work_end_time || "22:00").split(":")[0]) * 60 +
              parseInt((selected.work_end_time || "22:00").split(":")[1]);
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
      setBookingData({
        ...bookingData,
        startDate: `${foundDate.getFullYear()}-${pad(
          foundDate.getMonth() + 1,
        )}-${pad(foundDate.getDate())}`,
        startTime: `${pad(foundDate.getHours())}:${pad(
          foundDate.getMinutes(),
        )}`,
        endDate: `${new Date(
          foundDate.getTime() + 60 * 60 * 1000,
        ).getFullYear()}-${pad(
          new Date(foundDate.getTime() + 60 * 60 * 1000).getMonth() + 1,
        )}-${pad(new Date(foundDate.getTime() + 60 * 60 * 1000).getDate())}`,
        endTime: `${pad(
          new Date(foundDate.getTime() + 60 * 60 * 1000).getHours(),
        )}:${pad(new Date(foundDate.getTime() + 60 * 60 * 1000).getMinutes())}`,
      });
    } else {
      alert(
        isRTL
          ? "لا يمكن تحديد موعد تلقائي، يرجى الاختيار يدوياً."
          : "Cannot auto-suggest a slot.",
      );
    }
  };

  const handleBook = async () => {
    if (isSubmitting) return;

    if (!session) {
      if (typeof onRequireLogin === "function") onRequireLogin();
      else
        alert(
          isRTL
            ? "يرجى تسجيل الدخول أو إنشاء حساب أولاً 🔐"
            : "Please login first 🔐",
        );
      return;
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", session.user.id)
      .single();

    if (!userProfile?.full_name?.trim() || !userProfile?.phone?.trim()) {
      setIsSubmitting(false);
      return alert(
        isRTL
          ? "عذراً، يجب إكمال بياناتك الشخصية (الاسم ورقم الجوال) في قسم (حسابي) لتتمكن من إتمام الحجز ⚠️"
          : "Please complete your profile (Name and Phone) in 'My Account' to proceed with booking ⚠️",
      );
    }

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
        isRTL
          ? "يرجى إكمال جميع التفاصيل المطلوبة (الموقع، التواريخ، ورقم التواصل) 📍📞"
          : "Please complete all details.",
      );
    }

    if (bookingData.manualQuantity < 1)
      return alert("الرجاء تحديد عدد صحيح للخدمة.");

    const requestedStart = new Date(
      `${bookingData.startDate}T${bookingData.startTime || "00:00"}:00`,
    );
    let requestedEnd = new Date(
      `${bookingData.endDate}T${bookingData.endTime || "23:59"}:00`,
    );
    const now = new Date();

    if (requestedStart < now && bookingData.startTime)
      return alert(
        isRTL ? "⛔ لا يمكن الحجز في الماضي." : "⛔ Cannot book in the past.",
      );
    if (requestedEnd <= requestedStart)
      return alert(
        isRTL
          ? "⛔ وقت الانتهاء يجب أن يكون بعد وقت البدء."
          : "⛔ End time must be after start time.",
      );

    if (
      selected.is_24_7 === false &&
      selected.work_start_time &&
      selected.work_end_time &&
      bookingData.startTime &&
      bookingData.endTime
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
      if (normRStart < pStartMins || normRStart > pEndMins)
        return alert(
          isRTL
            ? `⛔ الوقت المحدد خارج أوقات الدوام! ساعات العمل من ${selected.work_start_time.substring(
                0,
                5,
              )} إلى ${selected.work_end_time.substring(0, 5)}.`
            : "⛔ Outside working hours.",
        );
    }

    setIsSubmitting(true);

    try {
      const { data: existing } = await supabase
        .from("bookings")
        .select("appointment_date, end_time, quantity, status")
        .eq("offering_id", selected.id)
        .in("status", ["confirmed", "completed"]);

      let overlappingUsedCapacity = 0;
      existing?.forEach((b) => {
        const bStart = new Date(b.appointment_date);
        const bEnd = b.end_time
          ? new Date(b.end_time)
          : new Date(bStart.getTime() + 60 * 60 * 1000);
        if (requestedStart < bEnd && requestedEnd > bStart)
          overlappingUsedCapacity += b.quantity || 1;
      });

      const maxCapacity = selected.max_capacity || 1;
      const finalAvailable = Math.max(0, maxCapacity - overlappingUsedCapacity);

      if (bookingData.manualQuantity > finalAvailable) {
        setIsSubmitting(false);
        setAvailableCapacity(finalAvailable);
        return alert(
          `⚠️ نعتذر، السعة المؤكدة المتاحة في هذا الوقت هي (${finalAvailable}) فقط من أصل (${maxCapacity}).\nالرجاء تقليل العدد المطلوب أو تغيير الوقت.`,
        );
      }

      const bookingStatus = selected.price_upon_agreement
        ? "awaiting_pricing"
        : "pending";

      const { data: bookingResult, error } = await supabase
        .from("bookings")
        .insert([
          {
            offering_id: selected.id,
            customer_id: session.user.id,
            appointment_date: requestedStart.toISOString(),
            end_time: requestedEnd.toISOString(),
            location: finalLocation,
            quantity: bookingData.manualQuantity,
            status: bookingStatus,
            client_contact: bookingData.clientContact,
            proposed_price: selected.price_upon_agreement
              ? null
              : calculatedData.price,
            is_commission_paid: isSpecialManualBooking ? true : false,
            is_manual_booking: isSpecialManualBooking ? true : false,
          },
        ])
        .select();

      if (!error && bookingResult) {
        const providerId = selected.provider_id || selected.profiles?.id;
        const newBookingId = bookingResult[0].id;

        if (providerId) {
          const msgText = isSpecialManualBooking
            ? `📞 [حجز خاص / خارجي]\n${
                bookingData.clientMessage.trim() ||
                "تم تسجيل الحجز يدوياً من قبل المزود."
              }`
            : bookingData.clientMessage.trim();

          if (msgText) {
            await supabase.from("messages").insert([
              {
                booking_id: newBookingId,
                sender_id: session.user.id,
                receiver_id: providerId,
                text_content: msgText,
              },
            ]);
          }
        }

        if (providerId && !isSpecialManualBooking) {
          await supabase.from("notifications").insert([
            {
              user_id: providerId,
              title: "طلب حجز جديد 🆕",
              message: `لديك طلب حجز جديد لخدمة "${selected.title}". يرجى مراجعته في لوحة أعمالك.`,
              is_read: false,
            },
          ]);
        }

        alert(
          isRTL
            ? isSpecialManualBooking
              ? "تم إرسال الحجز الخاص بنجاح وسيظهر في 'أعمالي' بانتظار التأكيد ✅"
              : selected.price_upon_agreement
              ? "تم إرسال طلب التسعير للمزود بنجاح 📨"
              : "تم إرسال الطلب للمزود بنجاح ✅"
            : "Request sent successfully ✅",
        );
        setSelected(null);
        setIsSpecialManualBooking(false);
      } else {
        alert("Error: " + error.message);
      }
    } catch (err) {
      alert("حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modelLabels = {
    fixed: "مهمة",
    hourly: "ساعة",
    period: "فترة",
    daily: "يوم",
    monthly: "شهر",
    yearly: "سنة",
    free: "تطوع",
  };

  // 🔥 دالة التقييم تعتمد على التقييم المخزن مسبقاً للسرعة القصوى 🔥
  const renderStars = (profileRating) => {
    return (
      "⭐ " + (profileRating ? parseFloat(profileRating).toFixed(1) : "5.0")
    );
  };

  const defaultAvatar = (name, hexColor = "#7c3aed") =>
    `https://ui-avatars.com/api/?name=${
      name || "User"
    }&background=${hexColor.replace("#", "")}20&color=${hexColor.replace(
      "#",
      "",
    )}&bold=true`;

  if (loading && offerings.length === 0)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          color: "#7c3aed",
          fontWeight: "bold",
        }}
      >
        ⏳ {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    );

  const isTimeOptional =
    selected &&
    (["fixed", "daily"].includes(selected.pricing_model) ||
      selected.price_upon_agreement);
  const isStoreMode = !!username;
  const storeTheme = storeProfile?.theme_color || "#7c3aed";

  const generateTimeOptions = () => {
    const options = [];
    const is24Hours = selected?.is_24_7;
    const startTimeStr = selected?.work_start_time;
    const endTimeStr = selected?.work_end_time;

    const addSlots = (start, end) => {
      for (let h = start; h < end; h++) {
        for (let m = 0; m < 60; m += 15) {
          options.push(
            `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          );
        }
      }
    };

    if (is24Hours) {
      addSlots(0, 24);
    } else if (startTimeStr && endTimeStr) {
      let startH = parseInt(startTimeStr.split(":")[0], 10);
      let endH = parseInt(endTimeStr.split(":")[0], 10);

      if (endH === 0) endH = 24;

      if (startH < endH) {
        addSlots(startH, endH);
      } else {
        addSlots(startH, 24);
        addSlots(0, endH);
      }
    } else {
      addSlots(0, 24);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const disableOffDays = ({ date }) => {
    if (!selected) return;
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const activeDays =
      Array.isArray(selected.available_days) &&
      selected.available_days.length > 0
        ? selected.available_days
        : ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const activeIndexes = activeDays.map((d) => dayMap[d]);

    if (!activeIndexes.includes(date.weekDay.index)) {
      return {
        disabled: true,
        style: {
          color: "#cbd5e1",
          textDecoration: "line-through",
          cursor: "not-allowed",
        },
      };
    }
  };

  return (
    <div style={{ direction: isRTL ? "rtl" : "ltr" }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 768px) {
          .categories-mobile { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
        }
        .smart-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); top: 0; }
        .smart-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); }
        .search-container { position: relative; z-index: 10; margin-top: -35px; margin-bottom: 30px; }
        .rmdp-container { width: 100%; }
        .rmdp-input { width: 100% !important; padding: 12px !important; border-radius: 12px !important; border: 1px solid #cbd5e1 !important; font-family: inherit !important; font-size: 0.95rem !important; outline: none; box-sizing: border-box; background: #fff; cursor: pointer; color: #1e293b; font-weight: bold; }
        .rmdp-input::placeholder { color: #94a3b8; font-weight: normal; }
      `}</style>

      {isAnnouncementActive && announcementText && (
        <div
          style={{
            backgroundColor: "#f59e0b",
            color: "#fff",
            textAlign: "center",
            padding: "12px",
            fontSize: "1rem",
            fontWeight: "bold",
            position: "relative",
            zIndex: 100,
            borderRadius: "16px",
            marginBottom: "15px",
            boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
          }}
        >
          {announcementLink ? (
            <a
              href={announcementLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fff", textDecoration: "underline" }}
            >
              {announcementText} 🚀
            </a>
          ) : (
            <span>{announcementText}</span>
          )}
        </div>
      )}

      <div
        style={{
          ...heroSectionS,
          background: isStoreMode
            ? storeTheme
            : "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
          padding: isStoreMode ? "30px 20px 85px" : "40px 20px 85px",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            color: "rgba(255,255,255,0.9)",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            fontWeight: "bold",
            backgroundColor: "rgba(0,0,0,0.15)",
            padding: "8px 20px",
            borderRadius: "20px",
            width: "fit-content",
            margin: "0 auto 20px auto",
            backdropFilter: "blur(5px)",
          }}
        >
          <span>🕒</span>
          <span dir="ltr">
            {liveTime.toLocaleTimeString(isRTL ? "ar-SA" : "en-US")}
          </span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>
            {liveTime.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {isStoreMode && storeProfile ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <img
              src={
                storeProfile.avatar_url ||
                defaultAvatar(storeProfile.full_name, storeTheme)
              }
              alt="Store Avatar"
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                border: "4px solid white",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                objectFit: "cover",
              }}
            />
            <h1 style={{ ...heroTitleS, margin: "0" }}>
              {storeProfile.full_name || storeProfile.username}
            </h1>
            <span
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: "4px 15px",
                borderRadius: "20px",
                fontSize: "1rem",
                fontWeight: "bold",
                letterSpacing: "1px",
              }}
            >
              @{storeProfile.username}
            </span>
            {storeProfile.provider_note && (
              <p
                style={{
                  maxWidth: "600px",
                  margin: "10px auto 0",
                  opacity: "0.9",
                  lineHeight: "1.5",
                }}
              >
                {storeProfile.provider_note}
              </p>
            )}
          </div>
        ) : (
          <>
            <h1 style={heroTitleS}>{welcomeMsg}</h1>
            <p style={heroSubTitleS}>{renderTextWithLinks(heroSubtitle)}</p>

            {(appleStoreLink || playStoreLink) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "15px",
                  marginTop: "25px",
                  flexWrap: "wrap",
                }}
              >
                {appleStoreLink && (
                  <a
                    href={appleStoreLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      backgroundColor: "#000",
                      color: "#fff",
                      padding: "10px 20px",
                      borderRadius: "14px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                      transition: "0.2s",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>🍏</span> App Store
                  </a>
                )}
                {playStoreLink && (
                  <a
                    href={playStoreLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      backgroundColor: "#fff",
                      color: "#000",
                      padding: "10px 20px",
                      borderRadius: "14px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                      transition: "0.2s",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>▶️</span> Google Play
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

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
          {!isStoreMode && (
            <button
              onClick={() =>
                setActiveCategory(
                  activeCategory === "favorites" ? "all" : "favorites",
                )
              }
              style={{
                backgroundColor:
                  activeCategory === "favorites" ? "#fef2f2" : "transparent",
                color: activeCategory === "favorites" ? "#ef4444" : "#94a3b8",
                border: "none",
                padding: "0 20px",
                cursor: "pointer",
                fontSize: "1.4rem",
                transition: "0.2s",
                borderLeft: isRTL ? "1px solid #f1f5f9" : "none",
                borderRight: isRTL ? "none" : "1px solid #f1f5f9",
              }}
              title={isRTL ? "عرض مفضلتي" : "Show Favorites"}
            >
              {activeCategory === "favorites" ? "❤️" : "🤍"}
            </button>
          )}

          <div
            style={{
              flex: "2 1 200px",
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              borderLeft: isRTL ? "1px solid #f1f5f9" : "none",
              borderRight: isRTL ? "none" : "1px solid #f1f5f9",
            }}
          >
            <span
              style={{
                fontSize: "1.2rem",
                margin: isRTL ? "0 0 0 10px" : "0 10px 0 0",
                color: isStoreMode ? storeTheme : "#7c3aed",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder={
                isStoreMode
                  ? `ابحث في خدمات ${storeProfile?.full_name || "المزود"}...`
                  : isRTL
                  ? "ابحث بالاسم، الخدمة، أو @يوزر المزود..."
                  : "Search..."
              }
              style={searchField}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          {!isStoreMode && (
            <div
              style={{
                flex: "1 1 120px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <select
                value={filterCountry}
                onChange={(e) => {
                  setFilterCountry(e.target.value);
                  setFilterCity("all");
                }}
                style={floatingSelectS(isRTL)}
              >
                <option value="all">
                  🌍 {t("filter_country", "كل الدول")}
                </option>
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isStoreMode && (
            <div
              style={{
                flex: "1 1 120px",
                display: "flex",
                alignItems: "center",
              }}
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
          )}
          <div
            style={{
              flex: "1.5 1 150px",
              display: "flex",
              alignItems: "center",
              padding: "8px 10px",
            }}
          >
            <SmartDatePicker
              calendar={gregorian}
              locale={isRTL ? gregorian_ar : undefined}
              value={filterDate}
              onChange={(date) => {
                if (!date) {
                  setFilterDate("");
                  return;
                }
                const jsDate = date.toDate();
                setFilterDate(
                  `${jsDate.getFullYear()}-${String(
                    jsDate.getMonth() + 1,
                  ).padStart(2, "0")}-${String(jsDate.getDate()).padStart(
                    2,
                    "0",
                  )}`,
                );
              }}
              minDate={new Date()}
              format="YYYY-MM-DD"
              placeholder={
                isRTL ? "تاريخ الحجز (اختياري) 📅" : "Date (Optional) 📅"
              }
              containerStyle={{ width: "100%" }}
              style={{
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                cursor: "pointer",
                color: "#475569",
                fontWeight: "bold",
                width: "100%",
              }}
            />
          </div>
          {(filterDate ||
            filterStartTime ||
            filterEndTime ||
            filterCountry !== "all" ||
            filterCity !== "all" ||
            localSearch ||
            activeCategory === "favorites") && (
            <button
              onClick={() => {
                setFilterDate("");
                setFilterStartTime("");
                setFilterEndTime("");
                setFilterCountry("all");
                setFilterCity("all");
                setLocalSearch("");
                setActiveCategory("all");
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

      {!isStoreMode && (
        <div
          className="hide-scrollbar categories-mobile"
          style={categoryScrollWrapperS}
        >
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
                <span style={{ fontSize: "1.1rem" }}>{cat.icon}</span>{" "}
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {(filterDate || filterStartTime || filterEndTime) && (
        <div style={searchAlertS}>
          ✅{" "}
          {isRTL
            ? `نعرض لك فقط الخدمات المتاحة ${
                filterDate ? `يوم (${filterDate})` : ""
              } ${filterStartTime ? `من (${filterStartTime})` : ""} ${
                filterEndTime ? `إلى (${filterEndTime})` : ""
              }`
            : "Showing available providers for selected date/time."}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "25px",
          alignItems: "stretch",
        }}
      >
        {filtered.length > 0 ? (
          filtered.map((item, index) => {
            const isFree = item.pricing_model === "free";
            const isAgreement = item.price_upon_agreement;
            const itemThemeColor = item.profiles?.theme_color || "#7c3aed";
            const isLastElement = filtered.length === index + 1;

            // متغير ذكي يبحث عن تفاصيل المدة ويمسح كلمة (دوام كامل) إذا وجدت
            let durationText =
              item.duration ||
              item.duration_details ||
              item.work_duration ||
              item.period ||
              item.time_details;
            if (durationText) {
              durationText = durationText.replace("(دوام كامل)", "").trim();
            }

            return (
              <div
                ref={isLastElement ? lastElementRef : null}
                key={`${item.id}-${index}`}
                className="smart-card"
                style={smartCardS}
              >
                {/* 🔴 الألوان الأصلية الفاقعة بدون شفافية 🔴 */}
                <div style={cardCoverS(isFree, itemThemeColor)}>
                  <button
                    onClick={(e) => toggleFavorite(e, item.provider_id)}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: isRTL ? "auto" : "10px",
                      left: isRTL ? "10px" : "auto",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "none",
                      borderRadius: "50%",
                      width: "36px",
                      height: "36px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      zIndex: 20,
                      boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      transition: "0.2s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.2rem",
                        transform: favorites.includes(item.provider_id)
                          ? "scale(1.1)"
                          : "scale(1)",
                      }}
                    >
                      {favorites.includes(item.provider_id) ? "❤️" : "🤍"}
                    </span>
                  </button>

                  <div
                    style={{
                      display: "flex",
                      gap: "5px",
                      padding: "12px",
                      flexWrap: "wrap",
                      width: "80%",
                    }}
                  >
                    {item.profiles?.provider_type === "institution" && (
                      <span style={coverBadgeS("#1e293b", "#fff")}>
                        🏢 فريق عمل / مجموعة
                      </span>
                    )}
                    {(item.license_number || item.profiles?.license_info) && (
                      <span style={coverBadgeS("#ecfdf5", "#059669")}>
                        🛡️ {t("verified", "موثق")}
                      </span>
                    )}
                  </div>
                </div>

                <div style={cardBodyS}>
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
                      style={{ ...cardAvatarS, borderColor: itemThemeColor }}
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

                  {!isStoreMode && (
                    <div
                      style={{
                        marginBottom: "8px",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "#475569",
                          fontWeight: "bold",
                        }}
                      >
                        {item.nickname ||
                          item.provider_name ||
                          item.profiles?.full_name}
                      </span>
                      {item.profiles?.username && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: itemThemeColor,
                            backgroundColor: `${itemThemeColor}15`,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            direction: "ltr",
                            fontWeight: "bold",
                          }}
                        >
                          @{item.profiles.username}
                        </span>
                      )}
                    </div>
                  )}

                  {item.provider_role && (
                    <div
                      style={{
                        backgroundColor: "#f1f5f9",
                        color: "#3b82f6",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        display: "inline-block",
                        marginBottom: "8px",
                      }}
                    >
                      👨‍💼 {item.provider_role}
                    </div>
                  )}

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
                  <p style={cardDescriptionS} title={item.description}>
                    {item.description}
                  </p>
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

                  <div style={cardFooterS}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        maxWidth: "160px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: isAgreement ? "0.95rem" : "1.25rem",
                          color: isAgreement
                            ? "#3b82f6"
                            : isFree
                            ? "#10b981"
                            : itemThemeColor,
                          lineHeight: "1.1",
                        }}
                      >
                        {isAgreement
                          ? "حسب الاتفاق 🤝"
                          : isFree
                          ? "مجاني (تطوع) 💚"
                          : `${item.price} ${item.currency || "SAR"}`}
                      </span>

                      <div style={{ marginTop: "4px", lineHeight: "1.4" }}>
                        {/* عرض المسمى وآلية الحساب فقط إذا كان هناك سعر أو تسعيرة */}
                        {!isAgreement && !isFree && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#475569",
                              fontWeight: "900",
                              display: "block",
                            }}
                          >
                            {item.provider_role ? `${item.provider_role} ` : ""}
                            {modelLabels[item.pricing_model || "fixed"]}
                          </span>
                        )}

                        {/* 🔥 عرض المضمون فقط مع الأيقونة بخط أوضح 🔥 */}
                        {durationText && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: itemThemeColor,
                              fontWeight: "bold",
                              display: "block",
                              marginTop: "4px",
                            }}
                          >
                            {durationText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      {session && session.user.id === item.provider_id && (
                        <button
                          onClick={() => {
                            setIsSpecialManualBooking(true);
                            setSelected(item);
                          }}
                          style={{
                            border: "1px solid #a7f3d0",
                            background: "#f0fdf4",
                            color: "#059669",
                            padding: "8px 12px",
                            borderRadius: "12px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            transition: "0.2s",
                          }}
                          title="تسجيل حجز هاتفي أو خارجي بدون عمولة"
                        >
                          📞 حجز خاص
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsSpecialManualBooking(false);
                          setSelected(item);
                        }}
                        style={{
                          ...smartBookBtnS,
                          backgroundColor: itemThemeColor,
                        }}
                      >
                        {t("view_book", "احجز الآن")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={noResultsS}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>
              {isStoreMode ? "🛒" : "🕵️‍♂️"}
            </div>
            {isRTL
              ? isStoreMode
                ? "لا توجد خدمات متاحة حالياً في هذا المتجر.."
                : "لم نجد خدمات تطابق بحثك حالياً.."
              : "No services found.."}
          </div>
        )}
      </div>

      {isFetchingMore && (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            color: "#64748b",
            fontWeight: "bold",
            width: "100%",
            marginTop: "20px",
          }}
        >
          جاري تحميل المزيد... ⏳
        </div>
      )}

      {selected && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              {isSpecialManualBooking && (
                <span
                  style={{
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                  }}
                >
                  📞 وضع الحجز الخاص (خارجي / هاتفي - بدون عمولة)
                </span>
              )}
              <button
                onClick={() => {
                  setSelected(null);
                  setIsSpecialManualBooking(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#94a3b8",
                  transition: "0.2s",
                }}
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
                  defaultAvatar(
                    selected.profiles?.full_name,
                    selected.profiles?.theme_color || "#7c3aed",
                  )
                }
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${
                    selected.profiles?.theme_color || "#7c3aed"
                  }`,
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
                {selected.profiles?.username && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: selected.profiles?.theme_color || "#7c3aed",
                      fontWeight: "bold",
                      direction: "ltr",
                      display: "inline-block",
                      backgroundColor: `${
                        selected.profiles?.theme_color || "#7c3aed"
                      }15`,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    @{selected.profiles.username}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#f59e0b",
                    fontWeight: "bold",
                  }}
                >
                  {renderStars(selected.profiles?.rating)}
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
              {selected.provider_role && (
                <div
                  style={{
                    marginBottom: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      backgroundColor: "#1e293b",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                    }}
                  >
                    💼 مقدم الخدمة: {selected.provider_role}
                  </span>
                </div>
              )}
              <h4
                style={{
                  margin: "0 0 8px 0",
                  color: selected.profiles?.theme_color || "#7c3aed",
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

              <div style={{ textAlign: isRTL ? "right" : "left" }}>
                <label style={labelS}>
                  {isRTL
                    ? "رسالة أو ملاحظة لمزود الخدمة (اختياري):"
                    : "Message to Provider (Optional):"}
                </label>
                <textarea
                  placeholder={
                    isRTL
                      ? "اكتب استفسارك أو تفاصيل إضافية لطلبك هنا..."
                      : "Write your inquiry or extra details..."
                  }
                  style={{
                    ...inputS,
                    resize: "vertical",
                    minHeight: "80px",
                    backgroundColor: "#f8fafc",
                  }}
                  value={bookingData.clientMessage}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      clientMessage: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                marginBottom: "25px",
              }}
            >
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
                    color: "#1e293b",
                    fontSize: "1rem",
                    margin: 0,
                  }}
                >
                  🗓️ فترة الحجز:
                </label>
                <button
                  type="button"
                  onClick={handleSuggestNextSlot}
                  style={{
                    backgroundColor:
                      selected.profiles?.theme_color || "#7c3aed",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  ✨ اقتراح موعد
                </button>
              </div>

              <div
                style={{
                  marginBottom: "15px",
                  backgroundColor: "#fff",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px dashed #3b82f6",
                }}
              >
                <label
                  style={{ ...labelS, color: "#1d4ed8", fontSize: "0.95rem" }}
                >
                  👥 العدد المطلوب من (
                  {selected.provider_role || "مقدمي الخدمة"}):
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    max={
                      availableCapacity !== null
                        ? availableCapacity
                        : selected.max_capacity || 1
                    }
                    disabled={availableCapacity === 0}
                    value={bookingData.manualQuantity}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 1;
                      const currentMax =
                        availableCapacity !== null
                          ? availableCapacity
                          : selected.max_capacity || 1;
                      if (val > currentMax) val = currentMax;
                      setBookingData({ ...bookingData, manualQuantity: val });
                    }}
                    style={{
                      ...inputS,
                      flex: 1,
                      borderColor:
                        availableCapacity === 0 ? "#fca5a5" : "#bfdbfe",
                      backgroundColor:
                        availableCapacity === 0 ? "#fef2f2" : "#fff",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: availableCapacity === 0 ? "#ef4444" : "#059669",
                      fontWeight: "bold",
                    }}
                  >
                    (المتاح مؤكداً:{" "}
                    {availableCapacity !== null
                      ? availableCapacity
                      : selected.max_capacity || 1}
                    )
                  </span>
                </div>
                {availableCapacity === 0 && (
                  <div
                    style={{
                      color: "#ef4444",
                      fontSize: "0.8rem",
                      marginTop: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ⚠️ نعتذر، السعة محجوزة بالكامل ومؤكدة في هذا الوقت. يرجى
                    اختيار تاريخ أو وقت آخر.
                  </div>
                )}
              </div>

              <div
                style={{ display: "flex", gap: "12px", marginBottom: "15px" }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{ ...labelS, color: "#64748b", fontSize: "0.8rem" }}
                  >
                    تاريخ (البدء):
                  </label>
                  <SmartDatePicker
                    calendar={gregorian}
                    locale={isRTL ? gregorian_ar : undefined}
                    value={bookingData.startDate}
                    onChange={(date) => {
                      if (!date) {
                        setBookingData({ ...bookingData, startDate: "" });
                        return;
                      }
                      const jsDate = date.toDate();
                      const start = `${jsDate.getFullYear()}-${String(
                        jsDate.getMonth() + 1,
                      ).padStart(2, "0")}-${String(jsDate.getDate()).padStart(
                        2,
                        "0",
                      )}`;
                      setBookingData({ ...bookingData, startDate: start });
                    }}
                    minDate={new Date()}
                    mapDays={disableOffDays}
                    placeholder="اختر تاريخ البدء 📅"
                    containerStyle={{ width: "100%" }}
                    inputClass="rmdp-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{ ...labelS, color: "#64748b", fontSize: "0.8rem" }}
                  >
                    تاريخ (الانتهاء):
                  </label>
                  <SmartDatePicker
                    calendar={gregorian}
                    locale={isRTL ? gregorian_ar : undefined}
                    value={bookingData.endDate}
                    onChange={(date) => {
                      if (!date) {
                        setBookingData({ ...bookingData, endDate: "" });
                        return;
                      }
                      const jsDate = date.toDate();
                      const end = `${jsDate.getFullYear()}-${String(
                        jsDate.getMonth() + 1,
                      ).padStart(2, "0")}-${String(jsDate.getDate()).padStart(
                        2,
                        "0",
                      )}`;
                      setBookingData({ ...bookingData, endDate: end });
                    }}
                    minDate={
                      bookingData.startDate
                        ? new Date(bookingData.startDate)
                        : new Date()
                    }
                    mapDays={disableOffDays}
                    placeholder="اختر تاريخ الانتهاء 📅"
                    containerStyle={{ width: "100%" }}
                    inputClass="rmdp-input"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{ ...labelS, color: "#64748b", fontSize: "0.8rem" }}
                  >
                    الوقت (البدء) {isTimeOptional && "(اختياري)"}:
                  </label>
                  <select
                    required={!isTimeOptional}
                    value={bookingData.startTime || ""}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        startTime: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      textAlign: "center",
                      direction: "ltr",
                      outline: "none",
                      backgroundColor: "white",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled={!isTimeOptional}>
                      {isTimeOptional
                        ? isRTL
                          ? "-- وقت غير محدد --"
                          : "-- No Specific Time --"
                        : isRTL
                        ? "اختر وقت البدء"
                        : "Select Start Time"}
                    </option>
                    {timeOptions.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{ ...labelS, color: "#64748b", fontSize: "0.8rem" }}
                  >
                    الوقت (الانتهاء) {isTimeOptional && "(اختياري)"}:
                  </label>
                  <select
                    required={!isTimeOptional}
                    value={bookingData.endTime || ""}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        endTime: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      textAlign: "center",
                      direction: "ltr",
                      outline: "none",
                      backgroundColor: "white",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled={!isTimeOptional}>
                      {isTimeOptional
                        ? isRTL
                          ? "-- وقت غير محدد --"
                          : "-- No Specific Time --"
                        : isRTL
                        ? "اختر وقت الانتهاء"
                        : "Select End Time"}
                    </option>
                    {timeOptions.map((time) => (
                      <option key={`end-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
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
                border: `1px dashed ${
                  selected.price_upon_agreement
                    ? "#10b981"
                    : selected.profiles?.theme_color || "#7c3aed"
                }`,
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
                  <div
                    style={{
                      fontSize: "0.95rem",
                      color: "#475569",
                      fontWeight: "bold",
                      marginBottom: "10px",
                      display: "flex",
                      justifyContent: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      direction: "rtl",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: "4px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {selected.price} {selected.currency || "SAR"}
                    </span>{" "}
                    ×
                    <span
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: "4px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {calculatedData.timeMultiplier} ({calculatedData.text})
                    </span>{" "}
                    ×
                    <span
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: "4px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {calculatedData.requestedCount} (مطلوب)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "900",
                      color:
                        selected.pricing_model === "free"
                          ? "#10b981"
                          : selected.profiles?.theme_color || "#7c3aed",
                    }}
                  >
                    {selected.pricing_model === "free"
                      ? `${t("free")} 💚`
                      : `الإجمالي = ${calculatedData.price} SAR`}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleBook}
              disabled={isSubmitting || availableCapacity === 0}
              style={{
                ...confirmBtn,
                backgroundColor:
                  isSubmitting || availableCapacity === 0
                    ? "#94a3b8"
                    : selected.profiles?.theme_color || "#7c3aed",
                cursor:
                  isSubmitting || availableCapacity === 0
                    ? "not-allowed"
                    : "pointer",
                boxShadow: `0 4px 15px ${
                  selected.profiles?.theme_color || "#7c3aed"
                }40`,
                opacity: isSubmitting || availableCapacity === 0 ? 0.8 : 1,
              }}
            >
              {isSubmitting
                ? "⏳ جاري إرسال الطلب..."
                : availableCapacity === 0
                ? "عذراً، محجوز بالكامل في هذا الوقت ⛔"
                : isSpecialManualBooking
                ? "تأكيد وإضافة الحجز الخاص فوراً ✅"
                : selected.price_upon_agreement
                ? "إرسال طلب تسعير للمزود 📨"
                : isRTL
                ? "تأكيد وإرسال الطلب ✅"
                : "Confirm Booking ✅"}
            </button>

            {reviews && reviews.length > 0 && (
              <div
                style={{
                  marginTop: "30px",
                  borderTop: "2px dashed #e2e8f0",
                  paddingTop: "20px",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                <h4
                  style={{
                    color: "#1e293b",
                    marginBottom: "15px",
                    fontSize: "1.1rem",
                    fontWeight: "900",
                  }}
                >
                  ⭐️ آراء العملاء السابقين:
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {reviews.map((r, idx) => (
                    <div
                      key={idx}
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
                          marginBottom: "8px",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{ color: "#334155", fontSize: "0.9rem" }}
                        >
                          👤 {r.profiles?.full_name || "عميل"}
                        </strong>
                        <span
                          style={{
                            color: "#f59e0b",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                          }}
                        >
                          {"⭐".repeat(r.rating || 5)}
                        </span>
                      </div>
                      {(r.review || r.review_text || r.client_review) && (
                        <p
                          style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "0.85rem",
                            lineHeight: "1.6",
                          }}
                        >
                          💬 {r.review || r.review_text || r.client_review}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const heroSectionS = {
  background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  padding: "55px 20px 85px",
  borderRadius: "24px",
  textAlign: "center",
  color: "#ffffff",
  boxShadow: "0 10px 30px rgba(109, 40, 217, 0.25)",
  marginTop: "25px",
};
const heroTitleS = {
  fontSize: "2.4rem",
  color: "#ffffff",
  margin: "0 0 18px 0",
  fontWeight: "900",
  lineHeight: "1.4",
  textShadow: "0 2px 10px rgba(0,0,0,0.15)",
};
const heroSubTitleS = {
  fontSize: "1.15rem",
  color: "#f1f5f9",
  opacity: "0.95",
  margin: 0,
  lineHeight: "1.6",
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
const cardCoverS = (isFree, themeColor) => ({
  height: "90px",
  background: isFree
    ? "linear-gradient(135deg, #a7f3d0, #10b981)"
    : `linear-gradient(135deg, ${themeColor}, ${themeColor})`, // ⬅️ الألوان الفاقعة الصافية
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
  alignItems: "flex-end",
  borderTop: "1px solid #f1f5f9",
  paddingTop: "15px",
};
const smartBookBtnS = {
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: "bold",
  transition: "0.2s",
};
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
