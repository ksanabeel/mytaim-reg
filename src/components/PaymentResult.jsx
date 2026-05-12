import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // قراءة البيانات التي أرسلها ميسر في الرابط
  const paymentId = searchParams.get("id");
  const status = searchParams.get("status");
  const message = searchParams.get("message");

  return (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {status === "paid" ? (
        <>
          <div style={{ fontSize: "4rem", marginBottom: "20px" }}>✅</div>
          <h2 style={{ color: "#16a34a", marginBottom: "10px" }}>
            تم الدفع بنجاح!
          </h2>
          <p style={{ color: "#475569", fontSize: "1.1rem" }}>
            شكراً لك، تم تأكيد حجزك وعمولتك بنجاح.
          </p>
          <div
            style={{
              background: "#f8fafc",
              padding: "15px",
              borderRadius: "10px",
              marginTop: "20px",
              border: "1px solid #e2e8f0",
            }}
          >
            <strong>رقم العملية:</strong> {paymentId}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "4rem", marginBottom: "20px" }}>❌</div>
          <h2 style={{ color: "#dc2626", marginBottom: "10px" }}>
            عذراً، فشلت عملية الدفع
          </h2>
          <p style={{ color: "#475569", fontSize: "1.1rem" }}>
            السبب: {message || "تم رفض العملية من قبل البنك"}
          </p>
        </>
      )}

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "40px",
          padding: "12px 30px",
          backgroundColor: "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "1.1rem",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        العودة للرئيسية
      </button>
    </div>
  );
}
