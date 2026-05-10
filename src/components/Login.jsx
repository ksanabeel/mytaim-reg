import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

// نصوص الصفحات القانونية (تمت صياغتها بشكل احترافي)
const legalDocs = {
  terms: {
    title: "شروط وأحكام الاستخدام",
    content:
      "مرحباً بك في منصتنا. باستخدامك لهذه المنصة، فإنك توافق على الالتزام بالشروط والأحكام التالية: \n\n1. دور المنصة: تعمل المنصة كوسيط بين مزودي الخدمات والعملاء، وتسهل عملية الحجز والدفع. \n2. العمولات: توافق كمزود خدمة على اقتطاع نسبة العمولة المحددة من قبل الإدارة على كل عملية مكتملة. \n3. المسؤولية: يلتزم المزود بتقديم الخدمة بالاحترافية المتفق عليها، وتخلي المنصة مسؤوليتها عن أي أضرار جانبية ناتجة عن سوء تقديم الخدمة. \n4. الاستخدام المقبول: يُمنع استخدام المنصة لأي أغراض غير قانونية أو تقديم خدمات تخالف أنظمة المملكة العربية السعودية.",
  },
  privacy: {
    title: "سياسة الخصوصية",
    content:
      "نحن نأخذ خصوصيتك على محمل الجد. توضح هذه السياسة كيف نجمع بياناتك ونستخدمها: \n\n1. جمع البيانات: نجمع المعلومات الأساسية مثل (الاسم، البريد الإلكتروني، رقم الجوال، الموقع) لغرض تسهيل تقديم الخدمات والتواصل. \n2. حماية البيانات: يتم تخزين بياناتك بشكل آمن ومشفّر في قواعد بياناتنا، ولا يتم مشاركتها مع أي جهة خارجية لغرض التسويق. \n3. مشاركة البيانات: يتم مشاركة بياناتك الأساسية (مثل الجوال) فقط مع مزود الخدمة الذي قمت بحجزه لضمان تنفيذ طلبك بنجاح. \n4. حذف الحساب: يحق لك طلب حذف حسابك وكافة بياناتك في أي وقت بالتواصل مع الإدارة.",
  },
  refund: {
    title: "سياسة الاسترجاع والإلغاء",
    content:
      "لضمان حقوق جميع الأطراف (العميل والمزود)، نطبق السياسة التالية: \n\n1. الإلغاء المبكر: يحق للعميل إلغاء الحجز واسترجاع المبلغ كاملاً إذا تم الإلغاء قبل موعد الخدمة بـ 24 ساعة على الأقل. \n2. الإلغاء المتأخر: في حال الإلغاء قبل الموعد بأقل من 24 ساعة، قد يتم خصم رسوم إدارية أو نسبة من قيمة الحجز لصالح المزود. \n3. عدم التنفيذ: إذا لم يقم المزود بتنفيذ الخدمة في الوقت المتفق عليه دون عذر قاهر، يحق للعميل استرجاع كامل مبلغه المدفوع. \n4. آلية الاسترجاع: تتم معالجة المبالغ المسترجعة وتعود لحساب العميل البنكي خلال 3 إلى 14 يوم عمل حسب سياسة البنك.",
  },
};

