import React from "react";
import { useTranslation } from "react-i18next";

// --- الدوال الحسابية المساعدة ---
const calculateFinancials = (b, commissionRate) => {
  const basePricePerUnit =
    Number(b.proposed_price) || Number(b.offerings?.price) || 0;
  const additional = Number(b.extra_costs) || Number(b.additional_costs) || 0;
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
  const customerUsername = b.profiles?.username
    ? `<span style="color:#64748b; font-size:0.9rem; direction:ltr; display:inline-block; margin-right:5px;">@${b.profiles.username}</span>`
    : "";

  const providerName = b.offerings?.profiles?.full_name || "غير متوفر";
  const providerUsername = b.offerings?.profiles?.username
    ? `<span style="color:#64748b; font-size:0.9rem; direction:ltr; display:inline-block; margin-right:5px;">@${b.offerings.profiles.username}</span>`
    : "";

  const currency = b.offerings?.currency || "SAR";
  const label = {
    fixed: "مهمة",
    hourly: "ساعة",
    period: "فترة",
    daily: "يوم",
    monthly: "شهر",
    yearly: "سنة",
    free: "تطوع",
  }[b.offerings?.pricing_model || "fixed"];

  // ✨ صائد الموقع السحري بناءً على ما اكتشفناه (b.location) ✨
  const locationData = b.location || "";
  const isUrl = locationData.includes("http");

  let locationHtml = "";
  if (locationData) {
    if (isUrl) {
      locationHtml = `
        <div style="margin-top:20px; padding:15px; background-color:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; display:flex; align-items:flex-start; gap:12px;">
          <span style="font-size:1.6rem; line-height:1;">📍</span>
          <div>
            <strong style="display:block; color:#0369a1; margin-bottom:5px; font-size:0.95rem;">موقع تنفيذ الخدمة (محدد من الخريطة):</strong>
            <a href="${locationData}" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:900; font-size:0.9rem;">
              عرض الخريطة 🌍
            </a>
          </div>
        </div>
      `;
    } else {
      locationHtml = `
        <div style="margin-top:20px; padding:15px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; display:flex; align-items:flex-start; gap:12px;">
          <span style="font-size:1.6rem; line-height:1;">📍</span>
          <div>
            <strong style="display:block; color:#1e293b; margin-bottom:5px; font-size:0.95rem;">موقع تنفيذ الخدمة:</strong>
            <span style="color:#475569; font-size:0.9rem; line-height:1.4;">${locationData}</span>
          </div>
        </div>
      `;
    }
  } else {
    locationHtml = `
      <div style="margin-top:20px; padding:15px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; display:flex; align-items:flex-start; gap:12px;">
        <span style="font-size:1.6rem; line-height:1;">🌐</span>
        <div>
          <strong style="display:block; color:#1e293b; margin-bottom:5px; font-size:0.95rem;">موقع تنفيذ الخدمة:</strong>
          <span style="color:#475569; font-size:0.9rem; line-height:1.4;">أونلاين / لم يتم تحديد موقع جغرافي</span>
        </div>
      </div>
    `;
  }

  const {
    baseTotal,
    qty,
    additional,
    totalClientPrice,
    platformCommission,
    providerNet,
  } = calculateFinancials(b, currentCommissionRate);

  const officialLogoHtml = `
    <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:10px; direction:ltr;">
      <h1 style="color:#1e293b; margin:0; font-size:2.8rem; font-weight:900; font-family:system-ui, sans-serif; letter-spacing:-1px;">BookOnMap</h1>
      <svg width="45" height="45" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#7c3aed"/>
        <circle cx="12" cy="9" r="5.5" fill="white"/>
        <path d="M10.5 11.5L7.5 8.5L8.5 7.5L10.5 9.5L15 5L16 6L10.5 11.5Z" fill="#10b981"/>
      </svg>
    </div>
  `;

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
    `<html dir="rtl">
      <head>
        <title>فاتورة #${b.id.substring(0, 8).toUpperCase()}</title>
        <style>
          body{font-family:system-ui, sans-serif;padding:40px;color:#1e293b}
          .invoice-box{border:2px dashed #cbd5e1;padding:40px;border-radius:15px;max-width:650px;margin:0 auto; background: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.02);}
          .header{display:flex;justify-content:space-between;border-bottom:2px solid #f1f5f9;padding-bottom:20px;margin-bottom:20px}
          .badge{background:${s.color};color:white;padding:8px 15px;border-radius:8px;font-weight:bold;font-size:0.85rem;}
          .plat-header{text-align:center; margin-bottom:30px;}
          p { margin: 8px 0; }
        </style>
      </head>
      <body style="background: #f8fafc;">
        <div class="invoice-box">
          <div class="plat-header">
            ${officialLogoHtml}
          </div>
          <div class="header">
            <h2 style="margin:0;">فاتورة حجز #${b.id.substring(0, 8).toUpperCase()}</h2>
            <span class="badge">${s.text}</span>
          </div>
          <p><strong>الخدمة:</strong> ${b.offerings?.title}</p>
          <p style="display:flex; align-items:center;"><strong>العميل:</strong>  ${customerName} ${customerUsername}</p>
          <p style="display:flex; align-items:center;"><strong>المزود:</strong>  ${providerName} ${providerUsername}</p>
          <p><strong>تاريخ البدء:</strong> ${new Date(b.appointment_date).toLocaleString("ar-SA")}</p>
          
          ${locationHtml}
          
          ${financialDetails}
        </div>
        <script>
          setTimeout(() => {
            window.print();
            setTimeout(() => window.close(), 500);
          }, 300);
        </script>
      </body>
    </html>`,
  );
  printWindow.document.close();
};

export default function InvoicesView({
  bookings,
  userId,
  commissionRate,
  platName,
  platLogo,
}) {
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

          // ✨ قراءة الموقع هنا للواجهة ✨
          const locationData = b.location || "";
          const isUrl = locationData.includes("http");

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
                    {b.id.substring(0, 8).toUpperCase()}
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

                {/* ✨ صندوق تفاصيل الموقع ورقم الحجز في بطاقة الفاتورة ✨ */}
                <div
                  style={{
                    marginBottom: "20px",
                    backgroundColor: "#f1f5f9",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      color: "#475569",
                      marginBottom: "6px",
                    }}
                  >
                    📍 موقع التنفيذ:
                  </div>
                  {locationData ? (
                    isUrl ? (
                      <a
                        href={locationData}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        عرض الخريطة <span style={{ fontSize: "1rem" }}>🌍</span>
                      </a>
                    ) : (
                      <span
                        style={{
                          color: "#475569",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        {locationData}
                      </span>
                    )
                  ) : (
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                      أونلاين / غير محدد
                    </span>
                  )}
                </div>

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
}
