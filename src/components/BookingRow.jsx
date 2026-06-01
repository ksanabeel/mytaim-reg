import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function BookingRow({ booking, onRefresh, isProviderView }) {
  const [loading, setLoading] = useState(false);

  // ✨ حالات التقييم للعميل ✨
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // ✨ حالات التفاوض والتكاليف الإضافية للمزود ✨
  const [extraCostAmount, setExtraCostAmount] = useState(""); // التكلفة الإضافية فقط
  const [extraDetails, setExtraDetails] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);

  const status = booking.status;
  const currency = booking.offerings?.currency || "SAR";
  const serviceTitle = booking.offerings?.title || "الخدمة";

  // 💰 حساب وتحديد السعر المعروض
  const isFree = booking.offerings?.pricing_model === "free";

  // السعر الأساسي = سعر الفرد × العدد
  const baseTotalPrice =
    (booking.offerings?.price || 0) * (booking.quantity || 1);

  // الإجمالي المعروض أثناء الكتابة في خانة التكاليف الإضافية
  const previewFinalPrice = baseTotalPrice + (parseFloat(extraCostAmount) || 0);

  let priceDisplay = "";
  if (status === "awaiting_pricing") {
    priceDisplay = "بانتظار تحديد السعر ⏳";
  } else if (isFree) {
    priceDisplay = "مجاني (تطوع) 💚";
  } else if (
    booking.offerings?.price_upon_agreement &&
    !booking.proposed_price
  ) {
    priceDisplay = "حسب الاتفاق 🤝";
  } else {
    // عرض السعر الإجمالي النهائي المحفوظ في القاعدة
    const finalPrice = booking.proposed_price || baseTotalPrice;
    priceDisplay = `${finalPrice} ${currency}`;
  }

  // 🔔 دالة مساعدة لإرسال الإشعارات
  const notifyUser = async (userId, title, message) => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .insert([{ user_id: userId, title, message, is_read: false }]);
  };

  // الدالة الشاملة لتغيير الحالة
  const handleAction = async (
    newStatus,
    customUpdate = {},
    actionName = "",
  ) => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, ...customUpdate })
      .eq("id", booking.id);

    setLoading(false);

    if (!error) {
      const targetUserId = isProviderView
        ? booking.customer_id
        : booking.offerings?.provider_id || booking.provider_id;

      let notifTitle = "";
      let notifMsg = "";

      if (isProviderView) {
        if (newStatus === "awaiting_client_approval") {
          notifTitle = "تكاليف إضافية لطلبك 💰";
          notifMsg = `أضاف المزود تكاليف لخدمة "${serviceTitle}". الإجمالي أصبح ${customUpdate.proposed_price} ${currency}.`;
          if (customUpdate.extra_details)
            notifMsg += ` ملاحظة: ${customUpdate.extra_details}`;
          notifMsg += ` يرجى الدخول والموافقة.`;
        } else if (newStatus === "confirmed") {
          notifTitle = "تم قبول طلبك ✅";
          notifMsg = `قام المزود بقبول طلب الحجز لخدمة "${serviceTitle}". يمكنك التواصل معه الآن!`;
        } else if (newStatus === "cancelled") {
          notifTitle = "تم رفض/إلغاء طلبك ❌";
          notifMsg = `نعتذر، قام المزود بإلغاء طلب الحجز لخدمة "${serviceTitle}".`;
        }
      } else {
        if (newStatus === "confirmed") {
          notifTitle = "العميل وافق على السعر 🎉";
          notifMsg = `وافق العميل على التسعير لخدمة "${serviceTitle}". الحجز مؤكد الآن، تواصل معه للبدء!`;
        } else if (newStatus === "cancelled") {
          notifTitle = "العميل رفض السعر/الطلب ❌";
          notifMsg = `قام العميل بإلغاء الطلب لخدمة "${serviceTitle}".`;
        } else if (newStatus === "completed") {
          notifTitle = "تم إنجاز الخدمة بنجاح 🏁";
          notifMsg = `قام العميل بتأكيد استلام وتنجيز خدمة "${serviceTitle}". الأرباح ستضاف لرصيدك قريباً!`;
        } else if (newStatus === "negotiating") {
          notifTitle = "العميل يطلب التفاوض 🤝";
          notifMsg = `طلب العميل التفاوض على السعر المعروض لخدمة "${serviceTitle}". يرجى مراجعة الطلب.`;
        }
      }

      if (notifTitle && targetUserId) {
        await notifyUser(targetUserId, notifTitle, notifMsg);
      }

      alert(`تم ${actionName} بنجاح! ✅`);
      if (onRefresh) onRefresh();
    } else {
      alert("حدث خطأ: " + error.message);
    }
  };

  // ✨ دالة إرسال التقييم (من العميل) ✨
  const submitReview = async () => {
    setIsSubmittingReview(true);
    const { error } = await supabase
      .from("bookings")
      .update({ rating: parseInt(rating), review: reviewText })
      .eq("id", booking.id);

    setIsSubmittingReview(false);
    if (!error) {
      const providerId = booking.offerings?.provider_id || booking.provider_id;
      await notifyUser(
        providerId,
        "تقييم جديد لخدمتك ⭐️",
        `قام العميل بتقييم خدمتك (${serviceTitle}) بـ ${rating} نجوم. استمر في التألق!`,
      );
      alert("تم إرسال التقييم بنجاح! شكراً لك. ✅");
      if (onRefresh) onRefresh();
    } else {
      alert("حدث خطأ أثناء إرسال التقييم: " + error.message);
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "confirmed":
        return { text: "مؤكد ✅", bg: "#ecfdf5", color: "#059669" };
      case "pending":
        return { text: "طلب جديد 🆕", bg: "#eff6ff", color: "#2563eb" };
      case "awaiting_pricing":
        return { text: "يطلب تسعير 💰", bg: "#fef3c7", color: "#d97706" };
      case "awaiting_client_approval":
        return { text: "بانتظار الموافقة ⏳", bg: "#f3e8ff", color: "#7e22ce" };
      case "negotiating":
        return { text: "تفاوض 🤝", bg: "#ffedd5", color: "#b45309" };
      case "cancelled":
        return { text: "ملغي ❌", bg: "#fef2f2", color: "#dc2626" };
      case "completed":
        return { text: "مكتمل 🏁", bg: "#f1f5f9", color: "#475569" };
      default:
        return { text: s, bg: "#f1f5f9", color: "#64748b" };
    }
  };

  const badge = getStatusBadge(status);

  const btnGreen = {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.85rem",
  };
  const btnRed = {
    background: "#fef2f2",
    color: "#ef4444",
    border: "1px solid #fca5a5",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.85rem",
  };
  const btnOrange = {
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.85rem",
  };
  const btnBlue = {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.85rem",
  };
  const inputS = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "0.9rem",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
        border: "1px solid #e2e8f0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
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
              margin: 0,
              fontSize: "1.1em",
              color: "#1e293b",
              fontWeight: "900",
            }}
          >
            {serviceTitle}
          </h4>
          <div
            style={{
              marginTop: "8px",
              fontSize: "1.05rem",
              fontWeight: "900",
              color: "#10b981",
            }}
          >
            💰 {priceDisplay}
            {booking.quantity > 1 && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#64748b",
                  margin: "0 5px",
                }}
              >
                (العدد: {booking.quantity})
              </span>
            )}
          </div>
        </div>
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
          display: "flex",
          gap: "20px",
          color: "#64748b",
          fontSize: "0.9em",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontWeight: "bold",
            color: "#334155",
          }}
        >
          👤 {isProviderView ? "العميل:" : "المزود:"}{" "}
          {isProviderView
            ? booking.profiles?.full_name || "عميل غير محدد"
            : booking.offerings?.profiles?.full_name || "مزود غير محدد"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          📅{" "}
          {booking.appointment_date
            ? new Date(booking.appointment_date).toLocaleDateString("ar-SA")
            : "غير محدد"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          ⏰{" "}
          {booking.appointment_date &&
          booking.appointment_date.includes("T00:00")
            ? "وقت مرن"
            : booking.appointment_date
            ? new Date(booking.appointment_date).toLocaleTimeString("ar-SA", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "غير محدد"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          color: "#475569",
          fontSize: "0.85em",
          flexWrap: "wrap",
          backgroundColor: "#f8fafc",
          padding: "12px",
          borderRadius: "10px",
          border: "1px dashed #cbd5e1",
        }}
      >
        {booking.client_contact && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            📞 <strong>رقم التواصل:</strong>
            <a
              href={`tel:${booking.client_contact}`}
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: "bold",
                direction: "ltr",
              }}
            >
              {booking.client_contact}
            </a>
          </span>
        )}
        {booking.location && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            📍 <strong>الموقع:</strong>
            {booking.location.startsWith("http") ? (
              <a
                href={booking.location}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#10b981",
                  textDecoration: "underline",
                  fontWeight: "bold",
                }}
              >
                عرض الموقع على الخريطة 🗺️
              </a>
            ) : (
              <span>{booking.location}</span>
            )}
          </span>
        )}
      </div>

      <div
        style={{
          borderTop: "1px dashed #cbd5e1",
          paddingTop: "15px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
        }}
      >
        {loading ? (
          <span
            style={{ color: "#94a3b8", fontWeight: "bold", fontSize: "0.9rem" }}
          >
            ⏳ جاري التنفيذ...
          </span>
        ) : isProviderView ? (
          /* ========================================= */
          /* واجهة المزود (نظام إضافة التكاليف) */
          /* ========================================= */
          <div style={{ width: "100%" }}>
            {status === "pending" && !isNegotiating && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  width: "100%",
                }}
              >
                <button
                  onClick={() => handleAction("confirmed", {}, "قبول الطلب")}
                  style={{ ...btnGreen, flex: 1 }}
                >
                  قبول الطلب ✅
                </button>
                <button
                  onClick={() => setIsNegotiating(true)}
                  style={{
                    ...btnBlue,
                    flex: 1,
                    backgroundColor: "#fff",
                    color: "#3b82f6",
                    border: "1px solid #3b82f6",
                  }}
                >
                  إضافة تكاليف إضافية / تفاوض 💬
                </button>
                <button
                  onClick={() => handleAction("cancelled", {}, "رفض الطلب")}
                  style={{ ...btnRed, flex: 1 }}
                >
                  رفض وإلغاء ❌
                </button>
              </div>
            )}

            {/* ✨ نافذة التكاليف الإضافية الذكية ✨ */}
            {(isNegotiating ||
              status === "awaiting_pricing" ||
              status === "negotiating") && (
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#eff6ff",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px dashed #3b82f6",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {status === "negotiating" && (
                  <strong style={{ color: "#b45309", fontSize: "0.9rem" }}>
                    🤝 العميل يطلب التفاوض على السعر..
                  </strong>
                )}
                <strong style={{ color: "#1e40af", fontSize: "0.95rem" }}>
                  ➕ إضافة تكاليف للمشوار والمعدات (إن وجدت):
                </strong>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    color: "#475569",
                    backgroundColor: "#fff",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <span>
                    السعر الأساسي للطلب ({booking.quantity} ×{" "}
                    {booking.offerings?.price || 0}):
                  </span>
                  <strong style={{ color: "#1e293b" }}>
                    {baseTotalPrice} {currency}
                  </strong>
                </div>

                <input
                  type="number"
                  placeholder="مبلغ التكلفة الإضافية او اعادة تسعير الخدمة (ريال)"
                  value={extraCostAmount}
                  onChange={(e) => setExtraCostAmount(e.target.value)}
                  style={inputS}
                />

                <input
                  type="text"
                  placeholder="سبب التكلفة (مثال: رسوم سكن وتذاكر سفر)"
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  style={inputS}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.05rem",
                    color: "#059669",
                    backgroundColor: "#ecfdf5",
                    padding: "12px",
                    borderRadius: "8px",
                    fontWeight: "900",
                    border: "1px solid #a7f3d0",
                    marginTop: "5px",
                  }}
                >
                  <span>الإجمالي النهائي للعميل:</span>
                  <span>
                    {previewFinalPrice} {currency}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                  <button
                    onClick={() => {
                      handleAction(
                        "awaiting_client_approval",
                        {
                          proposed_price: previewFinalPrice,
                          extra_details: extraDetails,
                          additional_costs: parseFloat(extraCostAmount) || 0, // حفظها في حقل إضافي إن وجد
                        },
                        "إرسال التكاليف للعميل",
                      );
                      setIsNegotiating(false);
                    }}
                    style={{ ...btnGreen, flex: 2, backgroundColor: "#2563eb" }}
                  >
                    إرسال السعر للعميل 🚀
                  </button>
                  {status === "pending" && (
                    <button
                      onClick={() => setIsNegotiating(false)}
                      style={{
                        ...btnRed,
                        flex: 1,
                        backgroundColor: "#e2e8f0",
                        color: "#475569",
                        border: "none",
                      }}
                    >
                      إلغاء
                    </button>
                  )}
                  {status === "negotiating" && (
                    <button
                      onClick={() => handleAction("cancelled", {}, "رفض الطلب")}
                      style={{ ...btnRed, flex: 1 }}
                    >
                      إلغاء الطلب ❌
                    </button>
                  )}
                </div>
              </div>
            )}

            {status === "awaiting_client_approval" && (
              <span
                style={{
                  fontSize: "0.85em",
                  color: "#64748b",
                  fontWeight: "bold",
                }}
              >
                ⏳ تم إرسال السعر الإجمالي ({booking.proposed_price} {currency}
                )، بانتظار موافقة العميل..
              </span>
            )}
            {status === "confirmed" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85em",
                    color: "#059669",
                    fontWeight: "bold",
                  }}
                >
                  👍 الحجز مؤكد، يرجى التنفيذ ثم الضغط على زر الإنجاز.
                </span>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "هل تأكدت من إنجاز الخدمة للعميل؟ سيتم إغلاق الطلب وإضافة الأرباح لمحفظتك.",
                      )
                    ) {
                      handleAction("completed", {}, "إنهاء الطلب");
                    }
                  }}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  تأكيد إنجاز الخدمة 🏁
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ========================================= */
          /* واجهة العميل */
          /* ========================================= */
          <div style={{ width: "100%" }}>
            {status === "pending" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85em",
                    color: "#64748b",
                    fontWeight: "bold",
                  }}
                >
                  ⏳ بانتظار مراجعة وقبول المزود..
                </span>
                <button
                  onClick={() => handleAction("cancelled", {}, "إلغاء الطلب")}
                  style={btnRed}
                >
                  إلغاء الطلب ❌
                </button>
              </div>
            )}

            {status === "awaiting_pricing" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85em",
                    color: "#64748b",
                    fontWeight: "bold",
                  }}
                >
                  💰 بانتظار قيام المزود بتحديد التكاليف..
                </span>
                <button
                  onClick={() => handleAction("cancelled", {}, "إلغاء الطلب")}
                  style={btnRed}
                >
                  إلغاء الطلب ❌
                </button>
              </div>
            )}

            {status === "awaiting_client_approval" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  width: "100%",
                }}
              >
                <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>
                  💰 الإجمالي المطلوب من المزود: {booking.proposed_price}{" "}
                  {currency}
                </strong>

                {booking.extra_details && (
                  <p
                    style={{
                      margin: "0 0 5px 0",
                      color: "#475569",
                      fontSize: "0.85rem",
                      backgroundColor: "#fffbeb",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #fde68a",
                    }}
                  >
                    📝 <strong>ملاحظات التكاليف الإضافية:</strong>{" "}
                    {booking.extra_details}
                  </p>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() =>
                      handleAction("confirmed", {}, "الموافقة على السعر")
                    }
                    style={{ ...btnGreen, flex: 2 }}
                  >
                    موافقة وتأكيد الحجز ✅
                  </button>
                  <button
                    onClick={() =>
                      handleAction("negotiating", {}, "طلب التفاوض")
                    }
                    style={{ ...btnOrange, flex: 1 }}
                  >
                    طلب تفاوض 🤝
                  </button>
                  <button
                    onClick={() =>
                      handleAction("cancelled", {}, "رفض السعر وإلغاء")
                    }
                    style={{ ...btnRed, flex: 1 }}
                  >
                    رفض ❌
                  </button>
                </div>
              </div>
            )}

            {status === "negotiating" && (
              <span
                style={{
                  fontSize: "0.85em",
                  color: "#64748b",
                  fontWeight: "bold",
                }}
              >
                ⏳ بانتظار رد المزود على طلب التفاوض..
              </span>
            )}

            {status === "confirmed" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85em",
                    color: "#059669",
                    fontWeight: "bold",
                  }}
                >
                  🎉 الحجز مؤكد وجاري التنفيذ!
                </span>
                <button
                  onClick={() => {
                    if (window.confirm("تأكيد إنجاز الخدمة؟"))
                      handleAction("completed", {}, "إنهاء الطلب");
                  }}
                  style={btnBlue}
                >
                  تأكيد إنجاز الخدمة 🏁
                </button>
              </div>
            )}

            {/* ✨ منطقة التقييم للعميل ✨ */}
            {status === "completed" && !isProviderView && (
              <div
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "15px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                {booking.rating || booking.review ? (
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>
                      تقييمك:{" "}
                    </strong>
                    {"⭐".repeat(booking.rating || 5)}
                    {(booking.review ||
                      booking.review_text ||
                      booking.client_review) && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "#64748b",
                          fontSize: "0.9rem",
                          fontStyle: "italic",
                        }}
                      >
                        💬{" "}
                        {booking.review ||
                          booking.review_text ||
                          booking.client_review}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>
                      ⭐ شاركنا تقييمك للخدمة والمزود:
                    </strong>
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      style={{
                        ...inputS,
                        cursor: "pointer",
                        backgroundColor: "#fff",
                      }}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (ممتاز ومحترف)</option>
                      <option value="4">⭐⭐⭐⭐ (جيد جداً)</option>
                      <option value="3">⭐⭐⭐ (جيد)</option>
                      <option value="2">⭐⭐ (مقبول)</option>
                      <option value="1">⭐ (سيء)</option>
                    </select>
                    <textarea
                      placeholder="اكتب تجربتك مع المزود هنا (اختياري)..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      style={{
                        ...inputS,
                        height: "70px",
                        resize: "none",
                        backgroundColor: "#fff",
                      }}
                    />
                    <button
                      onClick={submitReview}
                      disabled={isSubmittingReview}
                      style={{ ...btnGreen, width: "100%", padding: "12px" }}
                    >
                      {isSubmittingReview
                        ? "جاري الإرسال..."
                        : "إرسال التقييم للمزود 🚀"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
