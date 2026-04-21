import { useState } from "react";

export default function CalendarView({ bookings = [] }) {
  const [curr, setCurr] = useState(new Date());

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth(curr.getFullYear(), curr.getMonth()); d++)
    days.push(d);

  const getStatus = (day) => {
    if (!day) return null;
    const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayB = bookings.filter((b) => b.appointment_date?.startsWith(dStr));
    if (dayB.some((b) => b.status === "confirmed")) return "ok";
    if (dayB.some((b) => b.status === "pending" || b.status === "negotiating"))
      return "wait";
    return "free";
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "20px",
        direction: "rtl",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() - 1)))}
          style={navB}
        >
          ◀
        </button>
        <h3 style={{ fontSize: "1rem" }}>
          {curr.toLocaleString("ar-SA", { month: "long", year: "numeric" })}
        </h3>
        <button
          onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() + 1)))}
          style={navB}
        >
          ▶
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "5px",
        }}
      >
        {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((d) => (
          <div
            key={d}
            style={{
              fontSize: "0.7rem",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          const s = getStatus(d);
          return (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: "bold",
                backgroundColor:
                  s === "ok"
                    ? "#10b981"
                    : s === "wait"
                      ? "#f59e0b"
                      : "transparent",
                color: s !== "free" ? "white" : "#1e293b",
                border: d ? "1px solid #f8fafc" : "none",
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const navB = {
  border: "none",
  background: "#f1f5f9",
  borderRadius: "5px",
  padding: "5px 10px",
  cursor: "pointer",
};
