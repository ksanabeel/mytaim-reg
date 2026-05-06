import React, { useState, useEffect, useCallback, Fragment } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import BookingRow from "./components/BookingRow";
import ClientMarketplace from "./components/ClientMarketplace";
import ProfileSettings from "./components/ProfileSettings";
import AddOffering from "./components/AddOffering";
import CalendarView from "./components/CalendarView";
import { useTranslation } from "react-i18next";

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
  const basePricePerUnit =
    Number(b.proposed_price) || Number(b.offerings?.price) || 0;
  const additional = Number(b.additional_costs) || 0;
  const qty = b.quantity || 1;
  const baseTotal = basePricePerUnit * qty;
  const totalClientPrice = baseTotal + additional;
  const platformCommission = baseTotal * commissionRate;
  const providerNet = baseTotal - platformCommission + additional;
  return {
    baseTotal,
    qty,
    additional,
    totalClientPrice,
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

const handlePrintInvoice = (
  b,
  isClient,
  currentCommissionRate,
  platName,
  platLogo,
) => {
  const s = {
    pending: { text: "طلب جديد", color: "#64748b" },
    awaiting_pricing: { text: "بانتظار التسعير", color: "#f59e0b" },
    awaiting_client_approval: { text: "بانتظار الموافقة", color: "#f59e0b" },
    negotiating: { text: "بانتظار موافقة العميل", color: "#f59e0b" },
    confirmed: { text: "مؤكد", color: "#10b981" },
    completed: { text: "منفذ", color: "#059669" },
    cancelled: { text: "ملغى", color: "#ef4444" },
  }[b.status] || { text: "طلب جديد", color: "#64748b" };
  const customerName = b.profiles?.full_name || "غير متوفر";
  const providerName = b.offerings?.profiles?.full_name || "غير متوفر";
  const currency = b.offerings?.currency || "USD";
  const label = {
    fixed: "مهمة",
    hourly: "ساعة",
    period: "فترة",
    daily: "يوم",
    monthly: "شهر",
    yearly: "سنة",
    free: "تطوع",
  }[b.offerings?.pricing_model || "fixed"];
  const {
    baseTotal,
    qty,
    additional,
    totalClientPrice,
    platformCommission,
    providerNet,
  } = calculateFinancials(b, currentCommissionRate);

  const logoHtml =
    platLogo?.includes("http") || platLogo?.startsWith("data:image")
      ? `<img src="${platLogo}" style="height:50px; border-radius:8px; object-fit:cover;" />`
      : `<span style="font-size:2.5rem;">${platLogo}</span>`;

  let financialDetails = `<div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 15px;"><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكلفة الأساسية (${qty} ${label}):</span><span>${baseTotal.toFixed(2)} ${currency}</span></div><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكاليف الإضافية:</span><span>+ ${additional.toFixed(2)} ${currency}</span></div><div class="total" style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;"><span>الإجمالي المطلوب:</span><span style="color:#7c3aed;">${totalClientPrice.toFixed(2)} ${currency}</span></div></div>`;

  if (!isClient) {
    financialDetails = `<div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 15px;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكلفة الأساسية (${qty} ${label}):</span><span>${baseTotal.toFixed(2)} ${currency}</span></div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكاليف الإضافية لك:</span><span>+ ${additional.toFixed(2)} ${currency}</span></div>
      <div style="display:flex; justify-content:space-between; color: #ef4444; margin-bottom: 10px; padding: 5px; background: #fef2f2; border-radius: 5px;"><span>عمولة المنصة (${currentCommissionRate * 100}%):</span><span>- ${platformCommission.toFixed(2)} ${currency}</span></div>
      <div class="total" style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;"><span>الصافي المستحق للمزود:</span><span style="color:#10b981;">${providerNet.toFixed(2)} ${currency}</span></div>
    </div>`;
  }

  const printWindow = window.open("", "_blank", "width=800,height=800");
  printWindow.document.write(
    `<html dir="rtl"><head><title>فاتورة #${b.id.substring(0, 6)}</title><style>body{font-family:system-ui;padding:40px;color:#1e293b}.invoice-box{border:2px dashed #cbd5e1;padding:40px;border-radius:15px;max-width:600px;margin:0 auto; background: #fff;}.header{display:flex;justify-content:space-between;border-bottom:2px solid #f1f5f9;padding-bottom:20px;margin-bottom:20px}.badge{background:${s.color};color:white;padding:8px 15px;border-radius:8px;font-weight:bold}.plat-header{text-align:center; margin-bottom:30px;}</style></head><body style="background: #f8fafc;"><div class="invoice-box"><div class="plat-header">${logoHtml}<h2 style="color:#7c3aed; margin:10px 0 0 0;">${platName}</h2></div><div class="header"><h2>فاتورة حجز #${b.id.substring(0, 6)}</h2><span class="badge">${s.text}</span></div><p style="margin-bottom:5px;"><strong>الخدمة:</strong> ${b.offerings?.title}</p><p style="margin-bottom:5px;"><strong>العميل:</strong> ${customerName}</p><p style="margin-bottom:5px;"><strong>المزود:</strong> ${providerName}</p><p style="margin-top:15px;"><strong>تاريخ البدء:</strong> ${new Date(b.appointment_date).toLocaleString("ar-SA")}</p>${financialDetails}</div><script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script></body></html>`,
  );
  printWindow.document.close();
};

const InvoicesView = ({
  bookings,
  userId,
  commissionRate,
  platName,
  platLogo,
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const statusMap = {
    pending: { text: "طلب جديد", color: "#475569", bg: "#f1f5f9" },
    awaiting_pricing: {
      text: "بانتظار التسعير",
      color: "#d97706",
      bg: "#fffbeb",
    },
    awaiting_client_approval: {
      text: "بانتظار الموافقة",
      color: "#d97706",
      bg: "#fffbeb",
    },
    negotiating: {
      text: "بانتظار موافقة العميل",
      color: "#d97706",
      bg: "#fffbeb",
    },
    confirmed: { text: "مؤكد", color: "#059669", bg: "#ecfdf5" },
    completed: { text: "منفذ", color: "#15803d", bg: "#dcfce7" },
    cancelled: { text: "ملغى", color: "#ef4444", bg: "#fef2f2" },
  };

  if (!bookings || bookings.length === 0)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "#94a3b8",
          backgroundColor: "#fff",
          borderRadius: "24px",
          border: "2px dashed #cbd5e1",
        }}
      >
        <div style={{ fontSize: "3.5rem", marginBottom: "15px" }}>🧾</div>
        <h3 style={{ margin: 0, color: "#475569" }}>
          لا توجد فواتير أو حركات مالية حتى الآن
        </h3>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "30px",
          padding: "0 10px",
        }}
      >
        <span style={{ fontSize: "2.2rem" }}>🧾</span>
        <div>
          <h2
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: "1.5rem",
              fontWeight: "900",
            }}
          >
            السجل المالي والفواتير
          </h2>
          <p
            style={{
              margin: "5px 0 0 0",
              color: "#64748b",
              fontSize: "0.95rem",
            }}
          >
            استعرض كافة فواتير حجوزاتك كعميل أو إيراداتك كمزود خدمة.
          </p>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "25px",
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        {bookings.map((b) => {
          const isClient = b.customer_id === userId;
          const s = statusMap[b.status] || statusMap["pending"];
          const currency = b.offerings?.currency || "SAR";
          const { baseTotal, additional, totalClientPrice, providerNet } =
            calculateFinancials(b, commissionRate);

          return (
            <div
              key={b.id}
              className="smart-invoice-card"
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 20px",
                  borderBottom: "2px dashed #e2e8f0",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span style={{ color: "#94a3b8", fontWeight: "bold" }}>
                    #
                  </span>
                  <strong
                    style={{
                      fontSize: "1.1rem",
                      color: "#334155",
                      letterSpacing: "1px",
                      direction: "ltr",
                    }}
                  >
                    {b.id.substring(0, 6).toUpperCase()}
                  </strong>
                </div>
                <span
                  style={{
                    backgroundColor: s.bg,
                    color: s.color,
                    padding: "6px 12px",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: "900",
                  }}
                >
                  {s.text}
                </span>
              </div>
              <div style={{ padding: "20px", flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  الخدمة المقدمة:
                </div>
                <h4
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "1.1rem",
                    color: "#1e293b",
                    fontWeight: "900",
                    lineHeight: "1.4",
                  }}
                >
                  {b.offerings?.title || "غير متوفرة"}
                </h4>
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    padding: "15px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      fontSize: "0.85rem",
                      color: "#475569",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>
                      التكلفة الأساسية:
                    </span>
                    <strong style={{ color: "#1e293b", direction: "ltr" }}>
                      {baseTotal.toFixed(2)}{" "}
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {currency}
                      </span>
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      color: "#475569",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>إضافات (أخرى):</span>
                    <strong style={{ color: "#1e293b", direction: "ltr" }}>
                      {additional.toFixed(2)}{" "}
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {currency}
                      </span>
                    </strong>
                  </div>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: isClient ? "#eff6ff" : "#ecfdf5",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: isClient
                    ? "1px solid #bfdbfe"
                    : "1px solid #a7f3d0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: isClient ? "#2563eb" : "#059669",
                      fontWeight: "900",
                      marginBottom: "4px",
                    }}
                  >
                    {isClient ? "الإجمالي المطلوب" : "صافي أرباحك"}
                  </div>
                  <strong
                    style={{
                      fontSize: "1.4rem",
                      color: isClient ? "#1d4ed8" : "#047857",
                      direction: "ltr",
                      display: "block",
                      fontWeight: "900",
                    }}
                  >
                    {isClient
                      ? totalClientPrice.toFixed(2)
                      : providerNet.toFixed(2)}{" "}
                    <span style={{ fontSize: "0.85rem" }}>{currency}</span>
                  </strong>
                </div>
                <button
                  onClick={() =>
                    handlePrintInvoice(
                      b,
                      isClient,
                      commissionRate,
                      platName,
                      platLogo,
                    )
                  }
                  style={{
                    backgroundColor: "#fff",
                    color: isClient ? "#2563eb" : "#10b981",
                    border: isClient
                      ? "2px solid #bfdbfe"
                      : "2px solid #a7f3d0",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "900",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>🖨️</span> طباعة
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ✨ لوحة التقارير الإدارية ✨
const AdminReports = ({ commissionRate, affiliateRate, platName }) => {
  const [data, setData] = useState({ users: [], bookings: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const [reportTab, setReportTab] = useState("bookings");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const [payoutModalData, setPayoutModalData] = useState(null);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [u, c, offs, bks] = await Promise.all([
        fetchSafe("profiles"),
        fetchSafe("categories"),
        fetchSafe("offerings"),
        fetchSafe("bookings"),
      ]);

      const usersWithOfferings = u.map((user) => ({
        ...user,
        offerings: offs.filter((o) => o.provider_id === user.id),
      }));

      const enrichedBookings = bks.map((b) => {
        const offering = offs.find((o) => o.id === b.offering_id);
        const providerProfile = u.find(
          (user) => user.id === offering?.provider_id,
        );
        const customerProfile = u.find((user) => user.id === b.customer_id);
        return {
          ...b,
          offerings: offering
            ? { ...offering, profiles: providerProfile }
            : null,
          profiles: customerProfile,
        };
      });

      setData({
        users: usersWithOfferings,
        bookings: enrichedBookings,
        categories: c,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAdminDeleteBooking = async (id) => {
    if (
      window.confirm(
        "🚨 تحذير: هل أنت متأكد من حذف هذا الحجز نهائياً من قاعدة البيانات؟ لا يمكن التراجع.",
      )
    ) {
      try {
        const { error } = await supabase.from("bookings").delete().eq("id", id);
        if (error) throw error;
        alert("تم حذف الحجز بنجاح ✅");
        fetchStats();
      } catch (err) {
        alert("حدث خطأ أثناء الحذف: " + err.message);
      }
    }
  };

  const handleAdminDeleteUser = async (id) => {
    if (
      window.confirm(
        "🚨 تحذير خطير: حذف المستخدم سيؤدي إلى مسح بياناته. هل أنت متأكد؟",
      )
    ) {
      try {
        const { error } = await supabase.from("profiles").delete().eq("id", id);
        if (error) throw error;
        alert("تم حذف المستخدم بنجاح ✅");
        fetchStats();
      } catch (err) {
        alert("حدث خطأ! قد يكون المستخدم مرتبطاً بحجوزات سابقة.");
      }
    }
  };

  const toggleUserActive = async (id, status) => {
    try {
      await supabase
        .from("profiles")
        .update({ is_active: !status })
        .eq("id", id);
      fetchStats();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const filteredBookings = data.bookings
    .filter((b) => {
      const matchStatus =
        activeStatusFilter === "all" || b.status === activeStatusFilter;
      const matchSearch =
        userSearch === "" ||
        (b.profiles?.full_name || "")
          .toLowerCase()
          .includes(userSearch.toLowerCase()) ||
        (b.offerings?.profiles?.full_name || "")
          .toLowerCase()
          .includes(userSearch.toLowerCase());
      let matchPayment = true;
      if (b.status !== "cancelled") {
        if (paymentFilter === "paid")
          matchPayment = b.is_commission_paid === true;
        if (paymentFilter === "unpaid")
          matchPayment = b.is_commission_paid !== true;
      } else {
        if (paymentFilter === "paid") matchPayment = false;
      }
      return matchStatus && matchSearch && matchPayment;
    })
    .sort(
      (a, b) =>
        new Date(b.appointment_date || 0) - new Date(a.appointment_date || 0),
    );

  const filteredUsers = data.users.filter((u) => {
    return (
      userSearch === "" ||
      (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone || "").includes(userSearch)
    );
  });

  const completedBookings = data.bookings.filter(
    (b) => b.status === "completed",
  );
  const totalProfitText = sumByCurrency(completedBookings, commissionRate);
  const collectedProfitText = sumByCurrency(
    completedBookings.filter((b) => b.is_commission_paid),
    commissionRate,
  );
  const pendingProfitText = sumByCurrency(
    completedBookings.filter((b) => !b.is_commission_paid),
    commissionRate,
  );
  const currentReportTotalText = sumByCurrency(
    filteredBookings,
    commissionRate,
  );

  const getAffiliateStats = () => {
    const marketers = data.users.filter((u) => u.username);
    const currentAffiliateRate = affiliateRate || 0.2;

    return marketers
      .map((marketer) => {
        const referredUsersList = data.users.filter(
          (u) => u.referred_by === marketer.username,
        );
        const referredUserIds = referredUsersList.map((u) => u.id);

        const referralsBookings = data.bookings.filter((b) => {
          // ✨ التعديل المالي: لا تحسب العمولة إلا إذا كان منفذاً + تم سداد عمولة المنصة ✨
          if (b.status !== "completed" || !b.is_commission_paid) return false;

          const isCustomerReferred = referredUserIds.includes(b.customer_id);
          const isProviderReferred =
            b.offerings && referredUserIds.includes(b.offerings.provider_id);
          return isCustomerReferred || isProviderReferred;
        });

        let totalPlatformCommission = 0;
        let unpaidPlatformCommission = 0;

        referralsBookings.forEach((b) => {
          const { platformCommission } = calculateFinancials(b, commissionRate);
          totalPlatformCommission += platformCommission;
          if (!b.is_affiliate_paid) {
            unpaidPlatformCommission += platformCommission;
          }
        });

        return {
          ...marketer,
          referredUsersList,
          referralsBookings,
          referredUserIds,
          totalPlatformCommission,
          totalEarnings: totalPlatformCommission * currentAffiliateRate,
          unpaidEarnings: unpaidPlatformCommission * currentAffiliateRate,
        };
      })
      .filter((m) => m.referredUsersList.length > 0)
      .sort((a, b) => b.unpaidEarnings - a.unpaidEarnings);
  };
  const affiliateStats = getAffiliateStats();

  const handleExecutePayout = async () => {
    if (!payoutModalData) return;
    setIsProcessingPayout(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ is_affiliate_paid: true })
        .in("customer_id", payoutModalData.referredUserIds)
        .eq("status", "completed")
        .is("is_affiliate_paid", false);

      if (error) throw error;

      alert(
        `تم تسجيل سداد مبلغ ${payoutModalData.unpaidEarnings.toFixed(2)} بنجاح للمسوق ${payoutModalData.full_name} ✅`,
      );
      setPayoutModalData(null);
      fetchStats();
    } catch (err) {
      alert("حدث خطأ أثناء السداد: " + err.message);
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const printBookingsReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html dir="rtl"><head><title>تقرير الحجوزات</title><style>body{font-family:system-ui; padding:30px; color:#1e293b;} table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} th, td{padding:10px; border:1px solid #cbd5e1;}</style></head><body><h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">تقرير الحجوزات - ${platName}</h1><div style="background:#eff6ff; padding:15px; border:1px dashed #3b82f6; font-size:1.2rem; font-weight:bold; margin-bottom:20px;">إجمالي العمولات المفلترة: <span style="color:#2563eb">${currentReportTotalText}</span></div><table><thead><tr><th>المزود والخدمة</th><th>بيانات العميل</th><th>عمولة المنصة</th><th>الحالة</th></tr></thead><tbody>${filteredBookings
        .map((b) => {
          const curr = b.offerings?.currency || "USD";
          return `<tr><td>${b.offerings?.profiles?.full_name || "غير محدد"}<br><small>${b.offerings?.title}</small></td><td>${b.profiles?.full_name || "غير محدد"}<br><small dir="ltr">${b.profiles?.phone}</small></td><td style="color:#ef4444; font-weight:bold;">${calculateFinancials(b, commissionRate).platformCommission.toFixed(2)} ${curr}</td><td>${b.status}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`,
    );
    printWindow.document.close();
  };

  const printUsersReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html dir="rtl"><head><title>تقرير المستخدمين</title><style>body{font-family:system-ui; padding:30px; color:#1e293b;} table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} th, td{padding:10px; border:1px solid #cbd5e1;}</style></head><body><h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">تقرير المستخدمين - ${platName}</h1><p><strong>العدد المطبوع:</strong> ${filteredUsers.length} مستخدم</p><table><thead><tr><th>الاسم (اليوزر)</th><th>رقم التواصل</th><th>النوع</th><th>الحالة</th></tr></thead><tbody>${filteredUsers.map((u) => `<tr><td>${u.full_name || "بدون اسم"}</td><td dir="ltr">${u.phone || "-"}</td><td>${u.provider_type === "institution" ? "مؤسسة" : "فرد"}</td><td>${u.is_active ? "نشط" : "موقوف"}</td></tr>`).join("")}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`,
    );
    printWindow.document.close();
  };

  const printAffiliatesReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html dir="rtl"><head><title>تقرير المسوقين</title><style>body{font-family:system-ui; padding:30px; color:#1e293b;} table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} th, td{padding:10px; border:1px solid #cbd5e1;}</style></head><body><h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">تقرير المسوقين والأرباح - ${platName}</h1><table><thead><tr><th>المسوق</th><th>عدد العملاء</th><th>أرباح المنصة</th><th>أرباح المسوق (المستحقة)</th></tr></thead><tbody>${affiliateStats.map((a) => `<tr><td>${a.full_name} (@${a.username})</td><td>${a.referredCount} عملاء</td><td>${a.totalPlatformCommission.toFixed(2)} SAR</td><td style="color:#10b981; font-weight:bold;">${a.unpaidEarnings.toFixed(2)} SAR</td></tr>`).join("")}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`,
    );
    printWindow.document.close();
  };

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          color: "#64748b",
          fontWeight: "bold",
        }}
      >
        ⏳ جاري تحميل لوحة التقارير...
      </div>
    );

  return (
    <div
      style={{
        ...cardS,
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        direction: "rtl",
        borderTop: "4px solid #7c3aed",
      }}
    >
      {/* نافذة سداد المسوقين */}
      {payoutModalData && (
        <div style={modalOverlay}>
          <div style={modalContent}>
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
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.4rem" }}>
                💸 سداد أرباح مسوق
              </h2>
              <button
                onClick={() => setPayoutModalData(null)}
                style={{
                  background: "#fef2f2",
                  border: "none",
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "20px",
                borderRadius: "15px",
                border: "1px solid #e2e8f0",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  marginBottom: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <strong style={{ color: "#475569" }}>المسوق:</strong>
                <span style={{ fontWeight: "bold", color: "#1e293b" }}>
                  {payoutModalData.full_name} (@{payoutModalData.username})
                </span>
              </div>
              <div
                style={{
                  marginBottom: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <strong style={{ color: "#475569" }}>المستحق الآن:</strong>
                <span
                  style={{
                    fontWeight: "900",
                    color: "#10b981",
                    fontSize: "1.3rem",
                    direction: "ltr",
                  }}
                >
                  {payoutModalData.unpaidEarnings.toFixed(2)} SAR
                </span>
              </div>
              <hr
                style={{ borderTop: "1px dashed #cbd5e1", margin: "15px 0" }}
              />
              <div style={{ marginBottom: "10px" }}>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  💳 بيانات التحويل (الآيبان):
                </strong>
                <div
                  style={{
                    backgroundColor: "#fff",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #bfdbfe",
                    color: payoutModalData.bank_iban ? "#1e40af" : "#ef4444",
                    fontWeight: "bold",
                    direction: "ltr",
                    textAlign: "right",
                  }}
                >
                  {payoutModalData.bank_iban ||
                    "لم يقم المسوق بإضافة رقم الآيبان في ملفه!"}
                </div>
              </div>
              <div style={{ marginBottom: "5px" }}>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  👤 رقم الهوية (للتوثيق):
                </strong>
                <div style={{ color: "#1e293b", fontWeight: "bold" }}>
                  {payoutModalData.national_id || "غير متوفر"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleExecutePayout}
                disabled={
                  isProcessingPayout || payoutModalData.unpaidEarnings <= 0
                }
                style={{
                  flex: 2,
                  backgroundColor:
                    payoutModalData.unpaidEarnings > 0 ? "#10b981" : "#94a3b8",
                  color: "#fff",
                  border: "none",
                  padding: "15px",
                  borderRadius: "12px",
                  fontWeight: "900",
                  fontSize: "1.1rem",
                  cursor:
                    payoutModalData.unpaidEarnings > 0
                      ? "pointer"
                      : "not-allowed",
                  boxShadow:
                    payoutModalData.unpaidEarnings > 0
                      ? "0 4px 15px rgba(16, 185, 129, 0.3)"
                      : "none",
                }}
              >
                {isProcessingPayout
                  ? "⏳ جاري التنفيذ..."
                  : "تأكيد السداد وتصفير الرصيد ✅"}
              </button>
              <button
                onClick={() => setPayoutModalData(null)}
                style={{
                  flex: 1,
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  padding: "15px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
            {!payoutModalData.bank_iban && (
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  marginTop: "15px",
                  fontWeight: "bold",
                  backgroundColor: "#fef2f2",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                ⚠️ تنبيه: قم بتحويل المبلغ للمسوق بأي طريقة أخرى قبل تأكيد
                السداد هنا.
              </p>
            )}
          </div>
        </div>
      )}

      {/* شريط الإحصائيات العلوي */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <h2
          style={{
            color: "#1e293b",
            fontSize: "1.5rem",
            margin: 0,
            fontWeight: "900",
          }}
        >
          📊 التقارير والإحصائيات
        </h2>
        <button
          onClick={fetchStats}
          style={{
            background: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #bfdbfe",
            padding: "10px 20px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🔄</span> تحديث البيانات
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "15px",
        }}
      >
        <div style={reportCard("#3b82f6", false)}>
          <div style={{ fontSize: "2rem", marginBottom: "5px" }}>📁</div>
          <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>
            إجمالي الحجوزات
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "900",
              fontSize: "1.5rem",
              color: "#1e293b",
            }}
          >
            {data.bookings.length}
          </p>
        </div>
        <div style={reportCard("#10b981", false)}>
          <div style={{ fontSize: "2rem", marginBottom: "5px" }}>💰</div>
          <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>
            عمولة محصلة
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "900",
              color: "#10b981",
              direction: "ltr",
              fontSize: "1.2rem",
            }}
          >
            {collectedProfitText}
          </p>
        </div>
        <div style={reportCard("#ef4444", false)}>
          <div style={{ fontSize: "2rem", marginBottom: "5px" }}>⏳</div>
          <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>
            عمولة معلقة
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "900",
              color: "#ef4444",
              direction: "ltr",
              fontSize: "1.2rem",
            }}
          >
            {pendingProfitText}
          </p>
        </div>
        <div style={reportCard("#7c3aed", false)}>
          <div style={{ fontSize: "2rem", marginBottom: "5px" }}>💎</div>
          <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>
            الإيراد المتوقع
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "900",
              color: "#7c3aed",
              direction: "ltr",
              fontSize: "1.2rem",
            }}
          >
            {totalProfitText}
          </p>
        </div>
      </div>

      {/* أزرار التنقل والطباعة */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          backgroundColor: "#f8fafc",
          padding: "10px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <button
            onClick={() => setReportTab("bookings")}
            style={{
              background: reportTab === "bookings" ? "#fff" : "transparent",
              color: reportTab === "bookings" ? "#3b82f6" : "#64748b",
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow:
                reportTab === "bookings"
                  ? "0 4px 10px rgba(0,0,0,0.05)"
                  : "none",
              transition: "0.2s",
            }}
          >
            📑 تقارير الحجوزات
          </button>
          <button
            onClick={() => setReportTab("users")}
            style={{
              background: reportTab === "users" ? "#fff" : "transparent",
              color: reportTab === "users" ? "#3b82f6" : "#64748b",
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow:
                reportTab === "users" ? "0 4px 10px rgba(0,0,0,0.05)" : "none",
              transition: "0.2s",
            }}
          >
            👥 تقارير المستخدمين
          </button>
          <button
            onClick={() => setReportTab("affiliates")}
            style={{
              background: reportTab === "affiliates" ? "#fff" : "transparent",
              color: reportTab === "affiliates" ? "#10b981" : "#64748b",
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow:
                reportTab === "affiliates"
                  ? "0 4px 10px rgba(16, 185, 129, 0.1)"
                  : "none",
              transition: "0.2s",
            }}
          >
            💰 المسوقين والأرباح
          </button>
        </div>

        <div>
          {reportTab === "bookings" && (
            <button
              onClick={printBookingsReport}
              style={{
                background: "#1e293b",
                color: "#fff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                gap: "8px",
              }}
            >
              <span>🖨️</span> طباعة الحجوزات
            </button>
          )}
          {reportTab === "users" && (
            <button
              onClick={printUsersReport}
              style={{
                background: "#1e293b",
                color: "#fff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                gap: "8px",
              }}
            >
              <span>🖨️</span> طباعة المستخدمين
            </button>
          )}
          {reportTab === "affiliates" && (
            <button
              onClick={printAffiliatesReport}
              style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                gap: "8px",
              }}
            >
              <span>🖨️</span> طباعة المسوقين
            </button>
          )}
        </div>
      </div>

      {/* محتوى المسوقين */}
      {reportTab === "affiliates" && (
        <>
          <div
            style={{
              backgroundColor: "#ecfdf5",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #a7f3d0",
            }}
          >
            <span
              style={{
                color: "#047857",
                fontWeight: "bold",
                fontSize: "0.95rem",
              }}
            >
              💡 نسبة ربح المسوق محددة بـ {(affiliateRate * 100).toFixed(0)}% من
              (عمولة المنصة للحجوزات المكتملة للعملاء الذين سجلوا عبره).
            </span>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              overflowX: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  <th style={thS}>الاسم واليوزر (المسوق)</th>
                  <th style={thS}>العملاء المسجلين عبره</th>
                  <th style={thS}>تفاصيل الأرباح التاريخية</th>
                  <th style={thS}>المستحق حالياً</th>
                  <th style={thS}>إجراء السداد</th>
                </tr>
              </thead>
              <tbody>
                {affiliateStats.map((a) => (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "backgroundColor 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      style={{
                        ...tdS,
                        textAlign: "right",
                        verticalAlign: "top",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#1e293b",
                          fontSize: "1.05rem",
                        }}
                      >
                        {a.full_name}
                      </div>
                      <div
                        style={{
                          color: "#10b981",
                          fontSize: "0.85rem",
                          direction: "ltr",
                          textAlign: "right",
                          marginTop: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        @{a.username}
                      </div>
                    </td>

                    <td style={{ ...tdS, verticalAlign: "top" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        {a.referredUsersList.map((ru) => (
                          <div
                            key={ru.id}
                            style={{
                              backgroundColor: "#fef3c7",
                              padding: "6px 15px",
                              borderRadius: "12px",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              minWidth: "130px",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                              }}
                            >
                              👤 {ru.full_name || "بدون اسم"}
                            </span>
                            {ru.username ? (
                              <span
                                style={{
                                  direction: "ltr",
                                  fontSize: "0.75rem",
                                  opacity: 0.8,
                                  marginTop: "2px",
                                }}
                              >
                                @{ru.username}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  opacity: 0.7,
                                  marginTop: "2px",
                                }}
                              >
                                (بدون يوزر)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td
                      style={{
                        ...tdS,
                        textAlign: "right",
                        verticalAlign: "top",
                        borderRight: "1px dashed #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          color: "#475569",
                          fontSize: "0.85rem",
                          marginBottom: "8px",
                        }}
                      >
                        الحجوزات المنفذة لعملائه:{" "}
                        <strong
                          style={{ color: "#1e293b", fontSize: "1.1rem" }}
                        >
                          {a.referralsBookings.length}
                        </strong>
                      </div>
                      <div
                        style={{
                          color: "#475569",
                          fontSize: "0.85rem",
                          marginBottom: "10px",
                        }}
                      >
                        إجمالي عمولة المنصة:{" "}
                        <strong
                          style={{
                            color: "#1e293b",
                            direction: "ltr",
                            display: "inline-block",
                          }}
                        >
                          {a.totalPlatformCommission.toFixed(2)} SAR
                        </strong>
                      </div>
                      <div
                        style={{
                          color: "#10b981",
                          fontSize: "0.95rem",
                          fontWeight: "bold",
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: "10px",
                        }}
                      >
                        نصيب المسوق الكلي:{" "}
                        <span
                          style={{
                            direction: "ltr",
                            display: "inline-block",
                            fontSize: "1.1rem",
                          }}
                        >
                          {a.totalEarnings.toFixed(2)} SAR
                        </span>
                      </div>
                    </td>

                    <td style={{ ...tdS, verticalAlign: "middle" }}>
                      <div
                        style={{
                          color: a.unpaidEarnings > 0 ? "#ef4444" : "#94a3b8",
                          fontWeight: "900",
                          fontSize: "1.3rem",
                          direction: "ltr",
                          backgroundColor:
                            a.unpaidEarnings > 0 ? "#fef2f2" : "transparent",
                          padding: "10px",
                          borderRadius: "12px",
                          display: "inline-block",
                        }}
                      >
                        {a.unpaidEarnings.toFixed(2)} SAR
                      </div>
                    </td>

                    <td style={{ ...tdS, verticalAlign: "middle" }}>
                      <button
                        onClick={() => setPayoutModalData(a)}
                        disabled={a.unpaidEarnings <= 0}
                        style={{
                          backgroundColor:
                            a.unpaidEarnings > 0 ? "#10b981" : "#f1f5f9",
                          color: a.unpaidEarnings > 0 ? "#fff" : "#94a3b8",
                          border:
                            a.unpaidEarnings > 0 ? "none" : "1px solid #cbd5e1",
                          padding: "12px 20px",
                          borderRadius: "12px",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                          cursor:
                            a.unpaidEarnings > 0 ? "pointer" : "not-allowed",
                          transition: "0.2s",
                          boxShadow:
                            a.unpaidEarnings > 0
                              ? "0 4px 15px rgba(16, 185, 129, 0.25)"
                              : "none",
                        }}
                      >
                        {a.unpaidEarnings > 0
                          ? "سداد الآن 💳"
                          : "مسدد بالكامل ✅"}
                      </button>
                    </td>
                  </tr>
                ))}
                {affiliateStats.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      لا يوجد مسوقين مستحقين حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* محتوى الحجوزات */}
      {reportTab === "bookings" && (
        <>
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid #cbd5e1",
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                flex: "1 1 200px",
              }}
            >
              <strong style={{ fontSize: "0.8rem", color: "#64748b" }}>
                حالة الحجز:
              </strong>
              <select
                value={activeStatusFilter}
                onChange={(e) => setActiveStatusFilter(e.target.value)}
                style={smInput}
              >
                <option value="all">🚦 عرض جميع الحالات</option>
                <option value="completed">✅ منفذ (مكتمل)</option>
                <option value="pending">⏳ قيد المعالجة</option>
                <option value="confirmed">👍 مؤكد</option>
                <option value="cancelled">❌ ملغى</option>
              </select>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                flex: "1 1 200px",
              }}
            >
              <strong style={{ fontSize: "0.8rem", color: "#64748b" }}>
                حالة السداد للمنصة:
              </strong>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                style={smInput}
              >
                <option value="all">💳 عرض كل العمولات</option>
                <option value="paid">✅ المسددة فقط</option>
                <option value="unpaid">❌ غير المسددة فقط</option>
              </select>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                flex: "1 1 250px",
              }}
            >
              <strong style={{ fontSize: "0.8rem", color: "#64748b" }}>
                بحث سريع:
              </strong>
              <input
                type="text"
                placeholder="ابحث باسم العميل أو المزود..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={smInput}
              />
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#eff6ff",
              padding: "18px 25px",
              borderRadius: "16px",
              border: "1px dashed #3b82f6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong style={{ color: "#1e293b", fontSize: "1.1rem" }}>
              مجموع عمولات التقرير المفلتر حالياً:
            </strong>
            <strong
              style={{
                color: "#2563eb",
                fontSize: "1.3rem",
                direction: "ltr",
                backgroundColor: "#fff",
                padding: "6px 15px",
                borderRadius: "10px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              }}
            >
              {currentReportTotalText}
            </strong>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              overflowX: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  <th style={thS}>المزود / الخدمة</th>
                  <th style={thS}>العميل والتواصل</th>
                  <th style={thS}>العمولة</th>
                  <th style={thS}>الحالة</th>
                  <th style={{ ...thS, width: "80px" }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const currency = b.offerings?.currency || "USD";
                  const { platformCommission } = calculateFinancials(
                    b,
                    commissionRate,
                  );
                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f8fafc")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={{ ...tdS, textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: "900",
                            color: "#1e293b",
                            fontSize: "1rem",
                          }}
                        >
                          💼{" "}
                          {b.offerings?.profiles?.full_name || "مزود غير معروف"}
                        </div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "0.85rem",
                            marginTop: "6px",
                          }}
                        >
                          📌 خدمة: {b.offerings?.title || "غير محددة"}
                        </div>
                      </td>
                      <td style={{ ...tdS, textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: "900",
                            color: "#3b82f6",
                            fontSize: "1rem",
                          }}
                        >
                          🙋‍♂️ {b.profiles?.full_name || "عميل غير معروف"}
                        </div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "0.85rem",
                            marginTop: "6px",
                            direction: "ltr",
                            textAlign: "right",
                          }}
                        >
                          📞 {b.profiles?.phone || "لا يوجد رقم"}
                        </div>
                      </td>
                      <td
                        style={{
                          ...tdS,
                          color: "#ef4444",
                          fontWeight: "900",
                          direction: "ltr",
                          fontSize: "1.1rem",
                        }}
                      >
                        {platformCommission.toFixed(2)} {currency}
                      </td>
                      <td style={{ ...tdS }}>
                        <span
                          style={{
                            fontWeight: "bold",
                            padding: "6px 12px",
                            borderRadius: "10px",
                            backgroundColor:
                              b.status === "completed"
                                ? "#d1fae5"
                                : b.status === "cancelled"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                            color:
                              b.status === "completed"
                                ? "#047857"
                                : b.status === "cancelled"
                                  ? "#b91c1c"
                                  : "#b45309",
                          }}
                        >
                          {b.status === "completed"
                            ? "منفذ"
                            : b.status === "cancelled"
                              ? "ملغى"
                              : "معلق"}
                        </span>
                      </td>
                      <td style={{ ...tdS }}>
                        <button
                          onClick={() => handleAdminDeleteBooking(b.id)}
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fca5a5",
                            color: "#ef4444",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            transition: "0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.background = "#fee2e2")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.background = "#fef2f2")
                          }
                          title="حذف الحجز نهائياً"
                        >
                          🗑️ حذف
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      لا توجد حجوزات تطابق البحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* محتوى المستخدمين */}
      {reportTab === "users" && (
        <>
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid #cbd5e1",
              marginBottom: "20px",
            }}
          >
            <strong
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                display: "block",
                marginBottom: "8px",
              }}
            >
              بحث سريع عن مستخدم:
            </strong>
            <input
              type="text"
              placeholder="اكتب الاسم، رقم الجوال، أو الإيميل للبحث..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                maxWidth: "500px",
                padding: "12px 15px",
              }}
            />
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              overflowX: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  <th style={thS}>الاسم واليوزر</th>
                  <th style={thS}>رقم التواصل</th>
                  <th style={thS}>النوع</th>
                  <th style={thS}>الحالة</th>
                  <th style={thS}>إجراءات الإدارة</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={{ ...tdS, textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#1e293b",
                          fontSize: "1.05rem",
                        }}
                      >
                        {u.full_name || "بدون اسم"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.85rem",
                          marginTop: "6px",
                        }}
                      >
                        {u.username ? (
                          <span
                            style={{
                              color: "#3b82f6",
                              direction: "ltr",
                              display: "inline-block",
                            }}
                          >
                            @{u.username}
                          </span>
                        ) : (
                          <span style={{ opacity: 0.6 }}>(لم يعين يوزر)</span>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        ...tdS,
                        direction: "ltr",
                        fontWeight: "bold",
                        color: "#475569",
                      }}
                    >
                      {u.phone || "-"}
                    </td>
                    <td style={{ ...tdS }}>
                      <span
                        style={{
                          background:
                            u.provider_type === "institution"
                              ? "#eff6ff"
                              : "#f8fafc",
                          padding: "6px 12px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          color:
                            u.provider_type === "institution"
                              ? "#2563eb"
                              : "#64748b",
                          border:
                            u.provider_type === "institution"
                              ? "1px solid #bfdbfe"
                              : "1px solid #e2e8f0",
                        }}
                      >
                        {u.provider_type === "institution"
                          ? "🏢 مؤسسة"
                          : "👤 فرد"}
                      </span>
                    </td>
                    <td style={{ ...tdS }}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          backgroundColor: u.is_active ? "#ecfdf5" : "#fef2f2",
                          color: u.is_active ? "#059669" : "#dc2626",
                        }}
                      >
                        {u.is_active ? "نشط ✅" : "موقوف 🚫"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdS,
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <button
                        onClick={() => toggleUserActive(u.id, u.is_active)}
                        style={{
                          background: u.is_active ? "#fef3c7" : "#d1fae5",
                          color: u.is_active ? "#b45309" : "#047857",
                          border: "none",
                          borderRadius: "10px",
                          padding: "8px 15px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.transform = "scale(1.05)")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.transform = "scale(1)")
                        }
                      >
                        {u.is_active ? "إيقاف" : "تفعيل"}
                      </button>
                      <button
                        onClick={() => handleAdminDeleteUser(u.id)}
                        style={{
                          background: "#fef2f2",
                          color: "#ef4444",
                          border: "1px solid #fca5a5",
                          borderRadius: "10px",
                          padding: "8px 15px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background = "#fee2e2")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = "#fef2f2")
                        }
                        title="حذف المستخدم نهائياً"
                      >
                        حذف 🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      لا يوجد مستخدمين.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ✨ لوحة الإدارة العليا (بكل أقسامها الستة المُجمّلة) ✨
const PlatformManagement = ({
  onRefresh,
  commissionRate,
  setCommissionRate,
  affiliateRate,
  setAffiliateRate,
  platName,
  setPlatName,
  platLogo,
  setPlatLogo,
  bankAccounts,
  setBankAccounts,
  welcomeAr,
  setWelcomeAr,
  welcomeEn,
  setWelcomeEn,
  subtitleAr,
  setSubtitleAr,
  subtitleEn,
  setSubtitleEn,
  licenseName,
  setLicenseName,
  licenseNumber,
  setLicenseNumber,
  licenseLink,
  setLicenseLink,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState("settings");
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);

  const [inputRate, setInputRate] = useState(commissionRate * 100);
  const [inputAffiliateRate, setInputAffiliateRate] = useState(
    (affiliateRate || 0.2) * 100,
  );
  const [inputName, setInputName] = useState(platName);
  const [inputLogo, setInputLogo] = useState(platLogo);
  const [inputBankAccounts, setInputBankAccounts] = useState(
    bankAccounts || "",
  );
  const [inputWelcomeAr, setInputWelcomeAr] = useState(welcomeAr || "");
  const [inputWelcomeEn, setInputWelcomeEn] = useState(welcomeEn || "");
  const [inputSubtitleAr, setInputSubtitleAr] = useState(subtitleAr || "");
  const [inputSubtitleEn, setInputSubtitleEn] = useState(subtitleEn || "");
  const [inputLicenseName, setInputLicenseName] = useState(licenseName || "");
  const [inputLicenseNumber, setInputLicenseNumber] = useState(
    licenseNumber || "",
  );
  const [inputLicenseLink, setInputLicenseLink] = useState(licenseLink || "");

  const [inputTerms, setInputTerms] = useState("");
  const [inputPrivacy, setInputPrivacy] = useState("");
  const [inputRefund, setInputRefund] = useState("");

  const [newCatAr, setNewCatAr] = useState("");
  const [newCatEn, setNewCatEn] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({
    label_ar: "",
    label_en: "",
    icon: "",
  });

  const [messagingUserId, setMessagingUserId] = useState(null);
  const [adminMessageText, setAdminMessageText] = useState("");

  const fetchAdminData = async () => {
    try {
      const [u, cats, settsData, rawRevs, rawOffs, rawBks, rawMsgs] =
        await Promise.all([
          fetchSafe("profiles"),
          fetchSafe("categories"),
          fetchSettingsSafe(),
          fetchSafe("reviews"),
          fetchSafe("offerings"),
          fetchSafe("bookings"),
          fetchSafe("contact_messages"),
        ]);
      const setts = settsData;
      setUsers(
        u.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")),
      );
      setCategories(cats);

      if (setts) {
        setInputTerms(setts.terms_text || "");
        setInputPrivacy(setts.privacy_text || "");
        setInputRefund(setts.refund_text || "");
      }

      let allReviews = [];
      if (rawRevs.length > 0 && u.length > 0) {
        const enrichedRevs = rawRevs.map((r) => {
          const reviewerId =
            r.reviewer_id ||
            r.user_id ||
            r.customer_id ||
            r.author_id ||
            r.client_id;
          const userProfile = u.find((user) => user.id === reviewerId);
          let offering = null;
          if (r.offering_id)
            offering = rawOffs.find((o) => o.id === r.offering_id);
          else if (r.booking_id) {
            const bk = rawBks.find((b) => b.id === r.booking_id);
            if (bk) offering = rawOffs.find((o) => o.id === bk.offering_id);
          }
          return {
            ...r,
            source_table: "reviews",
            profiles: userProfile,
            offerings: offering,
          };
        });
        allReviews = [...allReviews, ...enrichedRevs];
      }

      if (rawBks.length > 0 && u.length > 0) {
        const bksWithReviews = rawBks.filter(
          (b) =>
            (b.rating && b.rating > 0) ||
            (b.stars && b.stars > 0) ||
            (b.review_text && b.review_text.trim() !== "") ||
            (b.comment && b.comment.trim() !== "") ||
            (b.feedback && b.feedback.trim() !== ""),
        );
        const enrichedBksRevs = bksWithReviews.map((b) => {
          const customerProfile = u.find((user) => user.id === b.customer_id);
          const offering = rawOffs.find((o) => o.id === b.offering_id);
          return {
            id: b.id,
            source_table: "bookings",
            is_comment_hidden: b.is_comment_hidden || false,
            rating: b.rating || b.client_rating || b.stars || 5,
            comment:
              b.review_text ||
              b.review_comment ||
              b.client_review ||
              b.review ||
              b.comment ||
              b.feedback ||
              "تم التقييم بدون تعليق نصي.",
            profiles: customerProfile,
            offerings: offering,
          };
        });
        const existingIds = allReviews.map((r) => r.booking_id).filter(Boolean);
        const uniqueBksRevs = enrichedBksRevs.filter(
          (r) => !existingIds.includes(r.id),
        );
        allReviews = [...allReviews, ...uniqueBksRevs];
      }
      setReviews(allReviews);

      if (rawMsgs.length > 0 && u.length > 0) {
        const enrichedMsgs = rawMsgs
          .map((m) => ({
            ...m,
            profiles: u.find((user) => user.id === m.user_id) || {
              full_name: "غير متوفر",
            },
          }))
          .sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
          );
        setMessages(enrichedMsgs);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.log("خطأ في جلب بيانات الإدارة", err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateSettings = async () => {
    const newRateDec = inputRate / 100;
    const newAffiliateRateDec = inputAffiliateRate / 100;
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          commission_rate: newRateDec,
          affiliate_rate: newAffiliateRateDec,
          platform_name: inputName,
          platform_logo: inputLogo,
          bank_accounts: inputBankAccounts,
          welcome_msg_ar: inputWelcomeAr,
          welcome_msg_en: inputWelcomeEn,
          hero_subtitle_ar: inputSubtitleAr,
          hero_subtitle_en: inputSubtitleEn,
          license_name: inputLicenseName,
          license_number: inputLicenseNumber,
          license_link: inputLicenseLink,
          terms_text: inputTerms,
          privacy_text: inputPrivacy,
          refund_text: inputRefund,
        })
        .eq("id", 1);
      if (!error) {
        setCommissionRate(newRateDec);
        setAffiliateRate(newAffiliateRateDec);
        setPlatName(inputName);
        setPlatLogo(inputLogo);
        setBankAccounts(inputBankAccounts);
        setWelcomeAr(inputWelcomeAr);
        setWelcomeEn(inputWelcomeEn);
        setSubtitleAr(inputSubtitleAr);
        setSubtitleEn(inputSubtitleEn);
        setLicenseName(inputLicenseName);
        setLicenseNumber(inputLicenseNumber);
        setLicenseLink(inputLicenseLink);
        alert("تم حفظ الإعدادات بنجاح ✅");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ.");
    }
  };

  const handleAddCategory = async () => {
    if (!newCatAr || !newCatEn)
      return alert("الرجاء إدخال اسم القسم بالعربي والإنجليزي.");
    const safeId =
      newCatEn
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "_") +
      "_" +
      Math.floor(Math.random() * 1000);
    try {
      const { error } = await supabase.from("categories").insert([
        {
          id: safeId,
          label_ar: newCatAr,
          label_en: newCatEn,
          icon: newCatIcon || "📌",
        },
      ]);
      if (!error) {
        fetchAdminData();
        setNewCatAr("");
        setNewCatEn("");
        setNewCatIcon("");
        alert("تمت إضافة القسم بنجاح ✅");
      }
    } catch (err) {
      alert("حدث خطأ.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا القسم؟")) {
      await supabase.from("categories").delete().eq("id", id);
      fetchAdminData();
    }
  };
  const handleSaveEditCategory = async (id) => {
    await supabase.from("categories").update(editCatForm).eq("id", id);
    setEditingCatId(null);
    fetchAdminData();
  };
  const toggleUserActive = async (id, status) => {
    try {
      await supabase
        .from("profiles")
        .update({ is_active: !status })
        .eq("id", id);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };
  const changeUserRole = async (userId, newRole) => {
    try {
      await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const sendAdminMessage = async (userId) => {
    try {
      await supabase
        .from("profiles")
        .update({ admin_note: adminMessageText })
        .eq("id", userId);
      await supabase.from("notifications").insert([
        {
          user_id: userId,
          title: "رسالة إدارية جديدة 📩",
          message: adminMessageText,
        },
      ]);
      alert("تم الإرسال بنجاح ✅");
      setMessagingUserId(null);
      setAdminMessageText("");
      fetchAdminData();
    } catch (err) {
      alert("حدث خطأ.");
    }
  };

  const handleHideComment = async (id, source_table) => {
    if (window.confirm("إخفاء التعليق لكونه مسيئاً؟")) {
      const hiddenText = "🚫 تم إخفاء التعليق لمخالفته سياسة المنصة.";
      try {
        if (source_table === "bookings") {
          const { data: bData } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", id)
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
            if ("comment" in bData && bData.comment)
              payload.comment = hiddenText;
            if ("feedback" in bData && bData.feedback)
              payload.feedback = hiddenText;
            await supabase.from("bookings").update(payload).eq("id", id);
          }
        } else {
          const { data: rData } = await supabase
            .from("reviews")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (rData) {
            const payload = { is_comment_hidden: true };
            if ("comment" in rData) payload.comment = hiddenText;
            if ("review_text" in rData) payload.review_text = hiddenText;
            await supabase.from("reviews").update(payload).eq("id", id);
          }
        }
        alert("تم إخفاء التعليق بنجاح ✅");
        fetchAdminData();
      } catch (err) {
        alert("تأكد من وجود عمود is_comment_hidden في Supabase أولاً.");
      }
    }
  };

  const handleMarkMessageRead = async (id) => {
    try {
      await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
      fetchAdminData();
    } catch (err) {}
  };

  const tabBtnStyle = (isActive) => ({
    padding: "12px 24px",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.9rem",
    backgroundColor: isActive ? "#fff" : "transparent",
    color: isActive ? "#ef4444" : "#64748b",
    boxShadow: isActive ? "0 4px 10px rgba(0,0,0,0.05)" : "none",
    transition: "0.2s",
  });

  return (
    <div
      style={{
        ...cardS,
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        direction: "rtl",
        borderTop: "4px solid #ef4444",
      }}
    >
      <h2
        style={{
          color: "#1e293b",
          margin: 0,
          fontSize: "1.5rem",
          fontWeight: "900",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span>👑</span> لوحة تحكم الإدارة العليا
      </h2>

      {/* ✨ أزرار جميع أقسام الإدارة ✨ */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          backgroundColor: "#f8fafc",
          padding: "10px",
          borderRadius: "20px",
          overflowX: "auto",
          border: "1px solid #e2e8f0",
        }}
      >
        <button
          onClick={() => setActiveAdminTab("settings")}
          style={tabBtnStyle(activeAdminTab === "settings")}
        >
          🛠️ إعدادات المنصة
        </button>
        <button
          onClick={() => setActiveAdminTab("policies")}
          style={tabBtnStyle(activeAdminTab === "policies")}
        >
          📜 سياسات المنصة
        </button>
        <button
          onClick={() => setActiveAdminTab("categories")}
          style={tabBtnStyle(activeAdminTab === "categories")}
        >
          📁 الأقسام
        </button>
        <button
          onClick={() => setActiveAdminTab("users")}
          style={tabBtnStyle(activeAdminTab === "users")}
        >
          👥 المستخدمين
        </button>
        <button
          onClick={() => setActiveAdminTab("reviews")}
          style={tabBtnStyle(activeAdminTab === "reviews")}
        >
          ⭐ التقييمات
        </button>
        <button
          onClick={() => setActiveAdminTab("messages")}
          style={tabBtnStyle(activeAdminTab === "messages")}
        >
          ✉️ رسائل الزوار{" "}
          {messages.filter((m) => !m.is_read).length > 0 && (
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                marginLeft: "5px",
              }}
            >
              {messages.filter((m) => !m.is_read).length}
            </span>
          )}
        </button>
      </div>

      {activeAdminTab === "settings" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {/* بطاقة الهوية */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#3b82f6", fontSize: "1.1rem" }}>
                🎨 الهوية البصرية
              </h3>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  اسم المنصة:
                </strong>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  رابط اللوجو (أو ارفع صورة):
                </strong>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={inputLogo}
                    onChange={(e) => setInputLogo(e.target.value)}
                    placeholder="https://..."
                    style={{ ...smInput, flex: 1, minWidth: "100px" }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setInputLogo(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{
                      padding: "8px",
                      fontSize: "0.75rem",
                      border: "1px dashed #94a3b8",
                      borderRadius: "10px",
                      cursor: "pointer",
                      backgroundColor: "#f8fafc",
                      width: "110px",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* بطاقة العمولات */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#10b981", fontSize: "1.1rem" }}>
                💰 العمولات والأرباح
              </h3>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.85rem",
                    }}
                  >
                    عمولة المنصة (%):
                  </strong>
                  <input
                    type="number"
                    value={inputRate}
                    onChange={(e) => setInputRate(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      fontWeight: "bold",
                      color: "#1e293b",
                      backgroundColor: "#f8fafc",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.85rem",
                    }}
                  >
                    ربح المسوق (%):
                  </strong>
                  <input
                    type="number"
                    value={inputAffiliateRate}
                    onChange={(e) => setInputAffiliateRate(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      fontWeight: "bold",
                      color: "#10b981",
                      backgroundColor: "#ecfdf5",
                      borderColor: "#a7f3d0",
                    }}
                  />
                </div>
              </div>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  الحسابات البنكية للمنصة (تظهر للعملاء والمزودين عند الدفع):
                </strong>
                <textarea
                  value={inputBankAccounts}
                  onChange={(e) => setInputBankAccounts(e.target.value)}
                  placeholder="مثال: البنك الراجحي..."
                  style={{
                    ...smInput,
                    width: "100%",
                    boxSizing: "border-box",
                    height: "70px",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {/* بطاقة النصوص */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#7c3aed", fontSize: "1.1rem" }}>
                📝 نصوص واجهة المتجر
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    ترحيب (عربي):
                  </strong>
                  <input
                    type="text"
                    value={inputWelcomeAr}
                    onChange={(e) => setInputWelcomeAr(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    ترحيب (إنجليزي):
                  </strong>
                  <input
                    type="text"
                    value={inputWelcomeEn}
                    onChange={(e) => setInputWelcomeEn(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    وصف (عربي):
                  </strong>
                  <input
                    type="text"
                    value={inputSubtitleAr}
                    onChange={(e) => setInputSubtitleAr(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    وصف (إنجليزي):
                  </strong>
                  <input
                    type="text"
                    value={inputSubtitleEn}
                    onChange={(e) => setInputSubtitleEn(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* بطاقة التراخيص */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#f59e0b", fontSize: "1.1rem" }}>
                🛡️ التوثيق والتراخيص (تظهر أسفل الموقع)
              </h3>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  جهة التوثيق (مثال: منصة الأعمال):
                </strong>
                <input
                  type="text"
                  value={inputLicenseName}
                  onChange={(e) => setInputLicenseName(e.target.value)}
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    رقم الترخيص/معروف:
                  </strong>
                  <input
                    type="text"
                    value={inputLicenseNumber}
                    onChange={(e) => setInputLicenseNumber(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    رابط التحقق (URL):
                  </strong>
                  <input
                    type="text"
                    placeholder="https://"
                    value={inputLicenseLink}
                    onChange={(e) => setInputLicenseLink(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleUpdateSettings}
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
              color: "white",
              border: "none",
              padding: "15px 30px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "900",
              fontSize: "1.1rem",
              marginTop: "10px",
              alignSelf: "flex-end",
              boxShadow: "0 6px 15px rgba(239, 68, 68, 0.3)",
            }}
          >
            حفظ الإعدادات بالكامل 💾
          </button>
        </div>
      )}

      {activeAdminTab === "policies" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong
              style={{
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "block",
                marginBottom: "10px",
              }}
            >
              📜 الشروط والأحكام للإستخدام:
            </strong>
            <textarea
              value={inputTerms}
              onChange={(e) => setInputTerms(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                boxSizing: "border-box",
                height: "150px",
                resize: "vertical",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong
              style={{
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "block",
                marginBottom: "10px",
              }}
            >
              🔒 سياسة الخصوصية:
            </strong>
            <textarea
              value={inputPrivacy}
              onChange={(e) => setInputPrivacy(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                boxSizing: "border-box",
                height: "150px",
                resize: "vertical",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong
              style={{
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "block",
                marginBottom: "10px",
              }}
            >
              💸 سياسة الاسترجاع والإلغاء:
            </strong>
            <textarea
              value={inputRefund}
              onChange={(e) => setInputRefund(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                boxSizing: "border-box",
                height: "150px",
                resize: "vertical",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
          <button
            onClick={handleUpdateSettings}
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
              color: "white",
              border: "none",
              padding: "15px 30px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "900",
              fontSize: "1.1rem",
              alignSelf: "flex-end",
              boxShadow: "0 6px 15px rgba(245, 158, 11, 0.3)",
            }}
          >
            حفظ وتحديث السياسات 📝
          </button>
        </div>
      )}

      {activeAdminTab === "categories" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              marginBottom: "25px",
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <strong
                style={{
                  color: "#475569",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                الاسم بالعربي:
              </strong>
              <input
                value={newCatAr}
                onChange={(e) => setNewCatAr(e.target.value)}
                style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <strong
                style={{
                  color: "#475569",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                الاسم بالإنجليزي:
              </strong>
              <input
                value={newCatEn}
                onChange={(e) => setNewCatEn(e.target.value)}
                style={{
                  ...smInput,
                  width: "100%",
                  boxSizing: "border-box",
                  direction: "ltr",
                }}
              />
            </div>
            <div style={{ width: "100px" }}>
              <strong
                style={{
                  color: "#475569",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                أيقونة 🪧:
              </strong>
              <input
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                style={{
                  ...smInput,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              />
            </div>
            <button
              onClick={handleAddCategory}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                padding: "12px 25px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
                boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
              }}
            >
              ➕ إضافة قسم
            </button>
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "center",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={thS}>القسم</th>
                  <th style={thS}>الأيقونة</th>
                  <th style={thS}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={tdS}>
                      {editingCatId === c.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            justifyContent: "center",
                          }}
                        >
                          <input
                            style={smInput}
                            value={editCatForm.label_ar}
                            onChange={(e) =>
                              setEditCatForm({
                                ...editCatForm,
                                label_ar: e.target.value,
                              })
                            }
                            placeholder="عربي"
                          />
                          <input
                            style={{ ...smInput, direction: "ltr" }}
                            value={editCatForm.label_en}
                            onChange={(e) =>
                              setEditCatForm({
                                ...editCatForm,
                                label_en: e.target.value,
                              })
                            }
                            placeholder="إنجليزي"
                          />
                        </div>
                      ) : (
                        <span style={{ fontWeight: "bold", color: "#1e293b" }}>
                          {c.label_ar}{" "}
                          <span
                            style={{
                              color: "#94a3b8",
                              fontSize: "0.8rem",
                              margin: "0 5px",
                            }}
                          >
                            |
                          </span>{" "}
                          {c.label_en}
                        </span>
                      )}
                    </td>
                    <td style={tdS}>
                      {editingCatId === c.id ? (
                        <input
                          style={{
                            ...smInput,
                            width: "60px",
                            textAlign: "center",
                          }}
                          value={editCatForm.icon}
                          onChange={(e) =>
                            setEditCatForm({
                              ...editCatForm,
                              icon: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <span style={{ fontSize: "1.5rem" }}>{c.icon}</span>
                      )}
                    </td>
                    <td style={tdS}>
                      {editingCatId === c.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => handleSaveEditCategory(c.id)}
                            style={{
                              ...admBtn("#10b981"),
                              padding: "8px 20px",
                            }}
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            style={{
                              ...admBtn("#64748b"),
                              padding: "8px 20px",
                            }}
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => {
                              setEditingCatId(c.id);
                              setEditCatForm({
                                label_ar: c.label_ar,
                                label_en: c.label_en,
                                icon: c.icon,
                              });
                            }}
                            style={admBtn("#3b82f6")}
                          >
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            style={{
                              ...admBtn("transparent"),
                              color: "#ef4444",
                              border: "1px solid #fca5a5",
                            }}
                          >
                            🗑️ حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      style={{ padding: "30px", color: "#94a3b8" }}
                    >
                      لا توجد أقسام حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAdminTab === "users" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "20px",
            borderRadius: "15px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center" }}>
                  <th style={thS}>المستخدم</th>
                  <th style={thS}>الصلاحية</th>
                  <th style={thS}>مراسلة</th>
                  <th style={thS}>الحالة</th>
                  <th style={thS}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      opacity: u.is_active ? 1 : 0.6,
                      textAlign: "center",
                      transition: "0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={tdS}>
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#1e293b",
                          fontSize: "1.05rem",
                        }}
                      >
                        {u.full_name || "بدون اسم"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {u.phone || "لا يوجد رقم"}
                      </div>
                    </td>
                    <td style={tdS}>
                      <select
                        value={u.role || "user"}
                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          backgroundColor:
                            u.role === "admin"
                              ? "#fef2f2"
                              : u.role === "supervisor"
                                ? "#eff6ff"
                                : "#f8fafc",
                          color:
                            u.role === "admin"
                              ? "#dc2626"
                              : u.role === "supervisor"
                                ? "#2563eb"
                                : "#475569",
                          fontWeight: "bold",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="user">👤 عادي</option>
                        <option value="supervisor">🛡️ مشرف</option>
                        <option value="admin">👑 مدير</option>
                      </select>
                    </td>
                    <td style={tdS}>
                      {messagingUserId === u.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <input
                            style={{ ...smInput, padding: "8px" }}
                            value={adminMessageText}
                            onChange={(e) =>
                              setAdminMessageText(e.target.value)
                            }
                            placeholder="رسالة تنبيه.."
                          />
                          <button
                            onClick={() => sendAdminMessage(u.id)}
                            style={admBtn("#3b82f6")}
                          >
                            إرسال
                          </button>
                          <button
                            onClick={() => setMessagingUserId(null)}
                            style={{
                              ...admBtn("transparent"),
                              color: "#94a3b8",
                              padding: "5px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setMessagingUserId(u.id)}
                          style={{
                            ...admBtn("#fff"),
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          }}
                        >
                          مراسلة 💬
                        </button>
                      )}
                    </td>
                    <td style={tdS}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          backgroundColor: u.is_active ? "#ecfdf5" : "#fef2f2",
                          color: u.is_active ? "#059669" : "#dc2626",
                        }}
                      >
                        {u.is_active ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdS,
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => toggleUserActive(u.id, u.is_active)}
                        style={{
                          background: u.is_active ? "#fef3c7" : "#d1fae5",
                          color: u.is_active ? "#b45309" : "#047857",
                          border: "none",
                          borderRadius: "10px",
                          padding: "8px 15px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                        }}
                      >
                        {u.is_active ? "إيقاف" : "تفعيل"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAdminTab === "reviews" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "15px 20px",
              borderRadius: "16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>💡</span>
            <p
              style={{
                margin: 0,
                color: "#1e3a8a",
                fontSize: "0.95rem",
                fontWeight: "bold",
              }}
            >
              يمكن إخفاء أي تعليق مسيء مع الاحتفاظ بعدد النجوم لعدم ظلم المزود.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "right",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={thS}>العميل</th>
                  <th style={thS}>الخدمة والمزود</th>
                  <th style={thS}>التقييم</th>
                  <th style={thS}>التعليق</th>
                  <th style={{ ...thS, textAlign: "center" }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      لا توجد تقييمات.
                    </td>
                  </tr>
                ) : (
                  reviews.map((r, idx) => {
                    const isHidden =
                      r.is_comment_hidden ||
                      (r.comment && r.comment.includes("🚫"));
                    return (
                      <tr
                        key={r.id || idx}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#f8fafc")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td
                          style={{
                            ...tdS,
                            fontWeight: "bold",
                            color: "#1e293b",
                          }}
                        >
                          {r.profiles?.full_name || "غير محدد"}
                        </td>
                        <td style={tdS}>
                          <div
                            style={{
                              color: "#3b82f6",
                              fontWeight: "bold",
                              marginBottom: "4px",
                            }}
                          >
                            {r.offerings?.title || "خدمة محذوفة"}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            المزود:{" "}
                            {r.offerings?.profiles?.full_name || "غير محدد"}
                          </div>
                        </td>
                        <td
                          style={{
                            ...tdS,
                            fontSize: "1.2rem",
                            letterSpacing: "2px",
                            color: "#f59e0b",
                          }}
                        >
                          {"⭐".repeat(r.rating || 5)}
                        </td>
                        <td style={tdS}>
                          {isHidden ? (
                            <span
                              style={{
                                color: "#ef4444",
                                fontWeight: "bold",
                                fontStyle: "italic",
                                backgroundColor: "#fef2f2",
                                padding: "6px 12px",
                                borderRadius: "10px",
                              }}
                            >
                              🚫 (مخفي)
                            </span>
                          ) : (
                            <span
                              style={{ color: "#475569", lineHeight: "1.6" }}
                            >
                              {r.comment || "-"}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdS, textAlign: "center" }}>
                          {!isHidden && (
                            <button
                              onClick={() =>
                                handleHideComment(r.id, r.source_table)
                              }
                              style={{
                                ...admBtn("transparent"),
                                color: "#ef4444",
                                border: "1px solid #fca5a5",
                                padding: "8px 15px",
                              }}
                            >
                              إخفاء 🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAdminTab === "messages" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "right",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={{ ...thS, width: "100px", textAlign: "center" }}>
                    الحالة
                  </th>
                  <th style={thS}>المرسل</th>
                  <th style={thS}>النوع</th>
                  <th style={thS}>الموضوع والرسالة</th>
                  <th style={{ ...thS, textAlign: "center", width: "150px" }}>
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      صندوق الوارد فارغ.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: m.is_read ? "transparent" : "#eff6ff",
                        transition: "0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = m.is_read
                          ? "#f8fafc"
                          : "#e0e7ff")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = m.is_read
                          ? "transparent"
                          : "#eff6ff")
                      }
                    >
                      <td style={{ ...tdS, textAlign: "center" }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "10px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            backgroundColor: m.is_read ? "#f1f5f9" : "#3b82f6",
                            color: m.is_read ? "#64748b" : "#fff",
                          }}
                        >
                          {m.is_read ? "مقروءة" : "جديدة 🆕"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <strong
                          style={{
                            color: "#1e293b",
                            fontSize: "1.05rem",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          {m.profiles?.full_name || "مجهول / زائر"}
                        </strong>
                        <span
                          style={{
                            direction: "ltr",
                            display: "inline-block",
                            fontSize: "0.85rem",
                            color: "#64748b",
                            fontWeight: "bold",
                          }}
                        >
                          {m.profiles?.phone || "لا يوجد رقم"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <span
                          style={{
                            backgroundColor:
                              m.type === "complaint"
                                ? "#fef2f2"
                                : m.type === "suggestion"
                                  ? "#fef3c7"
                                  : "#f1f5f9",
                            color:
                              m.type === "complaint"
                                ? "#dc2626"
                                : m.type === "suggestion"
                                  ? "#d97706"
                                  : "#475569",
                            padding: "6px 12px",
                            borderRadius: "10px",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            border: `1px solid ${m.type === "complaint" ? "#fecaca" : m.type === "suggestion" ? "#fde68a" : "#cbd5e1"}`,
                          }}
                        >
                          {m.type === "complaint"
                            ? "🚨 شكوى"
                            : m.type === "suggestion"
                              ? "💡 اقتراح"
                              : "❓ استفسار"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <strong
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            color: "#0f172a",
                            fontSize: "1.1rem",
                          }}
                        >
                          {m.subject}
                        </strong>
                        <p
                          style={{
                            margin: 0,
                            color: "#475569",
                            lineHeight: "1.6",
                          }}
                        >
                          {m.message}
                        </p>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            display: "block",
                            marginTop: "10px",
                          }}
                        >
                          {new Date(m.created_at).toLocaleString("ar-SA")}
                        </span>
                      </td>
                      <td style={{ ...tdS, textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          {!m.is_read && (
                            <button
                              onClick={() => handleMarkMessageRead(m.id)}
                              style={{ ...admBtn("#10b981"), width: "100%" }}
                            >
                              مقروء ✅
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm("حذف؟")) {
                                await supabase
                                  .from("contact_messages")
                                  .delete()
                                  .eq("id", m.id);
                                fetchAdminData();
                              }
                            }}
                            style={{
                              ...admBtn("transparent"),
                              color: "#ef4444",
                              border: "1px solid #fca5a5",
                              width: "100%",
                            }}
                          >
                            حذف 🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
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

      // 1. أولاً: نقوم بدمج الحجوزات مع تفاصيل الخدمات والأسعار
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

      // 2. ثانياً: ✨ حساب أرباح التسويق للمستخدم الحالي ✨
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
          // ✨ التعديل المالي: لا تحسب العمولة للمسوق إلا إذا سدد المزود عمولة المنصة ✨
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

      // 3. أخيراً: توزيع البيانات على الجداول
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
      setSession(session);
      fetchAllData(session?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, [fetchAllData]);

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

        <div style={{ overflowX: "auto", paddingBottom: "10px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 15px",
              fontSize: "0.8rem",
            }}
          >
            <tbody style={{ textAlign: "center" }}>
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
                  b.is_comment_hidden ||
                  (hasComment && hasComment.includes("🚫"));

                return (
                  <Fragment key={b.id}>
                    <BookingRow
                      booking={b}
                      onRefresh={() => fetchAllData(session.user.id)}
                      isProviderView={isProvider}
                    />

                    {/* ✨ تعليق العميل ✨ */}
                    {isProvider &&
                      b.status === "completed" &&
                      hasComment &&
                      !isHidden && (
                        <tr>
                          <td
                            colSpan="5"
                            style={{ padding: 0, border: "none" }}
                          >
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
                          </td>
                        </tr>
                      )}

                    {/* ✨ التعليق المخفي ✨ */}
                    {isProvider && b.status === "completed" && isHidden && (
                      <tr>
                        <td colSpan="5" style={{ padding: 0, border: "none" }}>
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
                        </td>
                      </tr>
                    )}

                    {/* ✨ عمولة المنصة تظهر تحت الحجز للمزود ✨ */}
                    {isProvider && b.status === "completed" && (
                      <tr>
                        <td colSpan="5" style={{ padding: 0, border: "none" }}>
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
                              color: b.is_commission_paid
                                ? "#047857"
                                : "#b91c1c",
                              fontWeight: "bold",
                              fontSize: "0.85rem",
                              marginTop:
                                hasComment || isHidden ? "0px" : "-15px",
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
  const defaultAvatar = `https://ui-avatars.com/api/?name=${userProfile?.full_name || "User"}&background=7c3aed&color=fff`;

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
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div
      style={{
        padding: "15px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "system-ui",
        direction: i18n.language === "ar" ? "rtl" : "ltr",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="الاسم على البطاقة"
                    style={smInput}
                  />
                  <input
                    type="text"
                    placeholder="رقم البطاقة (0000 0000 0000 0000)"
                    style={smInput}
                    maxLength="16"
                  />
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="تاريخ الانتهاء (MM/YY)"
                      style={{ ...smInput, flex: 1 }}
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      style={{ ...smInput, flex: 1 }}
                      maxLength="3"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      alert("جاري معالجة الدفع (هذه واجهة تجريبية)...");
                      try {
                        const unpaidBookings = providerBookings.filter(
                          (b) =>
                            b.status === "completed" && !b.is_commission_paid,
                        );
                        for (const booking of unpaidBookings) {
                          await supabase
                            .from("bookings")
                            .update({ is_commission_paid: true })
                            .eq("id", booking.id);
                        }
                        fetchAllData(session.user.id);
                        setShowPaymentModal(false);
                        alert("✅ تم سداد العمولة بنجاح! شكراً لك.");
                      } catch (err) {
                        alert(
                          "حدث خطأ أثناء تحديث حالة الدفع في قاعدة البيانات.",
                        );
                      }
                    }}
                    style={{
                      ...addSkillBtn,
                      backgroundColor: "#10b981",
                      backgroundImage: "none",
                      width: "100%",
                      marginTop: "10px",
                    }}
                  >
                    سداد الآن (تجريبي) 💳
                  </button>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      textAlign: "center",
                      margin: "10px 0 0 0",
                    }}
                  >
                    *هذه واجهة تجريبية لمحاكاة عملية الدفع. لا تدخل بيانات بطاقة
                    بنكية حقيقية هنا.
                  </p>
                </div>
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
          top: "15px",
          zIndex: 2000,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          padding: "15px 25px",
          borderRadius: "24px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          marginBottom: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
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
              gap: "15px",
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
            {/* ✨ نظام الشعار الذكي: يقرأ من الإدارة، وإلا يعرض الشعار الافتراضي ✨ */}
            {platformLogo?.includes("http") ||
            platformLogo?.startsWith("data:image") ? (
              <img
                src={platformLogo}
                style={{
                  height: "50px",
                  width: "50px",
                  borderRadius: "14px",
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
                width="50"
                height="50"
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
                fontSize: "1.7rem",
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {session ? (
              <>
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
                    position: "relative",
                    cursor: "pointer",
                    backgroundColor: "#f8fafc",
                    padding: "12px",
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
                  <span style={{ fontSize: "1.4rem" }}>🔔</span>
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
                              letterSpacing: "0.5px",
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
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج المأمون"
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#ef4444",
                    border: "1px solid #fca5a5",
                    width: "46px",
                    height: "46px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "1.4rem",
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
                  padding: "12px 30px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontWeight: "900",
                  fontSize: "1.05rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 6px 15px rgba(16, 185, 129, 0.25)",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                تسجيل الدخول / إنشاء حساب 🚀
              </button>
            )}
          </div>
        </div>

        {/* ✨ تم تقصير أسماء التبويبات وتم السماح لها بالنزول لسطر جديد ✨ */}
        <div
          className="hide-scrollbar"
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "5px",
            WebkitOverflowScrolling: "touch",
            justifyContent: "center",
            flexWrap: "wrap",
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
                fontSize: "0.85rem",
                backgroundColor: activeTab === tab.id ? tab.color : "#fff",
                color: activeTab === tab.id ? "white" : "#475569",
                boxShadow:
                  activeTab === tab.id
                    ? `0 4px 10px ${tab.color}40`
                    : "0 2px 4px rgba(0,0,0,0.02)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "0.2s",
              }}
            >
              <span
                style={{
                  fontSize: "1.05rem",
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
                        <InvoicesView
                          bookings={allUserBookings}
                          userId={session.user.id}
                          commissionRate={commissionRate}
                          platName={platformName}
                          platLogo={platformLogo}
                        />
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
                      <AdminReports
                        commissionRate={commissionRate}
                        affiliateRate={affiliateRate}
                        platName={platformName}
                      />
                    )}
                    {activeTab === "admin" && canManagePlatform && (
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
                                      : `🕒 دوام: ${off.work_start_time?.substring(0, 5)} - ${off.work_end_time?.substring(0, 5)}`}
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
                            {/* التنبيه داخل البطاقة بشكل صحيح */}
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
          © {new Date().getFullYear()} {platformName}. جميع الحقوق محفوظة لرواد
          الإبداع.
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
    </div>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <MainAppContent />
    </BrowserRouter>
  );
}
