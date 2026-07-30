import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // أضفنا مكتبة الترجمة للتواريخ

export default function InvoicesView({
  bookings = [],
  userId,
  commissionRate = 0.1,
  platName = "المنصة",
  platLogo = "📍",
}) {
  const { i18n } = useTranslation();

  // ✨ حالات الفلترة والبحث ✨
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  // ✨ حالة النافذة المنبثقة للفاتورة (Modal) ✨
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // 💰 دالة حساب المبالغ المالية للفاتورة المحدثة
  const calculateFinancials = (b) => {
    // 1. تحديد السعر النهائي الإجمالي:
    // إذا كان هناك سعر تفاوض (proposed_price)، فهو يمثل الإجمالي النهائي
    // وإذا لم يوجد، نضرب سعر الخدمة الأساسي في العدد
    const finalTotal =
      b.proposed_price && Number(b.proposed_price) > 0
        ? Number(b.proposed_price)
        : (Number(b.offerings?.price) || 0) * (b.quantity || 1);

    // 2. حساب عمولة المنصة من الإجمالي
    const platformCommission = finalTotal * commissionRate;

    // 3. صافي ربح المزود
    const providerNet = finalTotal - platformCommission;

    return {
      baseTotal: finalTotal, // نعرضه كإجمالي
      additional: 0, // أصبحت مدمجة مسبقاً إذا كان هناك تفاوض
      totalClientPrice: finalTotal,
      platformCommission,
      providerNet,
      qty: b.quantity || 1,
    };
  };

  // تطبيق الفلاتر
  let processedBookings = bookings.filter((b) => b.status === "completed");

  if (roleFilter === "provider") {
    processedBookings = processedBookings.filter(
      (b) => b.offerings?.provider_id === userId,
    );
  } else if (roleFilter === "client") {
    processedBookings = processedBookings.filter(
      (b) => b.customer_id === userId,
    );
  }

  if (searchTerm.trim() !== "") {
    const query = searchTerm.toLowerCase();
    processedBookings = processedBookings.filter((b) => {
      const shortId = b.id.split("-")[0].toLowerCase();
      const providerName = (
        b.offerings?.profiles?.full_name ||
        b.offerings?.profiles?.username ||
        ""
      ).toLowerCase();
      const clientName = (
        b.profiles?.full_name ||
        b.profiles?.username ||
        ""
      ).toLowerCase();
      return (
        shortId.includes(query) ||
        providerName.includes(query) ||
        clientName.includes(query)
      );
    });
  }

  processedBookings.sort((a, b) => {
    const dateA = new Date(a.appointment_date || 0);
    const dateB = new Date(b.appointment_date || 0);
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  const inputStyle = {
    padding: "12px 15px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    color: "#1e293b",
    backgroundColor: "#fff",
  };

  // ✨ دوال استخراج وتنسيق التواريخ والأوقات ✨
  const isRTL = i18n?.language === "ar" || true; // افتراضي عربي
  const dateLocale = isRTL ? "ar-SA" : "en-US";

  const getFullFormattedDate = (dateObj) => {
    if (!dateObj) return null;
    try {
      const dayName = new Intl.DateTimeFormat(dateLocale, {
        weekday: "long",
      }).format(dateObj);
      const gregDate = new Intl.DateTimeFormat(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dateObj);
      const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dateObj);
      return { dayName, gregDate, hijriDate };
    } catch (e) {
      return null;
    }
  };

  // دالة فتح نافذة الفاتورة وتمرير الحسابات معها
  const openInvoiceModal = (b) => {
    // تجهيز التواريخ لحظة الفتح
    const startObj = b.appointment_date ? new Date(b.appointment_date) : null;
    const endObj = b.end_time ? new Date(b.end_time) : null;

    const startTimeStr = startObj
      ? startObj.toLocaleTimeString(dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const endTimeStr = endObj
      ? endObj.toLocaleTimeString(dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    setSelectedInvoice({
      booking: b,
      fin: calculateFinancials(b),
      isProvider: b.offerings?.provider_id === userId,
      currency: b.offerings?.currency || "SAR",
      startFormatted: getFullFormattedDate(startObj),
      endFormatted: getFullFormattedDate(endObj),
      startTimeStr,
      endTimeStr,
    });
  };

  return (
    <>
      {/* 🚀 السحر هنا: كود الطباعة المتقدم الذي يعزل الفاتورة ويمنع التكرار 🚀 */}
      <style>{`
        @media print {
          /* 1. إجبار المتصفح على طباعة صفحة واحدة فقط ومنع الصفحات الفارغة */
          html, body {
            height: 100vh !important;
            overflow: hidden !important;
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* 2. إخفاء الواجهة الرئيسية لشبكة الفواتير كلياً */
          .hide-on-print {
            display: none !important;
          }

          /* 3. تمديد خلفية الفاتورة لتغطي أي شيء آخر (مثل شريط التنقل العلوي) */
          .invoice-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: #fff !important;
            z-index: 999999 !important;
            padding: 20px !important;
            display: block !important;
          }

          /* 4. تنظيف إطار الفاتورة لتبدو كورقة رسمية */
          #printable-invoice {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* 5. إخفاء أزرار الطباعة والإغلاق أثناء الطباعة */
          .no-print {
            display: none !important;
          }

          /* 6. إجبار المتصفح على طباعة الألوان بدقة */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. الواجهة الرئيسية */}
      {/* ========================================================= */}
      <div
        className={selectedInvoice ? "hide-on-print" : ""}
        style={{ display: "flex", flexDirection: "column", gap: "25px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <h2
            style={{
              fontSize: "1.8rem",
              color: "#1e293b",
              margin: "0 0 10px 0",
              fontWeight: "900",
            }}
          >
            السجل المالي والفواتير
          </h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
            استعرض كافة فواتير حجوزاتك كعميل أو إيراداتك كمزود خدمة.
          </p>
        </div>

        {/* 🔍 شريط البحث والفلترة الذكي 🔍 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            backgroundColor: "#f8fafc",
            padding: "20px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              flex: "1 1 250px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              البحث الشامل:
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1.1rem",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="رقم الفاتورة، اسم المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  paddingRight: "40px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div
            style={{
              flex: "1 1 150px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              تصنيف الفواتير:
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
            >
              <option value="all">📁 عرض جميع الفواتير</option>
              <option value="provider">💼 إيراداتي (كمزود)</option>
              <option value="client">🛍️ مشترياتي (كعميل)</option>
            </select>
          </div>
          <div
            style={{
              flex: "1 1 150px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: "bold",
                color: "#475569",
              }}
            >
              ترتيب حسب:
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
            >
              <option value="newest">🔽 الأحدث تاريخاً</option>
              <option value="oldest">🔼 الأقدم تاريخاً</option>
            </select>
          </div>
        </div>

        {processedBookings.length > 0 && (
          <div
            style={{ fontSize: "0.9rem", color: "#10b981", fontWeight: "bold" }}
          >
            ✅ تم العثور على ({processedBookings.length}) فاتورة مطابقة.
          </div>
        )}

        {/* 🧾 شبكة عرض الفواتير المبسطة 🧾 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "25px",
          }}
        >
          {processedBookings.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "60px 20px",
                backgroundColor: "#f8fafc",
                borderRadius: "20px",
                border: "2px dashed #cbd5e1",
                color: "#64748b",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "15px" }}>📭</div>
              <h3
                style={{ margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}
              >
                لا توجد فواتير مطابقة لبحثك
              </h3>
            </div>
          ) : (
            processedBookings.map((b) => {
              const shortId = b.id.split("-")[0].toUpperCase();
              const isProvider = b.offerings?.provider_id === userId;
              const currency = b.offerings?.currency || "SAR";
              const fin = calculateFinancials(b);

              return (
                <div
                  key={b.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "20px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "15px 20px",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        fontWeight: "bold",
                      }}
                    >
                      ملخص فاتورة #{shortId}
                    </span>
                    <span
                      style={{
                        backgroundColor: isProvider ? "#ecfdf5" : "#eff6ff",
                        color: isProvider ? "#059669" : "#2563eb",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      {isProvider ? "إيراد 💼" : "مشتريات 🛍️"}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      flex: 1,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        color: "#1e293b",
                        fontWeight: "900",
                      }}
                    >
                      {b.offerings?.title}
                    </h3>
                    <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                      <strong>{isProvider ? "العميل:" : "المزود:"}</strong>{" "}
                      {isProvider
                        ? b.profiles?.full_name
                        : b.offerings?.profiles?.full_name}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          color: "#64748b",
                          fontWeight: "bold",
                        }}
                      >
                        {isProvider ? "صافي الربح" : "المبلغ المدفوع"}
                      </span>
                      <strong
                        style={{
                          fontSize: "1.2rem",
                          color: "#1e293b",
                          fontWeight: "900",
                          direction: "ltr",
                        }}
                      >
                        {(isProvider
                          ? fin.providerNet
                          : fin.totalClientPrice
                        ).toFixed(2)}{" "}
                        {currency}
                      </strong>
                    </div>
                    {/* ✨ الزر الذي يفتح الفاتورة المستقلة ✨ */}
                    <button
                      onClick={() => openInvoiceModal(b)}
                      style={{
                        backgroundColor: "#1e293b",
                        color: "#fff",
                        border: "none",
                        padding: "10px 15px",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "0.2s",
                      }}
                    >
                      📄 عرض الفاتورة
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. نافذة الفاتورة المستقلة (هذا ما سيتم طباعته فقط) */}
      {/* ========================================================= */}
      {selectedInvoice && (
        <div
          className="invoice-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            id="printable-invoice"
            style={{
              backgroundColor: "#fff",
              width: "100%",
              maxWidth: "800px",
              minHeight: "fit-content",
              margin: "auto",
              padding: "40px",
              borderRadius: "24px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
              direction: "rtl",
            }}
          >
            {/* أزرار التحكم العلوية (تختفي في الطباعة بفضل الكلاس no-print) */}
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "30px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "20px",
              }}
            >
              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  padding: "10px 25px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                🖨️ طباعة الفاتورة
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#ef4444",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                ✖ إغلاق
              </button>
            </div>

            {/* --- هيدر الفاتورة --- */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "40px",
                borderBottom: "2px solid #1e293b",
                paddingBottom: "20px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                {platLogo?.includes("http") ||
                platLogo?.startsWith("data:image") ? (
                  <img
                    src={platLogo}
                    alt="Logo"
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "12px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "3rem" }}>{platLogo}</div>
                )}
                <div>
                  <h1
                    style={{
                      margin: 0,
                      color: "#1e293b",
                      fontSize: "1.8rem",
                      fontWeight: "900",
                    }}
                  >
                    {platName}
                  </h1>
                  <span
                    style={{
                      color: "#64748b",
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                    }}
                  >
                    منصة الخدمات الموثوقة
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <h2
                  style={{
                    margin: 0,
                    color: "#1e293b",
                    fontSize: "1.5rem",
                    fontWeight: "900",
                  }}
                >
                  فاتورة خدمة
                </h2>
                <div
                  style={{
                    color: "#475569",
                    fontSize: "0.9rem",
                    marginTop: "5px",
                  }}
                >
                  <strong>رقم الفاتورة:</strong> #
                  {selectedInvoice.booking.id.split("-")[0].toUpperCase()}
                </div>
                <div
                  style={{
                    color: "#475569",
                    fontSize: "0.9rem",
                    marginTop: "5px",
                  }}
                >
                  <strong>تاريخ الإصدار:</strong>{" "}
                  {new Date().toLocaleDateString("ar-SA")}
                </div>
              </div>
            </div>

            {/* --- بيانات الأطراف --- */}
            <div style={{ display: "flex", gap: "30px", marginBottom: "20px" }}>
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  padding: "20px",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 10px 0",
                    color: "#64748b",
                    fontSize: "0.9rem",
                  }}
                >
                  🏢 بيانات المزود:
                </h3>
                <strong
                  style={{
                    display: "block",
                    color: "#1e293b",
                    fontSize: "1.1rem",
                    marginBottom: "5px",
                  }}
                >
                  {selectedInvoice.booking.offerings?.profiles?.full_name ||
                    "مزود الخدمة"}
                </strong>
                {selectedInvoice.booking.offerings?.profiles?.username && (
                  <div style={{ color: "#475569", fontSize: "0.9rem" }}>
                    @{selectedInvoice.booking.offerings?.profiles?.username}
                  </div>
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  padding: "20px",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 10px 0",
                    color: "#64748b",
                    fontSize: "0.9rem",
                  }}
                >
                  👤 بيانات العميل:
                </h3>
                <strong
                  style={{
                    display: "block",
                    color: "#1e293b",
                    fontSize: "1.1rem",
                    marginBottom: "5px",
                  }}
                >
                  {selectedInvoice.booking.profiles?.full_name || "العميل"}
                </strong>
                {selectedInvoice.booking.profiles?.username && (
                  <div style={{ color: "#475569", fontSize: "0.9rem" }}>
                    @{selectedInvoice.booking.profiles?.username}
                  </div>
                )}
              </div>
            </div>

            {/* ✨ قسم تفاصيل الموعد والموقع (الجديد المضاف للفاتورة) ✨ */}
            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px dashed #bfdbfe",
                padding: "20px",
                borderRadius: "16px",
                marginBottom: "30px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              {/* تاريخ البدء */}
              <div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    color: "#64748b",
                    fontSize: "0.85rem",
                  }}
                >
                  تاريخ ووقت البدء:
                </h4>
                {selectedInvoice.startFormatted ? (
                  <div
                    style={{
                      color: "#1e293b",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      lineHeight: "1.6",
                    }}
                  >
                    📅 {selectedInvoice.startFormatted.dayName}،{" "}
                    {selectedInvoice.startFormatted.gregDate}
                    <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                      🌙 {selectedInvoice.startFormatted.hijriDate}
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      ⏰ {selectedInvoice.startTimeStr}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748b" }}>غير محدد</div>
                )}
              </div>

              {/* تاريخ الانتهاء */}
              <div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    color: "#64748b",
                    fontSize: "0.85rem",
                  }}
                >
                  تاريخ ووقت الانتهاء:
                </h4>
                <div
                  style={{
                    color: "#1e293b",
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                  }}
                >
                  {selectedInvoice.endFormatted ? (
                    <>
                      🏁 {selectedInvoice.endFormatted.dayName}،{" "}
                      {selectedInvoice.endFormatted.gregDate}
                      <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                        🌙 {selectedInvoice.endFormatted.hijriDate}
                      </div>
                    </>
                  ) : (
                    <>🏁 نفس تاريخ البدء</>
                  )}
                  <div style={{ marginTop: "4px" }}>
                    ⌛ {selectedInvoice.endTimeStr || "غير محدد"}
                  </div>
                </div>
              </div>

              {/* الموقع (إن وجد) يأخذ المساحة الكاملة بالأسفل */}
              {selectedInvoice.booking.location && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    borderTop: "1px solid #bfdbfe",
                    paddingTop: "15px",
                    marginTop: "5px",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "#64748b",
                      fontSize: "0.85rem",
                    }}
                  >
                    📍 موقع تقديم الخدمة:
                  </h4>
                  <div
                    style={{
                      color: "#1e293b",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedInvoice.booking.location.startsWith("http") ? (
                      <a
                        href={selectedInvoice.booking.location}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          textDecoration: "underline",
                        }}
                      >
                        رابط الموقع على الخريطة (اضغط للفتح)
                      </a>
                    ) : (
                      selectedInvoice.booking.location
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- تفاصيل الخدمة (الجدول) --- */}
            <h3
              style={{
                margin: "0 0 15px 0",
                color: "#1e293b",
                fontSize: "1.1rem",
              }}
            >
              التفاصيل المالية للخدمة المنفذة:
            </h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "40px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#1e293b", color: "#fff" }}>
                  <th
                    style={{
                      padding: "12px 15px",
                      textAlign: "right",
                      borderRadius: "0 10px 10px 0",
                    }}
                  >
                    الخدمة
                  </th>
                  <th style={{ padding: "12px 15px", textAlign: "center" }}>
                    العدد
                  </th>
                  <th
                    style={{
                      padding: "12px 15px",
                      textAlign: "left",
                      borderRadius: "10px 0 0 0",
                    }}
                  >
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "15px",
                      borderBottom: "1px solid #e2e8f0",
                      color: "#334155",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedInvoice.booking.offerings?.title}
                  </td>
                  <td
                    style={{
                      padding: "15px",
                      borderBottom: "1px solid #e2e8f0",
                      color: "#334155",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedInvoice.fin.qty}
                  </td>
                  <td
                    style={{
                      padding: "15px",
                      borderBottom: "1px solid #e2e8f0",
                      color: "#334155",
                      textAlign: "left",
                      fontWeight: "bold",
                      direction: "ltr",
                    }}
                  >
                    {selectedInvoice.fin.baseTotal.toFixed(2)}{" "}
                    {selectedInvoice.currency}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* --- الملخص المالي --- */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  width: "350px",
                  backgroundColor: "#f8fafc",
                  padding: "20px",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    color: "#475569",
                    fontSize: "0.95rem",
                  }}
                >
                  <span>المبلغ الأساسي:</span>
                  <span style={{ direction: "ltr", fontWeight: "bold" }}>
                    {selectedInvoice.fin.baseTotal.toFixed(2)}{" "}
                    {selectedInvoice.currency}
                  </span>
                </div>

                {selectedInvoice.fin.additional > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      color: "#475569",
                      fontSize: "0.95rem",
                    }}
                  >
                    <span>إضافات ومصاريف أخرى:</span>
                    <span style={{ direction: "ltr", fontWeight: "bold" }}>
                      {selectedInvoice.fin.additional.toFixed(2)}{" "}
                      {selectedInvoice.currency}
                    </span>
                  </div>
                )}

                {selectedInvoice.isProvider && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "15px",
                      color: "#ef4444",
                      fontSize: "0.95rem",
                      paddingBottom: "15px",
                      borderBottom: "1px dashed #cbd5e1",
                    }}
                  >
                    <span>رسوم المنصة ({commissionRate * 100}%):</span>
                    <span style={{ direction: "ltr", fontWeight: "bold" }}>
                      - {selectedInvoice.fin.platformCommission.toFixed(2)}{" "}
                      {selectedInvoice.currency}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: selectedInvoice.isProvider ? "#059669" : "#1d4ed8",
                    fontSize: "1.2rem",
                    paddingTop: selectedInvoice.isProvider ? "0" : "15px",
                    borderTop: selectedInvoice.isProvider
                      ? "none"
                      : "1px dashed #cbd5e1",
                    marginTop: selectedInvoice.isProvider ? "0" : "10px",
                  }}
                >
                  <strong style={{ fontWeight: "900" }}>
                    {selectedInvoice.isProvider
                      ? "صافي المستحق للمزود:"
                      : "إجمالي المدفوع:"}
                  </strong>
                  <strong style={{ direction: "ltr", fontWeight: "900" }}>
                    {(selectedInvoice.isProvider
                      ? selectedInvoice.fin.providerNet
                      : selectedInvoice.fin.totalClientPrice
                    ).toFixed(2)}{" "}
                    {selectedInvoice.currency}
                  </strong>
                </div>
              </div>
            </div>

            {/* --- الفوتر --- */}
            <div
              style={{
                marginTop: "50px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.9rem",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "20px",
              }}
            >
              تم إصدار هذه الفاتورة إلكترونياً من نظام{" "}
              <strong>{platName}</strong>.<br />
              شكراً لثقتكم وتعاملكم معنا.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
