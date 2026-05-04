import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function CustomerBookingCard({ booking }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(booking.status);

  // دالة الموافقة على السعر المقترح من المزود
  const handleApproveQuote = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "pending" }) // نحولها لـ pending لكي يراها المزود كطلب جديد بانتظار قبوله النهائي
        .eq("id", booking.id);

      if (!error) {
        setStatus("pending");
        alert("✅ تم قبول السعر بنجاح! تم إشعار المزود لتأكيد الحجز.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ترجمة الحالات للعميل بشكل جذاب
  const getStatusLabel = (s) => {
    switch (s) {
      case "awaiting_pricing":
        return "⏳ بانتظار تسعير المزود";
      case "awaiting_client_approval":
        return "💰 وصلك عرض سعر - بانتظار موافقتك";
      case "pending":
        return "📨 تم الإرسال وبانتظار قبول المزود";
      case "confirmed":
        return "✅ تم التأكيد";
      case "cancelled":
        return "❌ ملغي";
      case "completed":
        return "🏁 مكتمل";
      default:
        return s;
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        padding: "15px",
        borderRadius: "12px",
        backgroundColor: "#fff",
        marginBottom: "15px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>{booking.offerings?.title}</h4>
        <span
          style={{
            fontWeight: "bold",
            color: booking.price_upon_agreement ? "#3b82f6" : "#1e293b",
          }}
        >
          {booking.status === "awaiting_pricing"
            ? "سيتم التسعير قريباً"
            : `${booking.proposed_price || booking.offerings?.price} ريال`}
        </span>
      </div>

      <div style={{ margin: "10px 0", fontSize: "0.85em", color: "#64748b" }}>
        📅 الموعد:{" "}
        {new Date(booking.appointment_date).toLocaleDateString("ar-SA")}
      </div>

      {/* قسم عرض السعر المقترح (عندما يقوم المزود بالتسعير) */}
      {status === "awaiting_client_approval" && (
        <div
          style={{
            backgroundColor: "#fff7ed",
            padding: "12px",
            borderRadius: "8px",
            margin: "10px 0",
            border: "1px solid #ffedd5",
          }}
        >
          <strong style={{ color: "#9a3412", fontSize: "0.9em" }}>
            🤝 عرض سعر جديد من المزود:
          </strong>
          <p
            style={{ margin: "5px 0", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            {booking.proposed_price} ريال
          </p>
          {booking.extra_details && (
            <p style={{ margin: "5px 0", fontSize: "0.85em" }}>
              ملاحظات المزود: {booking.extra_details}
            </p>
          )}

          <button
            onClick={handleApproveQuote}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "10px",
              backgroundColor: "#10b981",
              color: "white",
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "جاري التأكيد..." : "الموافقة على هذا السعر ✅"}
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            padding: "4px 10px",
            borderRadius: "20px",
            backgroundColor:
              status === "awaiting_client_approval" ? "#fee2e2" : "#f1f5f9",
            color:
              status === "awaiting_client_approval" ? "#ef4444" : "#475569",
            fontWeight: "bold",
          }}
        >
          {getStatusLabel(status)}
        </span>
      </div>
    </div>
  );
}

export default function CustomerBookings({ session }) {
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, offerings!inner(*)")
        .eq("customer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) setMyBookings(data);
      setLoading(false);
    };

    fetchBookings();
  }, [session.user.id]);

  if (loading)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        ⏳ جاري تحميل طلباتك...
      </div>
    );

  return (
    <div style={{ padding: "10px" }}>
      <h2
        style={{
          fontSize: "1.2rem",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        📦 سجل طلباتي
      </h2>

      {myBookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          لا توجد لديك طلبات حالياً..
        </div>
      ) : (
        myBookings.map((b) => <CustomerBookingCard key={b.id} booking={b} />)
      )}
    </div>
  );
}
