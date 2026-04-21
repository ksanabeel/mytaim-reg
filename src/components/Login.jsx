import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false); // تبديل بين التسجيل والدخول

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // عملية تسجيل حساب جديد
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert(
          "تم إنشاء الحساب! افحص بريدك الإلكتروني لتأكيده (إن وجد) ثم سجل دخولك.",
        );
        setIsSignUp(false); // تحويله لصفحة الدخول بعد التسجيل
      } else {
        // عملية تسجيل الدخول
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "80vh",
        fontFamily: "system-ui",
        direction: "rtl",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "30px",
          borderRadius: "20px",
          backgroundColor: "#fff",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>
            {isSignUp ? "إنشاء حساب جديد ✨" : "مرحباً بك مجدداً 👋"}
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            {isSignUp
              ? "انضم إلينا وابدأ بتقديم أو طلب الخدمات"
              : "سجل دخولك لإدارة حجوزاتك وخدماتك"}
          </p>
        </div>

        <form
          onSubmit={handleAuth}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              كلمة المرور
            </label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "#7c3aed",
              color: "white",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              marginTop: "10px",
            }}
          >
            {loading
              ? "جاري المعالجة..."
              : isSignUp
                ? "تسجيل حساب جديد"
                : "تسجيل الدخول"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
            {isSignUp ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: "none",
                border: "none",
                color: "#7c3aed",
                fontWeight: "bold",
                cursor: "pointer",
                marginRight: "5px",
              }}
            >
              {isSignUp ? "سجل دخولك هنا" : "أنشئ حساباً الآن"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
