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

  const [proposedPrice, setProposedPrice] = useState("");
  const [isSendingPrice, setIsSendingPrice] = useState(false);

  const updateStatus = async (newStatus, extra = null, reason = null) => {
    const updatePayload = { status: newStatus };
    if (extra !== null) updatePayload.additional_costs = Number(extra) || 0;
    if (reason !== null) updatePayload.cancellation_reason = reason;

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", booking.id);
    if (!error) {
      alert(t("update_success_booking", "تم تحديث حالة الحجز بنجاح ✅"));
      setIsCanceling(false);
      onRefresh();
    } else {
      alert(t("error_prefix") + error.message);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim())
      return alert(t("cancel_reason_required", "الرجاء كتابة سبب الإلغاء"));
    updateStatus("cancelled", null, cancelReason);
  };

  const handleSendProposedPrice = async () => {
    if (!proposedPrice || isNaN(proposedPrice) || proposedPrice <= 0) {
      return alert("الرجاء إدخال سعر صحيح.");
    }

    setIsSendingPrice(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "awaiting_client_approval",
        proposed_price: parseFloat(proposedPrice),
      })
      .eq("id", booking.id);

    setIsSendingPrice(false);

    if (!error) {
      alert("تم إرسال السعر بنجاح للعميل بانتظار موافقته! ✅");
      onRefresh();
    } else {
      alert("حدث خطأ: " + error.message);
    }
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
      alert(t("rating_success", "تم حفظ التقييم بنجاح!"));
      setIsRatingMode(false);
      onRefresh();
    } else {
      alert(t("rating_error") + error.message);
    }
  };

  const getDisplayPrice = () => {
    if (booking.status === "awaiting_pricing") return 0;
    if (
      booking.status === "awaiting_client_approval" ||
      booking.proposed_price
    ) {
      return Number(booking.proposed_price);
    }
    return Number(booking.offerings?.price) || 0;
  };

  const basePrice = getDisplayPrice();
  const qty = booking.quantity || 1;
  const subTotal = basePrice * qty;

  const modelLabels = {
    fixed: t("task", "مهمة"),
    hourly: t("hour", "ساعة"),
    period: t("period", "فترة"),
    daily: t("day", "يوم"),
    monthly: t("month", "شهر"),
    yearly: t("year", "سنة"),
    free: t("volunteer", "تطوع"),
  };
  const label = modelLabels[booking.offerings?.pricing_model || "fixed"];

  const canCancel =
    booking.status !== "completed" && booking.status !== "cancelled";

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
    return new Date(dateString).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        text: "قيد الانتظار",
        bg: "#fef3c7",
        color: "#d97706",
        icon: "⏳",
      },
      awaiting_pricing: {
        text: "بانتظار تسعيرك",
        bg: "#fef3c7",
        color: "#d97706",
        icon: "💰",
      },
      awaiting_client_approval: {
        text: "بانتظار العميل",
        bg: "#eff6ff",
        color: "#2563eb",
        icon: "👀",
      },
      negotiating: {
        text: "بانتظار موافقتك",
        bg: "#fef3c7",
        color: "#d97706",
        icon: "🤝",
      },
      confirmed: { text: "مؤكد", bg: "#ecfdf5", color: "#059669", icon: "👍" },
      completed: {
        text: "تم التنفيذ",
        bg: "#f0fdf4",
        color: "#15803d",
        icon: "✅",
      },
      cancelled: { text: "ملغى", bg: "#fef2f2", color: "#ef4444", icon: "❌" },
    };
    return badges[status] || badges.pending;
  };

  const badge = getStatusBadge(booking.status);

  return (
    <div style={styles.card}>
      {/* ✨ الهيدر: الحالة واسم الخدمة ✨ */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: badge.bg,
              color: badge.color,
            }}
          >
            {badge.icon} {badge.text}
          </span>
          <span
            style={{
              fontSize: "0.8rem",
              color: "#94a3b8",
              fontWeight: "bold",
            }}
          >
            #{booking.id.substring(0, 6)}
          </span>
        </div>

        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>
          {booking.offerings?.title}
        </h3>
      </div>

      {/* ✨ جسم البطاقة: 3 أقسام للمعلومات ✨ */}
      <div style={styles.bodyGrid}>
        {/* القسم الأول: معلومات المستخدم */}
        <div style={styles.infoSection}>
          <span style={styles.infoLabel}>
            {isProviderView ? "العميل" : "مزود الخدمة"}
          </span>
          <strong style={{ fontSize: "0.95rem", color: "#334155" }}>
            {isProviderView
              ? booking.profiles?.full_name
              : booking.offerings?.profiles?.full_name}
          </strong>

          {isProviderView && booking.client_contact && (
            <a
              href={`https://wa.me/${booking.client_contact.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              style={styles.whatsappBtn}
            >
              تواصل {booking.client_contact}
            </a>
          )}

          {booking.location && (
            <div style={{ marginTop: "10px" }}>
              <span style={styles.infoLabel}>الموقع</span>
              {booking.location.includes("http") ? (
                <a
                  href={booking.location}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.mapBtn}
                >
                  📍 عرض الخريطة
                </a>
              ) : (
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  📍 {booking.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* القسم الثاني: التواريخ */}
        <div
          style={{
            ...styles.infoSection,
            borderRight: "1px solid #f1f5f9",
            borderLeft: "1px solid #f1f5f9",
            padding: "0 15px",
          }}
        >
          <span style={styles.infoLabel}>جدول العمل</span>
          <div style={styles.dateBox}>
            <span style={{ color: "#10b981" }}>🟢 البدء:</span>
            <span style={{ direction: "ltr" }}>
              {formatDate(booking.appointment_date)}
            </span>
          </div>
          {booking.end_time && (
            <div style={{ ...styles.dateBox, marginTop: "8px" }}>
              <span style={{ color: "#ef4444" }}>🔴 الانتهاء:</span>
              <span style={{ direction: "ltr" }}>
                {formatDate(booking.end_time)}
              </span>
            </div>
          )}
        </div>

        {/* القسم الثالث: المالية */}
        <div style={{ ...styles.infoSection, alignItems: "flex-end" }}>
          <span style={styles.infoLabel}>الإجمالي</span>
          <div style={styles.priceBig}>
            {booking.offerings?.pricing_model === "free" ? (
              t("free", "مجاني")
            ) : (
              <>
                {subTotal}{" "}
                <span style={{ fontSize: "0.9rem" }}>
                  {t("currency_sar", "ر.س")}
                </span>
              </>
            )}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginTop: "4px",
            }}
          >
            {qty} {label} × {basePrice}
          </div>
          {booking.additional_costs > 0 && (
            <div style={styles.extraCostBadge}>
              + {booking.additional_costs} {t("extra_cost_label", "إضافي")}
            </div>
          )}
        </div>
      </div>

      {/* ✨ شريط الإجراءات السفلي (الأزرار) ✨ */}
      <div style={styles.actionBar}>
        {isCanceling ? (
          <div style={styles.cancelBox}>
            <input
              type="text"
              placeholder={t(
                "type_reason_placeholder",
                "اكتب سبب الإلغاء هنا..",
              )}
              style={styles.input}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCancelSubmit}
                style={{
                  ...styles.btn,
                  backgroundColor: "#ef4444",
                  color: "#fff",
                }}
              >
                تأكيد الإلغاء
              </button>
              <button
                onClick={() => setIsCanceling(false)}
                style={{
                  ...styles.btn,
                  backgroundColor: "#e2e8f0",
                  color: "#475569",
                }}
              >
                تراجع
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "10px",
              width: "100%",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* --- أزرار العميل --- */}
            {!isProviderView && (
              <>
                {booking.status === "awaiting_client_approval" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      backgroundColor: "#ecfdf5",
                      padding: "8px 15px",
                      borderRadius: "10px",
                      width: "100%",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#059669",
                        fontWeight: "bold",
                      }}
                    >
                      سعر المزود المعتمد: {booking.proposed_price} ر.س
                    </span>
                    <button
                      onClick={() => updateStatus("confirmed")}
                      style={{
                        ...styles.btn,
                        backgroundColor: "#10b981",
                        color: "#fff",
                        marginLeft: "auto",
                      }}
                    >
                      موافقة وتأكيد الحجز ✅
                    </button>
                  </div>
                )}
                {booking.status === "negotiating" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      backgroundColor: "#ecfdf5",
                      padding: "8px 15px",
                      borderRadius: "10px",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#059669",
                        fontWeight: "bold",
                      }}
                    >
                      الإجمالي: {subTotal + booking.additional_costs} ر.س
                    </span>
                    <button
                      onClick={() => updateStatus("confirmed")}
                      style={{
                        ...styles.btn,
                        backgroundColor: "#10b981",
                        color: "#fff",
                        marginLeft: "auto",
                      }}
                    >
                      موافق وتأكيد
                    </button>
                  </div>
                )}
                {booking.status === "pending" && (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      alignSelf: "center",
                      marginLeft: "auto",
                    }}
                  >
                    بانتظار موافقة المزود...
                  </span>
                )}
              </>
            )}

            {/* --- أزرار المزود --- */}
            {isProviderView && (
              <>
                {booking.status === "awaiting_pricing" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      backgroundColor: "#fffbeb",
                      padding: "8px",
                      borderRadius: "10px",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <input
                      type="number"
                      placeholder="أدخل السعر (ر.س)"
                      style={{ ...styles.input, width: "150px", margin: 0 }}
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                    />
                    <button
                      onClick={handleSendProposedPrice}
                      disabled={isSendingPrice}
                      style={{
                        ...styles.btn,
                        backgroundColor: "#f59e0b",
                        color: "#fff",
                      }}
                    >
                      {isSendingPrice ? "جاري الإرسال..." : "إرسال السعر 📨"}
                    </button>
                  </div>
                )}
                {booking.status === "pending" && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      width: "100%",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => updateStatus("confirmed", 0)}
                      style={{
                        ...styles.btn,
                        backgroundColor: "#10b981",
                        color: "#fff",
                        flex: 1,
                      }}
                    >
                      قبول الطلب
                    </button>
                    <div style={{ display: "flex", gap: "5px", flex: 2 }}>
                      <input
                        type="number"
                        placeholder="سعر إضافي (تذاكر، مواصلات، سكن، أدوات..)"
                        style={{
                          ...styles.input,
                          margin: 0,
                          minWidth: "220px",
                        }}
                        value={extraCosts}
                        onChange={(e) => setExtraCosts(e.target.value)}
                        title="أدخل هنا أي تكاليف إضافية مثل التذاكر أو المواصلات أو السكن"
                      />
                      <button
                        onClick={() => updateStatus("negotiating", extraCosts)}
                        style={{
                          ...styles.btn,
                          backgroundColor: "#f59e0b",
                          color: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        التفاوض
                      </button>
                    </div>
                  </div>
                )}
                {booking.status === "confirmed" && (
                  <button
                    onClick={() => updateStatus("completed")}
                    style={{
                      ...styles.btn,
                      backgroundColor: "#3b82f6",
                      color: "#fff",
                    }}
                  >
                    تأكيد التنفيذ 🏁
                  </button>
                )}
              </>
            )}

            {/* زر الإلغاء المشترك */}
            {canCancel && booking.status !== "awaiting_pricing" && (
              <button
                onClick={() => setIsCanceling(true)}
                style={{
                  ...styles.btn,
                  backgroundColor: "transparent",
                  color: "#ef4444",
                  border: "1px solid #fca5a5",
                }}
              >
                {isProviderView && booking.status === "pending"
                  ? "رفض الطلب ✖"
                  : "إلغاء الطلب ✖"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✨ التقييمات والعمولات (Footer Extensions) ✨ */}
      {booking.status === "cancelled" && booking.cancellation_reason && (
        <div style={styles.alertBox}>
          <strong>سبب الإلغاء:</strong> {booking.cancellation_reason}
        </div>
      )}

      {booking.status === "completed" && (
        <div style={styles.footerSection}>
          {/* التقييم */}
          {booking.rating ? (
            <div style={styles.reviewBox}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  width: "100%",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#92400e",
                      fontWeight: "bold",
                    }}
                  >
                    التقييم:
                  </span>
                  <div
                    style={{
                      color: "#f59e0b",
                      fontSize: "1.1rem",
                      marginTop: "3px",
                    }}
                  >
                    {"⭐".repeat(booking.rating)}
                  </div>
                </div>
              </div>
              {booking.review && allowTextReviews && (
                <div
                  style={{
                    color: "#78350f",
                    fontSize: "0.85rem",
                    marginTop: "8px",
                    fontStyle: "italic",
                    padding: "8px",
                    backgroundColor: "rgba(255,255,255,0.5)",
                    borderRadius: "8px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {booking.is_comment_hidden
                    ? "🚫 تم إخفاء التعليق بواسطة المزود."
                    : `"${booking.review}"`}
                </div>
              )}
            </div>
          ) : (
            !isProviderView &&
            (isRatingMode ? (
              <div style={styles.reviewBox}>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "10px",
                    direction: "ltr",
                    justifyContent: "center",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRatingValue(star)}
                      style={{
                        cursor: "pointer",
                        fontSize: "1.8rem",
                        color: star <= ratingValue ? "#f59e0b" : "#cbd5e1",
                        transition: "0.2s",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {allowTextReviews && (
                  <textarea
                    placeholder="اكتب تجربتك (اختياري).."
                    style={{
                      ...styles.input,
                      height: "60px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    onClick={submitRating}
                    style={{
                      ...styles.btn,
                      backgroundColor: "#f59e0b",
                      color: "#fff",
                    }}
                  >
                    حفظ التقييم
                  </button>
                  <button
                    onClick={() => setIsRatingMode(false)}
                    style={{
                      ...styles.btn,
                      backgroundColor: "#e2e8f0",
                      color: "#475569",
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsRatingMode(true)}
                style={{
                  ...styles.btn,
                  backgroundColor: "#fffbeb",
                  color: "#f59e0b",
                  border: "1px dashed #f59e0b",
                  width: "100%",
                }}
              >
                ⭐ تقييم الخدمة
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ✨ كائنات التنسيق (CSS in JS) للتصميم العصري الجميل ✨
const styles = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    textAlign: "right",
    transition: "transform 0.2s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
  },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    alignItems: "start",
  },
  infoSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  infoLabel: {
    fontSize: "0.7rem",
    color: "#94a3b8",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  whatsappBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#25D366",
    color: "#ffffff",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: "bold",
    textDecoration: "none",
    width: "fit-content",
    marginTop: "4px",
    boxShadow: "0 2px 5px rgba(37, 211, 102, 0.3)",
  },
  mapBtn: {
    display: "inline-block",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "bold",
    textDecoration: "none",
  },
  dateBox: {
    fontSize: "0.85rem",
    color: "#334155",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#f8fafc",
    padding: "6px 10px",
    borderRadius: "8px",
  },
  priceBig: {
    fontSize: "1.5rem",
    fontWeight: "900",
    color: "#7c3aed",
    direction: "ltr",
  },
  extraCostBadge: {
    fontSize: "0.75rem",
    color: "#ef4444",
    backgroundColor: "#fef2f2",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "bold",
  },
  actionBar: {
    display: "flex",
    justifyContent: "flex-end",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "15px",
    marginTop: "5px",
  },
  btn: {
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: "bold",
    fontSize: "0.85rem",
    cursor: "pointer",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    transition: "0.2s",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.85rem",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  cancelBox: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "#fef2f2",
    padding: "15px",
    borderRadius: "12px",
    border: "1px dashed #fca5a5",
  },
  alertBox: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: "12px 15px",
    borderRadius: "10px",
    fontSize: "0.85rem",
    marginTop: "10px",
  },
  footerSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "5px",
  },
  reviewBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    padding: "15px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
  },
};
