import React from "react";

export default function ProviderSchedule({ bookings }) {
  return (
    <div
      style={{
        marginTop: "20px",
        overflowX: "auto",
        backgroundColor: "#fff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "15px",
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", fontSize: "1rem", color: "#1e293b" }}>
        📅 جدول مواعيدي المنظم
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "right",
          fontSize: "0.9em",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "2px solid #e2e8f0",
            }}
          >
            <th style={{ padding: "12px" }}>اليوم</th>
            <th style={{ padding: "12px" }}>الوقت</th>
            <th style={{ padding: "12px" }}>الخدمة</th>
            <th style={{ padding: "12px" }}>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td
                colSpan="4"
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                لا توجد حجوزات مجدولة بعد.
              </td>
            </tr>
          ) : (
            bookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px", fontWeight: "bold" }}>
                  {b.appointment_date}
                </td>
                <td style={{ padding: "12px" }}>{b.appointment_time}</td>
                <td style={{ padding: "12px" }}>{b.offerings?.title}</td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "0.8em",
                      backgroundColor:
                        b.status === "confirmed"
                          ? "#ecfdf5"
                          : b.status === "pending"
                            ? "#fff7ed"
                            : "#f1f5f9",
                      color:
                        b.status === "confirmed"
                          ? "#059669"
                          : b.status === "pending"
                            ? "#ea580c"
                            : "#64748b",
                    }}
                  >
                    {b.status === "confirmed"
                      ? "مؤكد"
                      : b.status === "pending"
                        ? "بانتظار عرضك"
                        : b.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
