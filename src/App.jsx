import React, { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import BookingRow from "./components/BookingRow";
import ClientMarketplace from "./components/ClientMarketplace";
import ProfileSettings from "./components/ProfileSettings";
import AddOffering from "./components/AddOffering";
import CalendarView from "./components/CalendarView";
import { useTranslation } from "react-i18next";

// --- التنسيقات العامة ---
const padS = { padding: "15px" };
const thS = {
  padding: "12px",
  color: "#475569",
  backgroundColor: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
};
const tdS = { padding: "12px", borderBottom: "1px solid #f1f5f9" };
const admBtn = (c) => ({
  backgroundColor: c,
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "10px",
  marginLeft: "5px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.75rem",
});
const reportCard = (color, isActive) => ({
  backgroundColor: "#fff",
  padding: "15px",
  borderRadius: "15px",
  borderLeft: `5px solid ${color}`,
  textAlign: "center",
  boxShadow: isActive ? `0 0 12px ${color}80` : "0 2px 8px rgba(0,0,0,0.05)",
  cursor: "pointer",
  transform: isActive ? "scale(1.03)" : "scale(1)",
  transition: "all 0.2s ease",
});
const addSkillBtn = {
  backgroundColor: "#7c3aed",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};
const cardS = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "20px",
  border: "1px solid #f1f5f9",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.75)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 3000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "600px",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
};
const printBtnS = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: "bold",
  color: "#334155",
};
const smInput = {
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  flex: "1 1 100px",
  outline: "none",
  fontFamily: "inherit",
};

