import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function BookingRow({
  booking,
  onRefresh,
  isProviderView,
  allowTextReviews = true,
}) {
  const [extraCosts, setExtraCosts] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [isRatingMode, setIsRatingMode] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const updateStatus = async (newStatus, extra = null, reason = null) => {
    const updatePayload = { status: newStatus };
    if (extra !== null) updatePayload.additional_costs = Number(extra) || 0;
    if (reason !== null) updatePayload.cancellation_reason = reason;

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", booking.id);
    if (!error) {
      alert("تم التحديث بنجاح ✅");
      setIsCanceling(false);
      onRefresh();
    } else {
      alert("خطأ: " + error.message);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) return alert("يرجى كتابة سبب الإلغاء ✍️");
    updateStatus("cancelled", null, cancelReason);
  };

  const submitRating = async () => {
    if (ratingValue === 0) return alert("يرجى تحديد عدد النجوم أولاً ⭐");

    // إذا كان المدير موقف التعليقات، نجبر النص على أن يكون فارغاً
    const finalReview = allowTextReviews ? reviewText : null;

    const { error } = await supabase
      .from("bookings")
      .update({
        rating: ratingValue,
        review: finalReview,
      })
      .eq("id", booking.id);

    if (!error) {
      const providerId = booking.offerings?.provider_id;
      if (providerId) {
        const { data: allRatings } = await supabase
          .from("bookings")
          .select("rating, offerings!inner(provider_id)")
          .eq("offerings.provider_id", providerId)
          .not("rating", "is", null);

        if (allRatings && allRatings.length > 0) {
          const avg =
            allRatings.reduce((acc, curr) => acc + curr.rating, 0) /
            allRatings.length;
          await supabase
            .from("profiles")
            .update({ rating: avg })
            .eq("id", providerId);
        }
      }
      alert("شكراً لتقييمك! تم حفظ التقييم بنجاح ✅");
      setIsRatingMode(false);
      onRefresh();
    } else {
      alert("خطأ في حفظ التقييم: " + error.message);
    }
  };

  const basePrice = Number(booking.offerings?.price) || 0;
  const qty = booking.quantity || 1;
  const subTotal = basePrice * qty;
  const modelLabels = {
    fixed: "مهمة",
    hourly: "ساعة",
    period: "فترة",
    daily: "يوم",
    monthly: "شهر",
    yearly: "سنة",
    free: "تطوع",
  };
  const label = modelLabels[booking.offerings?.pricing_model || "fixed"];
  const canCancel =
    booking.status !== "completed" && booking.status !== "cancelled";

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={tdS}>
        <strong>
          {isProviderView
            ? booking.profiles?.full_name
            : booking.offerings?.profiles?.full_name}
        </strong>
      </td>
      <td style={tdS}>
        <div style={{ fontWeight: "bold" }}>{booking.offerings?.title}</div>
        <div
          style={{ marginTop: "5px", fontSize: "0.75rem", color: "#3b82f6" }}
        >
          {booking.location?.includes("http") ? (
            <a
              href={booking.location}
              target="_blank"
              rel="noreferrer"
              style={mapBtn}
            >
              📍 عرض الخريطة
            </a>
          ) : (
            `📍 ${booking.location}`
          )}
        </div>
      </td>
      <td style={{ ...tdS, fontSize: "0.75rem" }}>
        <div
          style={{ color: "#10b981", fontWeight: "bold", marginBottom: "3px" }}
        >
          البدء: {new Date(booking.appointment_date).toLocaleString("ar-SA")}
        </div>
        {booking.end_time && (
          <div style={{ color: "#ef4444", fontWeight: "bold" }}>
            الانتهاء: {new Date(booking.end_time).toLocaleString("ar-SA")}
          </div>
        )}
      </td>
      <td style={tdS}>
        <div
          style={{
            color:
              booking.offerings?.pricing_model === "free"
                ? "#10b981"
                : "#7c3aed",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          {booking.offerings?.pricing_model === "free"
            ? "مجاني"
            : `${subTotal} ر.س`}
        </div>
        <div style={{ fontSize: "0.65rem", color: "#64748b" }}>
          {qty} {label} × {basePrice}
        </div>
        {booking.additional_costs > 0 && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#ef4444",
              marginTop: "5px",
              background: "#fef2f2",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            + {booking.additional_costs} إضافي
          </div>
        )}
      </td>
      <td style={tdS}>
        {isCanceling ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              backgroundColor: "#fef2f2",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
            }}
          >
            <label
              style={{
                fontSize: "0.75rem",
                color: "#ef4444",
                fontWeight: "bold",
              }}
            >
              لماذا تريد الإلغاء؟
            </label>
            <input
              type="text"
              placeholder="اكتب السبب.."
              style={smInput}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div style={{ display: "flex", gap: "5px" }}>
              <button onClick={handleCancelSubmit} style={btn("#ef4444")}>
                تأكيد
              </button>
              <button
                onClick={() => setIsCanceling(false)}
                style={btn("#94a3b8")}
              >
                تراجع
              </button>
            </div>
          </div>
        ) : (
          <>
            {booking.status === "pending" && isProviderView && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <button
                  onClick={() => updateStatus("confirmed", 0)}
                  style={btn("#10b981")}
                >
                  قبول الطلب
                </button>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input
                    type="number"
                    placeholder="إضافي.."
                    style={smInput}
                    value={extraCosts}
                    onChange={(e) => setExtraCosts(e.target.value)}
                  />
                  <button
                    onClick={() => updateStatus("negotiating", extraCosts)}
                    style={btn("#f59e0b")}
                  >
                    تسعيرة
                  </button>
                </div>
              </div>
            )}

            {booking.status === "negotiating" && !isProviderView && (
              <div
                style={{
                  textAlign: "center",
                  backgroundColor: "#ecfdf5",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    marginBottom: "8px",
                    color: "#059669",
                    fontWeight: "bold",
                  }}
                >
                  الإجمالي: {subTotal + booking.additional_costs} ر.س
                </div>
                <button
                  onClick={() => updateStatus("confirmed")}
                  style={btn("#10b981")}
                >
                  أوافق وأؤكد ✅
                </button>
              </div>
            )}

            {booking.status === "confirmed" && (
              <div>
                {isProviderView ? (
                  <button
                    onClick={() => updateStatus("completed")}
                    style={btn("#3b82f6")}
                  >
                    تأكيد التنفيذ ✅
                  </button>
                ) : (
                  <span style={badge("#eff6ff", "#2563eb")}>📅 موعد مؤكد</span>
                )}
              </div>
            )}

            {booking.status === "completed" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span style={badge("#ecfdf5", "#059669")}>✅ تم التنفيذ</span>

                {booking.rating ? (
                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #fde68a",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        color: "#f59e0b",
                        fontSize: "1rem",
                        textAlign: "center",
                        marginBottom: "3px",
                      }}
                    >
                      {"⭐".repeat(booking.rating)}
                    </div>
                    {/* إخفاء التعليق إذا منعه المدير */}
                    {booking.review && allowTextReviews && (
                      <div
                        style={{
                          color: "#92400e",
                          fontSize: "0.7rem",
                          textAlign: "center",
                          fontStyle: "italic",
                        }}
                      >
                        "{booking.review}"
                      </div>
                    )}
                  </div>
                ) : (
                  !isProviderView &&
                  (isRatingMode ? (
                    <div
                      style={{
                        backgroundColor: "#fffbeb",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid #fde68a",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "5px",
                          marginBottom: "8px",
                          direction: "ltr",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            onClick={() => setRatingValue(star)}
                            style={{
                              cursor: "pointer",
                              fontSize: "1.5rem",
                              transition: "0.2s",
                              color:
                                star <= ratingValue ? "#f59e0b" : "#cbd5e1",
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {/* 🛡️ إخفاء حقل النص إذا منع المدير التعليقات */}
                      {allowTextReviews && (
                        <textarea
                          placeholder="اكتب ملاحظاتك عن الخدمة (اختياري).."
                          style={{
                            ...smInput,
                            height: "50px",
                            marginBottom: "8px",
                          }}
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                        />
                      )}
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={submitRating} style={btn("#f59e0b")}>
                          حفظ التقييم
                        </button>
                        <button
                          onClick={() => setIsRatingMode(false)}
                          style={btn("#94a3b8")}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsRatingMode(true)}
                      style={{
                        ...btn("transparent"),
                        color: "#f59e0b",
                        border: "1px dashed #f59e0b",
                        marginTop: "5px",
                      }}
                    >
                      ⭐ تقييم الخدمة
                    </button>
                  ))
                )}
              </div>
            )}

            {booking.status === "pending" && !isProviderView && (
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                ⏳ بانتظار المزود..
              </span>
            )}
            {canCancel && (
              <button
                onClick={() => setIsCanceling(true)}
                style={{
                  ...btn("transparent"),
                  color: "#ef4444",
                  border: "1px dashed #ef4444",
                  marginTop: "8px",
                }}
              >
                {isProviderView && booking.status === "pending"
                  ? "رفض الطلب ❌"
                  : "إلغاء الطلب ❌"}
              </button>
            )}
          </>
        )}

        {booking.status === "cancelled" && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
            }}
          >
            <div
              style={{
                color: "#ef4444",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              ❌ ملغى
            </div>
            {booking.cancellation_reason && (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#991b1b",
                  marginTop: "5px",
                }}
              >
                <strong>السبب:</strong> {booking.cancellation_reason}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

const tdS = {
  padding: "12px 10px",
  textAlign: "center",
  verticalAlign: "middle",
};
const mapBtn = {
  fontSize: "0.7rem",
  color: "#fff",
  backgroundColor: "#3b82f6",
  padding: "5px 10px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
};
const smInput = {
  width: "100%",
  padding: "6px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "0.75rem",
  textAlign: "center",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const btn = (bg) => ({
  backgroundColor: bg,
  color: bg === "transparent" ? "inherit" : "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: "bold",
  width: "100%",
});
const badge = (bg, color) => ({
  padding: "8px 12px",
  backgroundColor: bg,
  color: color,
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "0.8rem",
  display: "inline-block",
});
