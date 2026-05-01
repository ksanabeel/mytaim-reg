import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

export default function BookingRow({
  booking,
  onRefresh,
  isProviderView,
  allowTextReviews = true,
}) {
  const { t, i18n } = useTranslation();
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
      alert(t("update_success_booking"));
      setIsCanceling(false);
      onRefresh();
    } else {
      alert(t("error_prefix") + error.message);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) return alert(t("cancel_reason_required"));
    updateStatus("cancelled", null, cancelReason);
  };

  const submitRating = async () => {
    if (ratingValue === 0) return alert(t("rating_required"));

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
      alert(t("rating_success"));
      setIsRatingMode(false);
      onRefresh();
    } else {
      alert(t("rating_error") + error.message);
    }
  };

  const basePrice = Number(booking.offerings?.price) || 0;
  const qty = booking.quantity || 1;
  const subTotal = basePrice * qty;
  const modelLabels = {
    fixed: t("task"),
    hourly: t("hour"),
    period: t("period"),
    daily: t("day"),
    monthly: t("month"),
    yearly: t("year"),
    free: t("volunteer"),
  };
  const label = modelLabels[booking.offerings?.pricing_model || "fixed"];
  const canCancel =
    booking.status !== "completed" && booking.status !== "cancelled";

  const formatDate = (dateString) => {
    const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
    return new Date(dateString).toLocaleString(locale);
  };

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={tdS}>
        <strong>
          {isProviderView
            ? booking.profiles?.full_name
            : booking.offerings?.profiles?.full_name}
        </strong>

        {/* ✨ إظهار رقم تواصل العميل لمقدم الخدمة فقط ✨ */}
        {isProviderView && booking.client_contact && (
          <div style={{ marginTop: "8px" }}>
            <a
              href={`https://wa.me/${booking.client_contact.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.7rem",
                color: "#059669",
                backgroundColor: "#ecfdf5",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #10b981",
                textDecoration: "none",
                fontWeight: "bold",
                display: "inline-block",
                direction: "ltr",
              }}
              title="تواصل عبر واتساب"
            >
              📞 {booking.client_contact}
            </a>
          </div>
        )}
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
              {t("view_map")}
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
          {t("start_time_label")} {formatDate(booking.appointment_date)}
        </div>
        {booking.end_time && (
          <div style={{ color: "#ef4444", fontWeight: "bold" }}>
            {t("end_time_label")} {formatDate(booking.end_time)}
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
            direction: i18n.language === "en" ? "ltr" : "rtl",
          }}
        >
          {booking.offerings?.pricing_model === "free"
            ? t("free")
            : `${subTotal} ${t("currency_sar")}`}
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
            + {booking.additional_costs} {t("extra_cost_label")}
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
              {t("cancel_reason_question")}
            </label>
            <input
              type="text"
              placeholder={t("type_reason_placeholder")}
              style={smInput}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div style={{ display: "flex", gap: "5px" }}>
              <button onClick={handleCancelSubmit} style={btn("#ef4444")}>
                {t("confirm_btn")}
              </button>
              <button
                onClick={() => setIsCanceling(false)}
                style={btn("#94a3b8")}
              >
                {t("cancel_back_btn")}
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
                  {t("accept_order")}
                </button>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input
                    type="number"
                    placeholder={t("extra_placeholder")}
                    style={smInput}
                    value={extraCosts}
                    onChange={(e) => setExtraCosts(e.target.value)}
                  />
                  <button
                    onClick={() => updateStatus("negotiating", extraCosts)}
                    style={btn("#f59e0b")}
                  >
                    {t("negotiate_price")}
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
                    direction: i18n.language === "en" ? "ltr" : "rtl",
                  }}
                >
                  {t("total_label")} {subTotal + booking.additional_costs}{" "}
                  {t("currency_sar")}
                </div>
                <button
                  onClick={() => updateStatus("confirmed")}
                  style={btn("#10b981")}
                >
                  {t("agree_confirm")}
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
                    {t("confirm_execution")}
                  </button>
                ) : (
                  <span style={badge("#eff6ff", "#2563eb")}>
                    {t("confirmed_appointment")}
                  </span>
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
                <span style={badge("#ecfdf5", "#059669")}>
                  {t("completed_status")}
                </span>

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
                      {allowTextReviews && (
                        <textarea
                          placeholder={t("review_placeholder")}
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
                          {t("save_rating")}
                        </button>
                        <button
                          onClick={() => setIsRatingMode(false)}
                          style={btn("#94a3b8")}
                        >
                          {t("cancel_btn")}
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
                      {t("rate_service")}
                    </button>
                  ))
                )}
              </div>
            )}

            {booking.status === "pending" && !isProviderView && (
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                {t("waiting_provider")}
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
                  ? t("reject_order")
                  : t("cancel_order")}
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
              {t("cancelled_status")}
            </div>
            {booking.cancellation_reason && (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#991b1b",
                  marginTop: "5px",
                }}
              >
                <strong>{t("reason_label")}</strong>{" "}
                {booking.cancellation_reason}
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
