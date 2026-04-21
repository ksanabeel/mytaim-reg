import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ClientMarketplace({
  session,
  searchTerm = "",
  allowTextReviews = true,
}) {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [localSearch, setLocalSearch] = useState("");
  const [reviews, setReviews] = useState([]);

  const [bookingData, setBookingData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    manualLocation: "",
    gpsLocation: "",
    manualQuantity: 1,
  });

  const [calculatedData, setCalculatedData] = useState({
    price: 0,
    quantity: 1,
    text: "",
  });
  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchOfferings = async () => {
      const { data } = await supabase
        .from("offerings")
        .select("*, profiles!inner(*)")
        .eq("profiles.is_active", true)
        .order("rating", { foreignTable: "profiles", ascending: false });

      setOfferings(data || []);
      setLoading(false);
    };
    fetchOfferings();
  }, []);

  const filtered = offerings.filter((item) => {
    const s = localSearch.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(s) ||
      (item.profiles?.full_name || "").toLowerCase().includes(s) ||
      (item.description || "").toLowerCase().includes(s)
    );
  });

  useEffect(() => {
    if (!selected) {
      setReviews([]);
      return;
    }
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("rating, review, profiles!bookings_customer_id_fkey(full_name)")
        .eq("offering_id", selected.id)
        .not("rating", "is", null)
        .order("id", { ascending: false })
        .limit(5);
      setReviews(data || []);
    };
    fetchReviews();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const model = selected.pricing_model || "fixed";
    const price = Number(selected.price);
    let qty = 1;
    let label = "مهمة";

    if (model === "period") {
      qty = Number(bookingData.manualQuantity) || 1;
      label = "فترة";
    } else if (
      model !== "fixed" &&
      model !== "free" &&
      bookingData.startDate &&
      bookingData.startTime &&
      bookingData.endDate &&
      bookingData.endTime
    ) {
      const start = new Date(
        `${bookingData.startDate}T${bookingData.startTime}`,
      );
      const end = new Date(`${bookingData.endDate}T${bookingData.endTime}`);
      let diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours <= 0) diffHours += 24;

      if (model === "hourly") {
        qty = Math.round(diffHours * 100) / 100;
        label = "ساعة";
      } else if (model === "daily") {
        qty = Math.max(1, Math.ceil(diffHours / 24));
        label = "يوم/ليلة";
      } else if (model === "monthly") {
        qty = Math.max(1, Math.ceil(diffHours / (24 * 30)));
        label = "شهر";
      } else if (model === "yearly") {
        qty = Math.max(1, Math.ceil(diffHours / (24 * 365)));
        label = "سنة";
      }
    } else if (model === "fixed" || model === "free") {
      qty = 1;
      label = model === "free" ? "تطوع" : "مهمة ثابتة";
    }

    setCalculatedData({ price: price * qty, quantity: qty, text: label });
  }, [bookingData, selected]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("جهازك لا يدعم تحديد الموقع.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBookingData({
          ...bookingData,
          gpsLocation: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
          manualLocation: "",
        });
      },
      () => alert("يرجى السماح بالوصول للـ GPS 📍"),
    );
  };

  const handleBook = async () => {
    const finalLocation = bookingData.manualLocation || bookingData.gpsLocation;
    if (
      !bookingData.startDate ||
      !bookingData.startTime ||
      !bookingData.endDate ||
      !bookingData.endTime ||
      !finalLocation
    ) {
      return alert("يرجى إكمال تفاصيل الموقع والوقت 📍");
    }

    const requestedStart = new Date(
      `${bookingData.startDate}T${bookingData.startTime}`,
    );
    let requestedEnd = new Date(
      `${bookingData.endDate}T${bookingData.endTime}`,
    );
    const now = new Date();
    if (requestedStart < now) return alert("⛔ لا يمكن الحجز في الماضي.");

    if (selected.is_24_7 === false) {
      const pStartD = new Date(`2000-01-01T${selected.work_start_time}`);
      const pEndD = new Date(`2000-01-01T${selected.work_end_time}`);
      const rStartD = new Date(`2000-01-01T${bookingData.startTime}`);
      let rEndD = new Date(`2000-01-01T${bookingData.endTime}`);
      if (rEndD <= rStartD)
        rEndD = new Date(`2000-01-02T${bookingData.endTime}`);
      let shiftEndD = pEndD;
      if (pEndD <= pStartD)
        shiftEndD = new Date(`2000-01-02T${selected.work_end_time}`);
      if (rStartD < pStartD || rEndD > shiftEndD) {
        return alert(
          `⛔ خارج أوقات عمل الخدمة (${selected.work_start_time.substring(0, 5)} - ${selected.work_end_time.substring(0, 5)})`,
        );
      }
    }

    const { data: existing } = await supabase
      .from("bookings")
      .select("appointment_date, end_time")
      .eq("offering_id", selected.id)
      .neq("status", "cancelled");
    let overlaps = 0;
    existing?.forEach((b) => {
      if (
        requestedStart < new Date(b.end_time) &&
        requestedEnd > new Date(b.appointment_date)
      )
        overlaps++;
    });

    if (overlaps >= (selected.profiles?.max_concurrent_bookings || 1)) {
      return alert("⚠️ هذا الوقت محجوز مسبقاً.");
    }

    const { error } = await supabase.from("bookings").insert([
      {
        offering_id: selected.id,
        customer_id: session.user.id,
        appointment_date: requestedStart.toISOString(),
        end_time: requestedEnd.toISOString(),
        location: finalLocation,
        quantity: calculatedData.quantity,
        status: "pending",
      },
    ]);

    if (!error) {
      alert("تم إرسال الطلب بنجاح ✅");
      setSelected(null);
    } else {
      alert("خطأ: " + error.message);
    }
  };

  const modelLabels = {
    fixed: "مهمة",
    hourly: "ساعة",
    period: "فترة",
    daily: "يوم",
    monthly: "شهر",
    yearly: "سنة",
    free: "تطوع",
  };
  const renderStars = (rating) =>
    "⭐".repeat(Math.round(rating || 5)) + ` (${(rating || 5).toFixed(1)})`;

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ⏳ جاري التحميل...
      </div>
    );
  const defaultAvatar = (name) =>
    `https://ui-avatars.com/api/?name=${name || "User"}&background=7c3aed&color=fff`;

  return (
    <div style={{ direction: "rtl" }}>
      <div style={searchBarContainer}>
        <span style={{ marginLeft: "10px", fontSize: "1.2rem" }}>🔍</span>
        <input
          type="text"
          placeholder="ابحث عن مبرمج، مطرب، مدرب، أو اسم مزود..."
          style={searchField}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {filtered.map((item) => (
          <div key={item.id} style={cardS}>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <img
                src={
                  item.profiles?.avatar_url ||
                  defaultAvatar(item.profiles?.full_name)
                }
                style={avS}
                alt="avatar"
              />
              <div style={{ flex: 1 }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {item.profiles?.full_name}
                  {item.profiles?.license_info && (
                    <span
                      style={{
                        fontSize: "0.55rem",
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        border: "1px solid #10b981",
                      }}
                    >
                      موثق
                    </span>
                  )}
                </h4>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#f59e0b",
                    fontWeight: "bold",
                    marginTop: "2px",
                  }}
                >
                  {renderStars(item.profiles?.rating)}
                </div>
                <div style={{ fontSize: "0.6rem", color: "#64748b" }}>
                  {item.is_24_7
                    ? "🟢 24 ساعة"
                    : `🕒 ${item.work_start_time?.substring(0, 5)} - ${item.work_end_time?.substring(0, 5)}`}
                </div>
              </div>
              {item.profiles?.provider_type === "institution" && (
                <span style={instBadge}>🏢 مؤسسة</span>
              )}
            </div>

            <h3
              style={{
                fontSize: "1.05rem",
                margin: "10px 0",
                color: "#1e293b",
                height: "40px",
                overflow: "hidden",
              }}
            >
              {item.title}
            </h3>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "15px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontWeight: "bold",
                    color:
                      item.pricing_model === "free" ? "#10b981" : "#7c3aed",
                    fontSize: "1.1rem",
                  }}
                >
                  {item.pricing_model === "free"
                    ? "مجاني"
                    : `${item.price} ر.س`}
                </span>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                  لكل {modelLabels[item.pricing_model || "fixed"]}
                </span>
              </div>
              <button onClick={() => setSelected(item)} style={bookB}>
                عرض الملف والحجز ✨
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "-10px",
              }}
            >
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#ef4444",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "flex-start",
                marginBottom: "15px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px",
              }}
            >
              <img
                src={
                  selected.profiles?.avatar_url ||
                  defaultAvatar(selected.profiles?.full_name)
                }
                style={{
                  width: "65px",
                  height: "65px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #7c3aed",
                }}
                alt="avatar"
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.1rem" }}>
                  {selected.profiles?.full_name}
                </h3>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#f59e0b",
                    margin: "3px 0",
                  }}
                >
                  {renderStars(selected.profiles?.rating)}
                </div>

                {selected.profiles?.license_info && (
                  <div style={{ marginTop: "5px" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#059669",
                        backgroundColor: "#ecfdf5",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid #10b981",
                        fontWeight: "bold",
                        display: "inline-block",
                      }}
                    >
                      ✅ مرخص: {selected.profiles.license_info}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                  {selected.profiles?.phone && (
                    <a
                      href={`tel:${selected.profiles.phone}`}
                      style={socialBtn("#10b981")}
                    >
                      📞 اتصال
                    </a>
                  )}
                  {selected.profiles?.instagram_url && (
                    <a
                      href={selected.profiles.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#db2777")}
                    >
                      📸 انستقرام
                    </a>
                  )}
                  {selected.profiles?.youtube_url && (
                    <a
                      href={selected.profiles.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      style={socialBtn("#ef4444")}
                    >
                      ▶️ يوتيوب
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                marginBottom: "15px",
              }}
            >
              <h4 style={{ margin: "0 0 5px 0", color: "#7c3aed" }}>
                📌 {selected.title}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#475569",
                  lineHeight: "1.5",
                }}
              >
                {selected.description}
              </p>
            </div>

            {reviews.length > 0 && (
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px solid #fde68a",
                  marginBottom: "20px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    color: "#d97706",
                    fontSize: "0.9rem",
                  }}
                >
                  💬 آراء العملاء في هذه الخدمة:
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {reviews.map((rev, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "#fff",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #fef3c7",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            color: "#475569",
                          }}
                        >
                          {rev.profiles?.full_name}
                        </span>
                        <span style={{ fontSize: "0.7rem" }}>
                          {"⭐".repeat(rev.rating)}
                        </span>
                      </div>
                      {/* 🛡️ إخفاء التعليق في السوق إذا منعه المدير */}
                      {rev.review && allowTextReviews && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#78350f",
                            fontStyle: "italic",
                          }}
                        >
                          "{rev.review}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h4
              style={{
                color: "#1e293b",
                marginBottom: "10px",
                fontSize: "1rem",
              }}
            >
              📅 تفاصيل الحجز:
            </h4>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelS}>📍 الموقع (كتابة أو GPS):</label>
              <input
                type="text"
                placeholder="اسم القاعة أو رابط ماب.."
                style={{ ...inputS, marginBottom: "8px" }}
                value={bookingData.manualLocation}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    manualLocation: e.target.value,
                    gpsLocation: "",
                  })
                }
              />
              {bookingData.gpsLocation ? (
                <div style={locOk}>تم التقاط الموقع ✅</div>
              ) : (
                <button onClick={handleGetLocation} style={gpsBtn}>
                  📍 استخدام موقعي الحالي
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelS}>📅 البدء:</label>
                <input
                  type="date"
                  min={todayDate}
                  style={inputS}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelS}>🕒 الوقت:</label>
                <input
                  type="time"
                  style={inputS}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelS}>📅 الانتهاء:</label>
                <input
                  type="date"
                  min={todayDate}
                  style={inputS}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, endDate: e.target.value })
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelS}>🕒 الوقت:</label>
                <input
                  type="time"
                  style={inputS}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#eff6ff",
                padding: "15px",
                borderRadius: "12px",
                border: "1px dashed #3b82f6",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>
                إجمالي {calculatedData.quantity} {calculatedData.text}:{" "}
              </span>
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color:
                    selected.pricing_model === "free" ? "#10b981" : "#2563eb",
                }}
              >
                {selected.pricing_model === "free"
                  ? "مجاني (تطوع) 💚"
                  : `${calculatedData.price} ر.س`}
              </span>
            </div>
            <button onClick={handleBook} style={confirmBtn}>
              تأكيد الطلب ✅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const searchBarContainer = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "#fff",
  padding: "10px 15px",
  borderRadius: "15px",
  border: "2px solid #e2e8f0",
  marginBottom: "25px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const searchField = {
  border: "none",
  outline: "none",
  width: "100%",
  fontSize: "0.95rem",
  fontFamily: "inherit",
};
const cardS = {
  backgroundColor: "#fff",
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f1f5f9",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
};
const avS = {
  width: "45px",
  height: "45px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #f1f5f9",
};
const bookB = {
  backgroundColor: "#7c3aed",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: "bold",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 3000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "25px",
  width: "100%",
  maxWidth: "420px",
  maxHeight: "90vh",
  overflowY: "auto",
};
const labelS = {
  display: "block",
  fontSize: "0.75rem",
  color: "#475569",
  marginBottom: "4px",
  fontWeight: "bold",
};
const inputS = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "0.85rem",
};
const confirmBtn = {
  width: "100%",
  backgroundColor: "#059669",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "15px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "1rem",
};
const gpsBtn = {
  width: "100%",
  padding: "8px",
  borderRadius: "10px",
  border: "1px dashed #3b82f6",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "0.75rem",
};
const instBadge = {
  fontSize: "0.6rem",
  backgroundColor: "#1e293b",
  color: "#fff",
  padding: "2px 6px",
  borderRadius: "10px",
  fontWeight: "bold",
  marginLeft: "auto",
};
const locOk = {
  padding: "8px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #10b981",
  borderRadius: "10px",
  textAlign: "center",
  color: "#059669",
  fontWeight: "bold",
  fontSize: "0.75rem",
};
const socialBtn = (bg) => ({
  backgroundColor: bg,
  color: "#fff",
  padding: "4px 8px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "0.7rem",
  fontWeight: "bold",
});
