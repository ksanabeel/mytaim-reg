import React, { useEffect, useRef } from "react";

export default function MoyasarPayment({ amount }) {
  // 🔒 هذا هو القفل السحري لمنع تكرار التحميل
  const formCreated = useRef(false);

  useEffect(() => {
    // إذا كان الفورم قد تم إنشاؤه وبدأ التحميل، لا تفعل شيئاً (تجاهل تحديثات React)
    if (formCreated.current) return;

    const initMoyasar = () => {
      const container = document.getElementById("mysr-form-container");

      // التأكد من وجود ميسر والصندوق، والتأكد أننا لم نقم بتشغيله مسبقاً
      if (window.Moyasar && container && !formCreated.current) {
        formCreated.current = true; // إغلاق القفل 🔒
        container.innerHTML = ""; // تنظيف الصندوق لمرة واحدة فقط

        try {
          window.Moyasar.init({
            element: "#mysr-form-container",
            amount: Math.round(amount * 100), // القيمة بالهللة
            currency: "SAR",
            description: "عمولة منصة BookOnMap",

            // ⚠️ الصق مفتاحك العام هنا:
            publishable_api_key:
              "pk_test_zaVuLXdXYTLsKhDYbuoeJHVDvHoTyg8V1sC8vPEP",

            callback_url: window.location.origin + "/payment-result",
            methods: ["creditcard"], // إجبار عرض البطاقة فقط لتجنب أخطاء Apple Pay
          });
        } catch (error) {
          console.error("خطأ أثناء تشغيل ميسر:", error);
          formCreated.current = false; // فتح القفل في حال حدوث خطأ كارثي
        }
      }
    };

    // جلب ملف تصميم ميسر (CSS)
    if (!document.getElementById("moyasar-css")) {
      const link = document.createElement("link");
      link.id = "moyasar-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
      document.head.appendChild(link);
    }

    // جلب سكربت ميسر (JS) وتشغيله
    if (!document.getElementById("moyasar-js")) {
      const script = document.createElement("script");
      script.id = "moyasar-js";
      script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
      script.onload = initMoyasar; // تشغيل الفورم بمجرد وصول السكربت
      document.head.appendChild(script);
    } else {
      // إذا كان السكربت موجوداً مسبقاً في المتصفح
      setTimeout(initMoyasar, 300);
    }
  }, [amount]);

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
      <div id="mysr-form-container" style={{ direction: "ltr" }}></div>
    </div>
  );
}
