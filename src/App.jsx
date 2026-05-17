// ⚡ تقنية التحميل الكسول (Lazy Loading) للملفات الإدارية الثقيلة ⚡
import React, {
  useState,
  useEffect,
  useCallback,
  Fragment,
  Suspense,
} from "react";
const InvoicesView = React.lazy(() => import("./components/InvoicesView"));
const AdminReports = React.lazy(() => import("./components/AdminReports"));
const PlatformManagement = React.lazy(() =>
  import("./components/PlatformManagement"),
);
import PaymentResult from "./components/PaymentResult";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import BookingRow from "./components/BookingRow";
import ClientMarketplace from "./components/ClientMarketplace";
import ProfileSettings from "./components/ProfileSettings";
import AddOffering from "./components/AddOffering";
import CalendarView from "./components/CalendarView";
import { useTranslation } from "react-i18next";
import { HelmetProvider } from "react-helmet-async";
import UpdatePasswordModal from "./components/UpdatePasswordModal";
import MoyasarPayment from "./components/MoyasarPayment";
import { Capacitor } from "@capacitor/core";

// --- التنسيقات العامة والجمالية ---
const padS = { padding: "16px" };
const thS = {
  padding: "15px",
  color: "#475569",
  backgroundColor: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
  fontWeight: "900",
  fontSize: "0.85rem",
};
const tdS = {
  padding: "15px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "0.9rem",
  color: "#334155",
};
const admBtn = (bg) => ({
  backgroundColor: bg,
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.85rem",
  transition: "all 0.2s ease",
  boxShadow: `0 4px 10px ${bg}40`,
});
const reportCard = (color, isActive) => ({
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "20px",
  borderBottom: `4px solid ${color}`,
  textAlign: "center",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  transition: "all 0.3s ease",
});
const addSkillBtn = {
  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  color: "white",
  border: "none",
  padding: "12px 25px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "1rem",
  boxShadow: "0 6px 15px rgba(124, 58, 237, 0.25)",
};
const cardS = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(8px)",
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
  maxWidth: "600px",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
  overflowY: "auto",
};
const smInput = {
  padding: "12px 15px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  flex: "1 1 100px",
  outline: "none",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  transition: "border-color 0.2s",
};

// ✨ دوال الجلب والحساب ✨
const fetchSafe = async (tableName) => {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    return error ? [] : data || [];
  } catch (err) {
    return [];
  }
};

const fetchSettingsSafe = async () => {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    return error ? null : data;
  } catch (err) {
    return null;
  }
};

const defaultLegalDocs = {
  terms: {
    title: "الشروط والأحكام والإقرار القانوني",
    content:
      "مرحباً بك في منصتنا.\n\n1. طبيعة عمل المنصة: المنصة عبارة عن وسيط تقني.\n2. المسؤولية تقع على مقدم الخدمة.",
  },
  privacy: {
    title: "سياسة الخصوصية وحماية البيانات",
    content:
      "نحن نأخذ خصوصيتك على محمل الجد.\n\n1. يتم حفظ بياناتك بسرية تامة.",
  },
  refund: {
    title: "سياسة الاسترجاع والإلغاء",
    content: "المنصة لا تتدخل في النزاعات المالية المباشرة بين الأطراف.",
  },
};

const calculateFinancials = (b, commissionRate) => {
  const finalTotal =
    b.proposed_price && Number(b.proposed_price) > 0
      ? Number(b.proposed_price)
      : (Number(b.offerings?.price) || 0) * (b.quantity || 1);

  const platformCommission = finalTotal * commissionRate;
  const providerNet = finalTotal - platformCommission;

  return {
    baseTotal: finalTotal,
    qty: b.quantity || 1,
    additional: 0,
    totalClientPrice: finalTotal,
    platformCommission,
    providerNet,
  };
};

const sumByCurrency = (
  bookingsArr,
  commissionRate,
  fieldName = "platformCommission",
) => {
  const totals = bookingsArr.reduce((acc, b) => {
    const c = b.offerings?.currency || "USD";
    const financials = calculateFinancials(b, commissionRate);
    acc[c] = (acc[c] || 0) + financials[fieldName];
    return acc;
  }, {});
  const entries = Object.entries(totals);
  if (entries.length === 0) return "0.00";
  return entries.map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" | ");
};

