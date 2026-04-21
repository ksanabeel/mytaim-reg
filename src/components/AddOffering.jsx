import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AddOffering({
  session,
  onSuccess,
  onCancel,
  editData = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricingModel, setPricingModel] = useState("fixed");

  // 🕒 أوقات الدوام الخاصة بهذه الخدمة
  const [is24x7, setIs24x7] = useState(true);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("22:00");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || "");
      setDescription(editData.description || "");
      setPrice(editData.price || "");
      setPricingModel(editData.pricing_model || "fixed");
      setIs24x7(editData.is_24_7 !== false);
      setWorkStart(editData.work_start_time?.substring(0, 5) || "08:00");
      setWorkEnd(editData.work_end_time?.substring(0, 5) || "22:00");
    }
  }, [editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 💡 المحرك الذكي: إذا كان تطوعاً نجبر السعر على صفر لحماية البيانات
    const finalPrice = pricingModel === "free" ? 0 : Number(price);

    const payload = {
      provider_id: session.user.id,
      title,
      description,
      price: finalPrice,
      pricing_model: pricingModel,
      is_24_7: is24x7,
      work_start_time: workStart,
      work_end_time: workEnd,
    };

    let error;
    if (editData) {
      const { error: err } = await supabase
        .from("offerings")
        .update(payload)
        .eq("id", editData.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("offerings").insert([payload]);
      error = err;
    }

    setIsSubmitting(false);

    if (!error) {
      alert(editData ? "تم تحديث الخدمة بنجاح ✅" : "تم إضافة الخدمة بنجاح ✅");
      onSuccess();
    } else {
      alert("حدث خطأ: " + error.message);
    }
  };

  return (
    <div style={{ direction: "rtl" }}>
      <h2
        style={{
          color: "#7c3aed",
          marginBottom: "20px",
          borderBottom: "2px solid #f1f5f9",
          paddingBottom: "10px",
        }}
      >
        {editData ? "✏️ تعديل بيانات الخدمة" : "✨ إضافة خدمة جديدة"}
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <div>
          <label style={lblS}>عنوان الخدمة:</label>
          <input
            type="text"
            required
            style={inpS}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label style={lblS}>وصف الخدمة:</label>
          <textarea
            required
            style={{ ...inpS, height: "60px" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "15px" }}>
          <div style={{ flex: 1 }}>
            <label style={lblS}>نظام التسعير:</label>
            <select
              style={inpS}
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value)}
            >
              <option value="fixed">مهمة ثابتة (مقطوع)</option>
              <option value="hourly">بالساعة ⏱️</option>
              <option value="period">بالفترة ⏳</option>
              <option value="daily">باليوم / الليلة 🌙</option>
              <option value="monthly">بالشهر 📅</option>
              <option value="yearly">بالسنة 🗓️</option>
              {/* 🟢 خيار التطوع المجاني عاد هنا! */}
              <option value="free">مجاني (تطوع) 0 💚</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lblS}>السعر (ر.س):</label>
            {/* 💡 قفل خانة السعر إذا اختار "مجاني" */}
            <input
              type="number"
              required={pricingModel !== "free"}
              disabled={pricingModel === "free"}
              style={{
                ...inpS,
                backgroundColor: pricingModel === "free" ? "#f1f5f9" : "#fff",
              }}
              value={pricingModel === "free" ? 0 : price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "15px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginTop: "5px",
          }}
        >
          <h4
            style={{
              margin: "0 0 10px 0",
              color: "#1e293b",
              fontSize: "0.9rem",
            }}
          >
            أوقات إتاحة هذه الخدمة
          </h4>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={is24x7}
              onChange={(e) => setIs24x7(e.target.checked)}
              style={{ width: "16px", height: "16px" }}
            />
            <label
              style={{
                fontWeight: "bold",
                color: "#2563eb",
                fontSize: "0.85rem",
              }}
            >
              متاحة 24 ساعة (لا يوجد وقت محدد)
            </label>
          </div>
          {!is24x7 && (
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={lblS}>تبدأ من الساعة:</label>
                <input
                  type="time"
                  style={inpS}
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  required={!is24x7}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lblS}>تنتهي الساعة:</label>
                <input
                  type="time"
                  style={inpS}
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  required={!is24x7}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...btnS(isSubmitting ? "#94a3b8" : "#10b981"),
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting
              ? "⏳ جاري الحفظ..."
              : editData
                ? "حفظ التغييرات"
                : "نشر الخدمة 🚀"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={btnS("#94a3b8")}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

const lblS = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  fontSize: "0.8rem",
  color: "#475569",
};
const inpS = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const btnS = (bg) => ({
  flex: 1,
  backgroundColor: bg,
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: "bold",
});
