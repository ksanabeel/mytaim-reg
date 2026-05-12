import React, { useEffect, useRef } from "react";

export default function MoyasarPayment({ amount, onSuccess }) {
  // القفل السحري لمنع تكرار التحميل
  const formCreated = useRef(false);

  useEffect(() => {
    if (formCreated.current) return;

    const initMoyasar = () => {
      const container = document.querySelector(".mysr-form");

      if (window.Moyasar && container && !formCreated.current) {
        formCreated.current = true; // إغلاق القفل
        container.innerHTML = ""; // تنظيف الصندوق

        try {
          window.Moyasar.init({
            element: ".mysr-form",
            amount: Math.round(amount * 100),
            currency: "SAR",
            description: "عمولة منصة BookOnMap",
            publishable_api_key:
              "pk_test_zaVuLXdXYTLsKhDYbuoeJHVDvHoTyg8V1sC8vPEP", // ابقه مفتاح الاختبار حالياً

            // 1️⃣ التعديل الأول: توجيه النتيجة إلى موقعك المباشر وليس اللوكل هوست
            // أضف id الفاتورة أو الحجز للرابط لكي تعرف صفحة النتيجة ماذا تحدث
            callback_url: `https://www.bookonmap.com/payment-result?booking_id=${booking.id}`,

            // 2️⃣ التعديل الثاني: تعريب واجهة البطاقات
            language: "ar",

            methods: ["creditcard", "mada", "stcpay"],
            on_completed: function (payment) {
              if (payment.status === "paid" && onSuccess) {
                onSuccess(payment);
              }
            },
          });
        } catch (error) {
          console.error("خطأ أثناء تشغيل ميسر:", error);
          formCreated.current = false;
        }
      }
    };

    // 1️⃣ حقن ملف تصميم ميسر (CSS) إجبارياً
    if (!document.getElementById("moyasar-css")) {
      const link = document.createElement("link");
      link.id = "moyasar-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
      document.head.appendChild(link);
    }

    // 2️⃣ حقن سكربت ميسر (JS) إجبارياً وتشغيله فور انتهاء التحميل
    if (!document.getElementById("moyasar-js")) {
      const script = document.createElement("script");
      script.id = "moyasar-js";
      script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
      script.onload = initMoyasar; // 👈 تشغيل الفورم بمجرد وصول السكربت
      document.head.appendChild(script);
    } else {
      setTimeout(initMoyasar, 300);
    }
  }, [amount, onSuccess]);

  return (
    <div
      style={{
        width: "100%",
        padding: "15px",
        backgroundColor: "#f8fafc",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        marginTop: "20px",
        minHeight: "350px",
      }}
    >
      <h3
        style={{ textAlign: "center", color: "#1e293b", marginBottom: "15px" }}
      >
        الدفع الإلكتروني الآمن 🔒
      </h3>
      {/* الصندوق الذي سيتم رسم حقول البطاقة فيه */}
      <div className="mysr-form" style={{ direction: "ltr" }}></div>
    </div>
  );
}
