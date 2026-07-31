import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPanel({ session }) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [commission, setCommission] = useState(""); // نسبة العمولة من الإعدادات (مثلاً 0.10)
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, [session]);

  const checkAdminAccess = async () => {
    if (!session?.user) return;
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (
      currentUserProfile &&
      (currentUserProfile.role === "admin" ||
        currentUserProfile.role === "مدير")
    ) {
      setIsAdmin(true);
      fetchAdminData();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: config } = await supabase
      .from("system_settings")
      .select("*")
      .eq("key", "commission_rate")
      .single();

    if (usersData) setUsers(usersData);
    if (config) setCommission(config.value);
    setLoading(false);
  }; // ✨ الدالة المحاسبية المطورة للحساب الحي ✨

  const calculateFinancials = (user) => {
    // جلب نسبة العمولة من الإعدادات أو افتراض 10%
    const rate = parseFloat(commission) || 0.1; // إجمالي المبالغ التي دخلت النظام لهذا المستخدم

    const rawEarnings = user.total_earnings || 0; // الحسبة الحية: // العمولة = الإجمالي × النسبة

    const liveCommission = rawEarnings * rate; // الصافي للمزود = الإجمالي - العمولة

    const netEarnings = rawEarnings - liveCommission;

    return {
      commissionDisplay: liveCommission.toFixed(2),
      earningsDisplay: netEarnings.toFixed(2),
    };
  };

  const changeUserRole = async (userId, newRole) => {
    if (!window.confirm(`تغيير الصلاحية إلى "${newRole}"؟`)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    if (!error) {
      fetchAdminData();
      alert("تم التحديث ✅");
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(currentStatus ? "إيقاف الحساب؟" : "تفعيل الحساب؟"))
      return;
    await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", userId);
    fetchAdminData();
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("⚠️ هل أنت متأكد من الحذف النهائي؟")) return;
    await supabase.from("profiles").delete().eq("id", userId);
    fetchAdminData();
  };

  const openForceEdit = (user) => {
    setEditingUser(user);
    setNewUsername(user.username || "");
    setNewFullName(user.full_name || "");
    setIsModalOpen(true);
  };

  const saveForceEdit = async () => {
    if (!newUsername.trim()) return alert("يجب كتابة اسم مستخدم");
    const { error } = await supabase
      .from("profiles")
      .update({
        username: newUsername.toLowerCase().trim(),
        full_name: newFullName,
      })
      .eq("id", editingUser.id);
    if (!error) {
      setIsModalOpen(false);
      fetchAdminData();
      alert("تم التعديل الإجباري بنجاح! 👑");
    }
  };

  const updateCommission = async () => {
    await supabase
      .from("system_settings")
      .update({ value: commission })
      .eq("key", "commission_rate");
    alert("تم تحديث نسبة العمولة العامة ✅");
    fetchAdminData(); // تحديث الحسابات فوراً بعد تغيير النسبة
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
                ⏳ جاري فحص الصلاحيات...      {" "}
      </div>
    );
  if (!isAdmin)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          backgroundColor: "#fef2f2",
          borderRadius: "15px",
          border: "1px solid #ef4444",
        }}
      >
                <h2 style={{ color: "#dc2626" }}>🚫 وصول غير مصرح به</h2>     {" "}
      </div>
    );

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "30px",
        borderRadius: "20px",
        border: "1px solid #e2e8f0",
        direction: "rtl",
      }}
    >
           {" "}
      <h2
        style={{
          color: "#1e293b",
          margin: "0 0 20px 0",
          fontWeight: "900",
          textAlign: "center",
        }}
      >
                👑 لوحة تحكم الإدارة العليا      {" "}
      </h2>
           {" "}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          backgroundColor: "#f8fafc",
          padding: "15px",
          borderRadius: "15px",
          border: "1px solid #e2e8f0",
          marginBottom: "30px",
        }}
      >
               {" "}
        <TabButton
          icon="📩"
          label="رسائل الزوار"
          isActive={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
        />
               {" "}
        <TabButton
          icon="⭐"
          label="التقييمات"
          isActive={activeTab === "reviews"}
          onClick={() => setActiveTab("reviews")}
        />
               {" "}
        <TabButton
          icon="👥"
          label="المستخدمين"
          isActive={activeTab === "users"}
          onClick={() => setActiveTab("users")}
        />
               {" "}
        <TabButton
          icon="📁"
          label="الأقسام"
          isActive={activeTab === "categories"}
          onClick={() => setActiveTab("categories")}
        />
               {" "}
        <TabButton
          icon="📜"
          label="سياسات المنصة"
          isActive={activeTab === "policies"}
          onClick={() => setActiveTab("policies")}
        />
               {" "}
        <TabButton
          icon="⚙️"
          label="إعدادات المنصة"
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
             {" "}
      </div>
           {" "}
      {activeTab === "users" && (
        <div className="animate-fade-in">
                   {" "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
                       {" "}
            <h3 style={{ color: "#1e293b", margin: 0 }}>
                            👥 إدارة المستخدمين ({users.length})            {" "}
            </h3>
                       {" "}
            <button onClick={() => window.print()} style={btnStyle("#475569")}>
                            🖨️ طباعة التقرير            {" "}
            </button>
                     {" "}
          </div>
                   {" "}
          <div
            style={{
              overflowX: "auto",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
                       {" "}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                textAlign: "right",
              }}
            >
                           {" "}
              <thead>
                               {" "}
                <tr style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                                    <th style={thStyle}>الاسم</th>             
                      <th style={thStyle}>اليوزر / النوع</th>                 {" "}
                  <th style={thStyle}>الصلاحية</th>                 {" "}
                  <th style={thStyle}>المستحق للمنصة 💰</th>                 {" "}
                  <th style={thStyle}>صافي الأرباح 📈</th>                 {" "}
                  <th style={thStyle}>الحالة</th>                 {" "}
                  <th style={thStyle}>الإجراءات</th>               {" "}
                </tr>
                             {" "}
              </thead>
                           {" "}
              <tbody>
                               {" "}
                {users.map((u) => {
                  const financials = calculateFinancials(u);
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                                           {" "}
                      <td style={tdStyle}>
                                               {" "}
                        <strong>{u.full_name || "بدون اسم"}</strong>
                                                <br />                       {" "}
                        <small dir="ltr" style={{ color: "#64748b" }}>
                                                    {u.phone || "---"}         
                                       {" "}
                        </small>
                                             {" "}
                      </td>
                                           {" "}
                      <td style={tdStyle}>
                                               {" "}
                        <span
                          dir="ltr"
                          style={{ color: "#7c3aed", fontWeight: "bold" }}
                        >
                                                    @{u.username || "---"}     
                                           {" "}
                        </span>
                                                <br />                       {" "}
                        <small style={{ color: "#64748b" }}>
                                                   {" "}
                          {u.provider_type === "institution"
                            ? "🏢 مؤسسة"
                            : "👤 فرد"}
                                                 {" "}
                        </small>
                                             {" "}
                      </td>
                                           {" "}
                      <td style={tdStyle}>
                                               {" "}
                        <select
                          value={u.role || "عادي"}
                          onChange={(e) => changeUserRole(u.id, e.target.value)}
                          style={{
                            padding: "8px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontWeight: "bold",
                          }}
                        >
                                                   {" "}
                          <option value="عادي">👤 عادي</option>                 
                                  <option value="مدير">👑 مدير</option>         
                                       {" "}
                        </select>
                                             {" "}
                      </td>
                                           {" "}
                      <td
                        style={{
                          ...tdStyle,
                          color: "#ef4444",
                          fontWeight: "bold",
                        }}
                      >
                                                {financials.commissionDisplay}{" "}
                        ر.س                      {" "}
                      </td>
                                           {" "}
                      <td
                        style={{
                          ...tdStyle,
                          color: "#10b981",
                          fontWeight: "bold",
                        }}
                      >
                                                {financials.earningsDisplay} ر.س
                                             {" "}
                      </td>
                                           {" "}
                      <td style={tdStyle}>
                                               {" "}
                        <span
                          style={badgeStyle(
                            u.is_active !== false ? "#10b981" : "#ef4444",
                          )}
                        >
                                                   {" "}
                          {u.is_active !== false ? "نشط" : "موقوف"}             
                                   {" "}
                        </span>
                                             {" "}
                      </td>
                                           {" "}
                      <td style={{ ...tdStyle, display: "flex", gap: "5px" }}>
                                               {" "}
                        <button
                          onClick={() => openForceEdit(u)}
                          style={actionBtn("#3b82f6")}
                          title="تعديل"
                        >
                                                    ✏️                        {" "}
                        </button>
                                               {" "}
                        <button
                          onClick={() =>
                            toggleUserStatus(u.id, u.is_active !== false)
                          }
                          style={actionBtn(
                            u.is_active !== false ? "#f59e0b" : "#10b981",
                          )}
                        >
                                                   {" "}
                          {u.is_active !== false ? "⏸️" : "▶️"}                 
                               {" "}
                        </button>
                                               {" "}
                        <button
                          onClick={() => deleteUser(u.id)}
                          style={actionBtn("#ef4444")}
                        >
                                                    🗑️                        {" "}
                        </button>
                                             {" "}
                      </td>
                                         {" "}
                    </tr>
                  );
                })}
                             {" "}
              </tbody>
                         {" "}
            </table>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {activeTab === "settings" && (
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "20px",
            borderRadius: "15px",
            border: "1px solid #e2e8f0",
          }}
        >
                   {" "}
          <h4 style={{ margin: "0 0 15px 0", color: "#334155" }}>
                        💰 إعدادات العمولة العامة          {" "}
          </h4>
                   {" "}
          <div style={{ display: "flex", gap: "10px", maxWidth: "450px" }}>
                       {" "}
            <div style={{ flex: 1 }}>
                           {" "}
              <label style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                نسبة العمولة (0.10 تعني 10%)              {" "}
              </label>
                           {" "}
              <input
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                }}
              />
                         {" "}
            </div>
                       {" "}
            <button
              onClick={updateCommission}
              style={{ ...btnStyle("#7c3aed"), marginTop: "22px" }}
            >
                            تحديث ⚙️            {" "}
            </button>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
            {/* النافذة المنبثقة للتعديل الإجباري */}     {" "}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
                   {" "}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "30px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "450px",
            }}
          >
                       {" "}
            <h3 style={{ margin: "0 0 20px 0" }}>🛠️ التعديل الإجباري</h3>       
               {" "}
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
                            الاسم الكامل:            {" "}
            </label>
                       {" "}
            <input
              type="text"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                marginBottom: "15px",
              }}
            />
                       {" "}
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#ef4444",
              }}
            >
                            اليوزر نيم بالقوة:            {" "}
            </label>
                       {" "}
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
              }}
            />
                       {" "}
            <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
                           {" "}
              <button
                onClick={saveForceEdit}
                style={{ flex: 1, ...btnStyle("#7c3aed") }}
              >
                                حفظ              {" "}
              </button>
                           {" "}
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ flex: 1, ...btnStyle("#94a3b8") }}
              >
                                إلغاء              {" "}
              </button>
                         {" "}
            </div>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
         {" "}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        borderRadius: "12px",
        backgroundColor: isActive ? "#fff" : "transparent",
        color: isActive ? "#7c3aed" : "#64748b",
        border: isActive ? "1px solid #e2e8f0" : "1px solid transparent",
        fontWeight: isActive ? "bold" : "normal",
        cursor: "pointer",
        transition: "0.2s",
      }}
    >
            <span>{icon}</span> <span>{label}</span>   {" "}
    </button>
  );
}

const thStyle = { padding: "15px", borderBottom: "2px solid #e2e8f0" };
const tdStyle = { padding: "15px", verticalAlign: "middle" };
const badgeStyle = (color) => ({
  backgroundColor: `${color}15`,
  color: color,
  padding: "5px 12px",
  borderRadius: "20px",
  fontWeight: "bold",
  fontSize: "0.85rem",
});
const btnStyle = (color) => ({
  backgroundColor: color,
  color: "white",
  padding: "10px 15px",
  borderRadius: "10px",
  border: "none",
  fontWeight: "bold",
  cursor: "pointer",
});
const actionBtn = (color) => ({
  backgroundColor: `${color}15`,
  border: `1px solid ${color}30`,
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "1.1rem",
});