const Login = () => {
  const { t, i18n } = useTranslation();

  // حالات الدخول
  const [authMode, setAuthMode] = useState("email_login"); // 'email_login', 'email_signup', 'phone_login', 'phone_otp'

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState(null);

  // تبديل اللغة
  const toggleLanguage = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      alert("خطأ في الاتصال بجوجل: " + error.message);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      alert("لم يتم تفعيل الدخول بحساب أبل بعد في إعدادات الخادم.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === "email_login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (authMode === "email_signup") {
        if (!fullName.trim()) return alert("الرجاء إدخال الاسم الكامل");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        alert("✅ تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.");
        setAuthMode("email_login");
        setPassword("");
      }
    } catch (error) {
      alert("حدث خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✉️ دالة استعادة كلمة المرور الجديدة
  const handleResetPassword = async () => {
    if (!email) {
      alert("الرجاء إدخال بريدك الإلكتروني في الحقل المخصص أولاً.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert(
        "تم إرسال رابط استعادة كلمة المرور إلى إيميلك! (شيك صندوق الوارد أو البريد المزعج Spam).",
      );
    } catch (err) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) return alert("الرجاء إدخال رقم جوال صحيح.");

    setLoading(true);
    try {
      alert("وضع الاختبار: استخدم الرمز 123456 للدخول.");
      setAuthMode("phone_otp");
    } catch (error) {
      alert("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return alert("الرجاء إدخال رمز التحقق.");

    setLoading(true);
    try {
      if (otp === "123456") {
        alert("نجاح! في البيئة الحقيقية سيتم دخولك الآن.");
        setAuthMode("email_login");
      } else {
        alert("رمز التحقق غير صحيح (استخدم 123456)");
      }
    } catch (error) {
      alert("خطأ في التحقق: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    if (authMode === "phone_login") {
      return (
        <form onSubmit={handlePhoneSubmit} style={styles.form}>
          <p style={{ ...styles.subtitle, marginBottom: "10px" }}>
            أدخل رقم الجوال ليتم إرسال رمز التحقق (OTP)
          </p>
          <input
            type="tel"
            placeholder="رقم الجوال (مثال: 966500000000+)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
            required
            dir="ltr"
          />
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("email_login")}
            style={styles.backBtn}
          >
            العودة للدخول بالإيميل
          </button>
        </form>
      );
    }

    if (authMode === "phone_otp") {
      return (
        <form onSubmit={handleVerifyOtp} style={styles.form}>
          <p style={{ ...styles.subtitle, marginBottom: "10px" }}>
            تم إرسال رمز التحقق إلى: <span dir="ltr">{phone}</span>
          </p>
          <input
            type="text"
            placeholder="أدخل الرمز (123456 للتجربة)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{
              ...styles.input,
              textAlign: "center",
              letterSpacing: "5px",
              fontSize: "1.2rem",
            }}
            required
            dir="ltr"
            maxLength="6"
          />
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "جاري التحقق..." : "تأكيد الدخول"}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("phone_login")}
            style={styles.backBtn}
          >
            تغيير رقم الجوال
          </button>
        </form>
      );
    }

    // Default Email Auth Form (Login or Signup)
    return (
      <form onSubmit={handleEmailAuth} style={styles.form}>
        {authMode === "email_signup" && (
          <input
            type="text"
            placeholder="الاسم الكامل"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              ...styles.input,
              textAlign: i18n.language === "ar" ? "right" : "left",
            }}
            required
          />
        )}
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
          dir="ltr"
        />
        <input
          type="password"
          placeholder="كلمة المرور (6 أحرف على الأقل)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
          dir="ltr"
          minLength="6"
        />

        {/* 🚀 زر استعادة كلمة المرور يظهر فقط في شاشة تسجيل الدخول */}
        {authMode === "email_login" && (
          <button
            type="button"
            onClick={handleResetPassword}
            style={{
              background: "transparent",
              color: "#3b82f6",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: "bold",
              cursor: "pointer",
              textAlign: i18n.language === "ar" ? "right" : "left",
              textDecoration: "underline",
              marginTop: "-5px",
              marginBottom: "5px",
            }}
          >
            نسيت كلمة المرور؟
          </button>
        )}

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading
            ? "جاري التحقق..."
            : authMode === "email_login"
              ? "تسجيل الدخول"
              : "إنشاء حساب"}
        </button>

        <p style={styles.footerText}>
          {authMode === "email_login"
            ? "ليس لديك حساب؟ "
            : "لديك حساب بالفعل؟ "}
          <span
            onClick={() =>
              setAuthMode(
                authMode === "email_login" ? "email_signup" : "email_login",
              )
            }
            style={styles.link}
          >
            {authMode === "email_login" ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </span>
        </p>

        <button
          type="button"
          onClick={() => setAuthMode("phone_login")}
          style={styles.phoneToggleBtn}
        >
          📱 الدخول برقم الجوال (OTP)
        </button>
      </form>
    );
  };

  return (
    <div style={styles.container}>
      <button onClick={toggleLanguage} style={styles.langToggle}>
        🌐 {i18n.language === "ar" ? "English" : "العربية"}
      </button>

      <div style={styles.box}>
        <div style={styles.header}>
          <span style={styles.logoIcon}>📍</span>
          <h2 style={styles.title}>BookOnMap</h2>
        </div>

        {authMode !== "phone_otp" && (
          <>
            <p style={styles.subtitle}>سجل دخولك لبدء استخدام المنصة</p>

            <div style={styles.socialBtnsContainer}>
              <button onClick={handleGoogleLogin} style={styles.socialBtn}>
                <img
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg"
                  alt="Google"
                  style={styles.socialIcon}
                />
                جوجل
              </button>

              <button
                onClick={handleAppleLogin}
                style={{
                  ...styles.socialBtn,
                  backgroundColor: "#000",
                  color: "#fff",
                  border: "none",
                }}
              >
                <span
                  style={{
                    fontSize: "1.2rem",
                    marginLeft: "5px",
                    marginRight: "5px",
                  }}
                >
                  
                </span>
                أبل
              </button>
            </div>

            <div style={styles.divider}>
              <span style={styles.dividerLine}></span>
              <span style={styles.dividerText}>أو</span>
              <span style={styles.dividerLine}></span>
            </div>
          </>
        )}

        {renderFormContent()}

        <div style={styles.legalLinks}>
          <span
            onClick={() => setActiveLegalDoc("terms")}
            style={styles.legalLink}
          >
            شروط الاستخدام
          </span>{" "}
          •
          <span
            onClick={() => setActiveLegalDoc("privacy")}
            style={styles.legalLink}
          >
            سياسة الخصوصية
          </span>{" "}
          •
          <span
            onClick={() => setActiveLegalDoc("refund")}
            style={styles.legalLink}
          >
            سياسة الاسترجاع
          </span>
        </div>
      </div>

      {activeLegalDoc && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: "#1e293b" }}>
                {legalDocs[activeLegalDoc].title}
              </h3>
              <button
                onClick={() => setActiveLegalDoc(null)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {legalDocs[activeLegalDoc].content
                .split("\n")
                .map((paragraph, idx) => (
                  <p
                    key={idx}
                    style={{
                      lineHeight: "1.6",
                      color: "#475569",
                      marginBottom: "10px",
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
            <button
              onClick={() => setActiveLegalDoc(null)}
              style={styles.acceptBtn}
            >
              موافق ومتابعة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "system-ui, sans-serif",
    position: "relative",
  },
  langToggle: {
    position: "absolute",
    top: "20px",
    right: "20px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    padding: "8px 15px",
    borderRadius: "20px",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#475569",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  },
  box: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "24px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.04)",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  logoIcon: { fontSize: "2rem" },
  title: { color: "#7c3aed", fontSize: "24px", fontWeight: "900", margin: 0 },
  subtitle: { color: "#64748b", fontSize: "14px", marginBottom: "20px" },

  socialBtnsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  socialBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#1e293b",
    transition: "all 0.2s",
  },
  socialIcon: { width: "20px", marginLeft: "8px", marginRight: "8px" },

  divider: { display: "flex", alignItems: "center", margin: "15px 0" },
  dividerLine: { flex: 1, height: "1px", backgroundColor: "#e2e8f0" },
  dividerText: {
    margin: "0 15px",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "bold",
  },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    outline: "none",
    textAlign: "right",
    fontSize: "15px",
    backgroundColor: "#f8fafc",
  },
  submitBtn: {
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#1e293b",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "5px",
  },
  backBtn: {
    padding: "10px",
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.9rem",
    textDecoration: "underline",
  },
  phoneToggleBtn: {
    marginTop: "10px",
    padding: "12px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px dashed #bfdbfe",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  footerText: {
    marginTop: "15px",
    fontSize: "14px",
    color: "#64748b",
    marginBottom: 0,
  },
  link: {
    color: "#7c3aed",
    cursor: "pointer",
    fontWeight: "bold",
    textDecoration: "underline",
  },
  legalLinks: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginTop: "25px",
    paddingTop: "15px",
    borderTop: "1px dashed #e2e8f0",
    fontSize: "12px",
    color: "#94a3b8",
  },
  legalLink: { cursor: "pointer", transition: "color 0.2s" },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "15px",
    marginBottom: "15px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer",
    color: "#94a3b8",
  },
  modalBody: {
    overflowY: "auto",
    textAlign: "right",
    paddingRight: "5px",
    paddingLeft: "5px",
  },
  acceptBtn: {
    marginTop: "20px",
    padding: "12px",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default Login;