// ✨ دالة الجلب الآمنة ✨
const fetchSafe = async (tableName) => {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    if (error) {
      console.warn(`⚠️ تم تجاهل خطأ في جدول (${tableName}):`, error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn(`⚠️ فشل جلب جدول (${tableName}):`, err.message);
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
    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

const defaultLegalDocs = {
  terms: {
    title: "الشروط والأحكام والإقرار القانوني",
    content: `مرحباً بك في منصتنا. باستخدامك لهذه المنصة، فإنك تقر وتوافق على الآتي:\n\n1. طبيعة عمل المنصة: المنصة عبارة عن "وسيط تقني إعلاني" فقط.\n2. المسؤولية القانونية: تقع المسؤولية الكاملة على "مقدم الخدمة".\n3. إخلاء مسؤولية: تُخلي المنصة مسؤوليتها بشكل كامل عن جودة الخدمة.`,
  },
  privacy: {
    title: "سياسة الخصوصية وحماية البيانات",
    content: `نحن نأخذ خصوصيتك على محمل الجد.\n\n1. جمع البيانات: نجمع المعلومات الأساسية لتسهيل التواصل.\n2. أمن البيانات: تتعهد المنصة بتخزين البيانات بشكل آمن.`,
  },
  refund: {
    title: "سياسة الاسترجاع والإلغاء",
    content: `لضمان حقوق جميع الأطراف:\n\n1. المنصة لا تتدخل في النزاعات المالية المباشرة.\n2. يُنصح العملاء بعدم دفع مبالغ مقدمة خارج المنصة.`,
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

  let financialDetails = `<div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 15px;"><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكلفة الأساسية (${qty} ${label}):</span><span>${baseTotal} ${currency}</span></div><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكاليف الإضافية:</span><span>+ ${additional} ${currency}</span></div><div class="total" style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;"><span>الإجمالي المطلوب:</span><span style="color:#7c3aed;">${totalClientPrice} ${currency}</span></div></div>`;

  if (!isClient) {
    financialDetails = `<div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 15px;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكلفة الأساسية (${qty} ${label}):</span><span>${baseTotal} ${currency}</span></div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكاليف الإضافية لك:</span><span>+ ${additional} ${currency}</span></div>
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // ألوان مخصصة لكل حالة لتبدو أنيقة في الفواتير
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
      {/* ✨ عنوان الصفحة الجديد ✨ */}
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
          const currency = b.offerings?.currency || "SAR"; // افتراضي ريال سعودي
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
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* ✨ ستايل الـ Hover مدمج هنا ✨ */}
              <style>{`
                .smart-invoice-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
              `}</style>

              {/* 1. ترويسة الإيصال (Header) */}
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

              {/* 2. تفاصيل الخدمة والمبالغ (Body) */}
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

                {/* الصندوق المحاسبي الداخلي */}
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

              {/* 3. الإجمالي وزر الطباعة (Footer) */}
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
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isClient
                      ? "#2563eb"
                      : "#10b981";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff";
                    e.currentTarget.style.color = isClient
                      ? "#2563eb"
                      : "#10b981";
                    e.currentTarget.style.transform = "scale(1)";
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
const AdminReports = ({ commissionRate, platName, platLogo }) => {
  const { i18n } = useTranslation();
  const [data, setData] = useState({ users: [], bookings: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const [reportTab, setReportTab] = useState("bookings");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

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

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ⏳ جاري تحميل البيانات...
      </div>
    );

  const filteredBookings = data.bookings
    .filter((b) => {
      const matchStatus =
        activeStatusFilter === "all" || b.status === activeStatusFilter;
      const matchCategory =
        activeCategoryFilter === "all" ||
        b.offerings?.category === activeCategoryFilter;
      const matchSearch =
        userSearch === "" ||
        (b.profiles?.full_name || "")
          .toLowerCase()
          .includes(userSearch.toLowerCase()) ||
        (b.offerings?.profiles?.full_name || "")
          .toLowerCase()
          .includes(userSearch.toLowerCase()) ||
        (b.profiles?.phone || "").includes(userSearch);
      let matchPayment = true;
      if (b.status !== "cancelled") {
        if (paymentFilter === "paid")
          matchPayment = b.is_commission_paid === true;
        if (paymentFilter === "unpaid")
          matchPayment = b.is_commission_paid !== true;
      } else {
        if (paymentFilter === "paid") matchPayment = false;
      }
      return matchStatus && matchCategory && matchSearch && matchPayment;
    })
    .sort(
      (a, b) =>
        new Date(b.appointment_date || 0) - new Date(a.appointment_date || 0),
    );

  const filteredUsers = data.users.filter((u) => {
    const matchSearch =
      userSearch === "" ||
      (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone || "").includes(userSearch) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    const matchCategory =
      activeCategoryFilter === "all" ||
      (u.offerings &&
        u.offerings.some((o) => o.category === activeCategoryFilter));
    return matchSearch && matchCategory;
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        direction: "rtl",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <h2 style={{ color: "#7c3aed", fontSize: "1.3rem", margin: 0 }}>
          📊 التقارير الذكية الشاملة
        </h2>
        <button
          onClick={fetchStats}
          style={{
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            padding: "8px 15px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🔄 تحديث البيانات
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={reportCard("#3b82f6", false)}>
          <h4 style={{ margin: "5px 0" }}>إجمالي الحجوزات</h4>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.2rem" }}>
            {data.bookings.length}
          </p>
        </div>
        <div style={{ ...reportCard("#10b981", false), background: "#ecfdf5" }}>
          <h4 style={{ margin: "5px 0", fontSize: "0.8rem", color: "#059669" }}>
            إجمالي عمولة محصلة
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "bold",
              color: "#059669",
              direction: "ltr",
              fontSize: "0.9rem",
            }}
          >
            {collectedProfitText}
          </p>
        </div>
        <div style={{ ...reportCard("#ef4444", false), background: "#fef2f2" }}>
          <h4 style={{ margin: "5px 0", fontSize: "0.8rem", color: "#dc2626" }}>
            إجمالي عمولة معلقة
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "bold",
              color: "#dc2626",
              direction: "ltr",
              fontSize: "0.9rem",
            }}
          >
            {pendingProfitText}
          </p>
        </div>
        <div style={{ ...reportCard("#7c3aed", false), background: "#f8fafc" }}>
          <h4 style={{ margin: "5px 0", fontSize: "0.8rem", color: "#7c3aed" }}>
            الإيراد المتوقع الشامل
          </h4>
          <p
            style={{
              margin: 0,
              fontWeight: "bold",
              color: "#7c3aed",
              direction: "ltr",
              fontSize: "0.9rem",
            }}
          >
            {totalProfitText}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "10px",
        }}
      >
        <button
          onClick={() => setReportTab("bookings")}
          style={{
            background: reportTab === "bookings" ? "#7c3aed" : "transparent",
            color: reportTab === "bookings" ? "#fff" : "#475569",
            border: "none",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          📑 تقارير الحجوزات
        </button>
        <button
          onClick={() => setReportTab("users")}
          style={{
            background: reportTab === "users" ? "#7c3aed" : "transparent",
            color: reportTab === "users" ? "#fff" : "#475569",
            border: "none",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          👥 تقارير المستخدمين
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "15px",
          borderRadius: "15px",
          border: "1px solid #cbd5e1",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {reportTab === "bookings" && (
          <>
            <select
              value={activeStatusFilter}
              onChange={(e) => setActiveStatusFilter(e.target.value)}
              style={{
                flex: "1 1 120px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="all">🚦 جميع الحالات</option>
              <option value="completed">✅ منفذ (مكتمل)</option>
              <option value="pending">⏳ قيد المعالجة</option>
              <option value="confirmed">👍 مؤكد</option>
              <option value="cancelled">❌ ملغى</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{
                flex: "1 1 120px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="all">💳 كل العمولات</option>
              <option value="paid">✅ مسددة</option>
              <option value="unpaid">❌ غير مسددة</option>
            </select>
            <button
              onClick={printBookingsReport}
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                padding: "10px 15px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                marginLeft: "auto",
              }}
            >
              🖨️ طباعة التقرير
            </button>
          </>
        )}

        {reportTab === "users" && (
          <button
            onClick={printUsersReport}
            style={{
              background: "#059669",
              color: "#fff",
              border: "none",
              padding: "10px 15px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              marginLeft: "auto",
            }}
          >
            🖨️ طباعة المستخدمين
          </button>
        )}
      </div>

      {reportTab === "bookings" && (
        <div
          style={{
            backgroundColor: "#eff6ff",
            padding: "15px",
            borderRadius: "10px",
            border: "1px dashed #3b82f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong style={{ color: "#1e293b", fontSize: "1.1rem" }}>
            مجموع عمولات التقرير المعروض حالياً:
          </strong>
          <strong
            style={{ color: "#2563eb", fontSize: "1.1rem", direction: "ltr" }}
          >
            {currentReportTotalText}
          </strong>
        </div>
      )}

      {reportTab === "bookings" ? (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
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
                  <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...tdS, textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", color: "#1e293b" }}>
                        💼{" "}
                        {b.offerings?.profiles?.full_name || "مزود غير معروف"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.8rem",
                          marginTop: "4px",
                        }}
                      >
                        📌 خدمة: {b.offerings?.title || "غير محددة"}
                      </div>
                    </td>
                    <td style={{ ...tdS, textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", color: "#3b82f6" }}>
                        🙋‍♂️ {b.profiles?.full_name || "عميل غير معروف"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.75rem",
                          marginTop: "2px",
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
                        fontWeight: "bold",
                        direction: "ltr",
                      }}
                    >
                      {platformCommission.toFixed(2)} {currency}
                    </td>
                    <td style={tdS}>
                      <span
                        style={{
                          fontWeight: "bold",
                          color:
                            b.status === "completed"
                              ? "#10b981"
                              : b.status === "cancelled"
                                ? "#ef4444"
                                : "#f59e0b",
                        }}
                      >
                        {b.status === "completed"
                          ? "منفذ"
                          : b.status === "cancelled"
                            ? "ملغى"
                            : "معلق"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: "20px", color: "#94a3b8" }}>
                    لا توجد حجوزات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
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
                <th style={thS}>الاسم والبريد</th>
                <th style={thS}>رقم التواصل</th>
                <th style={thS}>النوع</th>
                <th style={thS}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...tdS, textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", color: "#1e293b" }}>
                      {u.full_name || "بدون اسم"}
                    </div>
                  </td>
                  <td style={{ ...tdS, direction: "ltr" }}>{u.phone || "-"}</td>
                  <td style={tdS}>
                    <span
                      style={{
                        background:
                          u.provider_type === "institution"
                            ? "#eff6ff"
                            : "#f8fafc",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        color:
                          u.provider_type === "institution"
                            ? "#3b82f6"
                            : "#64748b",
                      }}
                    >
                      {u.provider_type === "institution"
                        ? "🏢 مؤسسة"
                        : "👤 فرد"}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdS,
                      color: u.is_active ? "#10b981" : "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {u.is_active ? "نشط" : "موقوف"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ✨ لوحة الإدارة العليا ✨
const PlatformManagement = ({
  onRefresh,
  commissionRate,
  setCommissionRate,
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
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          commission_rate: newRateDec,
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
        alert("تم حفظ الإعدادات والسياسات بنجاح ✅");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ.");
    }
  };

  const handleAddCategory = async () => {
    if (!newCatAr || !newCatEn)
      return alert("الرجاء إدخال اسم القسم بالعربي والإنجليزي كحد أدنى.");
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
      alert("حدث خطأ أثناء الإضافة.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("حذف القسم؟")) {
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
      alert("تم إرسال الرسالة والإشعار بنجاح ✅");
      setMessagingUserId(null);
      setAdminMessageText("");
      fetchAdminData();
    } catch (err) {
      alert("تم إرسال الرسالة، ولكن نظام الإشعارات يحتاج تفعيل.");
    }
  };

  const handleHideComment = async (id, source_table) => {
    if (
      window.confirm(
        "هل أنت متأكد من إخفاء هذا التعليق لكونه مسيئاً؟ (سيتم إخفاء النص فقط وستبقى النجوم)",
      )
    ) {
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

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#fff",
        borderRadius: "25px",
        border: "1px solid #fee2e2",
        direction: "rtl",
      }}
    >
      <h2
        style={{
          color: "#ef4444",
          margin: 0,
          fontSize: "1.3rem",
          marginBottom: "15px",
        }}
      >
        ⚙️ لوحة الإدارة العليا (Super Admin)
      </h2>

      <div
        style={{
          display: "flex",
          gap: "5px",
          marginBottom: "20px",
          backgroundColor: "#f1f5f9",
          padding: "5px",
          borderRadius: "10px",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveAdminTab("settings")}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.75rem",
            backgroundColor:
              activeAdminTab === "settings" ? "#ef4444" : "transparent",
            color: activeAdminTab === "settings" ? "white" : "#64748b",
          }}
        >
          🛠️ إعدادات المنصة
        </button>
        <button
          onClick={() => setActiveAdminTab("policies")}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.75rem",
            backgroundColor:
              activeAdminTab === "policies" ? "#f59e0b" : "transparent",
            color: activeAdminTab === "policies" ? "white" : "#64748b",
          }}
        >
          📜 سياسات المنصة
        </button>
        <button
          onClick={() => setActiveAdminTab("categories")}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.75rem",
            backgroundColor:
              activeAdminTab === "categories" ? "#10b981" : "transparent",
            color: activeAdminTab === "categories" ? "white" : "#64748b",
          }}
        >
          📁 الأقسام
        </button>
        <button
          onClick={() => setActiveAdminTab("users")}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.75rem",
            backgroundColor:
              activeAdminTab === "users" ? "#3b82f6" : "transparent",
            color: activeAdminTab === "users" ? "white" : "#64748b",
          }}
        >
          👥 المستخدمين
        </button>
        <button
          onClick={() => setActiveAdminTab("reviews")}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.75rem",
            backgroundColor:
              activeAdminTab === "reviews" ? "#8b5cf6" : "transparent",
            color: activeAdminTab === "reviews" ? "white" : "#64748b",
          }}
        >
          ⭐ التقييمات والمراجعات
        </button>
        <button
          onClick={() => setActiveAdminTab("messages")}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.75rem",
            backgroundColor:
              activeAdminTab === "messages" ? "#d946ef" : "transparent",
            color: activeAdminTab === "messages" ? "white" : "#64748b",
          }}
        >
          ✉️ رسائل الزوار{" "}
          {messages.filter((m) => !m.is_read).length > 0 &&
            `(${messages.filter((m) => !m.is_read).length})`}
        </button>
      </div>

      {activeAdminTab === "settings" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            border: "1px solid #cbd5e1",
          }}
        >
          <h3 style={{ margin: 0, color: "#1e293b" }}>
            إعدادات الهوية والواجهة
          </h3>
          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                gap: "10px",
                alignItems: "center",
                minWidth: "200px",
              }}
            >
              <strong style={{ color: "#334155" }}>الاسم:</strong>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                style={smInput}
              />
            </div>

            <div
              style={{
                flex: 2,
                display: "flex",
                gap: "10px",
                alignItems: "center",
                minWidth: "300px",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ color: "#334155" }}>اللوجو:</strong>
              <input
                type="text"
                value={inputLogo}
                onChange={(e) => setInputLogo(e.target.value)}
                placeholder="رابط اللوجو"
                style={{ ...smInput, flex: 1 }}
              />
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>أو</span>
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
                  padding: "5px",
                  fontSize: "0.75rem",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <strong style={{ color: "#334155" }}>العمولة (%):</strong>
              <input
                type="number"
                value={inputRate}
                onChange={(e) => setInputRate(e.target.value)}
                style={{
                  ...smInput,
                  flex: "none",
                  width: "80px",
                  textAlign: "center",
                }}
              />
            </div>
          </div>
          <hr
            style={{
              border: "0",
              borderTop: "1px dashed #cbd5e1",
              margin: "10px 0",
            }}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <strong style={{ color: "#10b981", fontSize: "1.1rem" }}>
              🛡️ التوثيق والتراخيص (تظهر في الفوتر):
            </strong>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="جهة التوثيق (مثل: المركز السعودي للأعمال)"
                value={inputLicenseName}
                onChange={(e) => setInputLicenseName(e.target.value)}
                style={smInput}
              />
              <input
                type="text"
                placeholder="رقم الترخيص / معروف"
                value={inputLicenseNumber}
                onChange={(e) => setInputLicenseNumber(e.target.value)}
                style={smInput}
              />
              <input
                type="text"
                placeholder="رابط التحقق (اختياري)"
                value={inputLicenseLink}
                onChange={(e) => setInputLicenseLink(e.target.value)}
                style={smInput}
              />
            </div>
          </div>
          <hr
            style={{
              border: "0",
              borderTop: "1px dashed #cbd5e1",
              margin: "10px 0",
            }}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <strong style={{ color: "#334155" }}>
              نصوص واجهة العملاء الرئيسية:
            </strong>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="العبارة الترحيبية (عربي)"
                value={inputWelcomeAr}
                onChange={(e) => setInputWelcomeAr(e.target.value)}
                style={smInput}
              />
              <input
                type="text"
                placeholder="العبارة الترحيبية (إنجليزي)"
                value={inputWelcomeEn}
                onChange={(e) => setInputWelcomeEn(e.target.value)}
                style={smInput}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="العبارة الوصفية (عربي)"
                value={inputSubtitleAr}
                onChange={(e) => setInputSubtitleAr(e.target.value)}
                style={smInput}
              />
              <input
                type="text"
                placeholder="العبارة الوصفية (إنجليزي)"
                value={inputSubtitleEn}
                onChange={(e) => setInputSubtitleEn(e.target.value)}
                style={smInput}
              />
            </div>
          </div>
          <hr
            style={{
              border: "0",
              borderTop: "1px dashed #cbd5e1",
              margin: "10px 0",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <strong style={{ color: "#334155" }}>
              بيانات الحسابات البنكية للمنصة:
            </strong>
            <textarea
              value={inputBankAccounts}
              onChange={(e) => setInputBankAccounts(e.target.value)}
              placeholder="مثال: البنك الراجحي - الحساب: 1234 - الآيبان: SA..."
              style={{ ...smInput, height: "80px", resize: "vertical" }}
            />
          </div>
          <button
            onClick={handleUpdateSettings}
            style={{
              ...admBtn("#ef4444"),
              marginLeft: "auto",
              padding: "10px 20px",
              marginTop: "10px",
            }}
          >
            حفظ الإعدادات بالكامل ✅
          </button>
        </div>
      )}

      {activeAdminTab === "policies" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            border: "1px solid #cbd5e1",
          }}
        >
          <h3 style={{ margin: 0, color: "#1e293b" }}>
            📜 إدارة السياسات والشروط
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
            تعديل هذه النصوص سيؤدي لتحديثها فوراً في الفوتر ولدى المستخدمين
            الجدد.
          </p>
          <strong style={{ color: "#334155" }}>الشروط والأحكام:</strong>
          <textarea
            value={inputTerms}
            onChange={(e) => setInputTerms(e.target.value)}
            style={{ ...smInput, height: "100px", resize: "vertical" }}
          />
          <strong style={{ color: "#334155", marginTop: "10px" }}>
            سياسة الخصوصية:
          </strong>
          <textarea
            value={inputPrivacy}
            onChange={(e) => setInputPrivacy(e.target.value)}
            style={{ ...smInput, height: "100px", resize: "vertical" }}
          />
          <strong style={{ color: "#334155", marginTop: "10px" }}>
            سياسة الاسترجاع:
          </strong>
          <textarea
            value={inputRefund}
            onChange={(e) => setInputRefund(e.target.value)}
            style={{ ...smInput, height: "100px", resize: "vertical" }}
          />
          <button
            onClick={handleUpdateSettings}
            style={{
              ...admBtn("#f59e0b"),
              marginLeft: "auto",
              padding: "10px 20px",
              marginTop: "10px",
            }}
          >
            حفظ السياسات ✅
          </button>
        </div>
      )}

      {activeAdminTab === "categories" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "15px",
            border: "1px solid #cbd5e1",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0", color: "#1e293b" }}>
            📁 إدارة الأقسام
          </h3>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "15px",
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="الاسم بالعربي"
              value={newCatAr}
              onChange={(e) => setNewCatAr(e.target.value)}
              style={smInput}
            />
            <input
              placeholder="الاسم بالإنجليزي"
              value={newCatEn}
              onChange={(e) => setNewCatEn(e.target.value)}
              style={smInput}
            />
            <input
              placeholder="الأيقونة (اختياري)"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              style={{ ...smInput, width: "100px", flex: "none" }}
            />
            <button onClick={handleAddCategory} style={admBtn("#10b981")}>
              ➕ إضافة قسم
            </button>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                <th style={thS}>القسم</th>
                <th style={thS}>الأيقونة</th>
                <th style={thS}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <td style={tdS}>
                    {editingCatId === c.id ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          justifyContent: "center",
                        }}
                      >
                        <input
                          style={{ ...smInput, width: "100px" }}
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
                          style={{ ...smInput, width: "100px" }}
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
                      c.label_ar
                    )}
                  </td>
                  <td style={tdS}>
                    {editingCatId === c.id ? (
                      <input
                        style={{ ...smInput, width: "50px" }}
                        value={editCatForm.icon}
                        onChange={(e) =>
                          setEditCatForm({
                            ...editCatForm,
                            icon: e.target.value,
                          })
                        }
                      />
                    ) : (
                      c.icon
                    )}
                  </td>
                  <td style={tdS}>
                    {editingCatId === c.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEditCategory(c.id)}
                          style={admBtn("#10b981")}
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          style={admBtn("#64748b")}
                        >
                          إلغاء
                        </button>
                      </>
                    ) : (
                      <>
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
                          style={admBtn("#ef4444")}
                        >
                          🗑️ حذف
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeAdminTab === "users" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "15px",
            border: "1px solid #cbd5e1",
            overflowX: "auto",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>
            👥 إدارة المستخدمين
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #cbd5e1",
                  textAlign: "center",
                }}
              >
                <th style={padS}>المستخدم</th>
                <th style={padS}>الصلاحية</th>
                <th style={padS}>مراسلة</th>
                <th style={padS}>الحالة</th>
                <th style={padS}>إجراء</th>
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
                  }}
                >
                  <td style={padS}>
                    <strong>{u.full_name}</strong>
                  </td>
                  <td style={padS}>
                    <select
                      value={u.role || "user"}
                      onChange={(e) => changeUserRole(u.id, e.target.value)}
                      style={{
                        padding: "5px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor:
                          u.role === "admin"
                            ? "#fef2f2"
                            : u.role === "supervisor"
                              ? "#eff6ff"
                              : "#fff",
                        color:
                          u.role === "admin"
                            ? "#ef4444"
                            : u.role === "supervisor"
                              ? "#3b82f6"
                              : "#334155",
                        fontWeight: "bold",
                      }}
                    >
                      <option value="user">مستخدم</option>
                      <option value="supervisor">مشرف</option>
                      <option value="admin">مدير</option>
                    </select>
                  </td>
                  <td style={padS}>
                    {messagingUserId === u.id ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          justifyContent: "center",
                        }}
                      >
                        <input
                          style={smInput}
                          value={adminMessageText}
                          onChange={(e) => setAdminMessageText(e.target.value)}
                        />
                        <button
                          onClick={() => sendAdminMessage(u.id)}
                          style={admBtn("#3b82f6")}
                        >
                          إرسال
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMessagingUserId(u.id)}
                        style={admBtn("#e2e8f0")}
                      >
                        <span style={{ color: "#334155" }}>مراسلة</span>
                      </button>
                    )}
                  </td>
                  <td style={padS}>
                    <div
                      style={{
                        width: "15px",
                        height: "15px",
                        borderRadius: "50%",
                        margin: "0 auto",
                        backgroundColor: u.is_active ? "#10b981" : "#ef4444",
                      }}
                    ></div>
                  </td>
                  <td style={padS}>
                    <button
                      onClick={() => toggleUserActive(u.id, u.is_active)}
                      style={admBtn(u.is_active ? "#f59e0b" : "#10b981")}
                    >
                      {u.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeAdminTab === "reviews" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "15px",
            border: "1px solid #cbd5e1",
            overflowX: "auto",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>
            ⭐ التقييمات والمراجعات
          </h3>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.85rem",
              margin: "0 0 15px 0",
            }}
          >
            يمكنك كإدارة إخفاء أي نص تقييم مسيء مع الاحتفاظ بالنجوم.
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
              textAlign: "right",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                <th style={padS}>العميل</th>
                <th style={padS}>الخدمة</th>
                <th style={padS}>التقييم</th>
                <th style={padS}>التعليق</th>
                <th style={padS}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{ padding: "20px", textAlign: "center" }}
                  >
                    لا توجد تقييمات مسجلة.
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
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={padS}>
                        <strong>{r.profiles?.full_name || "غير محدد"}</strong>
                      </td>
                      <td style={padS}>{r.offerings?.title || "غير محددة"}</td>
                      <td style={padS}>{"⭐".repeat(r.rating || 5)}</td>
                      <td style={padS}>
                        {isHidden ? (
                          <span
                            style={{
                              color: "#ef4444",
                              fontWeight: "bold",
                              fontStyle: "italic",
                            }}
                          >
                            🚫 (مخفي بواسطة الإدارة/المزود)
                          </span>
                        ) : (
                          r.comment || "-"
                        )}
                      </td>
                      <td style={padS}>
                        {!isHidden && (
                          <button
                            onClick={() =>
                              handleHideComment(r.id, r.source_table)
                            }
                            style={admBtn("#ef4444")}
                          >
                            🗑️ إخفاء النص
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
      )}

      {activeAdminTab === "messages" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "15px",
            border: "1px solid #cbd5e1",
            overflowX: "auto",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>
            ✉️ صندوق الوارد (شكاوى واقتراحات)
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
              textAlign: "right",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                <th style={padS}>حالة</th>
                <th style={padS}>المرسل</th>
                <th style={padS}>النوع</th>
                <th style={padS}>الموضوع والرسالة</th>
                <th style={padS}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{ padding: "20px", textAlign: "center" }}
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
                    }}
                  >
                    <td style={padS}>{m.is_read ? "👁️ مقروءة" : "🆕 جديدة"}</td>
                    <td style={padS}>
                      <strong>{m.profiles?.full_name || "مجهول"}</strong>
                      <br />
                      <span
                        style={{
                          direction: "ltr",
                          display: "inline-block",
                          fontSize: "0.75rem",
                          color: "#64748b",
                        }}
                      >
                        {m.profiles?.phone}
                      </span>
                    </td>
                    <td style={padS}>
                      <span
                        style={{
                          backgroundColor: "#e2e8f0",
                          padding: "3px 8px",
                          borderRadius: "5px",
                        }}
                      >
                        {m.type === "complaint"
                          ? "🚨 شكوى"
                          : m.type === "suggestion"
                            ? "💡 اقتراح"
                            : "❓ استفسار"}
                      </span>
                    </td>
                    <td style={padS}>
                      <strong>{m.subject}</strong>
                      <p style={{ margin: "5px 0 0 0", color: "#475569" }}>
                        {m.message}
                      </p>
                    </td>
                    <td style={padS}>
                      {!m.is_read && (
                        <button
                          onClick={() => handleMarkMessageRead(m.id)}
                          style={admBtn("#10b981")}
                        >
                          تحديد كمقروء
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (window.confirm("حذف الرسالة؟")) {
                            await supabase
                              .from("contact_messages")
                              .delete()
                              .eq("id", m.id);
                            fetchAdminData();
                          }
                        }}
                        style={{ ...admBtn("#ef4444"), marginTop: "5px" }}
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("market");
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  const [isSuspended, setIsSuspended] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editOfferingData, setEditOfferingData] = useState(null);

  const [myOfferings, setMyOfferings] = useState([]);
  const [providerBookings, setProviderBookings] = useState([]);
  const [clientBookings, setClientBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0.1);
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
    if (!userId) return;
    try {
      const settingsData = await fetchSettingsSafe();
      if (settingsData) {
        setCommissionRate(settingsData.commission_rate);
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
      if (session) fetchAllData(session.user.id);
      else setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) fetchAllData(session.user.id);
      else {
        setSession(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchAllData]);

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
        }}
      >
        <span style={{ fontSize: "5rem" }}>🚫</span>
        <h1 style={{ color: "#ef4444", marginTop: "20px" }}>حسابك موقوف</h1>
        <p
          style={{
            color: "#7f1d1d",
            fontSize: "1.2rem",
            maxWidth: "500px",
            margin: "15px auto",
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
            padding: "12px 30px",
            fontSize: "1.1rem",
            marginTop: "20px",
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "100px" }}>
        ⏳ جاري التحميل...
      </div>
    );
  if (!session) return <Login />;

  const openEditModal = (offering) => {
    setEditOfferingData(offering);
    setShowAddModal(true);
  };
  const handleDeleteOffering = async (id) => {
    if (window.confirm("هل تريد حذف هذه الخدمة؟")) {
      await supabase.from("offerings").delete().eq("id", id);
      fetchAllData(session.user.id);
    }
  };
  const checkProfileCompletion = () => {
    if (!userProfile || !userProfile.phone || userProfile.phone.trim() === "") {
      alert(
        "عذراً، يجب إضافة (رقم الجوال) في إعدادات حسابك لتتمكن من إضافة خدمات واستقبال الحجوزات.",
      );
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
      alert("حدث خطأ.");
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
          user_id: session.user.id,
          type: contactForm.type,
          subject: contactForm.subject,
          message: contactForm.message,
        },
      ]);
      alert("تم إرسال رسالتك للإدارة بنجاح، شكراً لتواصلك معنا! 📩");
      setShowContactModal(false);
      setContactForm({ type: "complaint", subject: "", message: "" });
    } catch (err) {
      alert("حدث خطأ غير متوقع.");
    }
    setIsSendingContact(false);
  };

  const hideProviderComment = async (bookingId) => {
    if (
      window.confirm(
        "هل أنت متأكد من إخفاء هذا التعليق لكونه مسيئاً؟ (سيتم إخفاء النص فقط وستبقى النجوم)",
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
        alert("تأكد من وجود عمود is_comment_hidden في Supabase أولاً.");
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
      subject: `رد على: ${n.title || "رسالة الإدارة"}`,
      message: "",
    });
    setShowNotifModal(false);
    setShowContactModal(true);
  };

  const renderTable = (bookings, status, isProvider) => {
    const filtered = bookings.filter((b) => b.status === status);

    // ✨ ألوان وأيقونات وتغليف مخصص لكل حالة ✨
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
        text: "بانتظار موافقتك",
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
        {/* ✨ التغليف الجديد للعناوين الفرعية (حالة الطلبات) ✨ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h4
            style={{
              fontSize: "0.9rem",
              color: currentTitle.color,
              backgroundColor: currentTitle.bg,
              border: `1px solid ${currentTitle.border}`,
              padding: "8px 18px",
              borderRadius: "25px",
              margin: "0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>{currentTitle.icon}</span>{" "}
            {currentTitle.text}
          </h4>
          {/* خط أفقي تجميلي يمتد لنهاية الشاشة */}
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: currentTitle.border,
              margin: "0 15px",
              opacity: 0.6,
            }}
          ></div>
        </div>

        <div style={{ overflowX: "auto", paddingBottom: "10px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 15px", // مسافة بين البطاقات
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

                    {isProvider &&
                      b.status === "completed" &&
                      hasComment &&
                      !isHidden && (
                        <tr
                          style={{
                            backgroundColor: "#fffbeb",
                            borderBottom: "1px solid #cbd5e1",
                          }}
                        >
                          <td
                            colSpan="5"
                            style={{ padding: "10px", textAlign: "right" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "10px",
                              }}
                            >
                              <span
                                style={{
                                  color: "#92400e",
                                  fontSize: "0.85rem",
                                }}
                              >
                                💬 <strong>تعليق العميل:</strong> {hasComment}
                              </span>
                              <button
                                onClick={() => hideProviderComment(b.id)}
                                style={{
                                  background: "#fef2f2",
                                  color: "#ef4444",
                                  border: "1px solid #fca5a5",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  fontSize: "0.75rem",
                                }}
                              >
                                🗑️ إخفاء التعليق المسيء
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    {isProvider && b.status === "completed" && isHidden && (
                      <tr
                        style={{
                          backgroundColor: "#f1f5f9",
                          borderBottom: "1px solid #cbd5e1",
                        }}
                      >
                        <td
                          colSpan="5"
                          style={{
                            padding: "8px",
                            color: "#64748b",
                            fontSize: "0.8rem",
                            textAlign: "right",
                            fontStyle: "italic",
                          }}
                        >
                          {hasComment || "🚫 تم إخفاء التعليق"}
                        </td>
                      </tr>
                    )}

                    {isProvider && b.status === "completed" && (
                      <tr
                        style={{
                          backgroundColor: b.is_commission_paid
                            ? "#ecfdf5"
                            : "#fef2f2",
                          borderBottom: "2px solid #cbd5e1",
                        }}
                      >
                        <td
                          colSpan="5"
                          style={{
                            padding: "8px",
                            color: b.is_commission_paid ? "#10b981" : "#ef4444",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                          }}
                        >
                          💰 عمولة المنصة لهذا الحجز:{" "}
                          {platformCommission.toFixed(2)} {currency}
                          <span style={{ margin: "0 10px" }}>|</span>
                          حالة السداد:{" "}
                          {b.is_commission_paid
                            ? "✅ مسددة للمنصة"
                            : "❌ غير مسددة (مستحقة)"}
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
      {/* ✨ النوافذ المنبثقة (المودلز) ✨ */}
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
                fontSize: "0.9rem",
              }}
            >
              مرحباً بك! للاستمرار في استخدام المنصة، يرجى قراءة والموافقة على
              الشروط والأحكام أدناه:
            </p>

            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                textAlign: "right",
                backgroundColor: "#f8fafc",
                padding: "15px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                marginBottom: "20px",
                fontSize: "0.85rem",
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
                padding: "12px 25px",
                borderRadius: "10px",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: isAccepting ? "not-allowed" : "pointer",
                width: "100%",
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
          <div style={{ ...modalContent, maxWidth: "500px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "15px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem" }}>
                طرق السداد المتاحة 💳
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button
                onClick={() => setPaymentMethod("bank")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor:
                    paymentMethod === "bank" ? "#7c3aed" : "#f1f5f9",
                  color: paymentMethod === "bank" ? "#fff" : "#475569",
                  fontWeight: "bold",
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
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor:
                    paymentMethod === "gateway" ? "#7c3aed" : "#f1f5f9",
                  color: paymentMethod === "gateway" ? "#fff" : "#475569",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "0.3s",
                }}
              >
                🌐 بوابات الدفع
              </button>
            </div>
            {paymentMethod === "bank" && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  textAlign: "right",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>
                  الحسابات البنكية المعتمدة للمنصة:
                </h4>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    color: "#1e293b",
                    lineHeight: "1.8",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                >
                  {bankAccounts ||
                    "لم تقم الإدارة بإضافة حسابات بنكية حتى الآن."}
                </div>
                <p
                  style={{
                    marginTop: "15px",
                    fontSize: "0.85rem",
                    color: "#ef4444",
                    fontWeight: "bold",
                    backgroundColor: "#fef2f2",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                >
                  * الرجاء تحويل المبلغ المستحق، ثم التواصل مع إدارة المنصة
                  لإرفاق إيصال التحويل وتأكيد السداد.
                </p>
              </div>
            )}
            {paymentMethod === "gateway" && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <h3
                  style={{
                    color: "#3b82f6",
                    margin: "0 0 15px 0",
                    textAlign: "center",
                  }}
                >
                  الدفع الإلكتروني (ميسر)
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.85rem",
                    textAlign: "center",
                    marginBottom: "15px",
                  }}
                >
                  سيتم سداد العمولات المستحقة:{" "}
                  <strong style={{ color: "#ef4444" }} dir="ltr">
                    {myUnpaidCommissionText}
                  </strong>
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="اسم حامل البطاقة"
                    style={smInput}
                  />
                  <input
                    type="text"
                    placeholder="رقم البطاقة (0000 0000 0000 0000)"
                    style={smInput}
                    maxLength="16"
                  />
                  <div style={{ display: "flex", gap: "10px" }}>
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
                      alert("جاري معالجة الدفع (وضع الاختبار)...");
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
                        alert("✅ تم الدفع بنجاح! شكراً لك.");
                      } catch (err) {
                        alert("حدث خطأ أثناء تحديث حالة الدفع.");
                      }
                    }}
                    style={{
                      ...admBtn("#10b981"),
                      padding: "12px",
                      fontSize: "1rem",
                      marginTop: "10px",
                      width: "100%",
                    }}
                  >
                    ادفع الآن (تجريبي)
                  </button>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      textAlign: "center",
                      margin: "5px 0 0 0",
                    }}
                  >
                    *هذه واجهة تجريبية لمحاكاة عملية الدفع. لا تدخل بيانات بطاقة
                    حقيقية.
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
                marginBottom: "15px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem" }}>
                ✉️ تواصل مع إدارة المنصة
              </h2>
              <button
                onClick={() => setShowContactModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
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
                    marginBottom: "5px",
                  }}
                >
                  نوع الرسالة:
                </strong>
                <select
                  value={contactForm.type}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, type: e.target.value })
                  }
                  style={smInput}
                >
                  <option value="complaint">🚨 شكوى / مشكلة</option>
                  <option value="suggestion">💡 اقتراح / فكرة</option>
                  <option value="inquiry">❓ استفسار عام</option>
                </select>
              </div>
              <div>
                <strong
                  style={{
                    color: "#334155",
                    display: "block",
                    marginBottom: "5px",
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
                  placeholder="اكتب عنواناً مختصراً لرسالتك"
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <strong
                  style={{
                    color: "#334155",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  نص الرسالة:
                </strong>
                <textarea
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  placeholder="اكتب تفاصيل رسالتك هنا..."
                  style={{
                    ...smInput,
                    width: "100%",
                    boxSizing: "border-box",
                    height: "120px",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                onClick={handleSubmitContact}
                disabled={isSendingContact}
                style={{
                  ...admBtn("#7c3aed"),
                  padding: "12px",
                  fontSize: "1rem",
                  marginTop: "10px",
                  cursor: isSendingContact ? "not-allowed" : "pointer",
                }}
              >
                {isSendingContact ? "جاري الإرسال..." : "إرسال الرسالة 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeLegalDoc && (
        <div style={{ ...modalOverlay, zIndex: 4000 }}>
          <div style={{ ...modalContent, padding: "30px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#1e293b" }}>
                {dynamicLegalDocs[activeLegalDoc].title}
              </h3>
              <button
                onClick={() => setActiveLegalDoc(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                textAlign: "right",
                paddingRight: "5px",
                paddingLeft: "5px",
              }}
            >
              {dynamicLegalDocs[activeLegalDoc].content
                .split("\n")
                .map((p, idx) => (
                  <p
                    key={idx}
                    style={{
                      lineHeight: "1.6",
                      color: "#475569",
                      marginBottom: "10px",
                    }}
                  >
                    {p}
                  </p>
                ))}
            </div>
            <button
              onClick={() => setActiveLegalDoc(null)}
              style={{
                marginTop: "20px",
                padding: "12px",
                backgroundColor: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              إغلاق
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
            style={{ ...modalContent, maxWidth: "450px", maxHeight: "70vh" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "15px",
                marginBottom: "15px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem" }}>
                🔔 الإشعارات الواردة
              </h2>
              <button
                onClick={() => setShowNotifModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "#94a3b8",
                  }}
                >
                  لا توجد إشعارات حالياً.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "15px",
                      backgroundColor: n.is_read ? "#f8fafc" : "#eff6ff",
                      borderBottom: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      marginBottom: "5px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        color: n.is_read ? "#475569" : "#2563eb",
                        marginBottom: "5px",
                      }}
                    >
                      {n.title}
                    </div>
                    <div style={{ color: "#334155", fontSize: "0.9rem" }}>
                      {n.message}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "10px",
                      }}
                    >
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {new Date(n.created_at || new Date()).toLocaleString(
                          "ar-SA",
                        )}
                      </div>
                      <button
                        onClick={() => handleReplyToAdmin(n)}
                        style={{
                          background: "#e0e7ff",
                          color: "#2563eb",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
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
                  ...admBtn("#10b981"),
                  marginTop: "15px",
                  padding: "10px",
                  width: "100%",
                }}
              >
                تحديد الكل كمقروء ✅
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          filter: mustAcceptTerms ? "blur(4px)" : "none",
          pointerEvents: mustAcceptTerms ? "none" : "auto",
        }}
      >
        {/* ✨ شريط التنقل الذكي العائم (Smart Sticky Navbar) ✨ */}
        <div
          style={{
            position: "sticky",
            top: "15px",
            zIndex: 2000,
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            padding: "15px 25px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.06)",
            marginBottom: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* الصف العلوي: الشعار والإجراءات السريعة */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            {/* الشعار واسم المنصة */}
            <div
              onClick={() => setActiveTab("market")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              {platformLogo?.includes("http") ||
              platformLogo?.startsWith("data:image") ? (
                <img
                  src={platformLogo}
                  style={{
                    height: "45px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                  }}
                  alt="logo"
                />
              ) : (
                <span
                  style={{
                    fontSize: "2.4rem",
                    textShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  }}
                >
                  {platformLogo}
                </span>
              )}
              <h1
                style={{
                  fontSize: "1.6rem",
                  margin: 0,
                  color: "#1e293b",
                  fontWeight: "900",
                  letterSpacing: "-0.5px",
                }}
              >
                {platformName}
              </h1>
            </div>

            {/* الإجراءات وبيانات المستخدم */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {/* زر إضافة خدمة بارز */}
              <button
                onClick={() => {
                  if (checkProfileCompletion()) {
                    setEditOfferingData(null);
                    setShowAddModal(true);
                  }
                }}
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 6px 15px rgba(124, 58, 237, 0.25)",
                  transition: "all 0.3s ease",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>✨</span> إضافة خدمة
              </button>

              {/* زر الإشعارات */}
              <div
                style={{
                  position: "relative",
                  cursor: "pointer",
                  backgroundColor: "rgba(241, 245, 249, 0.7)",
                  padding: "10px",
                  borderRadius: "14px",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setShowNotifModal(true)}
              >
                <span style={{ fontSize: "1.4rem" }}>🔔</span>
                {unreadNotifsCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "#ef4444",
                      color: "white",
                      borderRadius: "50%",
                      padding: "2px 6px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      border: "2px solid #fff",
                    }}
                  >
                    {unreadNotifsCount}
                  </span>
                )}
              </div>

              {/* خط فاصل */}
              <div
                style={{
                  width: "2px",
                  height: "30px",
                  background: "rgba(226, 232, 240, 0.8)",
                  margin: "0 5px",
                }}
              ></div>

              {/* بطاقة المستخدم */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  backgroundColor: "rgba(248, 250, 252, 0.6)",
                  padding: "6px 15px 6px 6px",
                  borderRadius: "30px",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                }}
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
                    {userProfile?.full_name}
                  </div>
                  {(isSuperAdmin || isSupervisor) && (
                    <div style={{ marginTop: "2px" }}>
                      {isSuperAdmin && (
                        <span
                          style={{
                            fontSize: "0.65rem",
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
                            fontSize: "0.65rem",
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
                <img
                  src={userProfile?.avatar_url || defaultAvatar}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    objectFit: "cover",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                  alt="avatar"
                />
              </div>

              {/* زر الخروج الأنيق */}
              <button
                onClick={handleLogout}
                title="تسجيل الخروج"
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#ef4444",
                  border: "none",
                  width: "45px",
                  height: "45px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "1.4rem",
                  transition: "all 0.2s ease",
                }}
              >
                🚪
              </button>
            </div>
          </div>

          {/* الصف السفلي: شريط التنقل (Tabs) */}
          <div
            className="hide-scrollbar"
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "5px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style>{`
              .hide-scrollbar::-webkit-scrollbar { display: none; }
              .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
              .nav-tab { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; }
              .nav-tab:hover { transform: translateY(-2px); opacity: 0.9; }
            `}</style>

            {[
              {
                id: "market",
                label: "دليل الخدمات",
                icon: "🔍",
                color: "#7c3aed",
              },
              { id: "provider", label: "أعمالي", icon: "💼", color: "#059669" },
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
              { id: "profile", label: "حسابي", icon: "👤", color: "#1e293b" },
            ].map((tab) => (
              <button
                key={tab.id}
                className="nav-tab"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  backgroundColor:
                    activeTab === tab.id ? tab.color : "transparent",
                  color: activeTab === tab.id ? "white" : "#64748b",
                  boxShadow:
                    activeTab === tab.id ? `0 6px 15px ${tab.color}40` : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.15rem" }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* محتوى الصفحات */}
        {activeTab === "market" && (
          <ClientMarketplace
            session={session}
            checkProfileCompletion={checkProfileCompletion}
            welcomeMsg={i18n.language === "ar" ? welcomeMsgAr : welcomeMsgEn}
            heroSubtitle={i18n.language === "ar" ? subtitleAr : subtitleEn}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarView
            bookings={allUserBookings}
            userId={session.user.id}
            onRefresh={() => fetchAllData(session.user.id)}
          />
        )}
        {activeTab === "invoices" && (
          <InvoicesView
            bookings={allUserBookings}
            userId={session.user.id}
            commissionRate={commissionRate}
            platName={platformName}
            platLogo={platformLogo}
          />
        )}
        {activeTab === "profile" && (
          <ProfileSettings
            session={session}
            onUpdate={() => fetchAllData(session.user.id)}
          />
        )}
        {activeTab === "reports" && canViewReports && (
          <AdminReports
            commissionRate={commissionRate}
            platName={platformName}
            platLogo={platformLogo}
          />
        )}
        {activeTab === "admin" && canManagePlatform && (
          <PlatformManagement
            onRefresh={() => fetchAllData(session.user.id)}
            commissionRate={commissionRate}
            setCommissionRate={setCommissionRate}
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
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {myOfferings.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "40px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "20px",
                  border: "2px dashed #cbd5e1",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📭</div>
                <h3 style={{ color: "#475569", margin: "0 0 15px 0" }}>
                  ليس لديك أي خدمات مضافة بعد
                </h3>
                <button
                  onClick={() => {
                    setEditOfferingData(null);
                    setShowAddModal(true);
                  }}
                  style={addSkillBtn}
                >
                  ✨ أضف خدمتك الأولى الآن
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
                    borderRadius: "20px",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  {/* الشريط الملون العلوي */}
                  <div
                    style={{
                      height: "6px",
                      background:
                        off.pricing_model === "free"
                          ? "linear-gradient(90deg, #10b981, #34d399)"
                          : "linear-gradient(90deg, #7c3aed, #a855f7)",
                    }}
                  ></div>

                  <div
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    {/* العنوان */}
                    <h3
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "1.15rem",
                        color: "#1e293b",
                        fontWeight: "900",
                        lineHeight: "1.4",
                      }}
                    >
                      {off.title}
                    </h3>

                    {/* الوصف المنسق (يظهر 3 أسطر كحد أقصى) */}
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        marginBottom: "15px",
                        lineHeight: "1.6",
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

                    {/* وقت الدوام */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          backgroundColor: "#f8fafc",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                          color: "#475569",
                          fontWeight: "bold",
                        }}
                      >
                        {off.is_24_7
                          ? `🟢 متاح 24 ساعة`
                          : `🕒 ${off.work_start_time?.substring(0, 5)} - ${off.work_end_time?.substring(0, 5)}`}
                      </div>
                    </div>

                    {/* الفوتر: السعر والأزرار */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: "15px",
                        marginTop: "auto",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontWeight: "900",
                            color:
                              off.pricing_model === "free"
                                ? "#10b981"
                                : "#7c3aed",
                            fontSize: "1.2rem",
                          }}
                        >
                          {off.price_upon_agreement
                            ? "حسب الاتفاق 🤝"
                            : off.pricing_model === "free"
                              ? `💚 تطوع`
                              : `${off.price} ${curr}`}
                        </span>
                        {!off.price_upon_agreement && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "#94a3b8",
                              marginTop: "2px",
                            }}
                          >
                            لكل {modelLabels[off.pricing_model] || "مهمة"}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => openEditModal(off)}
                          style={{
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            color: "#2563eb",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="تعديل"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteOffering(off.id)}
                          style={{
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#ef4444",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="حذف"
                        >
                          🗑️ حذف
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
            style={{ display: "flex", flexDirection: "column", gap: "30px" }}
          >
            {/* 💰 1. لوحة المؤشرات المالية للمزود 💰 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              {/* بطاقة إجمالي الأرباح */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  padding: "25px",
                  borderRadius: "20px",
                  color: "white",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transition: "0.3s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "translateY(-5px)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                    opacity: 0.9,
                  }}
                >
                  <span style={{ fontSize: "1.6rem" }}>💰</span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                    }}
                  >
                    صافي الأرباح المحققة
                  </h3>
                </div>
                <div
                  style={{
                    fontSize: "2.2rem",
                    fontWeight: "900",
                    direction: "ltr",
                    textAlign: "right",
                    textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  {sumByCurrency(
                    providerBookings.filter((b) => b.status === "completed"),
                    commissionRate,
                    "providerNet",
                  )}
                </div>
              </div>

              {/* بطاقة الطلبات المنفذة */}
              <div
                style={{
                  background: "#fff",
                  padding: "25px",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transition: "0.3s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "translateY(-5px)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                    color: "#64748b",
                  }}
                >
                  <span style={{ fontSize: "1.6rem" }}>✅</span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                    }}
                  >
                    الخدمات المنفذة
                  </h3>
                </div>
                <div
                  style={{
                    fontSize: "2.2rem",
                    fontWeight: "900",
                    color: "#1e293b",
                    textAlign: "left",
                  }}
                >
                  {
                    providerBookings.filter((b) => b.status === "completed")
                      .length
                  }{" "}
                  <span style={{ fontSize: "1.1rem", color: "#94a3b8" }}>
                    خدمة
                  </span>
                </div>
              </div>
            </div>

            {/* 🔴 2. العمولات المستحقة للمنصة (بتصميم ملموم وأنيق) */}
            {myUnpaidCommissionText !== "0.00" && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  padding: "20px 25px",
                  borderRadius: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "15px",
                  boxShadow: "0 4px 15px rgba(239, 68, 68, 0.05)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span style={{ fontSize: "2rem" }}>🔔</span>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "#ef4444",
                        fontSize: "1.1rem",
                        fontWeight: "900",
                      }}
                    >
                      العمولات المستحقة للمنصة
                    </h3>
                    <p
                      style={{
                        margin: "5px 0 0 0",
                        color: "#7f1d1d",
                        fontWeight: "bold",
                        fontSize: "1.1rem",
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
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    padding: "12px 25px",
                    fontSize: "1rem",
                    transition: "0.2s",
                    boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  💳 سداد العمولات
                </button>
              </div>
            )}

            {/* 💼 3. حجوزات خدماتي كمزود (تم رفعها للأعلى لتناسب السياق) */}
            <section
              style={{
                ...cardS,
                padding: "25px",
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  backgroundColor: "#f8fafc",
                  padding: "15px 20px",
                  borderRadius: "15px",
                  borderRight:
                    i18n.language === "ar" ? "5px solid #7c3aed" : "none",
                  borderLeft:
                    i18n.language === "en" ? "5px solid #7c3aed" : "none",
                  marginBottom: "30px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>💼</span>
                <div>
                  <h2
                    style={{
                      fontSize: "1.3rem",
                      margin: 0,
                      color: "#1e293b",
                      fontWeight: "900",
                    }}
                  >
                    حجوزات خدماتي كمزود
                  </h2>
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      color: "#64748b",
                      fontSize: "0.85rem",
                    }}
                  >
                    إدارة الطلبات التي وردت لخدماتك
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

            {/* 🛍️ 4. طلباتي كعميل (تم إنزالها للأسفل) */}
            <section
              style={{
                ...cardS,
                padding: "25px",
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  backgroundColor: "#f8fafc",
                  padding: "15px 20px",
                  borderRadius: "15px",
                  borderRight:
                    i18n.language === "ar" ? "5px solid #059669" : "none",
                  borderLeft:
                    i18n.language === "en" ? "5px solid #059669" : "none",
                  marginBottom: "30px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>🛍️</span>
                <div>
                  <h2
                    style={{
                      fontSize: "1.3rem",
                      margin: 0,
                      color: "#1e293b",
                      fontWeight: "900",
                    }}
                  >
                    طلباتي كعميل
                  </h2>
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      color: "#64748b",
                      fontSize: "0.85rem",
                    }}
                  >
                    الخدمات التي قمت بطلبها من مزودين آخرين
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
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          marginTop: "30px",
          borderTop: "1px solid #e2e8f0",
          color: "#64748b",
          fontSize: "0.85rem",
        }}
      >
        {licenseNumber && (
          <div
            style={{
              marginBottom: "15px",
              display: "inline-block",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              padding: "8px 20px",
              borderRadius: "12px",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>✅</span>
            <span
              style={{ fontWeight: "bold", margin: "0 5px", color: "#334155" }}
            >
              {licenseName || "موثق من الجهات الرسمية"}:
            </span>
            <a
              href={licenseLink || "#"}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#10b981",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "1.1rem",
                direction: "ltr",
                display: "inline-block",
              }}
            >
              {licenseNumber}
            </a>
          </div>
        )}

        <p>
          © {new Date().getFullYear()} {platformName}. جميع الحقوق محفوظة.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "10px",
            flexWrap: "wrap",
          }}
        >
          <span
            onClick={() => setActiveLegalDoc("terms")}
            style={{ cursor: "pointer", color: "#7c3aed", fontWeight: "bold" }}
          >
            شروط الاستخدام
          </span>{" "}
          |
          <span
            onClick={() => setActiveLegalDoc("privacy")}
            style={{ cursor: "pointer", color: "#7c3aed", fontWeight: "bold" }}
          >
            سياسة الخصوصية
          </span>{" "}
          |
          <span
            onClick={() => setActiveLegalDoc("refund")}
            style={{ cursor: "pointer", color: "#7c3aed", fontWeight: "bold" }}
          >
            سياسة الاسترجاع
          </span>{" "}
          |
          <span
            onClick={() => setShowContactModal(true)}
            style={{ cursor: "pointer", color: "#f59e0b", fontWeight: "bold" }}
          >
            ✉️ تواصل معنا
          </span>
        </div>
      </div>
    </div>
  );
}
