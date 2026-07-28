import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ✨ مكون بطاقة الحجز المطور والشامل ✨
export default function BookingRow({ booking, onRefresh, isProviderView }) {
  const [loading, setLoading] = useState(false);

  // ✨ الإخفاء الفوري اللحظي من الشاشة عند الضغط على أرشفة ✨
  const [hidden, setHidden] = useState(false);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [extraCostAmount, setExtraCostAmount] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);

  // 💬 ✨ المراسلة الفورية ✨
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const status = booking.status;
  const currency = booking.offerings?.currency || "SAR";
  const serviceTitle = booking.offerings?.title || "الخدمة";

  // 💰 الحسبة المالية الذكية الأساسية
  const isFree = booking.offerings?.pricing_model === "free";
  const baseTotalPrice =
    (booking.offerings?.price || 0) * (booking.quantity || 1);
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
    const finalPrice = booking.proposed_price || baseTotalPrice;
    priceDisplay = `${finalPrice} ${currency}`;
  }

  const currentTotal = booking.proposed_price || baseTotalPrice;

  // 🎨 الألوان الذكية للخلفية والإطار حسب حالة الطلب
  let cardStyle = {
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "0.3s",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
  };

  if (["pending", "awaiting_pricing", "negotiating"].includes(status)) {
    cardStyle.border = "2px solid #93c5fd";
    cardStyle.backgroundColor = "#eff6ff";
  } else if (["confirmed", "awaiting_client_approval"].includes(status)) {
    cardStyle.border = "2px solid #6ee7b7";
    cardStyle.backgroundColor = "#f0fdf4";
  } else if (status === "completed") {
    cardStyle.border = "2px solid #cbd5e1";
    cardStyle.backgroundColor = "#f8fafc";
  } else if (status === "cancelled") {
    cardStyle.border = "2px solid #fca5a5";
    cardStyle.backgroundColor = "#fef2f2";
  } else {
    cardStyle.border = "1px solid #e2e8f0";
    cardStyle.backgroundColor = "#fff";
  }

  const notifyUser = async (userId, title, message) => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .insert([{ user_id: userId, title, message, is_read: false }]);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
  }, [booking.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSendingMessage(true);

    const providerId = booking.offerings?.provider_id || booking.provider_id;
    const customerId = booking.customer_id;
    const senderId = isProviderView ? providerId : customerId;
    const receiverId = isProviderView ? customerId : providerId;

    const { error } = await supabase.from("messages").insert([
      {
        booking_id: booking.id,
        sender_id: senderId,
        receiver_id: receiverId,
        text_content: messageText.trim(),
      },
    ]);

    setSendingMessage(false);
    if (!error) {
      setMessageText("");
      fetchMessages();
      await notifyUser(
        receiverId,
        "رسالة جديدة 💬",
        `توجد رسالة جديدة بخصوص حجز "${serviceTitle}"`,
      );
    }
  };

  // 📂 دالة أرشفة وإخفاء الطلب الذكية للطرفين
  const handleArchive = async () => {
    setLoading(true);
    const columnToUpdate = isProviderView
      ? "is_archived_by_provider"
      : "is_archived_by_client";

    const { error } = await supabase
      .from("bookings")
      .update({ [columnToUpdate]: true })
      .eq("id", booking.id);

    setLoading(false);
    if (!error) {
      setHidden(true); // إخفاء فوري من الشاشة
      if (onRefresh) onRefresh();
    } else {
      alert("حدث خطأ أثناء أرشفة الطلب: " + error.message);
    }
  };

  // ❌ دالة إلغاء الحجز المؤكد مع ذكر السبب ❌
  const handleCancelWithReason = async () => {
    const reason = window.prompt(
      "الرجاء كتابة سبب الإلغاء ليتم إشعار الطرف الآخر:",
    );

    // إذا ضغط المستخدم على زر الإلغاء في النافذة
    if (reason === null) return;

    // التأكد من عدم ترك السبب فارغاً
    if (reason.trim() === "") {
      return alert("لا يمكن إلغاء الحجز المؤكد بدون ذكر السبب!");
    }

    setLoading(true);

    const providerId = booking.offerings?.provider_id || booking.provider_id;
    const customerId = booking.customer_id;
    const senderId = isProviderView ? providerId : customerId;
    const receiverId = isProviderView ? customerId : providerId;

    // 1. تغيير الحالة إلى ملغي
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);

    if (!error) {
      // 2. إرسال رسالة آلية في شات الحجز لتوثيق السبب للطرفين
      await supabase.from("messages").insert([
        {
          booking_id: booking.id,
          sender_id: senderId,
          receiver_id: receiverId,
          text_content: `⚠️ تم إلغاء الحجز المؤكد. السبب: ${reason.trim()}`,
        },
      ]);

      // 3. إرسال إشعار للطرف الآخر
      await notifyUser(
        receiverId,
        "تم إلغاء الحجز المؤكد ❌",
        `قام ${
          isProviderView ? "المزود" : "العميل"
        } بإلغاء الحجز لخدمة "${serviceTitle}". السبب: ${reason.trim()}`,
      );

      alert("تم إلغاء الحجز بنجاح وإرسال السبب للطرف الآخر.");
      fetchMessages(); // تحديث المراسلات
      if (onRefresh) onRefresh();
    } else {
      alert("حدث خطأ أثناء الإلغاء: " + error.message);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);
    setLoading(false);
    if (!error) {
      const customerId = booking.customer_id;
      await notifyUser(
        customerId,
        "تم قبول طلبك ✅",
        `قام المزود بقبول طلب الحجز لخدمة "${serviceTitle}".`,
      );
      alert("تم تأكيد الحجز! ✅");
      if (onRefresh) onRefresh();
    }
  };

  const handleComplete = async () => {
    if (
      !window.confirm(
        "هل تأكدت من إنهاء الخدمة؟ سيتم تحويل الأرباح للمحفظة الآن.",
      )
    )
      return;
    setLoading(true);

    try {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("commission_rate")
        .eq("id", 1)
        .single();
      const rate = settings?.commission_rate || 0.1;

      const commissionAmount = currentTotal * rate;
      const netProfit = currentTotal - commissionAmount;

      const providerId = booking.offerings?.provider_id || booking.provider_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_earnings, commission_owed")
        .eq("id", providerId)
        .single();

      await supabase
        .from("profiles")
        .update({
          total_earnings: (profile?.total_earnings || 0) + netProfit,
          commission_owed: (profile?.commission_owed || 0) + commissionAmount,
        })
        .eq("id", providerId);

      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      const targetUserId = isProviderView ? booking.customer_id : providerId;
      await notifyUser(
        targetUserId,
        "تم إنجاز الخدمة بنجاح 🏁",
        `تم تأكيد إنهاء واستلام خدمة "${serviceTitle}".`,
      );

      alert(
        `تم الإنجاز بنجاح! ✅ دخل جيبك الصافي: ${netProfit} ريال | عمولة المنصة: ${commissionAmount} ريال`,
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("خطأ في العمليات الحسابية للمحفظة: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPrice = async () => {
    if (!previewFinalPrice || previewFinalPrice <= 0)
      return alert("أدخل سعر صحيح");
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "awaiting_client_approval",
        proposed_price: parseFloat(previewFinalPrice),
        extra_details: extraDetails,
        additional_costs: parseFloat(extraCostAmount) || 0,
      })
      .eq("id", booking.id);
    setLoading(false);
    if (!error) {
      const customerId = booking.customer_id;
      await notifyUser(
        customerId,
        "تكاليف إضافية لطلبك 💰",
        `أضاف المزود تكاليف لخدمة "${serviceTitle}". الإجمالي أصبح ${previewFinalPrice} ${currency}.`,
      );
      setIsNegotiating(false);
      onRefresh();
    }
  };

  const handleAction = async (newStatus, actionName = "") => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", booking.id);
    setLoading(false);

    if (!error) {
      const providerId = booking.offerings?.provider_id || booking.provider_id;
      const targetUserId = isProviderView ? booking.customer_id : providerId;
      let notifTitle = "",
        notifMsg = "";

      if (isProviderView && newStatus === "cancelled") {
        notifTitle = "تم رفض/إلغاء طلبك ❌";
        notifMsg = `نعتذر, قام المزود بإلغاء طلب الحجز لخدمة "${serviceTitle}".`;
      } else if (!isProviderView) {
        if (newStatus === "confirmed") {
          notifTitle = "العميل وافق على السعر 🎉";
          notifMsg = `وافق العميل على التسعير لخدمة "${serviceTitle}". الحجز مؤكد الآن!`;
        } else if (newStatus === "cancelled") {
          notifTitle = "العميل رفض السعر/الطلب ❌";
          notifMsg = `قام العميل بإلغاء الطلب لخدمة "${serviceTitle}".`;
        } else if (newStatus === "negotiating") {
          notifTitle = "العميل يطلب التفاوض 🤝";
          notifMsg = `طلب العميل التفاوض على السعر لخدمة "${serviceTitle}".`;
        }
      }

      if (notifTitle && targetUserId)
        await notifyUser(targetUserId, notifTitle, notifMsg);
      alert(`تم ${actionName} بنجاح! ✅`);
      if (onRefresh) onRefresh();
    }
  };

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
        `قام العميل بتقييم خدمتك بـ ${rating} نجوم.`,
      );
      alert("تم إرسال التقييم بنجاح! شكراً لك. ✅");
      if (onRefresh) onRefresh();
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "confirmed":
        return { text: "مؤكد ✅", bg: "#d1fae5", color: "#059669" };
      case "pending":
        return { text: "طلب جديد 🆕", bg: "#dbeafe", color: "#2563eb" };
      case "awaiting_pricing":
        return { text: "يطلب تسعير 💰", bg: "#fef3c7", color: "#d97706" };
      case "awaiting_client_approval":
        return { text: "بانتظار الموافقة ⏳", bg: "#f3e8ff", color: "#7e22ce" };
      case "negotiating":
        return { text: "تفاوض 🤝", bg: "#ffedd5", color: "#b45309" };
      case "cancelled":
        return { text: "ملغي ❌", bg: "#fee2e2", color: "#dc2626" };
      case "completed":
        return { text: "مكتمل 🏁", bg: "#e2e8f0", color: "#475569" };
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

  if (hidden) return null;
  if (isProviderView && booking.is_archived_by_provider) return null;
  if (!isProviderView && booking.is_archived_by_client) return null;

  return (
    <div style={cardStyle}>
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
          backgroundColor: "#ffffffaa",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
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

      {/* 💬 المراسلات الفورية */}
      <div
        style={{
          borderTop: "1px solid #cbd5e1",
          paddingTop: "15px",
          marginTop: "5px",
        }}
      >
        <strong style={{ fontSize: "0.9rem", color: "#475569" }}>
          💬 الملاحظات والمراسلات الخاصة بالطلب:
        </strong>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "10px",
            maxHeight: "180px",
            overflowY: "auto",
            padding: "5px",
          }}
        >
          {messages.length === 0 ? (
            <span
              style={{
                fontSize: "0.85rem",
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              لا توجد رسائل مسجلة حتى الآن..
            </span>
          ) : (
            messages.map((msg) => {
              const currentUserId = isProviderView
                ? booking.offerings?.provider_id || booking.provider_id
                : booking.customer_id;
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isMe ? "flex-start" : "flex-end",
                    backgroundColor: isMe ? "#f1f5f9" : "#f0fdf4",
                    color: isMe ? "#334155" : "#166534",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    fontSize: "0.85rem",
                    maxWidth: "85%",
                    border: isMe ? "1px solid #e2e8f0" : "1px solid #bbf7d0",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "0.75rem",
                      opacity: 0.7,
                    }}
                  >
                    {isMe ? "أنت:" : isProviderView ? "العميل:" : "المزود:"}
                  </strong>
                  {msg.text_content}
                </div>
              );
            })
          )}
        </div>

        {status !== "completed" && status !== "cancelled" && (
          <form
            onSubmit={handleSendMessage}
            style={{ display: "flex", gap: "8px", marginTop: "12px" }}
          >
            <input
              type="text"
              placeholder="اكتب رسالتك هنا..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{ ...inputS, flex: 1, backgroundColor: "#fff" }}
            />
            <button
              type="submit"
              disabled={sendingMessage || !messageText.trim()}
              style={{
                ...btnBlue,
                backgroundColor: "#7c3aed",
                padding: "10px 20px",
                opacity: messageText.trim() ? 1 : 0.6,
              }}
            >
              إرسال 🚀
            </button>
          </form>
        )}
      </div>

      {/* العمليات والإجراءات */}
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
          /* واجهة التحكم للمزود */
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
                <button onClick={handleAccept} style={{ ...btnGreen, flex: 1 }}>
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
                  إضافة تكاليف / تفاوض 💬
                </button>
                <button
                  onClick={() => handleAction("cancelled", "refuse")}
                  style={{ ...btnRed, flex: 1 }}
                >
                  رفض وإلغاء ❌
                </button>
              </div>
            )}

            {(isNegotiating ||
              status === "awaiting_pricing" ||
              status === "negotiating") && (
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#ffffffaa",
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
                  placeholder="مبلغ التسعير او  التكلفة الإضافية (ريال)"
                  value={extraCostAmount}
                  onChange={(e) => setExtraCostAmount(e.target.value)}
                  style={inputS}
                />
                <input
                  type="text"
                  placeholder="سبب التكلفة (مثال: تسعير جديد او رسوم سكن وتذاكر سفر)"
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
                    onClick={handleSendPrice}
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
                      onClick={() => handleAction("cancelled", "refuse")}
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
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={handleComplete}
                    style={{
                      ...btnBlue,
                      flex: 1,
                      boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    تأكيد إنجاز الخدمة 🏁
                  </button>
                  <button
                    onClick={handleCancelWithReason}
                    style={{ ...btnRed, flex: 1 }}
                  >
                    إلغاء الحجز ❌
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* واجهة التحكم للعميل */
          <div style={{ width: "100%" }}>
            {(status === "pending" || status === "awaiting_pricing") && (
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
                  ⏳ بانتظار رد المزود..
                </span>
                <button
                  onClick={() => handleAction("cancelled", "cancel")}
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
                    onClick={() => handleAction("confirmed", "approve")}
                    style={{ ...btnGreen, flex: 2 }}
                  >
                    موافقة وتأكيد الحجز ✅
                  </button>
                  <button
                    onClick={() => handleAction("negotiating", "negotiate")}
                    style={{ ...btnOrange, flex: 1 }}
                  >
                    طلب تفاوض 🤝
                  </button>
                  <button
                    onClick={() => handleAction("cancelled", "reject")}
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
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={() => {
                      if (window.confirm("تأكيد استلام الخدمة؟"))
                        handleAction("completed", "complete");
                    }}
                    style={{
                      ...btnBlue,
                      flex: 1,
                      boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    تأكيد إنجاز الخدمة 🏁
                  </button>
                  <button
                    onClick={handleCancelWithReason}
                    style={{ ...btnRed, flex: 1 }}
                  >
                    إلغاء الحجز ❌
                  </button>
                </div>
              </div>
            )}

            {status === "completed" && !isProviderView && (
              <div
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "15px",
                  backgroundColor: "#ffffffaa",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
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
                      <option value="5">⭐⭐⭐⭐⭐ ممتاز</option>
                      <option value="4">⭐⭐⭐⭐ جيد جداً</option>
                      <option value="3">⭐⭐⭐ جيد</option>
                      <option value="2">⭐⭐ مقبول</option>
                      <option value="1">⭐ سيء</option>
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
                        : "إرسال التقييم 🚀"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🚀 ✨ زر الأرشفة السحري (يظهر للجميع في الحالات المنتهية أسفل البطاقة) ✨ 🚀 */}
      {!loading && (status === "completed" || status === "cancelled") && (
        <button
          onClick={handleArchive}
          style={{
            width: "100%",
            backgroundColor: "#f8fafc",
            color: "#64748b",
            border: "2px dashed #cbd5e1",
            borderRadius: "8px",
            padding: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            marginTop: "15px",
            transition: "0.2s",
          }}
        >
          📂 إخفاء الطلب وأرشفته من قائمتي
        </button>
      )}
    </div>
  );
}
