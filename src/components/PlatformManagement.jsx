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
  whiteSpace: "nowrap",
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
  whiteSpace: "nowrap",
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

// تنسيقات التمرير الأفقي لحل مشكلة الجوال
const tableWrapperS = {
  width: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
};
const responsiveTableS = {
  width: "100%",
  minWidth: "850px", // إجبار الجدول على التمرير في الشاشات الصغيرة
  borderCollapse: "collapse",
  textAlign: "right",
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

export default function PlatformManagement({
  userRole,
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
  announcementText,
  setAnnouncementText,
  announcementLink,
  setAnnouncementLink,
  isAnnouncementActive,
  setIsAnnouncementActive,
  appleStoreLink,
  setAppleStoreLink,
  playStoreLink,
  setPlayStoreLink,
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

  const [inputAnnouncementText, setInputAnnouncementText] = useState(
    announcementText || "",
  );
  const [inputAnnouncementLink, setInputAnnouncementLink] = useState(
    announcementLink || "",
  );
  const [inputIsAnnouncementActive, setInputIsAnnouncementActive] = useState(
    isAnnouncementActive || false,
  );
  const [inputAppleStore, setInputAppleStore] = useState(appleStoreLink || "");
  const [inputPlayStore, setInputPlayStore] = useState(playStoreLink || "");

  const [inputTerms, setInputTerms] = useState("");
  const [inputPrivacy, setInputPrivacy] = useState("");
  const [inputRefund, setInputRefund] = useState("");

  const [newCatAr, setNewCatAr] = useState("");
  const [newCatEn, setNewCatEn] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");

  // حالات تعديل الأقسام
  const [isEditCatModalOpen, setIsEditCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({
    label_ar: "",
    label_en: "",
    icon: "",
  });

  const [messagingUserId, setMessagingUserId] = useState(null);
  const [adminMessageText, setAdminMessageText] = useState("");

  const [isForceEditModalOpen, setIsForceEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const isFin = userRole === "financial_manager";

  useEffect(() => {
    if (isFin) {
      setActiveAdminTab("messages");
    }
  }, [userRole]);

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

        setInputAnnouncementText(settsData.announcement_text || "");
        setInputAnnouncementLink(settsData.announcement_link || "");
        setInputIsAnnouncementActive(settsData.is_announcement_active || false);
        setInputAppleStore(settsData.apple_store_link || "");
        setInputPlayStore(settsData.play_store_link || "");
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

  const handleApproveCommission = async (messageOrId) => {
    const msgId =
      typeof messageOrId === "object" ? messageOrId.id : messageOrId;
    const { data: msgData } = await supabase
      .from("contact_messages")
      .select("user_id")
      .eq("id", msgId)
      .maybeSingle();

    const providerId = msgData?.user_id;

    if (!providerId) {
      return alert("عذراً، هذا الإيصال مرسل من زائر غير مسجل في النظام.");
    }

    const choice = window.prompt(
      "لتصفية حساب المزود، اختر الطريقة المناسبة:\n\n1 - تصفية (كافة العمولات المعلقة) دفعة واحدة.\n2 - تصفية (حجز واحد محدد).\n\n⚠️ ملاحظة: إذا كان المبلغ المحول ناقصاً، اضغط (إلغاء) واستخدم زر المراسلة لطلب باقي المبلغ.\n\nأدخل الرقم (1) أو (2):",
    );

    if (!choice) return;

    try {
      if (choice === "1") {
        const { data: offeringsData } = await supabase
          .from("offerings")
          .select("id")
          .eq("provider_id", providerId);

        if (offeringsData && offeringsData.length > 0) {
          const offeringIds = offeringsData.map((o) => o.id);

          await supabase
            .from("bookings")
            .update({ is_commission_paid: true })
            .in("offering_id", offeringIds)
            .eq("status", "completed")
            .eq("is_commission_paid", false);
        }

        await supabase.from("notifications").insert([
          {
            user_id: providerId,
            title: "تم اعتماد سداد العمولات بنجاح 💰✅",
            message: `شكرًا لك، اعتمدت الإدارة المالية حوالتك البنكية. تم تصفية (كافة المستحقات المعلقة) وتحديث رصيدك بنجاح.`,
            is_read: false,
          },
        ]);
      } else if (choice === "2") {
        const bookingIdInput = window.prompt(
          "الرجاء إدخال (رقم الحجز) المراد تصفية عمولته:",
        );
        if (!bookingIdInput) return;

        await supabase
          .from("bookings")
          .update({ is_commission_paid: true })
          .eq("id", bookingIdInput);

        await supabase.from("notifications").insert([
          {
            user_id: providerId,
            title: "تم اعتماد سداد العمولة بنجاح ✅",
            message: `شكرًا لك، اعتمدت الإدارة المالية حوالتك البنكية للحجز رقم (${bookingIdInput}). تم إخفاء المطالبة بنجاح.`,
            is_read: false,
          },
        ]);
      } else {
        return alert("خيار غير صحيح، الرجاء إدخال رقم 1 أو 2.");
      }

      await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", msgId);

      alert("تم اعتماد السداد المالي وتحديث حساب المزود بنجاح! 🎉");
      fetchAdminData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("حدث خطأ مالي أثناء محاولة الاعتماد: " + err.message);
    }
  };

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
          announcement_text: inputAnnouncementText,
          announcement_link: inputAnnouncementLink,
          is_announcement_active: inputIsAnnouncementActive,
          apple_store_link: inputAppleStore,
          play_store_link: inputPlayStore,
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
        setAnnouncementText(inputAnnouncementText);
        setAnnouncementLink(inputAnnouncementLink);
        setIsAnnouncementActive(inputIsAnnouncementActive);
        setAppleStoreLink(inputAppleStore);
        setPlayStoreLink(inputPlayStore);
        alert("تم حفظ الإعدادات والتعديلات بنجاح ✅");
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

  // ✨ دالة فتح نافذة تعديل القسم ✨
  const openEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditCatForm({
      label_ar: cat.label_ar || "",
      label_en: cat.label_en || "",
      icon: cat.icon || "",
    });
    setIsEditCatModalOpen(true);
  };

  // ✨ دالة حفظ تعديل القسم ✨
  const handleSaveEditCategory = async () => {
    if (!editCatForm.label_ar.trim())
      return alert("الرجاء إدخال الاسم بالعربي");

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          label_ar: editCatForm.label_ar,
          label_en: editCatForm.label_en || editCatForm.label_ar,
          icon: editCatForm.icon || "📌",
        })
        .eq("id", editingCatId);

      if (!error) {
        alert("تم تعديل القسم بنجاح ✅");
        setIsEditCatModalOpen(false);
        setEditingCatId(null);
        fetchAdminData();
      } else {
        alert("حدث خطأ أثناء التعديل: " + error.message);
      }
    } catch (err) {
      alert("حدث خطأ.");
    }
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
        alert("حدث خطأ.");
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

  const renderMessageWithLinks = (text) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        const isImage = part.match(/\.(jpeg|jpg|gif|png|webp)/i);

        if (isImage) {
          return (
            <div key={index} style={{ marginTop: "15px", textAlign: "right" }}>
              <a href={part} target="_blank" rel="noopener noreferrer">
                <img
                  src={part}
                  alt="إيصال سداد"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "180px",
                    borderRadius: "12px",
                    border: "2px solid #cbd5e1",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                    cursor: "zoom-in",
                    objectFit: "contain",
                    backgroundColor: "#f8fafc",
                  }}
                  title="اضغط لمعاينة وتكبير الإيصال"
                />
              </a>
            </div>
          );
        } else {
          return (
            <div key={index} style={{ marginTop: "10px" }}>
              <a
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#3b82f6",
                  textDecoration: "none",
                  backgroundColor: "#eff6ff",
                  padding: "8px 15px",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                  direction: "ltr",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                }}
              >
                📄 عرض المرفق المالي (PDF / رابط)
              </a>
            </div>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
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
    whiteSpace: "nowrap",
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
        <span>👑</span> لوحة تحكم الإدارة {isFin && "والمالية العليا"}
      </h2>

      {/* شريط تبويبات الإدارة الذكي */}
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
        {!isFin && (
          <button
            onClick={() => setActiveAdminTab("settings")}
            style={tabBtnStyle(activeAdminTab === "settings")}
          >
            🛠️ إعدادات المنصة
          </button>
        )}
        {!isFin && (
          <button
            onClick={() => setActiveAdminTab("policies")}
            style={tabBtnStyle(activeAdminTab === "policies")}
          >
            📜 سياسات المنصة
          </button>
        )}
        {!isFin && (
          <button
            onClick={() => setActiveAdminTab("categories")}
            style={tabBtnStyle(activeAdminTab === "categories")}
          >
            📁 الأقسام
          </button>
        )}
        {!isFin && (
          <button
            onClick={() => setActiveAdminTab("users")}
            style={tabBtnStyle(activeAdminTab === "users")}
          >
            👥 المستخدمين
          </button>
        )}
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
          ✉️ رسائل وإيصالات الوارد{" "}
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

      {/* ================= تبويب إعدادات المنصة ================= */}
      {activeAdminTab === "settings" && !isFin && (
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
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, color: "#f59e0b", fontSize: "1.1rem" }}>
                📢 الشريط الإعلاني الذكي
              </h3>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: inputIsAnnouncementActive ? "#10b981" : "#94a3b8",
                }}
              >
                <input
                  type="checkbox"
                  checked={inputIsAnnouncementActive}
                  onChange={(e) =>
                    setInputIsAnnouncementActive(e.target.checked)
                  }
                  style={{ transform: "scale(1.2)" }}
                />
                {inputIsAnnouncementActive
                  ? "مفعل (يظهر للزوار)"
                  : "معطل (مخفي)"}
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: "200px" }}>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  نص الإعلان أو التنبيه:
                </strong>
                <input
                  type="text"
                  value={inputAnnouncementText}
                  onChange={(e) => setInputAnnouncementText(e.target.value)}
                  placeholder="مثال: حمل تطبيق دعوة الآن..."
                  style={{ ...smInput, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  رابط الإعلان (اختياري):
                </strong>
                <input
                  type="text"
                  value={inputAnnouncementLink}
                  onChange={(e) => setInputAnnouncementLink(e.target.value)}
                  placeholder="https://..."
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
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.1rem" }}>
              📱 روابط تحميل التطبيقات
            </h3>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  رابط (App Store):
                </strong>
                <input
                  type="text"
                  value={inputAppleStore}
                  onChange={(e) => setInputAppleStore(e.target.value)}
                  placeholder="https://apps.apple.com/..."
                  style={{
                    ...smInput,
                    width: "100%",
                    boxSizing: "border-box",
                    direction: "ltr",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <strong
                  style={{
                    color: "#475569",
                    display: "block",
                    marginBottom: "5px",
                    fontSize: "0.85rem",
                  }}
                >
                  رابط (Google Play):
                </strong>
                <input
                  type="text"
                  value={inputPlayStore}
                  onChange={(e) => setInputPlayStore(e.target.value)}
                  placeholder="https://play.google.com/..."
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

      {/* ================= تبويب السياسات (محدث مع الخصوصية والاسترجاع) ================= */}
      {activeAdminTab === "policies" && !isFin && (
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
          {/* الشروط والأحكام */}
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

          {/* سياسة الخصوصية */}
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
              🔐 سياسة الخصوصية:
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

          {/* سياسات الدفع والاسترجاع */}
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
              💳 سياسات الدفع والاسترجاع:
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

      {/* ================= تبويب الأقسام (مع زر التعديل) ================= */}
      {activeAdminTab === "categories" && !isFin && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* نموذج الإضافة */}
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
                الأيقونة 🌟:
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
                placeholder="📌"
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

          {/* جدول الأقسام بالتمرير الأفقي */}
          <h3 style={{ color: "#1e293b", margin: "20px 0 15px 0" }}>
            📁 الأقسام الحالية
          </h3>
          <div style={tableWrapperS}>
            <table style={responsiveTableS}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={thS}>الأيقونة</th>
                  <th style={thS}>الاسم بالعربي</th>
                  <th style={thS}>الاسم بالإنجليزي</th>
                  <th style={{ ...thS, textAlign: "center" }}>إجراءات القسم</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td
                      style={{
                        ...tdS,
                        textAlign: "center",
                        fontSize: "1.5rem",
                      }}
                    >
                      {c.icon}
                    </td>
                    <td style={{ ...tdS, fontWeight: "bold" }}>{c.label_ar}</td>
                    <td style={tdS}>{c.label_en}</td>
                    <td
                      style={{
                        ...tdS,
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      {/* ✨ زر التعديل ✨ */}
                      <button
                        onClick={() => openEditCategory(c)}
                        style={{
                          ...admBtn("transparent"),
                          color: "#3b82f6",
                          border: "1px solid #bfdbfe",
                        }}
                        title="تعديل اسم أو أيقونة القسم"
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
                        title="حذف القسم نهائياً"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      لا توجد أقسام مسجلة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= تبويب المستخدمين ================= */}
      {activeAdminTab === "users" && !isFin && (
        <div
          style={{
            background: "#f8fafc",
            padding: "20px",
            borderRadius: "15px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <h3 style={{ margin: 0, color: "#1e293b" }}>
              👥 إدارة المستخدمين ({users.length})
            </h3>
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              style={{
                ...admBtn("#10b981"),
                padding: "12px 25px",
                fontSize: "1rem",
              }}
            >
              📢 إرسال إعلان جماعي
            </button>
          </div>

          <div style={tableWrapperS}>
            <table style={responsiveTableS}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center" }}>
                  <th style={thS}>المستخدم</th>
                  <th style={thS}>الصلاحية</th>
                  <th style={thS}>الحالة</th>
                  <th style={thS}>إجراءات الإدارة</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "center",
                    }}
                  >
                    <td style={tdS}>
                      <strong>{u.full_name}</strong>
                      <br />
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        @{u.username}
                      </span>
                    </td>
                    <td style={tdS}>
                      <select
                        value={u.role || "user"}
                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                        style={{
                          padding: "6px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          outline: "none",
                        }}
                      >
                        <option value="user">👤 عادي</option>
                        <option value="supervisor">🛡️ مشرف</option>
                        <option value="financial_manager">💰 مدير مالي</option>
                        <option value="admin">👑 مدير المنصة</option>
                      </select>
                    </td>
                    <td style={tdS}>
                      <span
                        style={{
                          backgroundColor:
                            u.is_active !== false ? "#d1fae5" : "#fee2e2",
                          color: u.is_active !== false ? "#059669" : "#dc2626",
                          padding: "5px 12px",
                          borderRadius: "20px",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                        }}
                      >
                        {u.is_active !== false ? "نشط ✅" : "موقوف 🚫"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdS,
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => openForceEdit(u)}
                        style={{
                          ...admBtn("transparent"),
                          color: "#3b82f6",
                          border: "1px solid #bfdbfe",
                        }}
                        title="تعديل"
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() =>
                          toggleUserActive(u.id, u.is_active !== false)
                        }
                        style={{
                          ...admBtn("transparent"),
                          color: u.is_active !== false ? "#f59e0b" : "#10b981",
                          border: `1px solid ${
                            u.is_active !== false ? "#fcd34d" : "#6ee7b7"
                          }`,
                        }}
                        title={u.is_active !== false ? "إيقاف" : "تفعيل"}
                      >
                        {u.is_active !== false ? "⏸️ إيقاف" : "▶️ تفعيل"}
                      </button>
                      <button
                        onClick={() => handleAdminDeleteUser(u.id)}
                        style={{
                          ...admBtn("transparent"),
                          color: "#ef4444",
                          border: "1px solid #fca5a5",
                        }}
                        title="حذف نهائي"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= تبويب التقييمات ================= */}
      {activeAdminTab === "reviews" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ color: "#1e293b", marginBottom: "15px" }}>
            ⭐ إدارة التقييمات
          </h3>
          <div style={tableWrapperS}>
            <table style={responsiveTableS}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={thS}>صاحب التقييم</th>
                  <th style={thS}>الخدمة المُقيمة</th>
                  <th style={thS}>التقييم</th>
                  <th style={thS}>التعليق</th>
                  <th style={thS}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r, idx) => (
                  <tr
                    key={r.id || idx}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ ...tdS, fontWeight: "bold" }}>
                      {r.profiles?.full_name || "عميل"}
                    </td>
                    <td style={tdS}>{r.offerings?.title || "خدمة محذوفة"}</td>
                    <td
                      style={{ ...tdS, color: "#f59e0b", fontSize: "1.1rem" }}
                    >
                      {"⭐".repeat(r.rating || 5)}
                    </td>
                    <td
                      style={{
                        ...tdS,
                        color: r.is_comment_hidden ? "#ef4444" : "#475569",
                      }}
                    >
                      {r.comment}
                    </td>
                    <td style={tdS}>
                      {!r.is_comment_hidden && (
                        <button
                          onClick={() =>
                            handleHideComment(r.id, r.source_table)
                          }
                          style={{
                            ...admBtn("transparent"),
                            color: "#ef4444",
                            border: "1px solid #fca5a5",
                          }}
                        >
                          🚫 إخفاء مسيء
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      لا توجد تقييمات حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= تبويب الرسائل والإيصالات ================= */}
      {activeAdminTab === "messages" && (
        <div
          style={{
            background: "#f8fafc",
            padding: "25px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={tableWrapperS}>
            <table style={responsiveTableS}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  <th style={{ ...thS, width: "110px", textAlign: "center" }}>
                    الحالة
                  </th>
                  <th style={thS}>المرسل</th>
                  <th style={thS}>النوع</th>
                  <th style={thS}>الموضوع والتفاصيل المادية</th>
                  <th style={{ ...thS, textAlign: "center", width: "160px" }}>
                    إجراءات السداد
                  </th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: m.is_read ? "transparent" : "#eff6ff",
                    }}
                  >
                    <td style={{ ...tdS, textAlign: "center" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          backgroundColor: m.is_read ? "#cbd5e1" : "#3b82f6",
                          color: m.is_read ? "#475569" : "#fff",
                        }}
                      >
                        {m.is_read ? "معتمد/مقروء" : "جديد 🆕"}
                      </span>
                    </td>
                    <td style={tdS}>
                      <strong>{m.profiles?.full_name}</strong>
                      <br />
                      {m.profiles?.phone}
                    </td>
                    <td style={tdS}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          backgroundColor:
                            m.type === "receipt" ? "#d1fae5" : "#f1f5f9",
                          color: m.type === "receipt" ? "#065f46" : "#334155",
                        }}
                      >
                        {m.type === "receipt" ? "🧾 إيصال سداد" : "❓ استفسار"}
                      </span>
                    </td>
                    <td style={tdS}>
                      <strong>{m.subject}</strong>
                      <div
                        style={{
                          margin: "5px 0 0 0",
                          color: "#475569",
                          lineHeight: "1.6",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {renderMessageWithLinks(m.message || m.text_content)}
                      </div>
                    </td>
                    <td style={{ ...tdS, textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        {m.type === "receipt" && !m.is_read && (
                          <button
                            onClick={() => handleApproveCommission(m.id)}
                            style={{ ...admBtn("#10b981"), width: "100%" }}
                          >
                            💰 اعتماد وإخفاء المطالبة
                          </button>
                        )}
                        {!m.is_read && (
                          <button
                            onClick={() => handleMarkMessageRead(m.id)}
                            style={{ ...admBtn("#64748b"), width: "100%" }}
                          >
                            مقروء
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
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      صندوق الوارد فارغ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= النوافذ المنبثقة (Modals) ================= */}

      {/* 1. النافذة المنبثقة للتعديل الإجباري للمستخدم */}
      {isForceEditModalOpen && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: "450px" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b" }}>
              🛠️ التعديل الإجباري لليوزر
            </h3>
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
              style={{ ...smInput, marginBottom: "15px" }}
            />
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#ef4444",
              }}
            >
              اليوزر نيم بالقوة:
            </label>
            <input
              type="text"
              dir="ltr"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              style={{
                ...smInput,
                border: "2px solid #fca5a5",
                backgroundColor: "#fef2f2",
              }}
            />
            <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
              <button
                onClick={saveForceEdit}
                style={{ flex: 1, ...admBtn("#7c3aed") }}
              >
                حفظ التعديل
              </button>
              <button
                onClick={() => setIsForceEditModalOpen(false)}
                style={{ flex: 1, ...admBtn("#94a3b8") }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ 2. النافذة المنبثقة الجديدة لتعديل الأقسام ✨ */}
      {isEditCatModalOpen && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: "450px" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#3b82f6" }}>
              ✏️ تعديل القسم
            </h3>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              الاسم بالعربي:
            </label>
            <input
              type="text"
              value={editCatForm.label_ar}
              onChange={(e) =>
                setEditCatForm({ ...editCatForm, label_ar: e.target.value })
              }
              style={{
                ...smInput,
                marginBottom: "15px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              الاسم بالإنجليزي:
            </label>
            <input
              type="text"
              dir="ltr"
              value={editCatForm.label_en}
              onChange={(e) =>
                setEditCatForm({ ...editCatForm, label_en: e.target.value })
              }
              style={{
                ...smInput,
                marginBottom: "15px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              الأيقونة 🌟:
            </label>
            <input
              type="text"
              value={editCatForm.icon}
              onChange={(e) =>
                setEditCatForm({ ...editCatForm, icon: e.target.value })
              }
              style={{ ...smInput, width: "100px", textAlign: "center" }}
            />

            <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
              <button
                onClick={handleSaveEditCategory}
                style={{ flex: 1, ...admBtn("#3b82f6") }}
              >
                💾 حفظ التعديلات
              </button>
              <button
                onClick={() => {
                  setIsEditCatModalOpen(false);
                  setEditingCatId(null);
                }}
                style={{ flex: 1, ...admBtn("#94a3b8") }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. النافذة المنبثقة لإرسال إعلان جماعي */}
      {isBroadcastModalOpen && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: "500px" }}>
            <h3
              style={{
                margin: "0 0 20px 0",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>📢</span> إرسال إعلان / تنبيه جماعي
            </h3>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              اختر الشريحة المستهدفة:
            </label>
            <select
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              style={{
                ...smInput,
                marginBottom: "15px",
                backgroundColor: "#f8fafc",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <option value="all">🌐 إرسال للجميع (كل المسجلين)</option>
              <option value="users_only">👤 المستخدمين العاديين فقط</option>
              <option value="admins">🛡️ المدراء والمشرفين فقط</option>
              <option value="inactive">
                🚫 المستخدمين الموقوفين أو غير النشطين
              </option>
            </select>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              نص الرسالة (سيصل كإشعار منبثق):
            </label>
            <textarea
              value={broadcastMessageText}
              onChange={(e) => setBroadcastMessageText(e.target.value)}
              placeholder="اكتب التنبيه أو التحديث هنا..."
              style={{
                ...smInput,
                height: "120px",
                resize: "vertical",
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
              <button
                onClick={handleSendBroadcast}
                disabled={isBroadcasting}
                style={{
                  flex: 2,
                  ...admBtn(isBroadcasting ? "#94a3b8" : "#10b981"),
                }}
              >
                {isBroadcasting
                  ? "⏳ جاري الإرسال..."
                  : "🚀 إرسال الإعلان الآن"}
              </button>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                style={{ flex: 1, ...admBtn("#ef4444") }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
