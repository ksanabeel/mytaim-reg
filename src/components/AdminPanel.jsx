import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPanel({ session }) {
  const [users, setUsers] = useState([]);
  const [commission, setCommission] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    // جلب المستخدمين
    const { data: usersData } = await supabase.from("profiles").select("*");
    // جلب العمولة
    const { data: config } = await supabase
      .from("system_settings")
      .select("*")
      .eq("key", "commission_rate")
      .single();

    if (usersData) setUsers(usersData);
    if (config) setCommission(config.value);
    setLoading(false);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", userId);
    fetchAdminData();
    alert("تم تحديث حالة الحساب بنجاح");
  };

  const updateCommission = async () => {
    await supabase
      .from("system_settings")
      .update({ value: commission })
      .eq("key", "commission_rate");
    alert("تم تحديث نسبة العمولة بنجاح لكل المنصة ✅");
  };

  const printReport = () => {
    window.print(); // وظيفة طباعة بسيطة للمتصفح
  };

  if (loading) return <div>جاري تحميل بيانات الإدارة...</div>;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        fontFamily: "system-ui",
      }}
    >
      <h2 style={{ color: "#1e293b" }}>🔐 لوحة التحكم (المدير والمشرفين)</h2>

      {/* التحكم بالعمولة */}
      <div
        style={{
          backgroundColor: "#f1f5f9",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <label>⚙️ نسبة عمولة المنصة (مثلاً 0.05 للـ 5%):</label>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
          <button
            onClick={updateCommission}
            style={{
              backgroundColor: "#0f172a",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            تحديث
          </button>
        </div>
      </div>

      <button
        onClick={printReport}
        style={{
          marginBottom: "20px",
          padding: "10px",
          backgroundColor: "#64748b",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        🖨️ طباعة تقرير المستخدمين
      </button>

      {/* جدول المستخدمين */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85em",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#e2e8f0" }}>
              <th style={{ padding: "10px" }}>الاسم</th>
              <th style={{ padding: "10px" }}>الرتبة</th>
              <th style={{ padding: "10px" }}>العمولات المستحقة</th>
              <th style={{ padding: "10px" }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px" }}>
                  {u.full_name || u.nickname || "مستخدم جديد"}
                </td>
                <td style={{ padding: "10px" }}>{u.role}</td>
                <td style={{ padding: "10px", color: "red" }}>
                  {u.commission_owed} ريال
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => toggleUserStatus(u.id, u.is_active)}
                    style={{
                      backgroundColor: u.is_active ? "#ef4444" : "#22c55e",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    {u.is_active ? "إيقاف الحساب" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
