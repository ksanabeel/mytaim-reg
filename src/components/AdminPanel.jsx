import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPanel({ session }) {
  // 🔘 حالة التبويب النشط
  const [activeTab, setActiveTab] = useState("users");

  // 👑 حالات بيانات المدير
  const [users, setUsers] = useState([]);
  const [commission, setCommission] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🛠️ متغيرات النافذة المنبثقة للتعديل الإجباري
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
  };

  // 👑 وظائف إدارة المستخدمين
  const changeUserRole = async (userId, newRole) => {
    if (!window.confirm(`تغيير الصلاحية إلى "${newRole}"؟`)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    if (!error) {
      alert("تم التحديث ✅");
      fetchAdminData();
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
      alert("تم التعديل الإجباري بنجاح! 👑");
      setIsModalOpen(false);
      fetchAdminData();
    } else {
      error.code === "23505"
        ? alert("اسم المستخدم هذا محجوز.")
        : alert("خطأ: " + error.message);
    }
  };

  const updateCommission = async () => {
    await supabase
      .from("system_settings")
      .update({ value: commission })
      .eq("key", "commission_rate");
    alert("تم التحديث ✅");
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        ⏳ جاري فحص الصلاحيات...
      </div>
    );

  if (!isAdmin) {
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
        <h2 style={{ color: "#dc2626" }}>🚫 وصول غير مصرح به</h2>
      </div>
    );
  }

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
      <h2
        style={{
          color: "#1e293b",
          margin: "0 0 20px 0",
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        👑 لوحة تحكم الإدارة العليا
      </h2>

      {/* 🟡 الشريط العلوي للتبويبات 🟡 */}
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
        <TabButton
          icon="📩"
          label="رسائل الزوار"
          isActive={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
          badge="1"
        />
        <TabButton
          icon="⭐"
          label="التقييمات"
          isActive={activeTab === "reviews"}
          onClick={() => setActiveTab("reviews")}
        />
        <TabButton
          icon="👥"
          label="المستخدمين"
          isActive={activeTab === "users"}
          onClick={() => setActiveTab("users")}
        />
        <TabButton
          icon="📁"
          label="الأقسام"
          isActive={activeTab === "categories"}
          onClick={() => setActiveTab("categories")}
        />
        <TabButton
          icon="📜"
          label="سياسات المنصة"
          isActive={activeTab === "policies"}
          onClick={() => setActiveTab("policies")}
        />
        <TabButton
          icon="⚙️"
          label="إعدادات المنصة"
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </div>

      {/* ========================================= */}
      {/* 📄 تبويب المستخدمين (الجدول الجديد بالكامل) */}
      {/* ========================================= */}
      {activeTab === "users" && (
        <div className="animate-fade-in">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ color: "#1e293b", margin: 0 }}>
              👥 إدارة المستخدمين ({users.length})
            </h3>
            <button onClick={() => window.print()} style={btnStyle("#475569")}>
              🖨️ طباعة التقرير
            </button>
          </div>

          <div
            style={{
              overflowX: "auto",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
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
                <tr style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                  <th style={thStyle}>الاسم</th>
                  <th style={thStyle}>اليوزر / النوع</th>
                  <th style={thStyle}>الصلاحية</th>
                  <th style={thStyle}>المستحق 💰</th>
                  <th style={thStyle}>الحالة</th>
                  <th style={thStyle}>الإجراءات (التعديل/الإيقاف)</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={tdStyle}>
                      <strong>{u.full_name || "بدون اسم"}</strong>
                      <br />
                      <small dir="ltr" style={{ color: "#64748b" }}>
                        {u.phone || "لا يوجد رقم"}
                      </small>
                    </td>

                    <td style={tdStyle}>
                      <span
                        dir="ltr"
                        style={{ color: "#7c3aed", fontWeight: "bold" }}
                      >
                        @{u.username || "---"}
                      </span>
                      <br />
                      <small style={{ color: "#64748b" }}>
                        {u.provider_type === "institution"
                          ? "🏢 مؤسسة"
                          : "👤 فرد"}
                      </small>
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={u.role || "عادي"}
                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border:
                            u.role === "مدير" || u.role === "admin"
                              ? "1px solid #fca5a5"
                              : "1px solid #cbd5e1",
                          backgroundColor:
                            u.role === "مدير" || u.role === "admin"
                              ? "#fef2f2"
                              : "#fff",
                          color:
                            u.role === "مدير" || u.role === "admin"
                              ? "#ef4444"
                              : "#475569",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        <option value="عادي">👤 عادي</option>
                        <option value="مدير">👑 مدير</option>
                      </select>
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        color: "#ef4444",
                        fontWeight: "bold",
                      }}
                    >
                      {u.commission_owed || 0} ر.س
                    </td>

                    <td style={tdStyle}>
                      {u.is_active !== false ? (
                        <span style={badgeStyle("#10b981")}>نشط</span>
                      ) : (
                        <span style={badgeStyle("#ef4444")}>موقوف</span>
                      )}
                    </td>

                    {/* 🚀 الأزرار الجديدة هنا (الأزرق للتعديل، الأصفر للإيقاف، الأحمر للحذف) 🚀 */}
                    <td style={{ ...tdStyle, display: "flex", gap: "5px" }}>
                      <button
                        onClick={() => openForceEdit(u)}
                        style={actionBtn("#3b82f6")}
                        title="تعديل إجباري"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() =>
                          toggleUserStatus(u.id, u.is_active !== false)
                        }
                        style={actionBtn(
                          u.is_active !== false ? "#f59e0b" : "#10b981",
                        )}
                        title={u.is_active !== false ? "إيقاف" : "تفعيل"}
                      >
                        {u.is_active !== false ? "⏸️" : "▶️"}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        style={actionBtn("#ef4444")}
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 📄 إعدادات المنصة */}
      {activeTab === "settings" && (
        <div className="animate-fade-in">
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              borderRadius: "15px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#334155" }}>
              💰 نسبة عمولة المنصة العامة
            </h4>
            <div style={{ display: "flex", gap: "10px", maxWidth: "400px" }}>
              <input
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="مثال: 0.05 لـ 5%"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                }}
              />
              <button onClick={updateCommission} style={btnStyle("#7c3aed")}>
                تحديث الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* باقي التبويبات */}
      {activeTab === "messages" && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          ضع كود رسائل الزوار هنا 📩
        </div>
      )}
      {activeTab === "reviews" && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          ضع كود التقييمات هنا ⭐
        </div>
      )}
      {activeTab === "categories" && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          ضع كود إدارة الأقسام هنا 📁
        </div>
      )}
      {activeTab === "policies" && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          ضع كود سياسات المنصة هنا 📜
        </div>
      )}

      {/* 🛠️ النافذة المنبثقة للتعديل الإجباري 🛠️ */}
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
          <div
            style={{
              backgroundColor: "#fff",
              padding: "30px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "450px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              🛠️ التعديل الإجباري
            </h3>
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
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={saveForceEdit}
                style={{ flex: 1, ...btnStyle("#7c3aed") }}
              >
                حفظ وتطبيق
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ flex: 1, ...btnStyle("#94a3b8") }}
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

// 🔵 التبويبات والتنسيقات
function TabButton({ icon, label, isActive, onClick, badge }) {
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
        boxShadow: isActive ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none",
        fontWeight: isActive ? "bold" : "normal",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      <span>{icon}</span> <span>{label}</span>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            backgroundColor: "#ef4444",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: "10px",
          }}
        >
          {badge}
        </span>
      )}
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
  transition: "0.2s",
});
const actionBtn = (color) => ({
  backgroundColor: `${color}15`,
  border: `1px solid ${color}30`,
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "1.1rem",
  transition: "0.2s",
});
