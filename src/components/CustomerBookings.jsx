import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function CustomerBookingCard({ booking }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(booking.status);

  const handleApproveQuote = async () => {
    setLoading(true);
    try {
      await supabase
        .from("bookings")
        .update({ status: "client_approved" })
        .eq("id", booking.id);
      setStatus("client_approved");
      alert("لقد وافقت على التكاليف الإضافية! تم إشعار المزود للقبول النهائي.");
    } finally {
      setLoading(false);
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
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h4>{booking.offerings?.title}</h4>
        <span style={{ fontWeight: "bold" }}>
          {booking.offerings?.price} ريال
        </span>
      </div>

      {/* عرض التكاليف الإضافية إذا وجدت */}
      {(booking.extra_costs > 0 || booking.extra_details) && (
        <div
          style={{
            backgroundColor: "#eff6ff",
            padding: "12px",
            borderRadius: "8px",
            margin: "10px 0",
            border: "1px solid #dbeafe",
          }}
        >
          <strong style={{ color: "#1e40af", fontSize: "0.9em" }}>
            💰 عرض مالي من المزود:
          </strong>
          <p style={{ margin: "5px 0" }}>
            تكاليف إضافية: <strong>{booking.extra_costs} ريال</strong>
          </p>
          <p style={{ margin: "5px 0", fontSize: "0.85em" }}>
            التفاصيل: {booking.extra_details}
          </p>
          <p style={{ margin: "5px 0", fontSize: "0.85em" }}>
            طريقة الدفع المطلوبة: <strong>{booking.payment_method}</strong>
          </p>

          {status === "waiting_client" && (
            <button
              onClick={handleApproveQuote}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "10px",
                backgroundColor: "#2563eb",
                color: "white",
                padding: "10px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              الموافقة على التكاليف والدفع ✅
            </button>
          )}
        </div>
      )}

      <p style={{ fontSize: "0.9em" }}>
        الحالة: <strong>{status}</strong>
      </p>
    </div>
  );
}

export default function CustomerBookings({ session }) {
  const [myBookings, setMyBookings] = useState([]);
  useEffect(() => {
    supabase
      .from("bookings")
      .select("*, offerings!inner(*)")
      .eq("customer_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMyBookings(data);
      });
  }, [session.user.id]);

  return (
    <div>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "15px" }}>
        📦 سجل طلباتي
      </h2>
      {myBookings.map((b) => (
        <CustomerBookingCard key={b.id} booking={b} />
      ))}
    </div>
  );
}
