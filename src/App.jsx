import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import BookingRow from "./components/BookingRow";
import ClientMarketplace from "./components/ClientMarketplace";
import ProfileSettings from "./components/ProfileSettings";
import AddOffering from "./components/AddOffering";
import CalendarView from "./components/CalendarView";

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

// 💠 تحديث تصميم الهيدر (Header)
const headerS = {
  backgroundColor: "#fff",
  padding: "15px 25px",
  borderRadius: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "15px",
};
const logoS = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  cursor: "pointer",
};
const avatarS = {
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  border: "2px solid #7c3aed",
  objectFit: "cover",
};
const addSkillBtn = {
  backgroundColor: "#7c3aed",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};
const logoutB = {
  backgroundColor: "#fee2e2",
  color: "#ef4444",
  border: "none",
  padding: "8px 15px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};
const tabsS = {
  display: "flex",
  gap: "5px",
  marginBottom: "20px",
  backgroundColor: "#f1f5f9",
  padding: "5px",
  borderRadius: "15px",
  overflowX: "auto",
};
const tabS = (active, color) => ({
  flex: "none",
  minWidth: "90px",
  padding: "10px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.75rem",
  backgroundColor: active ? color : "transparent",
  color: active ? "white" : "#64748b",
});
const cardS = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "20px",
  border: "1px solid #f1f5f9",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "25px",
  width: "90%",
  maxWidth: "500px",
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

const calculateFinancials = (b, commissionRate) => {
  const basePricePerUnit = Number(b.offerings?.price) || 0;
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

const handlePrintInvoice = (
  b,
  isClient,
  currentCommissionRate,
  platName,
  platLogo,
) => {
  const statusMap = {
    pending: { text: "طلب جديد", color: "#64748b" },
    negotiating: { text: "بانتظار موافقة العميل", color: "#f59e0b" },
    confirmed: { text: "مؤكد", color: "#10b981" },
    completed: { text: "منفذ", color: "#059669" },
    cancelled: { text: "ملغى", color: "#ef4444" },
  };
  const s = statusMap[b.status] || statusMap["pending"];
  const customerName = b.profiles?.full_name || "غير متوفر";
  const providerName = b.offerings?.profiles?.full_name || "غير متوفر";
  const taxNumber = b.offerings?.profiles?.tax_number;
  const licenseInfo = b.offerings?.profiles?.license_info;
  const modelLabels = {
    fixed: "مهمة",
    hourly: "ساعة",
    period: "فترة",
    daily: "يوم",
    monthly: "شهر",
    yearly: "سنة",
    free: "تطوع",
  };
  const label = modelLabels[b.offerings?.pricing_model || "fixed"];
  const {
    baseTotal,
    qty,
    additional,
    totalClientPrice,
    platformCommission,
    providerNet,
  } = calculateFinancials(b, currentCommissionRate);

  const logoHtml = platLogo?.includes("http")
    ? `<img src="${platLogo}" style="height:50px; border-radius:8px; object-fit:cover;" />`
    : `<span style="font-size:2.5rem;">${platLogo}</span>`;

  let financialDetails = `<div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 15px;"><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكلفة الأساسية (${qty} ${label}):</span><span>${baseTotal} ر.س</span></div><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكاليف الإضافية:</span><span>+ ${additional} ر.س</span></div><div class="total" style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;"><span>الإجمالي المطلوب:</span><span style="color:#7c3aed;">${totalClientPrice} ر.س</span></div></div>`;
  if (!isClient) {
    financialDetails = `<div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 15px;"><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكلفة الأساسية (${qty} ${label}):</span><span>${baseTotal} ر.س</span></div><div style="display:flex; justify-content:space-between; margin-bottom: 5px; color: #475569;"><span>التكاليف الإضافية لك:</span><span>+ ${additional} ر.س</span></div><div style="display:flex; justify-content:space-between; color: #ef4444; margin-bottom: 10px;"><span>عمولة المنصة (${currentCommissionRate * 100}%):</span><span>- ${platformCommission} ر.س</span></div><div class="total" style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;"><span>الصافي المستحق لك:</span><span style="color:#10b981;">${providerNet} ر.س</span></div></div>`;
  }
  const taxSection = taxNumber
    ? `<p style="color:#64748b; font-size:0.85rem; margin:2px 0;"><strong>الرقم الضريبي للمزود:</strong> ${taxNumber}</p>`
    : "";
  const licenseSection = licenseInfo
    ? `<p style="color:#64748b; font-size:0.85rem; margin:2px 0;"><strong>رقم الترخيص:</strong> ${licenseInfo}</p>`
    : "";

  const printWindow = window.open("", "_blank", "width=800,height=800");
  printWindow.document.write(`
    <html dir="rtl">
    <head><title>فاتورة #${b.id.substring(0, 6)}</title><style>body{font-family:system-ui;padding:40px;color:#1e293b}.invoice-box{border:2px dashed #cbd5e1;padding:40px;border-radius:15px;max-width:600px;margin:0 auto}.header{display:flex;justify-content:space-between;border-bottom:2px solid #f1f5f9;padding-bottom:20px;margin-bottom:20px}.badge{background:${s.color};color:white;padding:8px 15px;border-radius:8px;font-weight:bold}.plat-header{text-align:center; margin-bottom:30px;}</style></head>
    <body>
      <div class="invoice-box">
        <div class="plat-header">
           ${logoHtml}
           <h2 style="color:#7c3aed; margin:10px 0 0 0;">${platName}</h2>
        </div>
        <div class="header"><h2>فاتورة حجز #${b.id.substring(0, 6)}</h2><span class="badge">${s.text}</span></div>
        <p style="margin-bottom:5px;"><strong>الخدمة:</strong> ${b.offerings?.title}</p>
        <p style="margin-bottom:5px;"><strong>العميل:</strong> ${customerName}</p>
        <p style="margin-bottom:5px;"><strong>المزود:</strong> ${providerName}</p>
        ${taxSection}${licenseSection}
        <p style="margin-top:15px;"><strong>تاريخ البدء:</strong> ${new Date(b.appointment_date).toLocaleString("ar-SA")}</p>
        ${financialDetails}
      </div>
      <script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script>
    </body></html>`);
  printWindow.document.close();
};

const InvoicesView = ({
  bookings,
  userId,
  commissionRate,
  platName,
  platLogo,
}) => {
  const statusMap = {
    pending: { text: "طلب جديد", color: "#64748b" },
    negotiating: { text: "بانتظار موافقة", color: "#f59e0b" },
    confirmed: { text: "مؤكد", color: "#10b981" },
    completed: { text: "منفذ", color: "#059669" },
    cancelled: { text: "ملغى", color: "#ef4444" },
  };
  if (!bookings || bookings.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        لا توجد فواتير حالياً..
      </div>
    );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "20px",
      }}
    >
      {bookings.map((b) => {
        const isClient = b.customer_id === userId;
        const s = statusMap[b.status] || statusMap["pending"];
        const { baseTotal, additional, totalClientPrice, providerNet } =
          calculateFinancials(b, commissionRate);
        return (
          <div
            key={b.id}
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "15px",
              border: "2px dashed #cbd5e1",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                فاتورة #{b.id.substring(0, 6)}
              </h3>
              <span
                style={{
                  backgroundColor: s.color,
                  color: "#fff",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  fontSize: "0.7rem",
                }}
              >
                {s.text}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", margin: "5px 0" }}>
              <strong>الخدمة:</strong> {b.offerings?.title}
            </p>
            <p
              style={{ fontSize: "0.85rem", margin: "5px 0", color: "#64748b" }}
            >
              الأساسي: {baseTotal} | الإضافي: {additional}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "15px",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "10px",
              }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  color: isClient ? "#7c3aed" : "#10b981",
                }}
              >
                {isClient
                  ? `الإجمالي: ${totalClientPrice} ر.س`
                  : `الصافي: ${providerNet} ر.س`}
              </span>
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
                style={printBtnS}
              >
                🖨️ طباعة
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ProviderDues = ({ providerBookings, commissionRate, onRefresh }) => {
  const [isPaying, setIsPaying] = useState(false);
  const completedBookings = providerBookings.filter(
    (b) => b.status === "completed",
  );
  const unpaidBookings = completedBookings.filter((b) => !b.is_commission_paid);
  const totalUnpaidCommission = unpaidBookings.reduce(
    (sum, b) => sum + calculateFinancials(b, commissionRate).platformCommission,
    0,
  );

  const handlePay = async (bookingIds) => {
    if (window.confirm(`هل أنت متأكد من السداد؟`)) {
      setIsPaying(true);
      const { error } = await supabase
        .from("bookings")
        .update({ is_commission_paid: true })
        .in("id", bookingIds);
      setIsPaying(false);
      if (!error) {
        alert("تم السداد بنجاح شكراً لك ✅");
        onRefresh();
      } else {
        alert("خطأ: " + error.message);
      }
    }
  };

  if (completedBookings.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ليس لديك طلبات منفذة بعد لتُحسب عليها عمولات.
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          backgroundColor: "#eff6ff",
          padding: "20px",
          borderRadius: "15px",
          border: "1px solid #3b82f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 5px 0", color: "#1e293b" }}>
            مستحقات المنصة المعلقة ⏳
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
            إجمالي العمولات غير المسددة
          </p>
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#ef4444",
              marginBottom: "5px",
            }}
          >
            {totalUnpaidCommission} ر.س
          </div>
          {unpaidBookings.length > 0 && (
            <button
              disabled={isPaying}
              onClick={() => handlePay(unpaidBookings.map((b) => b.id))}
              style={admBtn("#3b82f6")}
            >
              {isPaying ? "جاري الدفع..." : "💸 تسديد إجمالي المستحقات"}
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "15px",
          overflowX: "auto",
          border: "1px solid #e2e8f0",
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
            <tr>
              <th style={thS}>العميل / الخدمة</th>
              <th style={thS}>عمولة المنصة</th>
              <th style={thS}>حالة السداد</th>
              <th style={thS}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {completedBookings.map((b) => {
              const { platformCommission } = calculateFinancials(
                b,
                commissionRate,
              );
              return (
                <tr key={b.id}>
                  <td style={tdS}>
                    <strong>{b.profiles?.full_name}</strong>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {b.offerings?.title}
                    </div>
                  </td>
                  <td style={{ ...tdS, fontWeight: "bold", color: "#ef4444" }}>
                    {platformCommission} ر.س
                  </td>
                  <td style={tdS}>
                    {b.is_commission_paid ? (
                      <span style={{ color: "#059669" }}>مسددة ✅</span>
                    ) : (
                      <span style={{ color: "#ef4444" }}>غير مسددة ⏳</span>
                    )}
                  </td>
                  <td style={tdS}>
                    {!b.is_commission_paid && platformCommission > 0 && (
                      <button
                        disabled={isPaying}
                        onClick={() => handlePay([b.id])}
                        style={admBtn("#10b981")}
                      >
                        تسديد
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminReports = ({ commissionRate, platName, platLogo }) => {
  const [data, setData] = useState({ users: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const fetchStats = async () => {
    setLoading(true);
    const { data: u } = await supabase.from("profiles").select("*");
    const { data: b } = await supabase
      .from("bookings")
      .select(
        `*, offerings(title, price, pricing_model, profiles!offerings_provider_id_fkey(full_name)), profiles!bookings_customer_id_fkey(full_name)`,
      );
    setData({ users: u || [], bookings: b || [] });
    setLoading(false);
  };
  useEffect(() => {
    fetchStats();
  }, []);
  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ⏳ جاري التحميل...
      </div>
    );

  const completedBookings = data.bookings.filter(
    (b) => b.status === "completed",
  );
  const totalProfit = completedBookings.reduce(
    (sum, b) => sum + calculateFinancials(b, commissionRate).platformCommission,
    0,
  );
  const collectedProfit = completedBookings
    .filter((b) => b.is_commission_paid)
    .reduce(
      (sum, b) =>
        sum + calculateFinancials(b, commissionRate).platformCommission,
      0,
    );
  const pendingProfit = totalProfit - collectedProfit;

  const stats = {
    totalUsers: data.users.length,
    totalBookings: data.bookings.length,
    completed: completedBookings.length,
    pending: data.bookings.filter((b) =>
      ["pending", "negotiating"].includes(b.status),
    ).length,
  };
  const filteredBookings = data.bookings.filter((b) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending")
      return ["pending", "negotiating"].includes(b.status);
    return b.status === activeFilter;
  });

  const printFinancialReport = () => {
    const printWindow = window.open("", "_blank");
    const logoHtml = platLogo?.includes("http")
      ? `<img src="${platLogo}" style="height:40px; vertical-align:middle; border-radius:5px;" />`
      : `<span style="font-size:2rem; vertical-align:middle;">${platLogo}</span>`;
    const tableRows = filteredBookings
      .map((b) => {
        const { platformCommission, providerNet } = calculateFinancials(
          b,
          commissionRate,
        );
        const statusText =
          b.status === "completed"
            ? "منفذ"
            : b.status === "cancelled"
              ? "ملغى"
              : "معالجة";
        const paymentText =
          b.status === "completed"
            ? b.is_commission_paid
              ? "مسددة"
              : "معلقة"
            : "-";
        return `<tr><td style="padding:10px; border:1px solid #cbd5e1;">${b.offerings?.profiles?.full_name} <br><small style="color:#64748b">العميل: ${b.profiles?.full_name}</small></td><td style="padding:10px; border:1px solid #cbd5e1; color:#ef4444; font-weight:bold;">${platformCommission} ر.س</td><td style="padding:10px; border:1px solid #cbd5e1; color:#10b981; font-weight:bold;">${providerNet} ر.س</td><td style="padding:10px; border:1px solid #cbd5e1;">${statusText}</td><td style="padding:10px; border:1px solid #cbd5e1;">${paymentText}</td></tr>`;
      })
      .join("");
    printWindow.document.write(
      `<html dir="rtl"><head><title>التقرير المالي - ${platName}</title><style>body{font-family:system-ui; padding:30px; color:#1e293b;} table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} th{background:#f8fafc; padding:12px; border:2px solid #cbd5e1;} .summary{display:flex; justify-content:space-between; background:#eff6ff; padding:20px; border-radius:15px; border:1px dashed #3b82f6; font-size:1.2rem; margin-bottom:20px;}</style></head><body><h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">${logoHtml} التقرير المالي لمنصة ${platName}</h1><p>تاريخ الطباعة: ${new Date().toLocaleString("ar-SA")}</p><div class="summary"><div><strong>إجمالي الأرباح:</strong> <span style="color:#7c3aed">${totalProfit} ر.س</span></div><div><strong>المحصلة ✅:</strong> <span style="color:#059669">${collectedProfit} ر.س</span></div><div><strong>المعلقة ⏳:</strong> <span style="color:#dc2626">${pendingProfit} ر.س</span></div></div><h3>تفاصيل الحجوزات:</h3><table><thead><tr><th>المزود / العميل</th><th>عمولة المنصة</th><th>الصافي للمزود</th><th>حالة الطلب</th><th>سداد العمولة</th></tr></thead><tbody>${tableRows}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`,
    );
    printWindow.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "#7c3aed", fontSize: "1.2rem", margin: 0 }}>
          📊 التقارير المالية
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={printFinancialReport}
            style={{
              background: "#e0e7ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              padding: "8px 15px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🖨️ طباعة التقرير المالي
          </button>
          <button
            onClick={fetchStats}
            style={{
              background: "#f1f5f9",
              border: "none",
              padding: "8px 15px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 تحديث
          </button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        <div
          style={reportCard("#3b82f6", activeFilter === "all")}
          onClick={() => setActiveFilter("all")}
        >
          <h4 style={{ margin: "5px 0" }}>الحجوزات</h4>
          <p style={{ margin: 0, fontWeight: "bold" }}>{stats.totalBookings}</p>
        </div>
        <div
          style={reportCard("#10b981", activeFilter === "completed")}
          onClick={() => setActiveFilter("completed")}
        >
          <h4 style={{ margin: "5px 0" }}>المنفذة</h4>
          <p style={{ margin: 0, fontWeight: "bold" }}>{stats.completed}</p>
        </div>
        <div style={{ ...reportCard("#10b981", false), background: "#ecfdf5" }}>
          <h4
            style={{ margin: "5px 0", fontSize: "0.75rem", color: "#059669" }}
          >
            محصلة ✅
          </h4>
          <p style={{ margin: 0, fontWeight: "bold", color: "#059669" }}>
            {collectedProfit} ر.س
          </p>
        </div>
        <div style={{ ...reportCard("#ef4444", false), background: "#fef2f2" }}>
          <h4
            style={{ margin: "5px 0", fontSize: "0.75rem", color: "#dc2626" }}
          >
            معلقة ⏳
          </h4>
          <p style={{ margin: 0, fontWeight: "bold", color: "#dc2626" }}>
            {pendingProfit} ر.س
          </p>
        </div>
        <div style={{ ...reportCard("#7c3aed", false), background: "#f8fafc" }}>
          <h4
            style={{ margin: "5px 0", fontSize: "0.75rem", color: "#7c3aed" }}
          >
            إجمالي 💰
          </h4>
          <p style={{ margin: 0, fontWeight: "bold", color: "#7c3aed" }}>
            {totalProfit} ر.س
          </p>
        </div>
      </div>
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
            fontSize: "0.8rem",
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
              <th style={thS}>المزود / العميل</th>
              <th style={thS}>العمولة</th>
              <th style={thS}>حالة الطلب</th>
              <th style={thS}>سداد العمولة</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => {
              const { platformCommission } = calculateFinancials(
                b,
                commissionRate,
              );
              return (
                <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...tdS, textAlign: "right" }}>
                    <div>💼 {b.offerings?.profiles?.full_name}</div>
                    <div style={{ color: "#64748b" }}>
                      🙋‍♂️ {b.profiles?.full_name}
                    </div>
                  </td>
                  <td style={{ ...tdS, color: "#ef4444", fontWeight: "bold" }}>
                    {platformCommission} ر.س
                  </td>
                  <td
                    style={{
                      ...tdS,
                      fontWeight: "bold",
                      color:
                        b.status === "completed"
                          ? "#10b981"
                          : b.status === "cancelled"
                            ? "#ef4444"
                            : "#f59e0b",
                    }}
                  >
                    {b.status === "completed" ? "منفذ" : "معالجة/ملغى"}
                  </td>
                  <td style={tdS}>
                    {b.status === "completed" ? (
                      b.is_commission_paid ? (
                        <span style={{ color: "#059669" }}>مسددة ✅</span>
                      ) : (
                        <span style={{ color: "#ef4444" }}>معلقة ⏳</span>
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PlatformManagement = ({
  onRefresh,
  commissionRate,
  setCommissionRate,
  allowTextReviews,
  setAllowTextReviews,
  platName,
  setPlatName,
  platLogo,
  setPlatLogo,
}) => {
  const [users, setUsers] = useState([]);
  const [inputRate, setInputRate] = useState(commissionRate * 100);
  const [inputName, setInputName] = useState(platName);
  const [inputLogo, setInputLogo] = useState(platLogo);
  const [messagingUserId, setMessagingUserId] = useState(null);
  const [adminMessageText, setAdminMessageText] = useState("");
  const [reviewsList, setReviewsList] = useState([]);

  const fetchAdminData = async () => {
    const { data: u } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    if (u) setUsers(u);
    const { data: revs } = await supabase
      .from("bookings")
      .select(
        "id, rating, review, profiles!bookings_customer_id_fkey(full_name), offerings(title, profiles!offerings_provider_id_fkey(full_name))",
      )
      .not("review", "is", null)
      .neq("review", "")
      .order("id", { ascending: false });
    if (revs) setReviewsList(revs);
  };
  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateSettings = async () => {
    const newRateDec = inputRate / 100;
    const { error } = await supabase
      .from("platform_settings")
      .update({
        commission_rate: newRateDec,
        platform_name: inputName,
        platform_logo: inputLogo,
      })
      .eq("id", 1);
    if (!error) {
      setCommissionRate(newRateDec);
      setPlatName(inputName);
      setPlatLogo(inputLogo);
      alert(`تم تحديث إعدادات المنصة والهوية بنجاح ✅`);
    }
  };

  const handleToggleReviews = async () => {
    const newVal = !allowTextReviews;
    const { error } = await supabase
      .from("platform_settings")
      .update({ allow_text_reviews: newVal })
      .eq("id", 1);
    if (!error) {
      setAllowTextReviews(newVal);
      alert(
        newVal ? "تم تفعيل تعليقات العملاء ✅" : "تم إيقاف تعليقات العملاء ❌",
      );
    }
  };
  const handleDeleteReview = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التعليق نهائياً؟")) {
      const { error } = await supabase
        .from("bookings")
        .update({ review: null })
        .eq("id", id);
      if (!error) {
        alert("تم الحذف ✅");
        fetchAdminData();
        onRefresh();
      }
    }
  };
  const toggleUserActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    if (!error) {
      fetchAdminData();
      onRefresh();
    }
  };
  const sendAdminMessage = async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({ admin_note: adminMessageText })
      .eq("id", userId);
    if (!error) {
      alert("تم الإرسال بنجاح ✅");
      setMessagingUserId(null);
      setAdminMessageText("");
      fetchAdminData();
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#fff",
        borderRadius: "25px",
        border: "1px solid #fee2e2",
      }}
    >
      <h2
        style={{
          color: "#ef4444",
          margin: 0,
          fontSize: "1rem",
          marginBottom: "15px",
        }}
      >
        ⚙️ لوحة الرقابة والتحكم
      </h2>

      <div
        style={{
          background: "#f8fafc",
          padding: "15px",
          borderRadius: "15px",
          marginBottom: "25px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          border: "1px solid #cbd5e1",
        }}
      >
        <h3 style={{ margin: 0, color: "#1e293b" }}>
          🎨 هوية المنصة وإعدادات النظام
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
            }}
          >
            <strong style={{ color: "#334155" }}>الاسم:</strong>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <strong style={{ color: "#334155" }}>اللوجو:</strong>
            <input
              type="text"
              value={inputLogo}
              onChange={(e) => setInputLogo(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            alignItems: "center",
            borderTop: "1px dashed #cbd5e1",
            paddingTop: "15px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <strong style={{ color: "#334155" }}>💰 العمولة (%):</strong>
            <input
              type="number"
              value={inputRate}
              onChange={(e) => setInputRate(e.target.value)}
              style={{
                width: "60px",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                textAlign: "center",
              }}
            />
          </div>
          <button
            onClick={handleUpdateSettings}
            style={{ ...admBtn("#7c3aed"), marginLeft: "auto" }}
          >
            💾 حفظ الهوية
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", textAlign: "center" }}>
              <th style={padS}>المستخدم</th>
              <th style={padS}>مراسلات الإدارة</th>
              <th style={padS}>الحالة</th>
              <th style={padS}>الإجراءات</th>
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
                  {messagingUserId === u.id ? (
                    <div>
                      <input
                        value={adminMessageText}
                        onChange={(e) => setAdminMessageText(e.target.value)}
                      />
                      <button onClick={() => sendAdminMessage(u.id)}>
                        إرسال
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setMessagingUserId(u.id)}>
                      💬 مراسلة
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
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("market");
  const [providerBookings, setProviderBookings] = useState([]);
  const [clientBookings, setClientBookings] = useState([]);
  const [myOfferings, setMyOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editOfferingData, setEditOfferingData] = useState(null);
  const [commissionRate, setCommissionRate] = useState(0.1);
  const [allowTextReviews, setAllowTextReviews] = useState(true);
  const [platformName, setPlatformName] = useState("منصتي للخدمات");
  const [platformLogo, setPlatformLogo] = useState("🌟");

  const isAdmin = session?.user?.email === "ksanabeel@hotmail.com";

  const fetchAllData = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select(
          "commission_rate, allow_text_reviews, platform_name, platform_logo",
        )
        .eq("id", 1)
        .maybeSingle();
      if (settingsData) {
        setCommissionRate(settingsData.commission_rate);
        setAllowTextReviews(settingsData.allow_text_reviews !== false);
        if (settingsData.platform_name)
          setPlatformName(settingsData.platform_name);
        if (settingsData.platform_logo)
          setPlatformLogo(settingsData.platform_logo);
      }
      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (profile) setUserProfile(profile);
      const { data: offerings } = await supabase
        .from("offerings")
        .select("*")
        .eq("provider_id", userId);
      setMyOfferings(offerings || []);
      const { data } = await supabase
        .from("bookings")
        .select(
          `*, profiles!bookings_customer_id_fkey(full_name, avatar_url), offerings(*, profiles!offerings_provider_id_fkey(full_name, avatar_url))`,
        )
        .order("appointment_date", { ascending: false });
      if (data) {
        setProviderBookings(
          data.filter((b) => b.offerings?.provider_id === userId),
        );
        setClientBookings(data.filter((b) => b.customer_id === userId));
      }
    } catch (err) {
      console.error(err);
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
  const openEditModal = (offering) => {
    setEditOfferingData(offering);
    setShowAddModal(true);
  };

  const renderTable = (bookings, status, isProvider) => {
    const filtered = bookings.filter((b) => b.status === status);
    const titleMap = {
      pending: "⏳ طلبات جديدة",
      negotiating: "💬 بانتظار الموافقة",
      confirmed: "📅 مؤكدة وجاري التنفيذ",
      completed: "✅ منفذة",
      cancelled: "❌ ملغاة",
    };
    if (filtered.length === 0) return null;
    return (
      <div key={status} style={{ marginBottom: "15px" }}>
        <h4
          style={{
            fontSize: "0.85rem",
            color: "#2563eb",
            marginBottom: "8px",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "5px",
          }}
        >
          {titleMap[status]}
        </h4>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              backgroundColor: "#fff",
              borderRadius: "10px",
            }}
          >
            <tbody style={{ textAlign: "center" }}>
              {filtered.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onRefresh={() => fetchAllData(session.user.id)}
                  isProviderView={isProvider}
                  allowTextReviews={allowTextReviews}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "100px" }}>
        ⏳ جاري التحميل...
      </div>
    );
  if (!session) return <Login />;
  const allUserBookings = [
    ...providerBookings,
    ...clientBookings.filter(
      (cb) => !providerBookings.some((pb) => pb.id === cb.id),
    ),
  ];
  const defaultAvatar = `https://ui-avatars.com/api/?name=${userProfile?.full_name || "User"}&background=7c3aed&color=fff`;

  return (
    <div
      style={{
        padding: "15px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "system-ui",
        direction: "rtl",
      }}
    >
      <div style={headerS}>
        <div style={logoS} onClick={() => setActiveTab("market")}>
          {platformLogo?.includes("http") ? (
            <img
              src={platformLogo}
              style={{ height: "45px", borderRadius: "10px" }}
              alt="logo"
            />
          ) : (
            <span style={{ fontSize: "2.2rem" }}>{platformLogo}</span>
          )}
          <h1
            style={{
              fontSize: "1.4rem",
              margin: 0,
              color: "#7c3aed",
              fontWeight: "900",
            }}
          >
            {platformName}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontWeight: "bold",
                color: "#1e293b",
                fontSize: "0.9rem",
              }}
            >
              {userProfile?.full_name}
            </div>
            <button
              onClick={() => {
                setEditOfferingData(null);
                setShowAddModal(true);
              }}
              style={{
                ...addSkillBtn,
                padding: "4px 10px",
                fontSize: "0.7rem",
              }}
            >
              ✨ إضافة خدمة
            </button>
          </div>
          <img
            src={userProfile?.avatar_url || defaultAvatar}
            style={avatarS}
            alt="p"
          />
          <button onClick={handleLogout} style={logoutB}>
            خروج 🚪
          </button>
        </div>
      </div>

      <div style={tabsS}>
        <button
          onClick={() => setActiveTab("market")}
          style={tabS(activeTab === "market", "#7c3aed")}
        >
          🔍 السوق
        </button>
        <button
          onClick={() => setActiveTab("provider")}
          style={tabS(activeTab === "provider", "#059669")}
        >
          💼 أعمالي
        </button>
        <button
          onClick={() => setActiveTab("my_services")}
          style={tabS(activeTab === "my_services", "#f59e0b")}
        >
          ⚙️ خدماتي
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          style={tabS(activeTab === "calendar", "#3b82f6")}
        >
          📅 التقويم
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          style={tabS(activeTab === "invoices", "#8b5cf6")}
        >
          🧾 الفواتير
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("reports")}
            style={tabS(activeTab === "reports", "#d946ef")}
          >
            📊 التقارير
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            style={tabS(activeTab === "admin", "#ef4444")}
          >
            ⚙️ الإدارة
          </button>
        )}
        <button
          onClick={() => setActiveTab("profile")}
          style={tabS(activeTab === "profile", "#1e293b")}
        >
          👤 حسابي
        </button>
      </div>

      {activeTab === "market" && (
        <ClientMarketplace
          session={session}
          allowTextReviews={allowTextReviews}
        />
      )}
      {activeTab === "my_services" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {myOfferings.map((off) => (
            <div key={off.id} style={cardS}>
              <h3>{off.title}</h3>
              <p>{off.description}</p>
              <button onClick={() => openEditModal(off)}>تعديل</button>
            </div>
          ))}
        </div>
      )}
      {activeTab === "calendar" && <CalendarView bookings={allUserBookings} />}
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
      {activeTab === "reports" && isAdmin && (
        <AdminReports
          commissionRate={commissionRate}
          platName={platformName}
          platLogo={platformLogo}
        />
      )}
      {activeTab === "admin" && isAdmin && (
        <PlatformManagement
          onRefresh={() => fetchAllData(session.user.id)}
          commissionRate={commissionRate}
          setCommissionRate={setCommissionRate}
          allowTextReviews={allowTextReviews}
          setAllowTextReviews={setAllowTextReviews}
          platName={platformName}
          setPlatName={setPlatformName}
          platLogo={platformLogo}
          setPlatLogo={setPlatformLogo}
        />
      )}

      {activeTab === "provider" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section style={cardS}>
            <h2 style={{ fontSize: "1rem" }}>🛒 طلباتي</h2>
            {[
              "pending",
              "negotiating",
              "confirmed",
              "completed",
              "cancelled",
            ].map((s) => renderTable(clientBookings, s, false))}
          </section>
          <section style={cardS}>
            <h2 style={{ fontSize: "1rem" }}>📦 خدماتي</h2>
            {[
              "pending",
              "negotiating",
              "confirmed",
              "completed",
              "cancelled",
            ].map((s) => renderTable(providerBookings, s, true))}
          </section>
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
    </div>
  );
}