// ✨ المكون الفرعي الذي يحتوي على محتوى التطبيق بالكامل ✨
function MainAppContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("market");
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  const [isSuspended, setIsSuspended] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [showUpdatePassword, setShowUpdatePassword] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editOfferingData, setEditOfferingData] = useState(null);

  const [myOfferings, setMyOfferings] = useState([]);
  const [providerBookings, setProviderBookings] = useState([]);
  const [clientBookings, setClientBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const [commissionRate, setCommissionRate] = useState(0.1);
  const [affiliateRate, setAffiliateRate] = useState(0.2);

  const [myAffiliateStats, setMyAffiliateStats] = useState({
    total: 0,
    unpaid: 0,
    clients: 0,
  });

  const [platformName, setPlatformName] = useState("BookOnMap");
  const [platformLogo, setPlatformLogo] = useState("📍");
  const [bankAccounts, setBankAccounts] = useState("");
  const [welcomeMsgAr, setWelcomeMsgAr] = useState("مرحباً بك في المنصة ✨");
  const [welcomeMsgEn, setWelcomeMsgEn] = useState(
    "Welcome to the platform ✨",
  );
  const [subtitleAr, setSubtitleAr] = useState("اكتشف أفضل الخدمات");
  const [subtitleEn, setSubtitleEn] = useState("Discover the best services");
  const [licenseName, setLicenseName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseLink, setLicenseLink] = useState("");
  const [termsText, setTermsText] = useState("");
  const [privacyText, setPrivacyText] = useState("");
  const [refundText, setRefundText] = useState("");

  const [activeLegalDoc, setActiveLegalDoc] = useState(null);
  const [mustAcceptTerms, setMustAcceptTerms] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    type: "complaint",
    subject: "",
    message: "",
  });
  const [isSendingContact, setIsSendingContact] = useState(false);

  const dynamicLegalDocs = {
    terms: {
      title: defaultLegalDocs.terms.title,
      content: termsText || defaultLegalDocs.terms.content,
    },
    privacy: {
      title: defaultLegalDocs.privacy.title,
      content: privacyText || defaultLegalDocs.privacy.content,
    },
    refund: {
      title: defaultLegalDocs.refund.title,
      content: refundText || defaultLegalDocs.refund.content,
    },
  };

  const fetchAllData = useCallback(async (userId) => {
    try {
      const settingsData = await fetchSettingsSafe();
      let currentCommRate = 0.1;
      let currentAffRate = 0.2;

      if (settingsData) {
        if (settingsData.commission_rate !== undefined) {
          setCommissionRate(settingsData.commission_rate);
          currentCommRate = settingsData.commission_rate;
        }
        if (settingsData.affiliate_rate !== undefined) {
          setAffiliateRate(settingsData.affiliate_rate);
          currentAffRate = settingsData.affiliate_rate;
        }
        if (settingsData.platform_name)
          setPlatformName(settingsData.platform_name);
        if (settingsData.platform_logo)
          setPlatformLogo(settingsData.platform_logo);
        if (settingsData.bank_accounts)
          setBankAccounts(settingsData.bank_accounts);
        if (settingsData.welcome_msg_ar)
          setWelcomeMsgAr(settingsData.welcome_msg_ar);
        if (settingsData.welcome_msg_en)
          setWelcomeMsgEn(settingsData.welcome_msg_en);
        if (settingsData.hero_subtitle_ar)
          setSubtitleAr(settingsData.hero_subtitle_ar);
        if (settingsData.hero_subtitle_en)
          setSubtitleEn(settingsData.hero_subtitle_en);
        if (settingsData.license_name)
          setLicenseName(settingsData.license_name);
        if (settingsData.license_number)
          setLicenseNumber(settingsData.license_number);
        if (settingsData.license_link)
          setLicenseLink(settingsData.license_link);
        if (settingsData.terms_text) setTermsText(settingsData.terms_text);
        if (settingsData.privacy_text)
          setPrivacyText(settingsData.privacy_text);
        if (settingsData.refund_text) setRefundText(settingsData.refund_text);
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      let currentUserData = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        currentUserData = data;
        if (currentUserData) {
          if (currentUserData.is_active === false) {
            setIsSuspended(true);
            setLoading(false);
            return;
          }
          setUserProfile(currentUserData);
          if (currentUserData.terms_accepted === false)
            setMustAcceptTerms(true);
        }
      } catch (e) {}

      const [allProfiles, allOfferings, allBookings, rawNotifs] =
        await Promise.all([
          fetchSafe("profiles"),
          fetchSafe("offerings"),
          fetchSafe("bookings"),
          fetchSafe("notifications"),
        ]);

      const myNotifs = rawNotifs.filter((n) => n.user_id === userId);
      setNotifications(
        myNotifs.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        ),
      );

      let safeProfilesList = allProfiles;
      if (currentUserData && !allProfiles.find((p) => p.id === userId)) {
        safeProfilesList = [...allProfiles, currentUserData];
      }

      const enrichedOfferings = allOfferings.map((o) => ({
        ...o,
        profiles: safeProfilesList.find((p) => p.id === o.provider_id),
      }));
      const enrichedBookings = allBookings
        .map((b) => {
          const off = enrichedOfferings.find((o) => o.id === b.offering_id);
          const cust = safeProfilesList.find((p) => p.id === b.customer_id);
          return { ...b, offerings: off, profiles: cust };
        })
        .sort(
          (a, b) =>
            new Date(b.appointment_date || 0) -
            new Date(a.appointment_date || 0),
        );

      let affTotal = 0;
      let affUnpaid = 0;
      let affClients = 0;
      if (currentUserData && currentUserData.username) {
        const myReferred = safeProfilesList.filter(
          (p) => p.referred_by === currentUserData.username,
        );
        affClients = myReferred.length;
        const myReferredIds = myReferred.map((u) => u.id);

        const myRefBookings = enrichedBookings.filter((b) => {
          if (b.status !== "completed" || !b.is_commission_paid) return false;
          const isCustomerReferred = myReferredIds.includes(b.customer_id);
          const isProviderReferred =
            b.offerings && myReferredIds.includes(b.offerings.provider_id);
          return isCustomerReferred || isProviderReferred;
        });

        myRefBookings.forEach((b) => {
          const { platformCommission } = calculateFinancials(
            b,
            currentCommRate,
          );
          const earnings = platformCommission * currentAffRate;
          affTotal += earnings;
          if (!b.is_affiliate_paid) affUnpaid += earnings;
        });
      }
      setMyAffiliateStats({
        total: affTotal,
        unpaid: affUnpaid,
        clients: affClients,
      });

      setMyOfferings(enrichedOfferings.filter((o) => o.provider_id === userId));
      setProviderBookings(
        enrichedBookings.filter((b) => b.offerings?.provider_id === userId),
      );
      setClientBookings(
        enrichedBookings.filter((b) => b.customer_id === userId),
      );
    } catch (err) {
      console.error("Error fetching app data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchAllData(session?.user?.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (_e === "PASSWORD_RECOVERY") {
        setShowUpdatePassword(true);
      }
      setSession(session);
      fetchAllData(session?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, [fetchAllData]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const globalRadar = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === session.user.id) {
            if (typeof fetchAllData === "function") {
              fetchAllData(session.user.id);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalRadar);
    };
  }, [session, fetchAllData]);

  useEffect(() => {
    if (session && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [session, showLoginModal]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (isSuspended) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "100px 20px",
          fontFamily: "system-ui",
          direction: i18n.language === "ar" ? "rtl" : "ltr",
          backgroundColor: "#fef2f2",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "6rem", marginBottom: "20px" }}>🚫</span>
        <h1
          style={{ color: "#ef4444", margin: "0 0 10px 0", fontSize: "2.5rem" }}
        >
          حسابك موقوف
        </h1>
        <p
          style={{
            color: "#7f1d1d",
            fontSize: "1.2rem",
            maxWidth: "500px",
            margin: "0 0 30px 0",
            lineHeight: "1.8",
          }}
        >
          عذراً، تم إيقاف حسابك من قبل إدارة المنصة. يرجى التواصل مع الدعم الفني
          للاستفسار أو مراجعة الشروط والأحكام.
        </p>
        <button
          onClick={handleLogout}
          style={{
            ...admBtn("#ef4444"),
            padding: "15px 40px",
            fontSize: "1.2rem",
            borderRadius: "16px",
            boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "100px",
          fontFamily: "system-ui",
          fontWeight: "bold",
          fontSize: "1.2rem",
          color: "#64748b",
        }}
      >
        ⏳ جاري تحميل المنصة...
      </div>
    );

  const openEditModal = (offering) => {
    setEditOfferingData(offering);
    setShowAddModal(true);
  };
  const handleDeleteOffering = async (id) => {
    if (window.confirm("هل تريد حذف هذه الخدمة نهائياً؟")) {
      await supabase.from("offerings").delete().eq("id", id);
      fetchAllData(session.user.id);
    }
  };

  const checkProfileCompletion = () => {
    if (!userProfile || !userProfile.phone || userProfile.phone.trim() === "") {
      alert(
        "عذراً، يجب إضافة (رقم الجوال) في إعدادات حسابك لتتمكن من استخدام ميزات المزود.",
      );
      navigate("/");
      setActiveTab("profile");
      return false;
    }
    return true;
  };

  const handleAcceptTerms = async () => {
    setIsAccepting(true);
    try {
      await supabase
        .from("profiles")
        .update({ terms_accepted: true })
        .eq("id", session.user.id);
      setMustAcceptTerms(false);
      alert("تم تسجيل إقرارك وموافقتك قانونياً بنجاح ✅");
    } catch (err) {
      alert("حدث خطأ في التسجيل.");
    }
    setIsAccepting(false);
  };

  const handleSubmitContact = async () => {
    if (!contactForm.subject || !contactForm.message)
      return alert("الرجاء تعبئة العنوان والرسالة.");
    setIsSendingContact(true);
    try {
      await supabase.from("contact_messages").insert([
        {
          user_id: session?.user?.id || null,
          type: contactForm.type,
          subject: contactForm.subject,
          message: contactForm.message,
        },
      ]);
      alert(
        "تم إرسال رسالتك للإدارة بنجاح، شكراً لتواصلك معنا! 📩 سنقوم بالرد عليك في أقرب وقت.",
      );
      setShowContactModal(false);
      setContactForm({ type: "complaint", subject: "", message: "" });
    } catch (err) {
      alert("حدث خطأ غير متوقع أثناء الإرسال.");
    }
    setIsSendingContact(false);
  };

  const hideProviderComment = async (bookingId) => {
    if (
      window.confirm(
        "هل أنت متأكد من إخفاء هذا التعليق لكونه مسيئاً؟ (سيتم إخفاء النص فقط وستبقى النجوم لتجنب ظلم المزود)",
      )
    ) {
      const hiddenText = "🚫 تم إخفاء التعليق بواسطة المزود.";
      try {
        const { data: bData } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (bData) {
          const payload = { is_comment_hidden: true };
          if ("review_text" in bData && bData.review_text)
            payload.review_text = hiddenText;
          if ("review_comment" in bData && bData.review_comment)
            payload.review_comment = hiddenText;
          if ("client_review" in bData && bData.client_review)
            payload.client_review = hiddenText;
          if ("review" in bData && bData.review) payload.review = hiddenText;
          if ("comment" in bData && bData.comment) payload.comment = hiddenText;
          if ("feedback" in bData && bData.feedback)
            payload.feedback = hiddenText;
          await supabase.from("bookings").update(payload).eq("id", bookingId);
          alert("تم إخفاء التعليق بنجاح ✅");
          fetchAllData(session.user.id);
        }
      } catch (err) {
        alert("حدث خطأ! تأكد من تحديث قاعدة البيانات أولاً.");
      }
    }
  };

  const markAllNotifsRead = async () => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id);
      fetchAllData(session.user.id);
      setShowNotifModal(false);
    } catch (err) {}
  };
  const handleReplyToAdmin = (n) => {
    setContactForm({
      type: "inquiry",
      subject: `رد على رسالة الإدارة: ${n.title || ""}`,
      message: "",
    });
    setShowNotifModal(false);
    setShowContactModal(true);
  };

  const renderTable = (bookings, status, isProvider) => {
    const filtered = bookings.filter((b) => b.status === status);
    const titleMap = {
      awaiting_pricing: {
        text: "طلبات بانتظار تسعيرك",
        icon: "💰",
        color: "#d97706",
        bg: "#fffbeb",
        border: "#fde68a",
      },
      awaiting_client_approval: {
        text: "بانتظار موافقة العميل على السعر",
        icon: "⏳",
        color: "#2563eb",
        bg: "#eff6ff",
        border: "#bfdbfe",
      },
      pending: {
        text: "طلبات قيد الانتظار",
        icon: "🆕",
        color: "#d97706",
        bg: "#fef3c7",
        border: "#fde68a",
      },
      negotiating: {
        text: "بانتظار الموافقه",
        icon: "🤝",
        color: "#d97706",
        bg: "#fef3c7",
        border: "#fde68a",
      },
      confirmed: {
        text: "حجوزات مؤكدة",
        icon: "👍",
        color: "#059669",
        bg: "#ecfdf5",
        border: "#a7f3d0",
      },
      completed: {
        text: "حجوزات منفذة",
        icon: "✅",
        color: "#15803d",
        bg: "#f0fdf4",
        border: "#bbf7d0",
      },
      cancelled: {
        text: "ملغاة",
        icon: "❌",
        color: "#ef4444",
        bg: "#fef2f2",
        border: "#fecaca",
      },
    };
    if (filtered.length === 0) return null;
    const currentTitle = titleMap[status] || {
      text: status,
      icon: "📌",
      color: "#475569",
      bg: "#f1f5f9",
      border: "#cbd5e1",
    };

    return (
      <div key={status} style={{ marginBottom: "35px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h4
            style={{
              fontSize: "1rem",
              color: currentTitle.color,
              backgroundColor: currentTitle.bg,
              border: `1px solid ${currentTitle.border}`,
              padding: "10px 20px",
              borderRadius: "30px",
              margin: "0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontWeight: "900",
              boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>{currentTitle.icon}</span>{" "}
            {currentTitle.text}
          </h4>
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: currentTitle.border,
              margin: "0 20px",
              opacity: 0.5,
            }}
          ></div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            paddingBottom: "10px",
          }}
        >
          {filtered.map((b) => {
            const currency = b.offerings?.currency || "USD";
            const { platformCommission } = calculateFinancials(
              b,
              commissionRate,
            );
            const hasComment =
              b.review_text ||
              b.review_comment ||
              b.client_review ||
              b.review ||
              b.comment ||
              b.feedback;
            const isHidden =
              b.is_comment_hidden || (hasComment && hasComment.includes("🚫"));

            return (
              <div
                key={b.id}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <BookingRow
                  booking={b}
                  onRefresh={() => fetchAllData(session.user.id)}
                  isProviderView={isProvider}
                />

                {isProvider &&
                  b.status === "completed" &&
                  hasComment &&
                  !isHidden && (
                    <div
                      style={{
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderTop: "none",
                        padding: "10px 20px",
                        borderBottomRightRadius: "16px",
                        borderBottomLeftRadius: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        marginTop: "-15px",
                        position: "relative",
                        zIndex: 0,
                      }}
                    >
                      <span
                        style={{
                          color: "#b45309",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        💬 تعليق العميل: "{hasComment}"
                      </span>
                      <button
                        onClick={() => hideProviderComment(b.id)}
                        style={{
                          background: "#fef2f2",
                          color: "#ef4444",
                          border: "1px solid #fca5a5",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background = "#fee2e2")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = "#fef2f2")
                        }
                      >
                        🗑️ إخفاء التعليق
                      </button>
                    </div>
                  )}

                {isProvider && b.status === "completed" && isHidden && (
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderTop: "none",
                      padding: "12px 20px",
                      borderBottomRightRadius: "16px",
                      borderBottomLeftRadius: "16px",
                      color: "#64748b",
                      fontSize: "0.85rem",
                      fontStyle: "italic",
                      marginTop: "-15px",
                      position: "relative",
                      zIndex: 0,
                    }}
                  >
                    🚫 تم إخفاء التعليق
                  </div>
                )}

                {isProvider && b.status === "completed" && (
                  <div
                    style={{
                      backgroundColor: b.is_commission_paid
                        ? "#ecfdf5"
                        : "#fef2f2",
                      border: b.is_commission_paid
                        ? "1px solid #a7f3d0"
                        : "1px solid #fca5a5",
                      borderTop: "none",
                      padding: "12px 20px",
                      borderBottomRightRadius: "16px",
                      borderBottomLeftRadius: "16px",
                      color: b.is_commission_paid ? "#047857" : "#b91c1c",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      marginTop: hasComment || isHidden ? "0px" : "-15px",
                      position: "relative",
                      zIndex: -1,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      💰 عمولة المنصة لهذا الحجز:{" "}
                      <strong
                        style={{
                          direction: "ltr",
                          display: "inline-block",
                          fontSize: "1rem",
                        }}
                      >
                        {platformCommission.toFixed(2)} {currency}
                      </strong>
                    </span>
                    <span
                      style={{
                        backgroundColor: "#fff",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      {b.is_commission_paid
                        ? "✅ مسددة للمنصة"
                        : "❌ مستحقة ولم تسدد بعد"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isSuperAdmin =
    userProfile?.role === "admin" ||
    session?.user?.email === "ksanabeel@hotmail.com";
  const isSupervisor = userProfile?.role === "supervisor";
  const canManagePlatform = isSuperAdmin || isSupervisor;
  const canViewReports = isSuperAdmin || isSupervisor;

  const allUserBookings = [
    ...providerBookings,
    ...clientBookings.filter(
      (cb) => !providerBookings.some((pb) => pb.id === cb.id),
    ),
  ];
  const defaultAvatar = `https://ui-avatars.com/api/?name=${
    userProfile?.full_name || "User"
  }&background=7c3aed&color=fff`;

  const myPaidCommissionText = sumByCurrency(
    providerBookings.filter(
      (b) => b.status === "completed" && b.is_commission_paid,
    ),
    commissionRate,
  );

  const myUnpaidCommissionText = sumByCurrency(
    providerBookings.filter(
      (b) => b.status === "completed" && !b.is_commission_paid,
    ),
    commissionRate,
  );

  const totalUnpaidNumeric = providerBookings
    .filter((b) => b.status === "completed" && !b.is_commission_paid)
    .reduce(
      (acc, b) =>
        acc + calculateFinancials(b, commissionRate).platformCommission,
      0,
    );

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div
      style={{
        padding: "15px",
        paddingTop: "40px" /* 👈 قللنا المساحة العلوية لتناسب الجوال */,
        maxWidth: "100vw" /* 👈 يمنع تجاوز عرض الشاشة */,
        width: "100%" /* 👈 إجبار على أخذ مساحة الشاشة فقط */,
        boxSizing: "border-box" /* 👈 يحسب الحواف ضمن المقاس */,
        margin: "0 auto",
        fontFamily: "system-ui",
        direction: i18n.language === "ar" ? "rtl" : "ltr",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden" /* 👈 حماية إضافية */,
      }}
    >
      <style>{`
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {showLoginModal && !session && (
        <div style={modalOverlay}>
          <div
            style={{
              ...modalContent,
              padding: 0,
              overflow: "hidden",
              position: "relative",
              maxWidth: "480px",
            }}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: "absolute",
                top: "15px",
                left: "15px",
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                color: "#ef4444",
                fontWeight: "bold",
                cursor: "pointer",
                zIndex: 10,
                fontSize: "1.4rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              ✕
            </button>
            <div
              style={{
                padding: "30px",
                maxHeight: "90vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2
                style={{
                  color: "#1e293b",
                  margin: "0 0 10px 0",
                  textAlign: "center",
                }}
              >
                أهلاً بك في {platformName} 👋
              </h2>
              <p
                style={{
                  color: "#64748b",
                  margin: "0 0 20px 0",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                يرجى تسجيل الدخول أو إنشاء حساب جديد لإتمام الحجز والتواصل مع
                المزودين.
              </p>
              <Login />
            </div>
          </div>
        </div>
      )}

      {mustAcceptTerms && (
        <div style={{ ...modalOverlay, zIndex: 9999 }}>
          <div
            style={{ ...modalContent, maxWidth: "600px", textAlign: "center" }}
          >
            <span style={{ fontSize: "3rem" }}>📜</span>
            <h2 style={{ color: "#1e293b", marginTop: "10px" }}>
              تحديث الشروط والأحكام
            </h2>
            <p
              style={{
                color: "#64748b",
                lineHeight: "1.6",
                marginBottom: "15px",
                fontSize: "0.95rem",
              }}
            >
              مرحباً بك! للاستمرار في استخدام المنصة والاستفادة من خدماتنا، يرجى
              قراءة والموافقة على الشروط والأحكام أدناه:
            </p>
            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                textAlign: "right",
                backgroundColor: "#f8fafc",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                marginBottom: "20px",
                fontSize: "0.9rem",
                color: "#334155",
                lineHeight: "1.8",
              }}
            >
              {dynamicLegalDocs.terms.content.split("\n").map((p, idx) => (
                <p key={idx} style={{ margin: "0 0 10px 0" }}>
                  {p}
                </p>
              ))}
            </div>
            <button
              onClick={handleAcceptTerms}
              disabled={isAccepting}
              style={{
                backgroundColor: isAccepting ? "#94a3b8" : "#10b981",
                color: "white",
                border: "none",
                padding: "15px 30px",
                borderRadius: "14px",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: isAccepting ? "not-allowed" : "pointer",
                width: "100%",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
              }}
            >
              {isAccepting ? "جاري التأكيد..." : "قرأت وأوافق على الشروط ✅"}
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <AddOffering
              session={session}
              editData={editOfferingData}
              onSuccess={() => {
                setShowAddModal(false);
                fetchAllData(session.user.id);
              }}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div style={{ ...modalOverlay, zIndex: 4000 }}>
          <div style={{ ...modalContent, maxWidth: "550px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "15px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.3rem" }}>
                طرق السداد المتاحة للمنصة 💳
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: "#fef2f2",
                  border: "none",
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setPaymentMethod("bank")}
                style={{
                  flex: 1,
                  padding: "15px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor:
                    paymentMethod === "bank" ? "#7c3aed" : "#f1f5f9",
                  color: paymentMethod === "bank" ? "#fff" : "#475569",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  transition: "0.3s",
                }}
              >
                🏦 تحويل بنكي
              </button>
              <button
                onClick={() => setPaymentMethod("gateway")}
                style={{
                  flex: 1,
                  padding: "15px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor:
                    paymentMethod === "gateway" ? "#7c3aed" : "#f1f5f9",
                  color: paymentMethod === "gateway" ? "#fff" : "#475569",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  transition: "0.3s",
                }}
              >
                🌐 دفع إلكتروني
              </button>
            </div>
            {paymentMethod === "bank" && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "25px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "16px",
                  border: "1px solid #cbd5e1",
                  textAlign: "right",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 15px 0",
                    color: "#334155",
                    fontSize: "1.1rem",
                  }}
                >
                  الحسابات البنكية المعتمدة للمنصة:
                </h4>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    color: "#1e293b",
                    lineHeight: "1.8",
                    fontWeight: "bold",
                    fontSize: "1.15rem",
                    backgroundColor: "#fff",
                    padding: "15px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {bankAccounts ||
                    "لم تقم الإدارة بإضافة حسابات بنكية حتى الآن."}
                </div>
                <p
                  style={{
                    marginTop: "20px",
                    fontSize: "0.9rem",
                    color: "#b91c1c",
                    fontWeight: "bold",
                    backgroundColor: "#fef2f2",
                    padding: "15px",
                    borderRadius: "12px",
                    border: "1px dashed #fca5a5",
                  }}
                >
                  * الرجاء تحويل المبلغ المستحق لأحد الحسابات أعلاه، ثم التواصل
                  مع إدارة المنصة (عبر زر تواصل معنا) لإرفاق إيصال التحويل
                  وتأكيد السداد لتحديث رصيدك.
                </p>
              </div>
            )}
            {paymentMethod === "gateway" && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "25px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "16px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <h3
                  style={{
                    color: "#3b82f6",
                    margin: "0 0 10px 0",
                    textAlign: "center",
                  }}
                >
                  بوابة الدفع (ميسر / Stripe)
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.9rem",
                    textAlign: "center",
                    marginBottom: "20px",
                  }}
                >
                  سيتم سداد إجمالي العمولات المستحقة:{" "}
                  <strong
                    style={{
                      color: "#ef4444",
                      fontSize: "1.2rem",
                      display: "block",
                      marginTop: "5px",
                    }}
                    dir="ltr"
                  >
                    {myUnpaidCommissionText}
                  </strong>
                </p>

                {totalUnpaidNumeric > 0 ? (
                  <MoyasarPayment
                    amount={totalUnpaidNumeric}
                    booking={{
                      id: providerBookings
                        .filter(
                          (b) =>
                            b.status === "completed" && !b.is_commission_paid,
                        )
                        .map((b) => b.id)
                        .join(","),
                    }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#10b981",
                      fontWeight: "bold",
                      padding: "15px",
                    }}
                  >
                    لا توجد مستحقات أو عمولات معلقة حالياً ✅
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showContactModal && (
        <div style={{ ...modalOverlay, zIndex: 4000 }}>
          <div style={{ ...modalContent, maxWidth: "500px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "15px",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.3rem" }}>
                ✉️ تواصل مع إدارة المنصة
              </h2>
              <button
                onClick={() => setShowContactModal(false)}
                style={{
                  background: "#fef2f2",
                  border: "none",
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <strong
                  style={{
                    color: "#334155",
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  نوع الرسالة:
                </strong>
                <select
                  value={contactForm.type}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, type: e.target.value })
                  }
                  style={{ ...smInput, width: "100%", cursor: "pointer" }}
                >
                  <option value="complaint">🚨 لدي مشكلة أو شكوى</option>
                  <option value="suggestion">💡 لدي فكرة أو اقتراح</option>
                  <option value="inquiry">❓ استفسار عام / إرفاق إيصال</option>
                </select>
              </div>
              <div>
                <strong
                  style={{
                    color: "#334155",
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  عنوان الرسالة:
                </strong>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, subject: e.target.value })
                  }
                  placeholder="اكتب عنواناً مختصراً (مثال: إيصال سداد عمولة)"
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <strong
                  style={{
                    color: "#334155",
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  نص الرسالة التفصيلي:
                </strong>
                <textarea
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  placeholder="اكتب تفاصيل رسالتك أو استفسارك هنا بوضوح..."
                  style={{
                    ...smInput,
                    width: "100%",
                    boxSizing: "border-box",
                    height: "140px",
                    resize: "vertical",
                  }}
                />
              </div>
              <button
                onClick={handleSubmitContact}
                disabled={isSendingContact}
                style={{
                  ...addSkillBtn,
                  width: "100%",
                  marginTop: "10px",
                  cursor: isSendingContact ? "not-allowed" : "pointer",
                  opacity: isSendingContact ? 0.7 : 1,
                }}
              >
                {isSendingContact
                  ? "جاري الإرسال..."
                  : "إرسال الرسالة للإدارة 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeLegalDoc && (
        <div style={{ ...modalOverlay, zIndex: 4000 }}>
          <div style={{ ...modalContent, padding: "30px", maxWidth: "700px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "15px",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.3rem" }}>
                {dynamicLegalDocs[activeLegalDoc].title}
              </h3>
              <button
                onClick={() => setActiveLegalDoc(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                textAlign: "right",
                padding: "10px 15px",
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
              }}
            >
              {dynamicLegalDocs[activeLegalDoc].content
                .split("\n")
                .map((p, idx) => (
                  <p
                    key={idx}
                    style={{
                      lineHeight: "1.8",
                      color: "#334155",
                      marginBottom: "15px",
                      fontSize: "0.95rem",
                    }}
                  >
                    {p}
                  </p>
                ))}
            </div>
            <button
              onClick={() => setActiveLegalDoc(null)}
              style={{
                marginTop: "25px",
                padding: "15px",
                backgroundColor: "#1e293b",
                color: "#fff",
                border: "none",
                borderRadius: "14px",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}

      {showNotifModal && (
        <div
          style={{
            ...modalOverlay,
            zIndex: 5000,
            alignItems: "flex-start",
            paddingTop: "80px",
          }}
        >
          <div
            style={{ ...modalContent, maxWidth: "480px", maxHeight: "75vh" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: "15px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: "#1e293b",
                  fontSize: "1.3rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🔔</span> الإشعارات والتنبيهات
              </h2>
              <button
                onClick={() => setShowNotifModal(false)}
                style={{
                  background: "#fef2f2",
                  border: "none",
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#94a3b8",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "16px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  لا توجد إشعارات جديدة حالياً 📭
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "20px",
                      backgroundColor: n.is_read ? "#f8fafc" : "#eff6ff",
                      border: n.is_read
                        ? "1px solid #e2e8f0"
                        : "1px solid #bfdbfe",
                      borderRadius: "16px",
                      marginBottom: "12px",
                      boxShadow: n.is_read
                        ? "none"
                        : "0 4px 10px rgba(59, 130, 246, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "900",
                        color: n.is_read ? "#475569" : "#1d4ed8",
                        marginBottom: "8px",
                        fontSize: "1.05rem",
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        color: "#334155",
                        fontSize: "0.95rem",
                        lineHeight: "1.6",
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "15px",
                        borderTop: "1px dashed #cbd5e1",
                        paddingTop: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#94a3b8",
                          fontWeight: "bold",
                        }}
                      >
                        {new Date(n.created_at || new Date()).toLocaleString(
                          "ar-SA",
                        )}
                      </div>
                      <button
                        onClick={() => handleReplyToAdmin(n)}
                        style={{
                          background: "#e0e7ff",
                          color: "#3b82f6",
                          border: "none",
                          padding: "8px 15px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background = "#c7d2fe")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = "#e0e7ff")
                        }
                      >
                        ↩️ رد على الإدارة
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllNotifsRead}
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  marginTop: "20px",
                  padding: "15px",
                  borderRadius: "14px",
                  width: "100%",
                  fontSize: "1.05rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(16,185,129,0.2)",
                }}
              >
                تحديد الكل كمقروء ✅
              </button>
            )}
          </div>
        </div>
      )}

      {/* ✨ شريط التنقل (Navbar) العائم الرئيسي ✨ */}
      <div
        style={{
          position: "sticky",
          top: "10px",
          zIndex: 2000,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          padding: "15px",
          borderRadius: "24px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          marginBottom: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* 🚀 سحر البرمجة: فصل تصميم الجوال عن الكمبيوتر */}
        <style>{`
          /* الافتراضي: إخفاء سطر الجوال */
          .mobile-user-row { display: none !important; }
          
          @media (max-width: 768px) {
            /* في الجوال: إخفاء عناصر الكمبيوتر */
            .desktop-user-group { display: none !important; }
            
            /* في الجوال: إظهار السطر الجديد (الاسم + إضافة خدمة) */
            .mobile-user-row { 
              display: flex !important; 
              justify-content: space-between; 
              align-items: center; 
              background-color: #f8fafc; 
              padding: 8px 12px; 
              border-radius: 18px; 
              border: 1px solid #e2e8f0; 
              gap: 10px;
            }
            .mobile-user-row .add-btn {
              padding: 8px 15px !important;
              font-size: 0.95rem !important;
            }
          }
        `}</style>

        {/* 🥇 الصف الأول (يظهر للكمبيوتر كاملاً، وفي الجوال يظهر الشعار والإشعارات فقط) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div
            onClick={() => {
              navigate("/");
              setActiveTab("market");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              padding: "5px",
              borderRadius: "16px",
              transition: "0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(241,245,249,0.5)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            {/* الشعار */}
            {platformLogo?.includes("http") ||
            platformLogo?.startsWith("data:image") ? (
              <img
                src={platformLogo}
                style={{
                  height: "45px",
                  width: "45px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
                alt="logo"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                width="45"
                height="45"
                style={{
                  filter: "drop-shadow(0px 4px 10px rgba(124, 58, 237, 0.3))",
                  transition: "transform 0.3s ease",
                  flexShrink: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="pinGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient
                    id="checkGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <path
                  d="M50 5 C30.67 5 15 20.67 15 40 C15 70 50 95 50 95 C50 95 85 70 85 40 C85 20.67 69.33 5 50 5 Z"
                  fill="url(#pinGradient)"
                />
                <circle cx="50" cy="38" r="22" fill="#ffffff" />
                <path
                  d="M38 40 L46 48 L62 28"
                  stroke="url(#checkGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
            <h1
              style={{
                fontSize: "1.5rem",
                margin: 0,
                color: "#1e293b",
                fontWeight: "900",
                letterSpacing: "-0.5px",
                background: "linear-gradient(90deg, #1e293b, #475569)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {platformName}
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {session ? (
              <>
                {/* 💻 مجموعة أزرار الكمبيوتر (تختفي في الجوال تلقائياً) */}
                <div
                  className="desktop-user-group"
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <button
                    onClick={() => {
                      if (checkProfileCompletion()) {
                        setEditOfferingData(null);
                        setShowAddModal(true);
                      }
                    }}
                    style={addSkillBtn}
                  >
                    <span style={{ fontSize: "1.2rem" }}>✨</span> إضافة خدمة
                  </button>

                  <div
                    style={{
                      width: "2px",
                      height: "35px",
                      background: "#e2e8f0",
                      margin: "0 5px",
                    }}
                  ></div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      backgroundColor: "#f8fafc",
                      padding: "6px 20px 6px 6px",
                      borderRadius: "30px",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                      transition: "0.2s",
                    }}
                    onClick={() => setActiveTab("profile")}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f1f5f9")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                  >
                    <div
                      style={{
                        textAlign: i18n.language === "ar" ? "left" : "right",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#1e293b",
                          fontSize: "0.95rem",
                        }}
                      >
                        {userProfile?.full_name || "المستخدم"}
                      </div>
                      {(isSuperAdmin || isSupervisor) && (
                        <div style={{ marginTop: "4px" }}>
                          {isSuperAdmin && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: "#fff",
                                backgroundColor: "#ef4444",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                fontWeight: "bold",
                              }}
                            >
                              👑 مدير المنصة
                            </span>
                          )}
                          {isSupervisor && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: "#fff",
                                backgroundColor: "#3b82f6",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                fontWeight: "bold",
                              }}
                            >
                              🛡️ مشرف عام
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <img
                      src={userProfile?.avatar_url || defaultAvatar}
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        border: "2px solid #fff",
                        objectFit: "cover",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                      }}
                      alt="avatar"
                    />
                  </div>
                </div>

                {/* 🔔 الإشعارات وزر الخروج (تظهر للجميع كمبيوتر وجوال) */}
                <div
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    backgroundColor: "#f8fafc",
                    padding: "10px",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setShowNotifModal(true)}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f1f5f9")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                >
                  <span style={{ fontSize: "1.3rem" }}>🔔</span>
                  {unreadNotifsCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        background: "#ef4444",
                        color: "white",
                        borderRadius: "50%",
                        minWidth: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        border: "2px solid #fff",
                        boxShadow: "0 2px 5px rgba(239,68,68,0.4)",
                      }}
                    >
                      {unreadNotifsCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج المأمون"
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#ef4444",
                    border: "1px solid #fca5a5",
                    width: "42px",
                    height: "42px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "1.3rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#fee2e2";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  🚪
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  fontWeight: "900",
                  fontSize: "1rem",
                  boxShadow: "0 4px 15px rgba(16, 185, 129, 0.25)",
                }}
              >
                دخول / حساب 🚀
              </button>
            )}
          </div>
        </div>

        {/* 📱 السطر الثاني (يظهر في الجوال فقط ويختفي في الكمبيوتر تماماً) */}
        {session && (
          <div className="mobile-user-row">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                flex: 1,
              }}
              onClick={() => setActiveTab("profile")}
            >
              <img
                src={userProfile?.avatar_url || defaultAvatar}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  objectFit: "cover",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
                alt="avatar"
              />
              <div
                style={{ textAlign: i18n.language === "ar" ? "left" : "right" }}
              >
                <div
                  style={{
                    fontWeight: "900",
                    color: "#1e293b",
                    fontSize: "0.9rem",
                  }}
                >
                  {userProfile?.full_name || "المستخدم"}
                </div>
                {(isSuperAdmin || isSupervisor) && (
                  <div style={{ marginTop: "2px" }}>
                    {isSuperAdmin && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: "#fff",
                          backgroundColor: "#ef4444",
                          padding: "2px 6px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                        }}
                      >
                        👑 مدير
                      </span>
                    )}
                    {isSupervisor && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: "#fff",
                          backgroundColor: "#3b82f6",
                          padding: "2px 6px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                        }}
                      >
                        🛡️ مشرف
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              className="add-btn"
              onClick={() => {
                if (checkProfileCompletion()) {
                  setEditOfferingData(null);
                  setShowAddModal(true);
                }
              }}
              style={{
                ...addSkillBtn,
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>✨</span> إضافة خدمة
            </button>
          </div>
        )}

        {/* 🥉 الصف الثالث: التبويبات الساحبة (تظهر للكل) */}
        <div
          className="hide-scrollbar"
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingBottom: "10px",
            WebkitOverflowScrolling: "touch",
            justifyContent: "flex-start",
            flexWrap: "nowrap",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .nav-tab { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; } .nav-tab:hover { transform: translateY(-2px); opacity: 0.9; }`}</style>
          {[
            {
              id: "market",
              label: "دليل الخدمات",
              icon: "🔍",
              color: "#7c3aed",
            },
            ...(session
              ? [
                  {
                    id: "provider",
                    label: "أعمالي",
                    icon: "💼",
                    color: "#059669",
                  },
                  {
                    id: "my_services",
                    label: "خدماتي",
                    icon: "⚙️",
                    color: "#f59e0b",
                  },
                  {
                    id: "calendar",
                    label: "التقويم",
                    icon: "📅",
                    color: "#3b82f6",
                  },
                  {
                    id: "invoices",
                    label: "الفواتير",
                    icon: "🧾",
                    color: "#8b5cf6",
                  },
                  ...(canViewReports
                    ? [
                        {
                          id: "reports",
                          label: "التقارير",
                          icon: "📊",
                          color: "#d946ef",
                        },
                      ]
                    : []),
                  ...(canManagePlatform
                    ? [
                        {
                          id: "admin",
                          label: "الإدارة",
                          icon: "⚙️",
                          color: "#ef4444",
                        },
                      ]
                    : []),
                  {
                    id: "profile",
                    label: "حسابي",
                    icon: "👤",
                    color: "#1e293b",
                  },
                ]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              className="nav-tab"
              onClick={() => {
                navigate("/");
                setActiveTab(tab.id);
              }}
              style={{
                padding: "8px 16px",
                border: activeTab === tab.id ? "none" : "1px solid #e2e8f0",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.95rem",
                backgroundColor: activeTab === tab.id ? tab.color : "#fff",
                color: activeTab === tab.id ? "white" : "#475569",
                boxShadow:
                  activeTab === tab.id
                    ? `0 4px 10px ${tab.color}40`
                    : "0 2px 4px rgba(0,0,0,0.02)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                transition: "0.2s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "1.2rem",
                  filter: activeTab !== tab.id ? "grayscale(0.5)" : "none",
                }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* منطقة الروابط والتنقل لمحتوى الصفحات */}
      <div
        style={{
          flex: 1,
          filter: mustAcceptTerms ? "blur(5px)" : "none",
          pointerEvents: mustAcceptTerms ? "none" : "auto",
          transition: "0.3s",
        }}
      >
        <Routes>
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route
            path="/:storeUsername"
            element={
              <ClientMarketplace
                session={session}
                onRequireLogin={() => setShowLoginModal(true)}
                checkProfileCompletion={checkProfileCompletion}
                welcomeMsg={
                  i18n.language === "ar" ? welcomeMsgAr : welcomeMsgEn
                }
                heroSubtitle={i18n.language === "ar" ? subtitleAr : subtitleEn}
              />
            }
          />
          <Route
            path="/"
            element={
              <div style={{ animation: "fadeIn 0.5s ease-in-out" }}>
                <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

                {activeTab === "market" && (
                  <ClientMarketplace
                    session={session}
                    onRequireLogin={() => setShowLoginModal(true)}
                    checkProfileCompletion={checkProfileCompletion}
                    welcomeMsg={
                      i18n.language === "ar" ? welcomeMsgAr : welcomeMsgEn
                    }
                    heroSubtitle={
                      i18n.language === "ar" ? subtitleAr : subtitleEn
                    }
                  />
                )}

                {session && (
                  <>
                    {activeTab === "calendar" && (
                      <div style={cardS}>
                        <CalendarView
                          bookings={allUserBookings}
                          userId={session.user.id}
                          onRefresh={() => fetchAllData(session.user.id)}
                        />
                      </div>
                    )}

                    {activeTab === "invoices" && (
                      <div style={cardS}>
                        <Suspense
                          fallback={
                            <div
                              style={{
                                textAlign: "center",
                                padding: "50px",
                                color: "#64748b",
                                fontWeight: "bold",
                              }}
                            >
                              ⏳ جاري جلب الفواتير...
                            </div>
                          }
                        >
                          <InvoicesView
                            bookings={allUserBookings}
                            userId={session.user.id}
                            commissionRate={commissionRate}
                            platName={platformName}
                            platLogo={platformLogo}
                          />
                        </Suspense>
                      </div>
                    )}

                    {activeTab === "profile" && (
                      <div style={cardS}>
                        <ProfileSettings
                          session={session}
                          onUpdate={() => fetchAllData(session.user.id)}
                        />
                      </div>
                    )}

                    {activeTab === "reports" && canViewReports && (
                      <div style={cardS}>
                        <Suspense
                          fallback={
                            <div
                              style={{
                                textAlign: "center",
                                padding: "50px",
                                color: "#64748b",
                                fontWeight: "bold",
                              }}
                            >
                              📊 جاري تجهيز التقارير والإحصائيات...
                            </div>
                          }
                        >
                          <AdminReports
                            commissionRate={commissionRate}
                            affiliateRate={affiliateRate}
                            platName={platformName}
                          />
                        </Suspense>
                      </div>
                    )}

                    {activeTab === "admin" && canManagePlatform && (
                      <Suspense
                        fallback={
                          <div
                            style={{
                              textAlign: "center",
                              padding: "80px",
                              color: "#ef4444",
                              fontWeight: "bold",
                              fontSize: "1.2rem",
                            }}
                          >
                            👑 جاري فتح لوحة الإدارة العليا...
                          </div>
                        }
                      >
                        <PlatformManagement
                          onRefresh={() => fetchAllData(session.user.id)}
                          commissionRate={commissionRate}
                          setCommissionRate={setCommissionRate}
                          affiliateRate={affiliateRate}
                          setAffiliateRate={setAffiliateRate}
                          platName={platformName}
                          setPlatName={setPlatformName}
                          platLogo={platformLogo}
                          setPlatLogo={setPlatformLogo}
                          bankAccounts={bankAccounts}
                          setBankAccounts={setBankAccounts}
                          welcomeAr={welcomeMsgAr}
                          setWelcomeAr={setWelcomeMsgAr}
                          welcomeEn={welcomeMsgEn}
                          setWelcomeEn={setWelcomeMsgEn}
                          subtitleAr={subtitleAr}
                          setSubtitleAr={setSubtitleAr}
                          subtitleEn={subtitleEn}
                          setSubtitleEn={setSubtitleEn}
                          licenseName={licenseName}
                          setLicenseName={setLicenseName}
                          licenseNumber={licenseNumber}
                          setLicenseNumber={setLicenseNumber}
                          licenseLink={licenseLink}
                          setLicenseLink={setLicenseLink}
                        />
                      </Suspense>
                    )}

                    {activeTab === "my_services" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(320px, 1fr))",
                          gap: "25px",
                        }}
                      >
                        {myOfferings.length === 0 && (
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              textAlign: "center",
                              padding: "60px 20px",
                              backgroundColor: "#f8fafc",
                              borderRadius: "24px",
                              border: "2px dashed #cbd5e1",
                            }}
                          >
                            <div
                              style={{ fontSize: "4rem", marginBottom: "15px" }}
                            >
                              📭
                            </div>
                            <h3
                              style={{
                                color: "#475569",
                                margin: "0 0 20px 0",
                                fontSize: "1.3rem",
                              }}
                            >
                              ليس لديك أي خدمات مضافة بعد
                            </h3>
                            <button
                              onClick={() => {
                                setEditOfferingData(null);
                                setShowAddModal(true);
                              }}
                              style={{
                                ...addSkillBtn,
                                padding: "15px 35px",
                                fontSize: "1.1rem",
                              }}
                            >
                              ✨ أضف خدمتك الأولى والآن وانطلق
                            </button>
                          </div>
                        )}
                        {myOfferings.map((off) => {
                          const modelLabels = {
                            fixed: "مهمة",
                            hourly: "ساعة",
                            period: "فترة",
                            daily: "يوم",
                            monthly: "شهر",
                            yearly: "سنة",
                            free: "تطوع",
                          };
                          const curr = off.currency || "USD";
                          return (
                            <div
                              key={off.id}
                              style={{
                                backgroundColor: "#fff",
                                borderRadius: "24px",
                                border: "1px solid #e2e8f0",
                                overflow: "hidden",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                                display: "flex",
                                flexDirection: "column",
                                position: "relative",
                                transition: "0.3s",
                              }}
                              onMouseOver={(e) =>
                                (e.currentTarget.style.transform =
                                  "translateY(-5px)")
                              }
                              onMouseOut={(e) =>
                                (e.currentTarget.style.transform =
                                  "translateY(0)")
                              }
                            >
                              <div
                                style={{
                                  height: "8px",
                                  background:
                                    off.pricing_model === "free"
                                      ? "linear-gradient(90deg, #10b981, #34d399)"
                                      : "linear-gradient(90deg, #7c3aed, #a855f7)",
                                }}
                              ></div>
                              <div
                                style={{
                                  padding: "25px",
                                  display: "flex",
                                  flexDirection: "column",
                                  flex: 1,
                                }}
                              >
                                <h3
                                  style={{
                                    margin: "0 0 12px 0",
                                    fontSize: "1.25rem",
                                    color: "#1e293b",
                                    fontWeight: "900",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {off.title}
                                </h3>
                                <p
                                  style={{
                                    fontSize: "0.9rem",
                                    color: "#64748b",
                                    marginBottom: "20px",
                                    lineHeight: "1.8",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    flex: 1,
                                  }}
                                  title={off.description}
                                >
                                  {off.description}
                                </p>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "10px",
                                    marginBottom: "25px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      backgroundColor: "#f8fafc",
                                      padding: "8px 15px",
                                      borderRadius: "10px",
                                      border: "1px solid #e2e8f0",
                                      color: "#475569",
                                      fontWeight: "bold",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    {off.is_24_7
                                      ? `🟢 متاح 24 ساعة للعمل`
                                      : `🕒 دوام: ${off.work_start_time?.substring(
                                          0,
                                          5,
                                        )} - ${off.work_end_time?.substring(
                                          0,
                                          5,
                                        )}`}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderTop: "2px dashed #f1f5f9",
                                    paddingTop: "20px",
                                    marginTop: "auto",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: "900",
                                        color:
                                          off.pricing_model === "free"
                                            ? "#10b981"
                                            : "#7c3aed",
                                        fontSize: "1.4rem",
                                      }}
                                    >
                                      {off.price_upon_agreement
                                        ? "حسب الاتفاق 🤝"
                                        : off.pricing_model === "free"
                                        ? `💚 عمل تطوعي`
                                        : `${off.price} ${curr}`}
                                    </span>
                                    {!off.price_upon_agreement && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "#94a3b8",
                                          marginTop: "4px",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        السعر محدد لكل{" "}
                                        {modelLabels[off.pricing_model] ||
                                          "مهمة"}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                      onClick={() => openEditModal(off)}
                                      style={{
                                        border: "none",
                                        background: "#eff6ff",
                                        color: "#2563eb",
                                        padding: "10px",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                        fontSize: "1.1rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "45px",
                                        height: "45px",
                                        transition: "0.2s",
                                      }}
                                      onMouseOver={(e) =>
                                        (e.currentTarget.style.background =
                                          "#dbeafe")
                                      }
                                      onMouseOut={(e) =>
                                        (e.currentTarget.style.background =
                                          "#eff6ff")
                                      }
                                      title="تعديل الخدمة"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteOffering(off.id)
                                      }
                                      style={{
                                        border: "none",
                                        background: "#fef2f2",
                                        color: "#ef4444",
                                        padding: "10px",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                        fontSize: "1.1rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "45px",
                                        height: "45px",
                                        transition: "0.2s",
                                      }}
                                      onMouseOver={(e) =>
                                        (e.currentTarget.style.background =
                                          "#fee2e2")
                                      }
                                      onMouseOut={(e) =>
                                        (e.currentTarget.style.background =
                                          "#fef2f2")
                                      }
                                      title="حذف الخدمة"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeTab === "provider" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "35px",
                        }}
                      >
                        {/* ✨ زر نسخ رابط المتجر الخاص بالمزود ✨ */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            backgroundColor: "#fff",
                            padding: "25px",
                            borderRadius: "24px",
                            border: "1px solid #e2e8f0",
                            flexWrap: "wrap",
                            gap: "20px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "15px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "2.5rem",
                                background: "#f8fafc",
                                padding: "10px",
                                borderRadius: "16px",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              🔗
                            </div>
                            <div>
                              <h3
                                style={{
                                  margin: 0,
                                  color: "#1e293b",
                                  fontSize: "1.3rem",
                                  fontWeight: "900",
                                }}
                              >
                                رابط متجرك الخاص المباشر
                              </h3>
                              <p
                                style={{
                                  margin: "6px 0 0 0",
                                  color: "#64748b",
                                  fontSize: "0.95rem",
                                  lineHeight: "1.6",
                                }}
                              >
                                انسخ هذا الرابط وشاركه في حساباتك (تويتر،
                                واتساب، انستقرام) ليتمكن العملاء من الدخول لملفك
                                وحجز خدماتك مباشرة فوراً بضغطة واحدة.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!userProfile?.username) {
                                alert(
                                  "عذراً! لا يمكننا إنشاء رابط لمتجرك حتى تقوم باختيار (يوزر نيم / Username) خاص بك.\n\nيرجى الذهاب إلى تبويب 👤 [حسابي] وكتابة اليوزر نيم الخاص بك أولاً ⚠️",
                                );
                                return;
                              }
                              const storeUrl = `${window.location.origin}/@${userProfile.username}`;
                              navigator.clipboard.writeText(storeUrl);
                              alert(
                                "رائع! تم نسخ رابط متجرك بنجاح 📋✨\nالرابط هو:\n" +
                                  storeUrl,
                              );
                            }}
                            style={{
                              background:
                                "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                              color: "white",
                              border: "none",
                              padding: "15px 30px",
                              borderRadius: "14px",
                              fontWeight: "900",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              boxShadow: "0 8px 20px rgba(124, 58, 237, 0.3)",
                              transition:
                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(-3px)")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(0)")
                            }
                          >
                            <span style={{ fontSize: "1.3rem" }}>📋</span> نسخ
                            الرابط الآن
                          </button>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(280px, 1fr))",
                            gap: "25px",
                          }}
                        >
                          {/* 1. بطاقة إجمالي الأرباح الصافية */}
                          <div
                            style={{
                              background:
                                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              padding: "30px",
                              borderRadius: "24px",
                              color: "white",
                              boxShadow: "0 15px 35px rgba(16, 185, 129, 0.25)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              transition: "0.3s",
                              position: "relative",
                              overflow: "hidden",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(-5px)")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(0)")
                            }
                          >
                            <div
                              style={{
                                position: "absolute",
                                right: "-20px",
                                top: "-20px",
                                fontSize: "8rem",
                                opacity: 0.1,
                              }}
                            >
                              💰
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginBottom: "15px",
                                opacity: 0.9,
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              <span style={{ fontSize: "1.8rem" }}>💰</span>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "1.2rem",
                                  fontWeight: "bold",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                إجمالي الأرباح الصافية
                              </h3>
                            </div>
                            <div
                              style={{
                                fontSize: "1.8rem",
                                fontWeight: "900",
                                direction: "ltr",
                                textAlign: "right",
                                textShadow: "0 4px 10px rgba(0,0,0,0.15)",
                                position: "relative",
                                zIndex: 1,
                                wordBreak: "break-word",
                              }}
                            >
                              {sumByCurrency(
                                providerBookings.filter(
                                  (b) => b.status === "completed",
                                ),
                                commissionRate,
                                "providerNet",
                              )}
                            </div>
                          </div>

                          {/* 2. بطاقة الخدمات المكتملة */}
                          <div
                            style={{
                              background: "#fff",
                              padding: "30px",
                              borderRadius: "24px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              transition: "0.3s",
                              position: "relative",
                              overflow: "hidden",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(-5px)")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(0)")
                            }
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: "-10px",
                                bottom: "-20px",
                                fontSize: "7rem",
                                opacity: 0.05,
                              }}
                            >
                              ✅
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginBottom: "15px",
                                color: "#64748b",
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              <span style={{ fontSize: "1.8rem" }}>✅</span>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "1.2rem",
                                  fontWeight: "bold",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                الخدمات المكتملة بنجاح
                              </h3>
                            </div>
                            <div
                              style={{
                                fontSize: "2.5rem",
                                fontWeight: "900",
                                color: "#1e293b",
                                textAlign: "left",
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              {
                                providerBookings.filter(
                                  (b) => b.status === "completed",
                                ).length
                              }{" "}
                              <span
                                style={{
                                  fontSize: "1.2rem",
                                  color: "#94a3b8",
                                  fontWeight: "bold",
                                }}
                              >
                                عملية منفذة
                              </span>
                            </div>
                          </div>

                          {/* 3. ✨ بطاقة أرباح التسويق ✨ */}
                          <div
                            style={{
                              background:
                                "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                              padding: "30px",
                              borderRadius: "24px",
                              color: "white",
                              boxShadow: "0 15px 35px rgba(245, 158, 11, 0.25)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              transition: "0.3s",
                              position: "relative",
                              overflow: "hidden",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(-5px)")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(0)")
                            }
                          >
                            <div
                              style={{
                                position: "absolute",
                                right: "-20px",
                                top: "-20px",
                                fontSize: "8rem",
                                opacity: 0.1,
                              }}
                            >
                              🤝
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginBottom: "15px",
                                opacity: 0.9,
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              <span style={{ fontSize: "1.8rem" }}>🤝</span>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "1.2rem",
                                  fontWeight: "bold",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                أرباح التسويق بالعمولة
                              </h3>
                            </div>
                            <div
                              style={{
                                fontSize: "1.8rem",
                                fontWeight: "900",
                                direction: "ltr",
                                textAlign: "right",
                                textShadow: "0 4px 10px rgba(0,0,0,0.15)",
                                position: "relative",
                                zIndex: 1,
                              }}
                            >
                              {myAffiliateStats.total.toFixed(2)} SAR
                            </div>
                            <div
                              style={{
                                fontSize: "0.95rem",
                                marginTop: "15px",
                                opacity: 0.9,
                                display: "flex",
                                justifyContent: "space-between",
                                position: "relative",
                                zIndex: 1,
                                fontWeight: "bold",
                              }}
                            >
                              <span>العملاء: {myAffiliateStats.clients}</span>
                              <span>
                                المستحق: {myAffiliateStats.unpaid.toFixed(2)}{" "}
                                SAR
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                marginTop: "15px",
                                color: "#fef3c7",
                                textAlign: "center",
                                position: "relative",
                                zIndex: 1,
                                borderTop: "1px dashed rgba(255,255,255,0.3)",
                                paddingTop: "10px",
                                fontWeight: "bold",
                              }}
                            >
                              * تضاف الأرباح لرصيدك فور سداد المزود لعمولة
                              المنصة.
                            </div>
                          </div>
                        </div>

                        {myUnpaidCommissionText !== "0.00" && (
                          <div
                            style={{
                              backgroundColor: "#fef2f2",
                              border: "2px dashed #fca5a5",
                              padding: "25px 30px",
                              borderRadius: "24px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "20px",
                              boxShadow: "0 10px 25px rgba(239, 68, 68, 0.08)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "18px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "2.5rem",
                                  animation: "pulse 2s infinite",
                                }}
                              >
                                <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }`}</style>
                                🔔
                              </span>
                              <div>
                                <h3
                                  style={{
                                    margin: 0,
                                    color: "#ef4444",
                                    fontSize: "1.3rem",
                                    fontWeight: "900",
                                  }}
                                >
                                  مستحقات المنصة معلقة
                                </h3>
                                <p
                                  style={{
                                    margin: "8px 0 0 0",
                                    color: "#7f1d1d",
                                    fontWeight: "900",
                                    fontSize: "1.3rem",
                                    direction: "ltr",
                                    textAlign: "right",
                                  }}
                                >
                                  {myUnpaidCommissionText}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              style={{
                                background:
                                  "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                                color: "white",
                                border: "none",
                                borderRadius: "14px",
                                fontWeight: "900",
                                cursor: "pointer",
                                padding: "15px 30px",
                                fontSize: "1.1rem",
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: "0 8px 20px rgba(239, 68, 68, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                              onMouseOver={(e) =>
                                (e.currentTarget.style.transform =
                                  "translateY(-3px)")
                              }
                              onMouseOut={(e) =>
                                (e.currentTarget.style.transform =
                                  "translateY(0)")
                              }
                            >
                              <span style={{ fontSize: "1.3rem" }}>💳</span>{" "}
                              المبادرة بسداد العمولات الآن
                            </button>
                          </div>
                        )}

                        <section style={cardS}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "15px",
                              backgroundColor: "#f8fafc",
                              padding: "20px 25px",
                              borderRadius: "20px",
                              borderRight:
                                i18n.language === "ar"
                                  ? "6px solid #7c3aed"
                                  : "none",
                              borderLeft:
                                i18n.language === "en"
                                  ? "6px solid #7c3aed"
                                  : "none",
                              marginBottom: "35px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                            }}
                          >
                            <span style={{ fontSize: "2.2rem" }}>💼</span>
                            <div>
                              <h2
                                style={{
                                  fontSize: "1.5rem",
                                  margin: 0,
                                  color: "#1e293b",
                                  fontWeight: "900",
                                }}
                              >
                                لوحة تحكم طلبات خدماتي
                              </h2>
                              <p
                                style={{
                                  margin: "6px 0 0 0",
                                  color: "#64748b",
                                  fontSize: "0.95rem",
                                }}
                              >
                                إدارة ومتابعة جميع الطلبات الواردة لخدماتك من
                                العملاء لتسعيرها أو تنفيذها.
                              </p>
                            </div>
                          </div>
                          {[
                            "pending",
                            "awaiting_pricing",
                            "awaiting_client_approval",
                            "negotiating",
                            "confirmed",
                            "completed",
                            "cancelled",
                          ].map((s) => renderTable(providerBookings, s, true))}
                        </section>

                        <section style={cardS}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "15px",
                              backgroundColor: "#f8fafc",
                              padding: "20px 25px",
                              borderRadius: "20px",
                              borderRight:
                                i18n.language === "ar"
                                  ? "6px solid #059669"
                                  : "none",
                              borderLeft:
                                i18n.language === "en"
                                  ? "6px solid #059669"
                                  : "none",
                              marginBottom: "35px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                            }}
                          >
                            <span style={{ fontSize: "2.2rem" }}>🛍️</span>
                            <div>
                              <h2
                                style={{
                                  fontSize: "1.5rem",
                                  margin: 0,
                                  color: "#1e293b",
                                  fontWeight: "900",
                                }}
                              >
                                مشترياتي وطلباتي كعميل
                              </h2>
                              <p
                                style={{
                                  margin: "6px 0 0 0",
                                  color: "#64748b",
                                  fontSize: "0.95rem",
                                }}
                              >
                                تتبع حالات الخدمات التي قمت بطلبها أنت من مزودين
                                آخرين في المنصة.
                              </p>
                            </div>
                          </div>
                          {[
                            "pending",
                            "awaiting_pricing",
                            "awaiting_client_approval",
                            "negotiating",
                            "confirmed",
                            "completed",
                            "cancelled",
                          ].map((s) => renderTable(clientBookings, s, false))}
                        </section>
                      </div>
                    )}
                  </>
                )}
              </div>
            }
          />
        </Routes>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "30px 0",
          marginTop: "50px",
          borderTop: "2px solid #e2e8f0",
          color: "#64748b",
          fontSize: "0.9rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px",
        }}
      >
        {licenseNumber && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              padding: "10px 25px",
              borderRadius: "16px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>✅</span>
            <span style={{ fontWeight: "bold", color: "#334155" }}>
              {licenseName || "موثق من الجهات الرسمية"}:
            </span>
            <a
              href={licenseLink || "#"}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#10b981",
                textDecoration: "none",
                fontWeight: "900",
                fontSize: "1.2rem",
                direction: "ltr",
                display: "inline-block",
              }}
            >
              {licenseNumber}
            </a>
          </div>
        )}
        <p style={{ margin: 0, fontWeight: "bold", fontSize: "1rem" }}>
          © {new Date().getFullYear()} {platformName} (جميع الحقوق محفوظة )
          email:bookonmap@hotmail.com ترخيص FL-822660150
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            backgroundColor: "#f8fafc",
            padding: "12px 25px",
            borderRadius: "20px",
            border: "1px solid #f1f5f9",
          }}
        >
          <span
            onClick={() => setActiveLegalDoc("terms")}
            style={{
              cursor: "pointer",
              color: "#4f46e5",
              fontWeight: "bold",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#312e81")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#4f46e5")}
          >
            شروط الاستخدام
          </span>{" "}
          <span style={{ color: "#cbd5e1" }}>|</span>
          <span
            onClick={() => setActiveLegalDoc("privacy")}
            style={{
              cursor: "pointer",
              color: "#4f46e5",
              fontWeight: "bold",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#312e81")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#4f46e5")}
          >
            سياسة الخصوصية
          </span>{" "}
          <span style={{ color: "#cbd5e1" }}>|</span>
          <span
            onClick={() => setActiveLegalDoc("refund")}
            style={{
              cursor: "pointer",
              color: "#4f46e5",
              fontWeight: "bold",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#312e81")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#4f46e5")}
          >
            سياسات الدفع والاسترجاع
          </span>{" "}
          <span style={{ color: "#cbd5e1" }}>|</span>
          <span
            onClick={() => setShowContactModal(true)}
            style={{
              cursor: "pointer",
              color: "#d97706",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>✉️</span> تواصل مع الإدارة
          </span>
        </div>
      </div>

      {/* ✨ نافذة استعادة كلمة المرور الجديدة ✨ */}
      {showUpdatePassword && (
        <UpdatePasswordModal onClose={() => setShowUpdatePassword(false)} />
      )}
    </div>
  );
}

// ✨ بوابة الدخول السرية للمرحلة التجريبية (Beta Gate) ✨
const BetaGate = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(
    localStorage.getItem("beta_unlocked") === "true",
  );

  const [passcode, setPasscode] = useState("");

  if (isUnlocked) return children;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        fontFamily: "system-ui",
        direction: "rtl",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "40px",
          borderRadius: "24px",
          textAlign: "center",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          maxWidth: "400px",
          width: "100%",
          border: "1px solid #334155",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "15px" }}>🚧</div>
        <h2
          style={{ color: "#f8fafc", margin: "0 0 10px 0", fontSize: "1.8rem" }}
        >
          منصة مغلقة مؤقتاً
        </h2>
        <p
          style={{
            color: "#94a3b8",
            marginBottom: "30px",
            fontSize: "0.95rem",
            lineHeight: "1.6",
          }}
        >
          المنصة حالياً في مرحلة الاختبار المغلق (Beta). يرجى إدخال رمز المرور
          السري المخصص للوصول.
        </p>
        <input
          type="password"
          placeholder="أدخل الرمز هنا..."
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "14px",
            border: "1px solid #475569",
            backgroundColor: "#0f172a",
            color: "#fff",
            outline: "none",
            textAlign: "center",
            fontSize: "1.2rem",
            letterSpacing: "5px",
            marginBottom: "20px",
            boxSizing: "border-box",
            transition: "0.2s",
          }}
          dir="ltr"
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#475569")}
        />
        <button
          onClick={() => {
            if (passcode === "2030") {
              localStorage.setItem("beta_unlocked", "true");
              setIsUnlocked(true);
            } else {
              alert("الرمز غير صحيح ❌");
              setPasscode("");
            }
          }}
          style={{
            width: "100%",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            padding: "15px",
            borderRadius: "14px",
            fontWeight: "900",
            fontSize: "1.1rem",
            cursor: "pointer",
            transition: "0.2s",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#2563eb")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#3b82f6")
          }
        >
          دخول للمنصة 🔓
        </button>
      </div>
    </div>
  );
};

export default function AppWrapper() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        {/* 🚧 تم إيقاف بوابة الاختبار (BetaGate) مؤقتاً لمراجعة المركز السعودي للأعمال 🚧 */}
        {/* <BetaGate> */}
        <MainAppContent />
        {/* </BetaGate> */}
      </BrowserRouter>
    </HelmetProvider>
  );
}
