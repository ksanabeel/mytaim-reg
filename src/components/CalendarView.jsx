import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import BookingRow from "./BookingRow"; // ✨ استدعاء سطر الحجز للتحكم به من التقويم

export default function CalendarView({
  bookings = [],
  onRefresh,
  userId,
  allowTextReviews = true,
}) {
  const { t, i18n } = useTranslation();
  const [curr, setCurr] = useState(new Date());

  // ✨ جلب الـ ID الخاص بالمستخدم الحالي في حال لم يتم تمريره من App.jsx ✨
  const [localUserId, setLocalUserId] = useState(userId);
  useEffect(() => {
    if (!localUserId) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) setLocalUserId(data.session.user.id);
      });
    }
  }, [localUserId]);

  // ✨ حالة النافذة المنبثقة للتقويم ✨
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [managingBookingId, setManagingBookingId] = useState(null); // لمعرفة أي حجز يتم إدارته حالياً

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth(curr.getFullYear(), curr.getMonth()); d++)
    days.push(d);

  const getDateString = (day) => {
    if (!day) return null;
    return `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getStatus = (day) => {
    const dStr = getDateString(day);
    if (!dStr) return "free";
    const dayB = bookings.filter((b) => b.appointment_date?.startsWith(dStr));
    if (dayB.length === 0) return "free";
    if (dayB.some((b) => b.status === "confirmed" || b.status === "completed"))
      return "ok";
    if (dayB.some((b) => b.status === "pending" || b.status === "negotiating"))
      return "wait";
    return "free";
  };

  const handleDayClick = (day) => {
    const dStr = getDateString(day);
    if (!dStr) return;

    const bks = bookings.filter((b) => b.appointment_date?.startsWith(dStr));
    if (bks.length > 0) {
      setDayBookings(bks);
      setSelectedDate(dStr);
      setManagingBookingId(null); // إغلاق أي نافذة إدارة مفتوحة مسبقاً
    }
  };

  const handlePrintInvoice = (b) => {
    const isRTL = i18n.language === "ar";
    const statusText =
      b.status === "confirmed"
        ? isRTL
          ? "مؤكد"
          : "Confirmed"
        : b.status === "completed"
          ? isRTL
            ? "مكتمل"
            : "Completed"
          : b.status === "cancelled"
            ? isRTL
              ? "ملغى"
              : "Cancelled"
            : isRTL
              ? "قيد المعالجة"
              : "Pending";

    const qty = b.quantity || 1;
    const price = Number(b.offerings?.price) || 0;
    const addCosts = Number(b.additional_costs) || 0;
    const total = price * qty + addCosts;

    const printWindow = window.open("", "_blank", "width=800,height=800");
    printWindow.document.write(`
      <html dir="${isRTL ? "rtl" : "ltr"}">
      <head>
        <title>فاتورة حجز #${b.id.substring(0, 6)}</title>
        <style>
          body { font-family: system-ui; padding: 40px; color: #1e293b; }
          .invoice-box { border: 2px dashed #cbd5e1; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; background: #fff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
          h2, p { margin: 0 0 10px 0; }
        </style>
      </head>
      <body style="background: #f8fafc;">
        <div class="invoice-box">
          <div class="header">
            <h2>فاتورة حجز #${b.id.substring(0, 6)}</h2>
            <span style="background: #7c3aed; color: white; padding: 8px 15px; border-radius: 8px; font-weight: bold;">${statusText}</span>
          </div>
          <p><strong>الخدمة:</strong> ${b.offerings?.title || "غير متوفر"}</p>
          <p><strong>تاريخ ووقت البدء:</strong> ${new Date(b.appointment_date).toLocaleString(isRTL ? "ar-SA" : "en-US")}</p>
          <hr style="border: 1px solid #f1f5f9; margin: 20px 0;" />
          <div style="display: flex; justify-content: space-between;">
            <p><strong>التكلفة الأساسية:</strong></p> <p>${price * qty} ر.س</p>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <p><strong>التكاليف الإضافية:</strong></p> <p>+ ${addCosts} ر.س</p>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid #cbd5e1;">
            <h3 style="margin:0; color: #1e293b;"><strong>الإجمالي:</strong></h3> 
            <h3 style="margin:0; color: #10b981;">${total} ر.س</h3>
          </div>
        </div>
        <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    if (status === "confirmed")
      return {
        text: i18n.language === "ar" ? "مؤكد" : "Confirmed",
        bg: "#ecfdf5",
        color: "#059669",
        border: "#10b981",
      };
    if (status === "completed")
      return {
        text: i18n.language === "ar" ? "مكتمل" : "Completed",
        bg: "#ecfdf5",
        color: "#059669",
        border: "#10b981",
      };
    if (status === "cancelled")
      return {
        text: i18n.language === "ar" ? "ملغى" : "Cancelled",
        bg: "#fef2f2",
        color: "#ef4444",
        border: "#f87171",
      };
    return {
      text: i18n.language === "ar" ? "قيد المعالجة" : "Pending",
      bg: "#fffbeb",
      color: "#d97706",
      border: "#fcd34d",
    };
  };

  const dateLocale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const isRTL = i18n.language === "ar";
  const weekDays = [
    t("sun"),
    t("mon"),
    t("tue"),
    t("wed"),
    t("thu"),
    t("fri"),
    t("sat"),
  ];

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "20px",
        direction: isRTL ? "rtl" : "ltr",
        border: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() - 1)))}
          style={navB}
        >
          {isRTL ? "▶" : "◀"}
        </button>

        <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#7c3aed" }}>
          {curr.toLocaleString(dateLocale, { month: "long", year: "numeric" })}
        </h3>

        <button
          onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() + 1)))}
          style={navB}
        >
          {isRTL ? "◀" : "▶"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px",
        }}
      >
        {weekDays.map((d, index) => (
          <div
            key={index}
            style={{
              fontSize: "0.85rem",
              color: "#64748b",
              textAlign: "center",
              fontWeight: "bold",
              marginBottom: "10px",
              paddingBottom: "10px",
              borderBottom: "2px solid #f1f5f9",
            }}
          >
            {d}
          </div>
        ))}

        {days.map((d, i) => {
          const s = getStatus(d);
          const hasBookings = s !== "free";

          return (
            <div
              key={i}
              onClick={() => handleDayClick(d)}
              style={{
                padding: "15px 0",
                borderRadius: "12px",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: "bold",
                cursor: hasBookings ? "pointer" : "default",
                backgroundColor:
                  s === "ok"
                    ? "#10b981"
                    : s === "wait"
                      ? "#f59e0b"
                      : "transparent",
                color: hasBookings ? "white" : "#1e293b",
                border: d
                  ? hasBookings
                    ? "none"
                    : "1px solid #f1f5f9"
                  : "none",
                opacity: d ? 1 : 0,
                transform: hasBookings ? "scale(1.02)" : "scale(1)",
                boxShadow: hasBookings ? "0 4px 10px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s ease",
              }}
              title={hasBookings ? "اضغط لعرض وإدارة الحجوزات" : ""}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* ✨ نافذة عرض الحجوزات عند الضغط على يوم ✨ */}
      {selectedDate && (
        <div style={modalOverlay}>
          <div style={modalContent}>
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
              <h3 style={{ margin: 0, color: "#7c3aed" }}>
                📅 حجوزات يوم:{" "}
                {new Date(selectedDate).toLocaleDateString(dateLocale)}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
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
                flexDirection: "column",
                gap: "15px",
                maxHeight: "65vh",
                overflowY: "auto",
                paddingRight: "5px",
                paddingLeft: "5px",
              }}
            >
              {dayBookings.map((b) => {
                const badge = getStatusBadge(b.status);
                const isProvider = localUserId === b.offerings?.provider_id;

                return (
                  <div
                    key={b.id}
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
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: "0 0 5px 0",
                            color: "#1e293b",
                            fontSize: "0.95rem",
                          }}
                        >
                          📌 {b.offerings?.title || "الخدمة"}
                        </h4>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            fontWeight: "bold",
                          }}
                        >
                          رقم الحجز: #{b.id.substring(0, 6)}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            marginTop: "3px",
                          }}
                        >
                          🕒{" "}
                          {new Date(b.appointment_date).toLocaleTimeString(
                            dateLocale,
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.text}
                        </span>

                        {/* ✨ زر فتح إدارة الحجز ✨ */}
                        <button
                          onClick={() =>
                            setManagingBookingId(
                              managingBookingId === b.id ? null : b.id,
                            )
                          }
                          style={{
                            backgroundColor:
                              managingBookingId === b.id
                                ? "#94a3b8"
                                : "#f59e0b",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            transition: "0.2s",
                          }}
                        >
                          {managingBookingId === b.id
                            ? "❌ إغلاق الإدارة"
                            : "⚙️ إدارة"}
                        </button>

                        <button
                          onClick={() => handlePrintInvoice(b)}
                          style={{
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          🖨️ طباعة
                        </button>
                      </div>
                    </div>

                    {/* ✨ استدعاء واجهة إدارة الحجز الكاملة هنا بذكاء ✨ */}
                    {managingBookingId === b.id && (
                      <div
                        style={{
                          width: "100%",
                          marginTop: "15px",
                          borderTop: "1px dashed #cbd5e1",
                          paddingTop: "15px",
                          overflowX: "auto",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.8rem",
                            backgroundColor: "#fff",
                            borderRadius: "10px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          <tbody style={{ textAlign: "center" }}>
                            <BookingRow
                              booking={b}
                              onRefresh={() => {
                                if (onRefresh) onRefresh();
                                else window.location.reload(); // تحديث الصفحة لتأكيد البيانات لو لم تكن الدالة ممررة
                              }}
                              isProviderView={isProvider}
                              allowTextReviews={allowTextReviews}
                            />
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navB = {
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  borderRadius: "8px",
  padding: "6px 12px",
  cursor: "pointer",
  color: "#475569",
  fontWeight: "bold",
  transition: "0.2s",
};

// تنسيقات النافذة المنبثقة (تم تكبيرها قليلاً لتستوعب تفاصيل الإدارة براحة)
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 4000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "850px",
  maxHeight: "85vh",
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
};
