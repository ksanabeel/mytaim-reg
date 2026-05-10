import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ✨ مكون بطاقة الحجز المطور ✨
function BookingRow({ booking, onRefresh }) {
  const [status, setStatus] = useState(booking.status);
  const [proposedPrice, setProposedPrice] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [loading, setLoading] = useState(false);

  // 💰 الحسبة المالية الذكية لمنع الخطأ (3000 ريال)
  const calculateTotal = () => {
    // إذا المزود حط سعر تفاوض، نعتبره هو الإجمالي النهائي للكل
    if (booking.proposed_price && booking.proposed_price > 0) {
      return booking.proposed_price;
    }
    // وإلا، نضرب السعر الفردي في العدد
    return (booking.offerings?.price || 0) * (booking.quantity || 1);
  };

  const currentTotal = calculateTotal();

  // ✅ قبول الطلب
  const handleAccept = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);
    setLoading(false);
    if (!error) {
      setStatus("confirmed");
      onRefresh();
      alert("تم تأكيد الحجز! ✅");
    }
  };

  // 🏁 إتمام الخدمة (هنا يتم حساب الأرباح الحقيقية)
  const handleComplete = async () => {
    if (
      !window.confirm(
        "هل تأكدت من إنهاء الخدمة؟ سيتم تحويل الأرباح للمحفظة الآن.",
      )
    )
      return;
    setLoading(true);

    try {
      // 1. جلب نسبة العمولة من جدول platform_settings (اسم جدولك الصحيح)
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("commission_rate")
        .eq("id", 1)
        .single();
      const rate = settings?.commission_rate || 0.1; // افتراضي 10%

      // 2. حساب المبالغ
      const commissionAmount = currentTotal * rate;
      const netProfit = currentTotal - commissionAmount;

      // 3. تحديث محفظة المزود (Profiles)
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_earnings, commission_owed")
        .eq("id", booking.offerings.provider_id)
        .single();

      await supabase
        .from("profiles")
        .update({
          total_earnings: (profile?.total_earnings || 0) + netProfit,
          commission_owed: (profile?.commission_owed || 0) + commissionAmount,
        })
        .eq("id", booking.offerings.provider_id);

      // 4. تحديث حالة الطلب
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      setStatus("completed");
      alert(
        `تم الإنجاز! ✅ دخل جيبك: ${netProfit} ريال | عمولة المنصة: ${commissionAmount} ريال`,
      );
      onRefresh();
    } catch (err) {
      alert("خطأ في الحسابات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPrice = async () => {
    if (!proposedPrice || proposedPrice <= 0) return alert("أدخل سعر صحيح");
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "awaiting_client_approval",
        proposed_price: parseFloat(proposedPrice),
        extra_details: extraDetails,
      })
      .eq("id", booking.id);
    setLoading(false);
    if (!error) {
      setStatus("awaiting_client_approval");
      setIsNegotiating(false);
      onRefresh();
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "confirmed":
        return { text: "مؤكد ✅", bg: "#ecfdf5", color: "#059669" };
      case "pending":
        return { text: "طلب جديد 🆕", bg: "#eff6ff", color: "#2563eb" };
      case "awaiting_client_approval":
        return { text: "بانتظار العميل ⏳", bg: "#f3e8ff", color: "#7e22ce" };
      case "completed":
        return { text: "مكتمل 🏁", bg: "#f1f5f9", color: "#475569" };
      case "cancelled":
        return { text: "ملغي ❌", bg: "#fef2f2", color: "#dc2626" };
      default:
        return { text: s, bg: "#f1f5f9", color: "#64748b" };
    }
  };

  const badge = getStatusBadge(status);

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0, fontWeight: "900" }}>
          {booking.offerings?.title}
        </h4>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.85em",
            backgroundColor: badge.bg,
            color: badge.color,
            fontWeight: "bold",
          }}
        >
          {badge.text}
        </span>
      </div>

      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "12px",
          borderRadius: "10px",
          fontSize: "0.85rem",
        }}
      >
        <strong>💰 إجمالي القيمة:</strong> {currentTotal} ريال
        <span
          style={{ color: "#64748b", fontSize: "0.75rem", marginRight: "10px" }}
        >
          العدد: {booking.quantity})
        </span>
      </div>

      <div
        style={{
          borderTop: "1px dashed #cbd5e1",
          paddingTop: "15px",
          display: "flex",
          gap: "10px",
        }}
      >
        {loading ? (
          <span>⏳ جاري العمل...</span>
        ) : (
          <>
            {(status === "pending" || status === "awaiting_pricing") &&
              !isNegotiating && (
                <>
                  <button
                    onClick={handleAccept}
                    style={{
                      flex: 1,
                      backgroundColor: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    قبول ✅
                  </button>
                  <button
                    onClick={() => setIsNegotiating(true)}
                    style={{
                      flex: 1,
                      border: "1px solid #3b82f6",
                      color: "#3b82f6",
                      borderRadius: "8px",
                      padding: "10px",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    تفاوض 💬
                  </button>
                </>
              )}

            {isNegotiating && (
              <div
                style={{
                  width: "100%",
                  background: "#eff6ff",
                  padding: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <input
                  type="number"
                  placeholder="السعر الإجمالي للكل"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                  }}
                />
                <button
                  onClick={handleSendPrice}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  إرسال للعميل 🚀
                </button>
                <button
                  onClick={() => setIsNegotiating(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  إلغاء
                </button>
              </div>
            )}

            {status === "confirmed" && (
              <button
                onClick={handleComplete}
                style={{
                  width: "100%",
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                إتمام وإنجاز الخدمة 🏁
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ✨ المكون الرئيسي المطور ✨
export default function ProviderSchedule({ bookings, session, fetchBookings }) {
  // 📡 رادار التحديث اللحظي
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("realtime_bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchBookings();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session, fetchBookings]);

  return (
    <div
      style={{
        marginTop: "20px",
        backgroundColor: "#f8fafc",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", fontWeight: "900" }}>
        لوحة تحكم أعمالي 💼
      </h3>
      <p
        style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "20px" }}
      >
        إدارة الطلبات والحسابات المالية بدقة.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {!bookings || bookings.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#94a3b8",
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "2px dashed #e2e8f0",
            }}
          >
            لا توجد طلبات..
          </div>
        ) : (
          bookings.map((b) => (
            <BookingRow key={b.id} booking={b} onRefresh={fetchBookings} />
          ))
        )}
      </div>
    </div>
  );
}
