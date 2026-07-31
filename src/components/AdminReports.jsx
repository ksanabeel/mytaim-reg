import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next"; // مكتبة الترجمة لاستخراج لغة المستخدم

// --- التنسيقات العامة والجمالية للملف ---
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
const cardS = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
};
const reportCard = (color) => ({
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "20px",
  borderBottom: `4px solid ${color}`,
  textAlign: "center",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  transition: "all 0.3s ease",
});
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
};

// --- الدوال المساعدة ---
const fetchSafe = async (tableName) => {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    return error ? [] : data || [];
  } catch (err) {
    return [];
  }
};

// 💰✨ دالة حساب العمولات محدثة لدعم الحجوزات الخاصة (يدوية) ✨💰
const calculateFinancials = (b, commissionRate) => {
  const finalTotal =
    b.proposed_price && Number(b.proposed_price) > 0
      ? Number(b.proposed_price)
      : (Number(b.offerings?.price) || 0) * (b.quantity || 1);

  // إذا كان الحجز يدوياً (خاصاً) تكون عمولة المنصة صفر
  const isManual = b.is_manual_booking === true;
  const platformCommission = isManual ? 0 : finalTotal * commissionRate;

  const providerNet = finalTotal - platformCommission;

  return {
    baseTotal: finalTotal,
    qty: b.quantity || 1,
    additional: 0,
    totalClientPrice: finalTotal,
    platformCommission,
    providerNet,
    isManual,
  };
};

const sumByCurrency = (
  bookingsArr,
  commissionRate,
  fieldName = "platformCommission",
) => {
  const totals = bookingsArr.reduce((acc, b) => {
    const c = b.offerings?.currency || "SAR";
    const financials = calculateFinancials(b, commissionRate);
    acc[c] = (acc[c] || 0) + financials[fieldName];
    return acc;
  }, {});
  const entries = Object.entries(totals);
  if (entries.length === 0) return "0.00";
  return entries.map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" | ");
};

// ✨ دوال التواريخ والأوقات ✨
const getFullFormattedDate = (dateObj, locale) => {
  if (!dateObj) return null;
  try {
    const dayName = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      dateObj,
    );
    const gregDate = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateObj);
    const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateObj);
    return { dayName, gregDate, hijriDate };
  } catch (e) {
    return null;
  }
};

