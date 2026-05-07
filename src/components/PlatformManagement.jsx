import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// --- التنسيقات والدوال المساعدة ---
const thS = {
  padding: "15px",
  color: "#475569",
  backgroundColor: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
  fontWeight: "900",
  fontSize: "0.85rem",
};
const tdS = {
  padding: "15px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "0.9rem",
  color: "#334155",
};
const admBtn = (bg) => ({
  backgroundColor: bg,
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.85rem",
  transition: "all 0.2s ease",
  boxShadow: `0 4px 10px ${bg}40`,
});
const cardS = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(8px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "30px",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "600px",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
};
const smInput = {
  padding: "12px 15px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  flex: "1 1 100px",
  outline: "none",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  transition: "border-color 0.2s",
};

const fetchSafe = async (tableName) => {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    return error ? [] : data || [];
  } catch (err) {
    return [];
  }
};

const fetchSettingsSafe = async () => {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    return error ? null : data;
  } catch (err) {
    return null;
  }
};

// ✨ المكون الرئيسي للوحة الإدارة ✨
export default function PlatformManagement({
  onRefresh,
  commissionRate,
  setCommissionRate,
  affiliateRate,
  setAffiliateRate,
  platName,
  setPlatName,
  platLogo,
  setPlatLogo,
  bankAccounts,
  setBankAccounts,
  welcomeAr,
  setWelcomeAr,
  welcomeEn,
  setWelcomeEn,
  subtitleAr,
  setSubtitleAr,
  subtitleEn,
  setSubtitleEn,
  licenseName,
  setLicenseName,
  licenseNumber,
  setLicenseNumber,
  licenseLink,
  setLicenseLink,
}) {
  const [activeAdminTab, setActiveAdminTab] = useState("settings");
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);

  const [inputRate, setInputRate] = useState(commissionRate * 100);
  const [inputAffiliateRate, setInputAffiliateRate] = useState(
    (affiliateRate || 0.2) * 100,
  );
  const [inputName, setInputName] = useState(platName);
  const [inputLogo, setInputLogo] = useState(platLogo);
  const [inputBankAccounts, setInputBankAccounts] = useState(
    bankAccounts || "",
  );
  const [inputWelcomeAr, setInputWelcomeAr] = useState(welcomeAr || "");
  const [inputWelcomeEn, setInputWelcomeEn] = useState(welcomeEn || "");
  const [inputSubtitleAr, setInputSubtitleAr] = useState(subtitleAr || "");
  const [inputSubtitleEn, setInputSubtitleEn] = useState(subtitleEn || "");
  const [inputLicenseName, setInputLicenseName] = useState(licenseName || "");
  const [inputLicenseNumber, setInputLicenseNumber] = useState(
    licenseNumber || "",
  );
  const [inputLicenseLink, setInputLicenseLink] = useState(licenseLink || "");

  const [inputTerms, setInputTerms] = useState("");
  const [inputPrivacy, setInputPrivacy] = useState("");
  const [inputRefund, setInputRefund] = useState("");

  const [newCatAr, setNewCatAr] = useState("");
  const [newCatEn, setNewCatEn] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({
    label_ar: "",
    label_en: "",
    icon: "",
  });

  const [messagingUserId, setMessagingUserId] = useState(null);
  const [adminMessageText, setAdminMessageText] = useState("");

  // 🛠️ متغيرات التعديل الإجباري للمدير
  const [isForceEditModalOpen, setIsForceEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");

  // 📢 متغيرات الإرسال الجماعي
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [u, cats, settsData, rawRevs, rawOffs, rawBks, rawMsgs] =
        await Promise.all([
          fetchSafe("profiles"),
          fetchSafe("categories"),
          fetchSettingsSafe(),
          fetchSafe("reviews"),
          fetchSafe("offerings"),
          fetchSafe("bookings"),
          fetchSafe("contact_messages"),
        ]);

      setUsers(
        u.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")),
      );
      setCategories(cats);

      if (settsData) {
        setInputTerms(settsData.terms_text || "");
        setInputPrivacy(settsData.privacy_text || "");
        setInputRefund(settsData.refund_text || "");
      }

      let allReviews = [];
      if (rawRevs.length > 0 && u.length > 0) {
        const enrichedRevs = rawRevs.map((r) => {
          const reviewerId =
            r.reviewer_id ||
            r.user_id ||
            r.customer_id ||
            r.author_id ||
            r.client_id;
          const userProfile = u.find((user) => user.id === reviewerId);
          let offering = null;
          if (r.offering_id)
            offering = rawOffs.find((o) => o.id === r.offering_id);
          else if (r.booking_id) {
            const bk = rawBks.find((b) => b.id === r.booking_id);
            if (bk) offering = rawOffs.find((o) => o.id === bk.offering_id);
          }
          return {
            ...r,
            source_table: "reviews",
            profiles: userProfile,
            offerings: offering,
          };
        });
        allReviews = [...allReviews, ...enrichedRevs];
      }

      if (rawBks.length > 0 && u.length > 0) {
        const bksWithReviews = rawBks.filter(
          (b) =>
            (b.rating && b.rating > 0) ||
            (b.stars && b.stars > 0) ||
            (b.review_text && b.review_text.trim() !== "") ||
            (b.comment && b.comment.trim() !== "") ||
            (b.feedback && b.feedback.trim() !== ""),
        );
        const enrichedBksRevs = bksWithReviews.map((b) => {
          const customerProfile = u.find((user) => user.id === b.customer_id);
          const offering = rawOffs.find((o) => o.id === b.offering_id);
          return {
            id: b.id,
            source_table: "bookings",
            is_comment_hidden: b.is_comment_hidden || false,
            rating: b.rating || b.client_rating || b.stars || 5,
            comment:
              b.review_text ||
              b.review_comment ||
              b.client_review ||
              b.review ||
              b.comment ||
              b.feedback ||
              "تم التقييم بدون تعليق نصي.",
            profiles: customerProfile,
            offerings: offering,
          };
        });
        const existingIds = allReviews.map((r) => r.booking_id).filter(Boolean);
        const uniqueBksRevs = enrichedBksRevs.filter(
          (r) => !existingIds.includes(r.id),
        );
        allReviews = [...allReviews, ...uniqueBksRevs];
      }
      setReviews(allReviews);

      if (rawMsgs.length > 0 && u.length > 0) {
        const enrichedMsgs = rawMsgs
          .map((m) => ({
            ...m,
            profiles: u.find((user) => user.id === m.user_id) || {
              full_name: "غير متوفر",
            },
          }))
          .sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
          );
        setMessages(enrichedMsgs);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.log("خطأ في جلب بيانات الإدارة", err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateSettings = async () => {
    const newRateDec = inputRate / 100;
    const newAffiliateRateDec = inputAffiliateRate / 100;
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          commission_rate: newRateDec,
          affiliate_rate: newAffiliateRateDec,
          platform_name: inputName,
          platform_logo: inputLogo,
          bank_accounts: inputBankAccounts,
          welcome_msg_ar: inputWelcomeAr,
          welcome_msg_en: inputWelcomeEn,
          hero_subtitle_ar: inputSubtitleAr,
          hero_subtitle_en: inputSubtitleEn,
          license_name: inputLicenseName,
          license_number: inputLicenseNumber,
          license_link: inputLicenseLink,
        })
        .eq("id", 1);
      if (!error) {
        setCommissionRate(newRateDec);
        setAffiliateRate(newAffiliateRateDec);
        setPlatName(inputName);
        setPlatLogo(inputLogo);
        setBankAccounts(inputBankAccounts);
        setWelcomeAr(inputWelcomeAr);
        setWelcomeEn(inputWelcomeEn);
        setSubtitleAr(inputSubtitleAr);
        setSubtitleEn(inputSubtitleEn);
        setLicenseName(inputLicenseName);
        setLicenseNumber(inputLicenseNumber);
        setLicenseLink(inputLicenseLink);
        alert("تم حفظ الإعدادات بنجاح ✅");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ.");
    }
  };

  const handleUpdatePolicies = async () => {
    try {
      const { error: settingsError } = await supabase
        .from("platform_settings")
        .update({
          terms_text: inputTerms,
          privacy_text: inputPrivacy,
          refund_text: inputRefund,
        })
        .eq("id", 1);

      if (settingsError) throw settingsError;

      if (
        window.confirm(
          "تم حفظ السياسات بنجاح ✅\n\nهل هذا التعديل (جوهري) وتريد إجبار جميع المستخدمين الحاليين على الموافقة على الشروط الجديدة عند دخولهم القادم للمنصة؟",
        )
      ) {
        const { error: profilesError } = await supabase
          .from("profiles")
          .update({ terms_accepted: false })
          .not("id", "is", null);
        if (profilesError) throw profilesError;
        alert("تم الحفظ وإجبار الجميع على الموافقة من جديد بنجاح! 🚀📜");
      } else {
        alert("تم حفظ السياسات دون إجبار المستخدمين القدامى.");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatAr || !newCatEn)
      return alert("الرجاء إدخال اسم القسم بالعربي والإنجليزي.");
    const safeId =
      newCatEn
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "_") +
      "_" +
      Math.floor(Math.random() * 1000);
    try {
      const { error } = await supabase.from("categories").insert([
        {
          id: safeId,
          label_ar: newCatAr,
          label_en: newCatEn,
          icon: newCatIcon || "📌",
        },
      ]);
      if (!error) {
        fetchAdminData();
        setNewCatAr("");
        setNewCatEn("");
        setNewCatIcon("");
        alert("تمت إضافة القسم بنجاح ✅");
      }
    } catch (err) {
      alert("حدث خطأ.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا القسم؟")) {
      await supabase.from("categories").delete().eq("id", id);
      fetchAdminData();
    }
  };

  const handleSaveEditCategory = async (id) => {
    await supabase.from("categories").update(editCatForm).eq("id", id);
    setEditingCatId(null);
    fetchAdminData();
  };

  const toggleUserActive = async (id, status) => {
    try {
      await supabase
        .from("profiles")
        .update({ is_active: !status })
        .eq("id", id);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const handleAdminDeleteUser = async (id) => {
    if (
      window.confirm(
        "🚨 تحذير خطير: حذف المستخدم سيؤدي إلى مسح بياناته. هل أنت متأكد?",
      )
    ) {
      try {
        const { error } = await supabase.from("profiles").delete().eq("id", id);
        if (error) throw error;
        alert("تم حذف المستخدم بنجاح ✅");
        fetchAdminData();
        onRefresh();
      } catch (err) {
        alert("حدث خطأ! قد يكون المستخدم مرتبطاً بحجوزات سابقة.");
      }
    }
  };

  const openForceEdit = (user) => {
    setEditingUser(user);
    setNewUsername(user.username || "");
    setNewFullName(user.full_name || "");
    setIsForceEditModalOpen(true);
  };

  const saveForceEdit = async () => {
    if (!newUsername.trim()) return alert("يجب كتابة اسم مستخدم");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: newUsername.toLowerCase().trim(),
          full_name: newFullName,
        })
        .eq("id", editingUser.id);
      if (!error) {
        alert("تم التعديل الإجباري بنجاح! 👑");
        setIsForceEditModalOpen(false);
        fetchAdminData();
        onRefresh();
      } else {
        error.code === "23505"
          ? alert("اسم المستخدم هذا محجوز لشخص آخر.")
          : alert("خطأ: " + error.message);
      }
    } catch (err) {
      alert("خطأ أثناء التعديل");
    }
  };

  const sendAdminMessage = async (userId) => {
    try {
      await supabase
        .from("profiles")
        .update({ admin_note: adminMessageText })
        .eq("id", userId);
      await supabase.from("notifications").insert([
        {
          user_id: userId,
          title: "رسالة إدارية جديدة 📩",
          message: adminMessageText,
        },
      ]);
      alert("تم الإرسال بنجاح ✅");
      setMessagingUserId(null);
      setAdminMessageText("");
      fetchAdminData();
    } catch (err) {
      alert("حدث خطأ.");
    }
  };

  // 📢 دالة الإرسال الجماعي 📢
  const handleSendBroadcast = async () => {
    if (!broadcastMessageText.trim())
      return alert("الرجاء كتابة نص الرسالة أولاً ✍️");

    setIsBroadcasting(true);
    let targetUsers = users;

    if (broadcastTarget === "admins") {
      targetUsers = users.filter(
        (u) => u.role === "admin" || u.role === "supervisor",
      );
    } else if (broadcastTarget === "users_only") {
      targetUsers = users.filter((u) => u.role === "user" || !u.role);
    } else if (broadcastTarget === "inactive") {
      targetUsers = users.filter((u) => !u.is_active);
    }

    if (targetUsers.length === 0) {
      setIsBroadcasting(false);
      return alert("لا يوجد مستخدمين في هذه الشريحة لإرسال الرسالة لهم.");
    }

    const notificationsToInsert = targetUsers.map((u) => ({
      user_id: u.id,
      title: "إعلان إداري هام 📢",
      message: broadcastMessageText,
    }));

    try {
      const { error } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);
      if (error) throw error;
      alert(`تم إرسال الرسالة إلى (${targetUsers.length}) مستخدم بنجاح! ✅`);
      setIsBroadcastModalOpen(false);
      setBroadcastMessageText("");
    } catch (err) {
      alert("حدث خطأ أثناء الإرسال الجماعي: " + err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleHideComment = async (id, source_table) => {
    if (window.confirm("إخفاء التعليق لكونه مسيئاً؟")) {
      const hiddenText = "🚫 تم إخفاء التعليق لمخالفته سياسة المنصة.";
      try {
        if (source_table === "bookings") {
          const { data: bData } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (bData) {
            const payload = { is_comment_hidden: true };
            if ("review_text" in bData && bData.review_text)
              payload.review_text = hiddenText;
            if ("review_comment" in bData && bData.review_comment)
              payload.review_comment = hiddenText;
            if ("client_review" in bData && bData.client_review)
              payload.client_review = hiddenText;
            if ("review" in bData && bData.review) payload.review = hiddenText;
            if ("comment" in bData && bData.comment)
              payload.comment = hiddenText;
            if ("feedback" in bData && bData.feedback)
              payload.feedback = hiddenText;
            await supabase.from("bookings").update(payload).eq("id", id);
          }
        } else {
          const { data: rData } = await supabase
            .from("reviews")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (rData) {
            const payload = { is_comment_hidden: true };
            if ("comment" in rData) payload.comment = hiddenText;
            if ("review_text" in rData) payload.review_text = hiddenText;
            await supabase.from("reviews").update(payload).eq("id", id);
          }
        }
        alert("تم إخفاء التعليق بنجاح ✅");
        fetchAdminData();
      } catch (err) {
        alert("تأكد من وجود عمود is_comment_hidden في Supabase أولاً.");
      }
    }
  };

  const handleMarkMessageRead = async (id) => {
    try {
      await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
      fetchAdminData();
    } catch (err) {}
  };

  const tabBtnStyle = (isActive) => ({
    padding: "12px 24px",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.9rem",
    backgroundColor: isActive ? "#fff" : "transparent",
    color: isActive ? "#ef4444" : "#64748b",
    boxShadow: isActive ? "0 4px 10px rgba(0,0,0,0.05)" : "none",
    transition: "0.2s",
  });

  return (
    <div
      style={{
        ...cardS,
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        direction: "rtl",
        borderTop: "4px solid #ef4444",
      }}
    >
      <h2
        style={{
          color: "#1e293b",
          margin: 0,
          fontSize: "1.5rem",
          fontWeight: "900",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span>👑</span> لوحة تحكم الإدارة العليا
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          backgroundColor: "#f8fafc",
          padding: "10px",
          borderRadius: "20px",
          overflowX: "auto",
          border: "1px solid #e2e8f0",
        }}
      >
        <button
          onClick={() => setActiveAdminTab("settings")}
          style={tabBtnStyle(activeAdminTab === "settings")}
        >
          🛠️ إعدادات المنصة
        </button>
        <button
          onClick={() => setActiveAdminTab("policies")}
          style={tabBtnStyle(activeAdminTab === "policies")}
        >
          📜 سياسات المنصة
        </button>
        <button
          onClick={() => setActiveAdminTab("categories")}
          style={tabBtnStyle(activeAdminTab === "categories")}
        >
          📁 الأقسام
        </button>
        <button
          onClick={() => setActiveAdminTab("users")}
          style={tabBtnStyle(activeAdminTab === "users")}
        >
          👥 المستخدمين
        </button>
        <button
          onClick={() => setActiveAdminTab("reviews")}
          style={tabBtnStyle(activeAdminTab === "reviews")}
        >
          ⭐ التقييمات
        </button>
        <button
          onClick={() => setActiveAdminTab("messages")}
          style={tabBtnStyle(activeAdminTab === "messages")}
        >
          ✉️ رسائل الزوار{" "}
          {messages.filter((m) => !m.is_read).length > 0 && (
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                marginLeft: "5px",
              }}
            >
              {messages.filter((m) => !m.is_read).length}
            </span>
          )}
        </button>
      </div>

      {activeAdminTab === "settings" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#3b82f6", fontSize: "1.1rem" }}>
                🎨 الهوية البصرية
              </h3>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  اسم المنصة:
                </strong>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  رابط اللوجو (أو ارفع صورة):
                </strong>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={inputLogo}
                    onChange={(e) => setInputLogo(e.target.value)}
                    placeholder="https://..."
                    style={{ ...smInput, flex: 1, minWidth: "100px" }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setInputLogo(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{
                      padding: "8px",
                      fontSize: "0.75rem",
                      border: "1px dashed #94a3b8",
                      borderRadius: "10px",
                      cursor: "pointer",
                      backgroundColor: "#f8fafc",
                      width: "110px",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#10b981", fontSize: "1.1rem" }}>
                💰 العمولات والأرباح
              </h3>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.85rem",
                    }}
                  >
                    عمولة المنصة (%):
                  </strong>
                  <input
                    type="number"
                    value={inputRate}
                    onChange={(e) => setInputRate(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      fontWeight: "bold",
                      color: "#1e293b",
                      backgroundColor: "#f8fafc",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.85rem",
                    }}
                  >
                    ربح المسوق (%):
                  </strong>
                  <input
                    type="number"
                    value={inputAffiliateRate}
                    onChange={(e) => setInputAffiliateRate(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      fontWeight: "bold",
                      color: "#10b981",
                      backgroundColor: "#ecfdf5",
                      borderColor: "#a7f3d0",
                    }}
                  />
                </div>
              </div>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  الحسابات البنكية للمنصة:
                </strong>
                <textarea
                  value={inputBankAccounts}
                  onChange={(e) => setInputBankAccounts(e.target.value)}
                  placeholder="مثال: البنك الراجحي..."
                  style={{
                    ...smInput,
                    width: "100%",
                    boxSizing: "border-box",
                    height: "70px",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#7c3aed", fontSize: "1.1rem" }}>
                📝 نصوص واجهة المتجر
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    ترحيب (عربي):
                  </strong>
                  <input
                    type="text"
                    value={inputWelcomeAr}
                    onChange={(e) => setInputWelcomeAr(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    ترحيب (إنجليزي):
                  </strong>
                  <input
                    type="text"
                    value={inputWelcomeEn}
                    onChange={(e) => setInputWelcomeEn(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    وصف (عربي):
                  </strong>
                  <input
                    type="text"
                    value={inputSubtitleAr}
                    onChange={(e) => setInputSubtitleAr(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    وصف (إنجليزي):
                  </strong>
                  <input
                    type="text"
                    value={inputSubtitleEn}
                    onChange={(e) => setInputSubtitleEn(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#f59e0b", fontSize: "1.1rem" }}>
                🛡️ التوثيق والتراخيص
              </h3>
              <div>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  جهة التوثيق:
                </strong>
                <input
                  type="text"
                  value={inputLicenseName}
                  onChange={(e) => setInputLicenseName(e.target.value)}
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    رقم الترخيص:
                  </strong>
                  <input
                    type="text"
                    value={inputLicenseNumber}
                    onChange={(e) => setInputLicenseNumber(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: "5px",
                      fontSize: "0.8rem",
                    }}
                  >
                    رابط التحقق:
                  </strong>
                  <input
                    type="text"
                    placeholder="https://"
                    value={inputLicenseLink}
                    onChange={(e) => setInputLicenseLink(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      boxSizing: "border-box",
                      direction: "ltr",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleUpdateSettings}
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
              color: "white",
              border: "none",
              padding: "15px 30px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "900",
              fontSize: "1.1rem",
              marginTop: "10px",
              alignSelf: "flex-end",
              boxShadow: "0 6px 15px rgba(239, 68, 68, 0.3)",
            }}
          >
            💾 حفظ الإعدادات بالكامل
          </button>
        </div>
      )}

      {activeAdminTab === "policies" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong
              style={{
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "block",
                marginBottom: "10px",
              }}
            >
              📜 الشروط والأحكام للإستخدام:
            </strong>
            <textarea
              value={inputTerms}
              onChange={(e) => setInputTerms(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                boxSizing: "border-box",
                height: "150px",
                resize: "vertical",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong
              style={{
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "block",
                marginBottom: "10px",
              }}
            >
              🔒 سياسة الخصوصية:
            </strong>
            <textarea
              value={inputPrivacy}
              onChange={(e) => setInputPrivacy(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                boxSizing: "border-box",
                height: "150px",
                resize: "vertical",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <strong
              style={{
                color: "#1e293b",
                fontSize: "1.1rem",
                display: "block",
                marginBottom: "10px",
              }}
            >
              💸 سياسة الاسترجاع والإلغاء:
            </strong>
            <textarea
              value={inputRefund}
              onChange={(e) => setInputRefund(e.target.value)}
              style={{
                ...smInput,
                width: "100%",
                boxSizing: "border-box",
                height: "150px",
                resize: "vertical",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
          <button
            onClick={handleUpdatePolicies}
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
              color: "white",
              border: "none",
              padding: "15px 30px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "900",
              fontSize: "1.1rem",
              alignSelf: "flex-end",
              boxShadow: "0 6px 15px rgba(245, 158, 11, 0.3)",
            }}
          >
            حفظ وتحديث السياسات 📝
          </button>
        </div>
      )}

      {activeAdminTab === "categories" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              marginBottom: "25px",
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <strong
                style={{
                  color: "#475569",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                الاسم بالعربي:
              </strong>
              <input
                value={newCatAr}
                onChange={(e) => setNewCatAr(e.target.value)}
                style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <strong
                style={{
                  color: "#475569",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                الاسم بالإنجليزي:
              </strong>
              <input
                value={newCatEn}
                onChange={(e) => setNewCatEn(e.target.value)}
                style={{
                  ...smInput,
                  width: "100%",
                  boxSizing: "border-box",
                  direction: "ltr",
                }}
              />
            </div>
            <div style={{ width: "100px" }}>
              <strong
                style={{
                  color: "#475569",
                  fontSize: "0.85rem",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                أيقونة 🪧:
              </strong>
              <input
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                style={{
                  ...smInput,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              />
            </div>
            <button
              onClick={handleAddCategory}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                padding: "12px 25px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
                boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
              }}
            >
              ➕ إضافة قسم
            </button>
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "center",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={thS}>القسم</th>
                  <th style={thS}>الأيقونة</th>
                  <th style={thS}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={tdS}>
                      {editingCatId === c.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            justifyContent: "center",
                          }}
                        >
                          <input
                            style={smInput}
                            value={editCatForm.label_ar}
                            onChange={(e) =>
                              setEditCatForm({
                                ...editCatForm,
                                label_ar: e.target.value,
                              })
                            }
                            placeholder="عربي"
                          />
                          <input
                            style={{ ...smInput, direction: "ltr" }}
                            value={editCatForm.label_en}
                            onChange={(e) =>
                              setEditCatForm({
                                ...editCatForm,
                                label_en: e.target.value,
                              })
                            }
                            placeholder="إنجليزي"
                          />
                        </div>
                      ) : (
                        <span style={{ fontWeight: "bold", color: "#1e293b" }}>
                          {c.label_ar}{" "}
                          <span
                            style={{
                              color: "#94a3b8",
                              fontSize: "0.8rem",
                              margin: "0 5px",
                            }}
                          >
                            |
                          </span>{" "}
                          {c.label_en}
                        </span>
                      )}
                    </td>
                    <td style={tdS}>
                      {editingCatId === c.id ? (
                        <input
                          style={{
                            ...smInput,
                            width: "60px",
                            textAlign: "center",
                          }}
                          value={editCatForm.icon}
                          onChange={(e) =>
                            setEditCatForm({
                              ...editCatForm,
                              icon: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <span style={{ fontSize: "1.5rem" }}>{c.icon}</span>
                      )}
                    </td>
                    <td style={tdS}>
                      {editingCatId === c.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => handleSaveEditCategory(c.id)}
                            style={{
                              ...admBtn("#10b981"),
                              padding: "8px 20px",
                            }}
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            style={{
                              ...admBtn("#64748b"),
                              padding: "8px 20px",
                            }}
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => {
                              setEditingCatId(c.id);
                              setEditCatForm({
                                label_ar: c.label_ar,
                                label_en: c.label_en,
                                icon: c.icon,
                              });
                            }}
                            style={admBtn("#3b82f6")}
                          >
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            style={{
                              ...admBtn("transparent"),
                              color: "#ef4444",
                              border: "1px solid #fca5a5",
                            }}
                          >
                            🗑️ حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      style={{ padding: "30px", color: "#94a3b8" }}
                    >
                      لا توجد أقسام حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 👥 تبويب المستخدمين - تمت إضافة الإرسال الجماعي والتعديل الإجباري 👥 */}
      {activeAdminTab === "users" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "20px",
            borderRadius: "15px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          {/* ✨ زر الإرسال الجماعي ✨ */}
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              style={{
                ...admBtn("#10b981"),
                padding: "12px 25px",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              📢 إرسال إعلان جماعي
            </button>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center" }}>
                  <th style={thS}>المستخدم</th>
                  <th style={thS}>الصلاحية</th>
                  <th style={thS}>مراسلة</th>
                  <th style={thS}>الحالة</th>
                  <th style={{ ...thS, minWidth: "220px" }}>إجراءات الإدارة</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      opacity: u.is_active ? 1 : 0.6,
                      textAlign: "center",
                      transition: "0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={tdS}>
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#1e293b",
                          fontSize: "1.05rem",
                        }}
                      >
                        {u.full_name || "بدون اسم"}
                        <span
                          style={{
                            color: "#3b82f6",
                            fontSize: "0.85rem",
                            display: "block",
                            direction: "ltr",
                          }}
                        >
                          @{u.username || "---"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {u.phone || "لا يوجد رقم"}
                      </div>
                    </td>
                    <td style={tdS}>
                      <select
                        value={u.role || "user"}
                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          backgroundColor:
                            u.role === "admin"
                              ? "#fef2f2"
                              : u.role === "supervisor"
                                ? "#eff6ff"
                                : "#f8fafc",
                          color:
                            u.role === "admin"
                              ? "#dc2626"
                              : u.role === "supervisor"
                                ? "#2563eb"
                                : "#475569",
                          fontWeight: "bold",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="user">👤 عادي</option>
                        <option value="supervisor">🛡️ مشرف</option>
                        <option value="admin">👑 مدير</option>
                      </select>
                    </td>
                    <td style={tdS}>
                      {messagingUserId === u.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <input
                            style={{ ...smInput, padding: "8px" }}
                            value={adminMessageText}
                            onChange={(e) =>
                              setAdminMessageText(e.target.value)
                            }
                            placeholder="رسالة تنبيه.."
                          />
                          <button
                            onClick={() => sendAdminMessage(u.id)}
                            style={admBtn("#3b82f6")}
                          >
                            إرسال
                          </button>
                          <button
                            onClick={() => setMessagingUserId(null)}
                            style={{
                              ...admBtn("transparent"),
                              color: "#94a3b8",
                              padding: "5px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setMessagingUserId(u.id)}
                          style={{
                            ...admBtn("#fff"),
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          }}
                        >
                          مراسلة 💬
                        </button>
                      )}
                    </td>
                    <td style={tdS}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "10px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          backgroundColor: u.is_active ? "#ecfdf5" : "#fef2f2",
                          color: u.is_active ? "#059669" : "#dc2626",
                        }}
                      >
                        {u.is_active ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdS,
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => openForceEdit(u)}
                        style={{
                          background: "#eff6ff",
                          color: "#3b82f6",
                          border: "1px solid #bfdbfe",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          transition: "0.2s",
                        }}
                        title="تعديل بيانات المستخدم إجبارياً"
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => toggleUserActive(u.id, u.is_active)}
                        style={{
                          background: u.is_active ? "#fef3c7" : "#d1fae5",
                          color: u.is_active ? "#b45309" : "#047857",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          transition: "0.2s",
                        }}
                      >
                        {u.is_active ? "إيقاف ⏸️" : "تفعيل ▶️"}
                      </button>
                      <button
                        onClick={() => handleAdminDeleteUser(u.id)}
                        style={{
                          background: "#fef2f2",
                          color: "#ef4444",
                          border: "1px solid #fca5a5",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          transition: "0.2s",
                        }}
                        title="حذف المستخدم نهائياً"
                      >
                        حذف 🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🛠️ النافذة المنبثقة للتعديل الإجباري للمستخدمين 🛠️ */}
          {isForceEditModalOpen && (
            <div style={{ ...modalOverlay, zIndex: 9999 }}>
              <div style={{ ...modalContent, maxWidth: "450px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#1e293b" }}>
                    🛠️ التعديل الإجباري
                  </h3>
                  <button
                    onClick={() => setIsForceEditModalOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#ef4444",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: "#475569",
                    }}
                  >
                    الاسم الكامل:
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "25px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: "#ef4444",
                    }}
                  >
                    تغيير اليوزر نيم بالقوة:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "2px solid #fca5a5",
                      textAlign: "left",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "15px" }}>
                  <button
                    onClick={saveForceEdit}
                    style={{ flex: 1, ...admBtn("#7c3aed"), padding: "12px" }}
                  >
                    حفظ وتطبيق
                  </button>
                  <button
                    onClick={() => setIsForceEditModalOpen(false)}
                    style={{ flex: 1, ...admBtn("#94a3b8"), padding: "12px" }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 📢 النافذة المنبثقة للإرسال الجماعي 📢 */}
          {isBroadcastModalOpen && (
            <div style={{ ...modalOverlay, zIndex: 9999 }}>
              <div style={{ ...modalContent, maxWidth: "500px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#10b981" }}>
                    📢 إرسال إعلان جماعي
                  </h3>
                  <button
                    onClick={() => setIsBroadcastModalOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#ef4444",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: "#475569",
                    }}
                  >
                    إلى من تريد الإرسال؟
                  </label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    style={{
                      ...smInput,
                      width: "100%",
                      cursor: "pointer",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="all">🌐 الجميع (كافة المستخدمين)</option>
                    <option value="users_only">
                      👥 المستخدمين العاديين (عملاء ومزودين)
                    </option>
                    <option value="admins">
                      🛡️ طاقم الإدارة (المدراء والمشرفين)
                    </option>
                    <option value="inactive">⏸️ المستخدمين الموقوفين</option>
                  </select>
                </div>

                <div style={{ marginBottom: "25px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: "#475569",
                    }}
                  >
                    نص الإعلان أو الرسالة:
                  </label>
                  <textarea
                    value={broadcastMessageText}
                    onChange={(e) => setBroadcastMessageText(e.target.value)}
                    placeholder="اكتب التنبيه أو التحديث هنا..."
                    style={{
                      ...smInput,
                      width: "100%",
                      height: "120px",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "15px" }}>
                  <button
                    onClick={handleSendBroadcast}
                    disabled={isBroadcasting}
                    style={{
                      flex: 1,
                      ...admBtn("#10b981"),
                      padding: "12px",
                      opacity: isBroadcasting ? 0.7 : 1,
                    }}
                  >
                    {isBroadcasting ? "⏳ جاري الإرسال..." : "إرسال الآن 🚀"}
                  </button>
                  <button
                    onClick={() => setIsBroadcastModalOpen(false)}
                    style={{ flex: 1, ...admBtn("#94a3b8"), padding: "12px" }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === "reviews" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "15px 20px",
              borderRadius: "16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>💡</span>
            <p
              style={{
                margin: 0,
                color: "#1e3a8a",
                fontSize: "0.95rem",
                fontWeight: "bold",
              }}
            >
              يمكن إخفاء أي تعليق مسيء مع الاحتفاظ بعدد النجوم لعدم ظلم المزود.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "right",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={thS}>العميل</th>
                  <th style={thS}>الخدمة والمزود</th>
                  <th style={thS}>التقييم</th>
                  <th style={thS}>التعليق</th>
                  <th style={{ ...thS, textAlign: "center" }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      لا توجد تقييمات.
                    </td>
                  </tr>
                ) : (
                  reviews.map((r, idx) => {
                    const isHidden =
                      r.is_comment_hidden ||
                      (r.comment && r.comment.includes("🚫"));
                    return (
                      <tr
                        key={r.id || idx}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#f8fafc")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td
                          style={{
                            ...tdS,
                            fontWeight: "bold",
                            color: "#1e293b",
                          }}
                        >
                          {r.profiles?.full_name || "غير محدد"}
                        </td>
                        <td style={tdS}>
                          <div
                            style={{
                              color: "#3b82f6",
                              fontWeight: "bold",
                              marginBottom: "4px",
                            }}
                          >
                            {r.offerings?.title || "خدمة محذوفة"}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            المزود:{" "}
                            {r.offerings?.profiles?.full_name || "غير محدد"}
                          </div>
                        </td>
                        <td
                          style={{
                            ...tdS,
                            fontSize: "1.2rem",
                            letterSpacing: "2px",
                            color: "#f59e0b",
                          }}
                        >
                          {"⭐".repeat(r.rating || 5)}
                        </td>
                        <td style={tdS}>
                          {isHidden ? (
                            <span
                              style={{
                                color: "#ef4444",
                                fontWeight: "bold",
                                fontStyle: "italic",
                                backgroundColor: "#fef2f2",
                                padding: "6px 12px",
                                borderRadius: "10px",
                              }}
                            >
                              🚫 (مخفي)
                            </span>
                          ) : (
                            <span
                              style={{ color: "#475569", lineHeight: "1.6" }}
                            >
                              {r.comment || "-"}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdS, textAlign: "center" }}>
                          {!isHidden && (
                            <button
                              onClick={() =>
                                handleHideComment(r.id, r.source_table)
                              }
                              style={{
                                ...admBtn("transparent"),
                                color: "#ef4444",
                                border: "1px solid #fca5a5",
                                padding: "8px 15px",
                              }}
                            >
                              إخفاء 🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAdminTab === "messages" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "right",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={{ ...thS, width: "100px", textAlign: "center" }}>
                    الحالة
                  </th>
                  <th style={thS}>المرسل</th>
                  <th style={thS}>النوع</th>
                  <th style={thS}>الموضوع والرسالة</th>
                  <th style={{ ...thS, textAlign: "center", width: "150px" }}>
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "1.1rem",
                      }}
                    >
                      صندوق الوارد فارغ.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: m.is_read ? "transparent" : "#eff6ff",
                        transition: "0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = m.is_read
                          ? "#f8fafc"
                          : "#e0e7ff")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = m.is_read
                          ? "transparent"
                          : "#eff6ff")
                      }
                    >
                      <td style={{ ...tdS, textAlign: "center" }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "10px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            backgroundColor: m.is_read ? "#f1f5f9" : "#3b82f6",
                            color: m.is_read ? "#64748b" : "#fff",
                          }}
                        >
                          {m.is_read ? "مقروءة" : "جديدة 🆕"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <strong
                          style={{
                            color: "#1e293b",
                            fontSize: "1.05rem",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          {m.profiles?.full_name || "مجهول / زائر"}
                        </strong>
                        <span
                          style={{
                            direction: "ltr",
                            display: "inline-block",
                            fontSize: "0.85rem",
                            color: "#64748b",
                            fontWeight: "bold",
                          }}
                        >
                          {m.profiles?.phone || "لا يوجد رقم"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <span
                          style={{
                            backgroundColor:
                              m.type === "complaint"
                                ? "#fef2f2"
                                : m.type === "suggestion"
                                  ? "#fef3c7"
                                  : "#f1f5f9",
                            color:
                              m.type === "complaint"
                                ? "#dc2626"
                                : m.type === "suggestion"
                                  ? "#d97706"
                                  : "#475569",
                            padding: "6px 12px",
                            borderRadius: "10px",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            border: `1px solid ${m.type === "complaint" ? "#fecaca" : m.type === "suggestion" ? "#fde68a" : "#cbd5e1"}`,
                          }}
                        >
                          {m.type === "complaint"
                            ? "🚨 شكوى"
                            : m.type === "suggestion"
                              ? "💡 اقتراح"
                              : "❓ استفسار"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <strong
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            color: "#0f172a",
                            fontSize: "1.1rem",
                          }}
                        >
                          {m.subject}
                        </strong>
                        <p
                          style={{
                            margin: 0,
                            color: "#475569",
                            lineHeight: "1.6",
                          }}
                        >
                          {m.message}
                        </p>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            display: "block",
                            marginTop: "10px",
                          }}
                        >
                          {new Date(m.created_at).toLocaleString("ar-SA")}
                        </span>
                      </td>
                      <td style={{ ...tdS, textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          {!m.is_read && (
                            <button
                              onClick={() => handleMarkMessageRead(m.id)}
                              style={{ ...admBtn("#10b981"), width: "100%" }}
                            >
                              مقروء ✅
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm("حذف؟")) {
                                await supabase
                                  .from("contact_messages")
                                  .delete()
                                  .eq("id", m.id);
                                fetchAdminData();
                              }
                            }}
                            style={{
                              ...admBtn("transparent"),
                              color: "#ef4444",
                              border: "1px solid #fca5a5",
                              width: "100%",
                            }}
                          >
                            حذف 🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
