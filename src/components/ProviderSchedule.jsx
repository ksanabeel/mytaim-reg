import React, { useState } from "react";
import { supabase } from "../lib/supabase";

// ✨ مكون فرعي يمثل كل صف في الجدول للتحكم بحالته بشكل مستقل ✨
function BookingRow({ booking }) {
  const [status, setStatus] = useState(booking.status);
  const [proposedPrice, setProposedPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // دالة إرسال السعر للعميل
  const handleSendPrice = async () => {
    if (!proposedPrice || isNaN(proposedPrice) || proposedPrice <= 0) {
      return alert("الرجاء إدخال سعر صحيح.");
    }

    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "awaiting_client_approval",
        proposed_price: parseFloat(proposedPrice),
      })
      .eq("id", booking.id);

    setLoading(false);

    if (!error) {
      setStatus("awaiting_client_approval");
      alert("تم إرسال السعر بنجاح للعميل بانتظار موافقته! ✅");
    } else {
      alert("حدث خطأ: " + error.message);
    }
  };

  // دالة ذكية لإعطاء ألوان وتسميات للحالات
  const getStatusBadge = (s) => {
    switch (s) {
      case "confirmed":
        return { text: "مؤكد ✅", bg: "#ecfdf5", color: "#059669" };
      case "pending":
        return { text: "طلب جديد 🆕", bg: "#eff6ff", color: "#2563eb" };
      case "awaiting_pricing":
        return { text: "يطلب تسعير 💰", bg: "#fef3c7", color: "#d97706" };
      case "awaiting_client_approval":
        return { text: "بانتظار العميل ⏳", bg: "#f3e8ff", color: "#7e22ce" };
      case "cancelled":
        return { text: "ملغي ❌", bg: "#fef2f2", color: "#dc2626" };
      case "completed":
        return { text: "مكتمل 🏁", bg: "#f1f5f9", color: "#475569" };
      default:
        return { text: s, bg: "#f1f5f9", color: "#64748b" };
    }
  };

  const badge = getStatusBadge(status);

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "12px", fontWeight: "bold", fontSize: "0.9em" }}>
        {/* عرض التاريخ من appointment_date */}
        {booking.appointment_date
          ? new Date(booking.appointment_date).toLocaleDateString("ar-SA")
          : booking.appointment_date}
      </td>
      <td style={{ padding: "12px", fontSize: "0.85em", color: "#475569" }}>
        {/* عرض الوقت (إن وجد) أو التنبيه بأنه اختياري */}
        {booking.appointment_date && booking.appointment_date.includes("T00:00")
          ? "وقت مرن"
          : new Date(booking.appointment_date).toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
      </td>
      <td style={{ padding: "12px", fontWeight: "bold" }}>
        {booking.offerings?.title}
      </td>
      <td style={{ padding: "12px" }}>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.8em",
            backgroundColor: badge.bg,
            color: badge.color,
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
        >
          {badge.text}
        </span>
      </td>

      {/* ✨ عمود الإجراءات الجديد ✨ */}
      <td style={{ padding: "12px" }}>
        {status === "awaiting_pricing" ? (
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <input
              type="number"
              placeholder="السعر (ريال)"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              style={{
                width: "90px",
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: "0.85em",
              }}
            />
            <button
              onClick={handleSendPrice}
              disabled={loading}
              style={{
                backgroundColor: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.85em",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "..." : "إرسال"}
            </button>
          </div>
        ) : status === "awaiting_client_approval" ? (
          <span
            style={{ fontSize: "0.8em", color: "#64748b", fontWeight: "bold" }}
          >
            تم إرسال السعر: {booking.proposed_price || proposedPrice} ريال
          </span>
        ) : (
          <span style={{ fontSize: "0.8em", color: "#cbd5e1" }}>
            لا يوجد إجراء
          </span>
        )}
      </td>
    </tr>
  );
}

// المكون الرئيسي للجدول
export default function ProviderSchedule({ bookings }) {
  return (
    <div
      style={{
        marginTop: "20px",
        overflowX: "auto",
        backgroundColor: "#fff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "15px",
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", fontSize: "1rem", color: "#1e293b" }}>
        📅 جدول مواعيدي المنظم
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "right",
          fontSize: "0.9em",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "2px solid #e2e8f0",
              color: "#475569",
            }}
          >
            <th style={{ padding: "12px" }}>اليوم</th>
            <th style={{ padding: "12px" }}>الوقت</th>
            <th style={{ padding: "12px" }}>الخدمة</th>
            <th style={{ padding: "12px" }}>الحالة</th>
            <th style={{ padding: "12px" }}>الإجراءات</th> {/* عمود جديد */}
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                لا توجد حجوزات مجدولة بعد..
              </td>
            </tr>
          ) : (
            bookings.map((b) => <BookingRow key={b.id} booking={b} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