// ✨ المكون الرئيسي للوحة التقارير ✨
export default function AdminReports({
  commissionRate,
  affiliateRate,
  platName,
}) {
  const { i18n } = useTranslation();
  const dateLocale = i18n?.language === "en" ? "en-US" : "ar-SA";

  const [data, setData] = useState({ users: [], bookings: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const [reportTab, setReportTab] = useState("bookings");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const [payoutModalData, setPayoutModalData] = useState(null);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // ✨ حالات المراسلة الداخلية في النظام ✨
  const [activeMsgId, setActiveMsgId] = useState(null);
  const [sysMsgText, setSysMsgText] = useState("");

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

  // ✉️ دالة إرسال التنبيه الداخلي للنظام ✉️
  const handleSendSysMsg = async (userId, bookingId) => {
    if (!sysMsgText.trim()) return alert("الرجاء كتابة رسالة التنبيه.");
    try {
      await supabase.from("notifications").insert([
        {
          user_id: userId,
          title: `تنبيه مالي للحجز #${bookingId.substring(0, 8).toUpperCase()}`,
          message: sysMsgText,
          is_read: false,
        },
      ]);
      alert("تم إرسال التنبيه للمزود داخل النظام بنجاح! 🔔✅");
      setActiveMsgId(null);
      setSysMsgText("");
    } catch (err) {
      alert("حدث خطأ أثناء الإرسال: " + err.message);
    }
  };

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

      const searchStr = userSearch.toLowerCase();
      const matchSearch =
        userSearch === "" ||
        (b.id || "").toLowerCase().includes(searchStr) ||
        (b.profiles?.full_name || "").toLowerCase().includes(searchStr) ||
        (b.offerings?.profiles?.full_name || "")
          .toLowerCase()
          .includes(searchStr);

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

  // الحسابات هنا ستتجاهل العمولات للحجوزات الخاصة لأن الدالة ترجع 0.00
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

  const affiliateStats = useMemo(
    () => getAffiliateStats(),
    [data.users, data.bookings, affiliateRate, commissionRate],
  );

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
        `تم تسجيل سداد مبلغ ${payoutModalData.unpaidEarnings.toFixed(
          2,
        )} بنجاح للمسوق ${payoutModalData.full_name} ✅`,
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
      `<html dir="rtl">
        <head>
          <title>تقرير الحجوزات الشامل</title>
          <style>
            body{font-family:system-ui; padding:30px; color:#1e293b; font-size: 0.9rem;} 
            table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} 
            th{background:#f1f5f9; padding:12px; border:1px solid #cbd5e1; font-weight:bold;}
            td{padding:12px; border:1px solid #cbd5e1;}
            .date-block { font-size: 0.85rem; line-height: 1.4; color: #475569; }
          </style>
        </head>
        <body>
          <h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">تقرير الحجوزات والعمليات - ${platName}</h1>
          <div style="background:#eff6ff; padding:15px; border:1px dashed #3b82f6; font-size:1.1rem; font-weight:bold; margin-bottom:20px;">
            إجمالي العمولات للتقرير الحالي: <span style="color:#2563eb">${currentReportTotalText}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الحجز</th>
                <th>المزود والخدمة</th>
                <th>التاريخ والوقت</th>
                <th>بيانات العميل</th>
                <th>الإجمالي</th>
                <th>صافي المزود</th>
                <th>عمولة المنصة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBookings
                .map((b) => {
                  const curr = b.offerings?.currency || "SAR";
                  const fin = calculateFinancials(b, commissionRate);

                  // تواريخ الفاتورة للطباعة
                  const startObj = b.appointment_date
                    ? new Date(b.appointment_date)
                    : null;
                  const endObj = b.end_time ? new Date(b.end_time) : null;
                  const startF = getFullFormattedDate(startObj, dateLocale);
                  const endF = endObj
                    ? getFullFormattedDate(endObj, dateLocale)
                    : null;

                  const sTime = startObj
                    ? startObj.toLocaleTimeString(dateLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  const eTime = endObj
                    ? endObj.toLocaleTimeString(dateLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  let datePrintHtml = "غير محدد";
                  if (startF) {
                    datePrintHtml = `
                      <div class="date-block" style="text-align: right;">
                        <strong>من:</strong> ${startF.gregDate} (${sTime})<br/>
                        <strong>إلى:</strong> ${
                          endF
                            ? `${endF.gregDate} (${eTime})`
                            : `${startF.gregDate} (${eTime || "غير محدد"})`
                        }
                      </div>
                    `;
                  }

                  const locationData = b.location || "";
                  const isUrl = locationData.includes("http");
                  const locString = locationData
                    ? isUrl
                      ? `<a href="${locationData}" target="_blank" style="color:#2563eb; text-decoration:none;">📍 عرض الخريطة</a>`
                      : `📍 ${locationData}`
                    : "🌐 أونلاين / غير محدد";

                  const pUser = b.offerings?.profiles?.username
                    ? `<br><small style="color:#2563eb;" dir="ltr">@${b.offerings.profiles.username}</small>`
                    : "";
                  const cUser = b.profiles?.username
                    ? `<br><small style="color:#059669;" dir="ltr">@${b.profiles.username}</small>`
                    : "";

                  const commissionColor = b.is_manual_booking
                    ? "#166534"
                    : b.is_commission_paid
                    ? "#10b981"
                    : "#ef4444";

                  const commissionBadge = b.is_manual_booking
                    ? `<span style="background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:3px 8px; border-radius:6px; font-size:0.75rem; margin-top:5px; display:inline-block;">معفى (حجز خاص) 📞</span>`
                    : b.is_commission_paid
                    ? `<span style="background:#d1fae5; color:#047857; padding:3px 8px; border-radius:6px; font-size:0.75rem; margin-top:5px; display:inline-block;">مسددة ✅</span>`
                    : `<span style="background:#fef2f2; color:#b91c1c; padding:3px 8px; border-radius:6px; font-size:0.75rem; margin-top:5px; display:inline-block;">غير مسددة ❌</span>`;

                  return `
                  <tr>
                    <td style="font-family:monospace; font-weight:bold;">${b.id.substring(
                      0,
                      8,
                    )}</td>
                    <td style="text-align:right;">
                      <strong>${
                        b.offerings?.profiles?.full_name || "غير محدد"
                      }</strong> ${pUser}<br>
                      <small style="color:#475569; font-weight:bold; display:block; margin-top:5px;">الخدمة: ${
                        b.offerings?.title
                      }</small>
                      <small style="background:#f8fafc; padding:3px; border-radius:4px; display:inline-block; margin-top:5px; font-weight:bold;">${locString}</small>
                    </td>
                    <td>${datePrintHtml}</td>
                    <td style="text-align:right;">
                      <strong>${
                        b.profiles?.full_name || "غير محدد"
                      }</strong> ${cUser}<br>
                      <small dir="ltr" style="display:block; margin-top:5px; font-weight:bold;">📞 ${
                        b.profiles?.phone
                      }</small>
                    </td>
                    <td style="font-weight:bold; direction:ltr;">${fin.baseTotal.toFixed(
                      2,
                    )} ${curr}</td>
                    <td style="color:#10b981; font-weight:bold; direction:ltr;">${fin.providerNet.toFixed(
                      2,
                    )} ${curr}</td>
                    <td style="color:${commissionColor}; font-weight:bold; direction:ltr;">
                      ${fin.platformCommission.toFixed(2)} ${curr}<br>
                      ${commissionBadge}
                    </td>
                    <td>${b.status}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
          <script>window.onload=()=>window.print();</script>
        </body>
      </html>`,
    );
    printWindow.document.close();
  };

  const printUsersReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html dir="rtl"><head><title>تقرير المستخدمين</title><style>body{font-family:system-ui; padding:30px; color:#1e293b;} table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} th, td{padding:10px; border:1px solid #cbd5e1;}</style></head><body><h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">تقرير المستخدمين - ${platName}</h1><p><strong>العدد المطبوع:</strong> ${
        filteredUsers.length
      } مستخدم</p><table><thead><tr><th>الاسم (اليوزر)</th><th>رقم التواصل</th><th>النوع</th><th>الحالة</th></tr></thead><tbody>${filteredUsers
        .map(
          (u) =>
            `<tr><td>${u.full_name || "بدون اسم"}</td><td dir="ltr">${
              u.phone || "-"
            }</td><td>${
              u.provider_type === "institution" ? "مؤسسة" : "فرد"
            }</td><td>${u.is_active ? "نشط" : "موقوف"}</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`,
    );
    printWindow.document.close();
  };

  const printAffiliatesReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html dir="rtl"><head><title>تقرير المسوقين</title><style>body{font-family:system-ui; padding:30px; color:#1e293b;} table{width:100%; border-collapse:collapse; margin-top:20px; text-align:center;} th, td{padding:10px; border:1px solid #cbd5e1;}</style></head><body><h1 style="color:#7c3aed; border-bottom:3px solid #7c3aed; padding-bottom:10px;">تقرير المسوقين والأرباح - ${platName}</h1><table><thead><tr><th>المسوق</th><th>عدد العملاء</th><th>أرباح المنصة</th><th>أرباح المسوق (المستحقة)</th></tr></thead><tbody>${affiliateStats
        .map(
          (a) =>
            `<tr><td>${a.full_name} (@${a.username})</td><td>${
              a.referredUsersList.length
            } عملاء</td><td>${a.totalPlatformCommission.toFixed(
              2,
            )} SAR</td><td style="color:#10b981; font-weight:bold;">${a.unpaidEarnings.toFixed(
              2,
            )} SAR</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`,
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
        <div style={reportCard("#3b82f6")}>
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
        <div style={reportCard("#10b981")}>
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
        <div style={reportCard("#ef4444")}>
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
        <div style={reportCard("#7c3aed")}>
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
                placeholder="ابحث برقم الحجز، العميل أو المزود..."
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
                  <th style={thS}>المزود والخدمة</th>
                  <th style={thS}>الموعد والموقع</th>
                  <th style={thS}>العميل والتواصل</th>
                  <th style={thS}>الإجمالي</th>
                  <th style={thS}>صافي المزود</th>
                  <th style={thS}>عمولة المنصة</th>
                  <th style={thS}>الحالة</th>
                  <th style={{ ...thS, width: "80px" }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const currency = b.offerings?.currency || "SAR";
                  const fin = calculateFinancials(b, commissionRate);

                  const locationData = b.location || "";
                  const isUrl = locationData.includes("http");

                  // تجهيز التواريخ للعرض في الجدول
                  const startObj = b.appointment_date
                    ? new Date(b.appointment_date)
                    : null;
                  const endObj = b.end_time ? new Date(b.end_time) : null;

                  const sTime = startObj
                    ? startObj.toLocaleTimeString(dateLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  const eTime = endObj
                    ? endObj.toLocaleTimeString(dateLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  const startF = getFullFormattedDate(startObj, dateLocale);
                  const endF = endObj
                    ? getFullFormattedDate(endObj, dateLocale)
                    : null;

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
                        {b.offerings?.profiles?.username && (
                          <div
                            style={{
                              color: "#3b82f6",
                              fontSize: "0.85rem",
                              direction: "ltr",
                              display: "inline-block",
                              fontWeight: "bold",
                              marginTop: "4px",
                            }}
                          >
                            @{b.offerings.profiles.username}
                          </div>
                        )}
                        <div
                          style={{
                            color: "#475569",
                            fontSize: "0.85rem",
                            marginTop: "8px",
                            fontWeight: "bold",
                          }}
                        >
                          📌 خدمة: {b.offerings?.title || "غير محددة"}
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            fontFamily: "monospace",
                            borderTop: "1px solid #e2e8f0",
                            paddingTop: "5px",
                          }}
                        >
                          رقم الحجز: #{b.id.substring(0, 8).toUpperCase()}
                        </div>
                      </td>

                      {/* ✨ خلية الموعد والموقع الجديدة ✨ */}
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          verticalAlign: "top",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: "#f8fafc",
                            padding: "10px",
                            borderRadius: "10px",
                            border: "1px dashed #cbd5e1",
                          }}
                        >
                          {startF ? (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#1e293b",
                                lineHeight: "1.6",
                              }}
                            >
                              <strong style={{ color: "#64748b" }}>
                                البدء:
                              </strong>
                              <br />
                              📅 {startF.gregDate} ({sTime})<br />
                              <span
                                style={{
                                  color: "#64748b",
                                  fontSize: "0.75rem",
                                }}
                              >
                                🌙 {startF.hijriDate}
                              </span>
                            </div>
                          ) : (
                            <div
                              style={{ fontSize: "0.85rem", color: "#64748b" }}
                            >
                              تاريخ البدء غير محدد
                            </div>
                          )}

                          <div
                            style={{
                              borderTop: "1px solid #e2e8f0",
                              margin: "8px 0",
                            }}
                          ></div>

                          {endF ? (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#1e293b",
                                lineHeight: "1.6",
                              }}
                            >
                              <strong style={{ color: "#64748b" }}>
                                الانتهاء:
                              </strong>
                              <br />
                              🏁 {endF.gregDate} ({eTime})<br />
                              <span
                                style={{
                                  color: "#64748b",
                                  fontSize: "0.75rem",
                                }}
                              >
                                🌙 {endF.hijriDate}
                              </span>
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#64748b",
                                lineHeight: "1.6",
                              }}
                            >
                              <strong style={{ color: "#64748b" }}>
                                الانتهاء:
                              </strong>
                              <br />
                              🏁 نفس يوم البدء ({eTime || "غير محدد"})
                            </div>
                          )}

                          <div
                            style={{
                              borderTop: "1px solid #e2e8f0",
                              margin: "8px 0",
                            }}
                          ></div>

                          <div
                            style={{ fontSize: "0.85rem", fontWeight: "bold" }}
                          >
                            {locationData ? (
                              isUrl ? (
                                <a
                                  href={locationData}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "#2563eb",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  عرض الخريطة 🌍
                                </a>
                              ) : (
                                <span style={{ color: "#475569" }}>
                                  📍 {locationData}
                                </span>
                              )
                            ) : (
                              <span style={{ color: "#94a3b8" }}>
                                🌐 أونلاين / غير محدد
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

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
                            color: "#10b981",
                            fontSize: "1rem",
                          }}
                        >
                          🙋‍♂️ {b.profiles?.full_name || "عميل غير معروف"}
                        </div>
                        {b.profiles?.username && (
                          <div
                            style={{
                              color: "#059669",
                              fontSize: "0.85rem",
                              direction: "ltr",
                              display: "inline-block",
                              fontWeight: "bold",
                              marginTop: "4px",
                            }}
                          >
                            @{b.profiles.username}
                          </div>
                        )}
                        <div
                          style={{
                            color: "#475569",
                            fontSize: "0.85rem",
                            marginTop: "10px",
                            direction: "ltr",
                            textAlign: "right",
                            fontWeight: "bold",
                          }}
                        >
                          📞 {b.profiles?.phone || "لا يوجد رقم"}
                        </div>
                      </td>

                      <td
                        style={{ ...tdS, fontWeight: "bold", direction: "ltr" }}
                      >
                        {fin.baseTotal.toFixed(2)} {currency}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          color: "#10b981",
                          fontWeight: "bold",
                          direction: "ltr",
                        }}
                      >
                        {fin.providerNet.toFixed(2)} {currency}
                      </td>

                      {/* ✨ عمود عمولة المنصة - معدل لدعم الحجز الخاص ✨ */}
                      <td style={{ ...tdS, verticalAlign: "middle" }}>
                        <div
                          style={{
                            color: b.is_manual_booking
                              ? "#10b981"
                              : b.is_commission_paid
                              ? "#10b981"
                              : "#ef4444",
                            fontWeight: "900",
                            direction: "ltr",
                            fontSize: "1.1rem",
                          }}
                        >
                          {fin.platformCommission.toFixed(2)} {currency}
                        </div>

                        {b.is_manual_booking ? (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "0.8rem",
                              color: "#166534",
                              fontWeight: "bold",
                              backgroundColor: "#f0fdf4",
                              padding: "4px 8px",
                              borderRadius: "8px",
                              display: "inline-block",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            📞 حجز خاص (معفى)
                          </div>
                        ) : b.is_commission_paid ? (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "0.8rem",
                              color: "#059669",
                              fontWeight: "bold",
                              backgroundColor: "#d1fae5",
                              padding: "4px 8px",
                              borderRadius: "8px",
                              display: "inline-block",
                            }}
                          >
                            مسددة ✅
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              marginTop: "10px",
                              alignItems: "center",
                            }}
                          >
                            {/* 1. زر الواتساب المباشر */}
                            <a
                              href={`https://wa.me/${(
                                b.offerings?.profiles?.phone || ""
                              ).replace(/\D/g, "")}?text=${encodeURIComponent(
                                `مرحباً ${
                                  b.offerings?.profiles?.full_name ||
                                  "مزود الخدمة"
                                }،\n\nنود تذكيركم بضرورة سداد عمولة المنصة المستحقة بمبلغ *${fin.platformCommission.toFixed(
                                  2,
                                )} ${currency}*\nلرقم الحجز: #${b.id
                                  .substring(0, 8)
                                  .toUpperCase()}\n\nوشكراً لتعاونكم.`,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="مراسلة عبر الواتساب"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                gap: "4px",
                                backgroundColor: "#fef2f2",
                                color: "#ef4444",
                                border: "1px solid #fca5a5",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                textDecoration: "none",
                                cursor: "pointer",
                                transition: "0.2s",
                              }}
                              onMouseOver={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#fee2e2")
                              }
                              onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#fef2f2")
                              }
                            >
                              <span>💬</span> واتساب
                            </a>

                            {/* 2. المراسلة الداخلية في النظام */}
                            {activeMsgId === b.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "5px",
                                  width: "100%",
                                  marginTop: "5px",
                                  padding: "8px",
                                  backgroundColor: "#f8fafc",
                                  borderRadius: "10px",
                                  border: "1px dashed #cbd5e1",
                                }}
                              >
                                <input
                                  type="text"
                                  value={sysMsgText}
                                  onChange={(e) =>
                                    setSysMsgText(e.target.value)
                                  }
                                  placeholder="اكتب التنبيه هنا..."
                                  style={{
                                    ...smInput,
                                    padding: "6px",
                                    fontSize: "0.75rem",
                                    width: "auto",
                                  }}
                                />
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <button
                                    onClick={() =>
                                      handleSendSysMsg(
                                        b.offerings?.provider_id,
                                        b.id,
                                      )
                                    }
                                    style={{
                                      flex: 1,
                                      backgroundColor: "#3b82f6",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "6px",
                                      fontSize: "0.75rem",
                                      fontWeight: "bold",
                                      padding: "5px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    إرسال
                                  </button>
                                  <button
                                    onClick={() => setActiveMsgId(null)}
                                    style={{
                                      backgroundColor: "#f1f5f9",
                                      color: "#64748b",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      fontSize: "0.75rem",
                                      padding: "5px 10px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✖
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveMsgId(b.id);
                                  setSysMsgText(
                                    `تذكير ودي: نرجو منكم المبادرة بسداد عمولة المنصة (${fin.platformCommission.toFixed(
                                      2,
                                    )} ${currency}) للحجز المكتمل لضمان استمرار تقديم الخدمات.`,
                                  );
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "100%",
                                  gap: "4px",
                                  backgroundColor: "#fff",
                                  color: "#3b82f6",
                                  border: "1px solid #bfdbfe",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  transition: "0.2s",
                                }}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#eff6ff")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#fff")
                                }
                              >
                                <span>🔔</span> تنبيه بالنظام
                              </button>
                            )}
                          </div>
                        )}
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
                      colSpan="8"
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
}
