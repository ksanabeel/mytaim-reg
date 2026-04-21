import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Wallet({ session }) {
  const [wallet, setWallet] = useState({
    total_earnings: 0,
    commission_owed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("total_earnings, commission_owed")
        .eq("id", session.user.id)
        .single();

      if (data) setWallet(data);
      setLoading(false);
    };
    fetchWallet();
  }, [session.user.id]);

  if (loading)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        جاري تحميل المحفظة... ⏳
      </div>
    );

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        marginBottom: "20px",
        fontFamily: "system-ui",
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", color: "#0f172a" }}>💰 محفظتي</h3>
      <div style={{ display: "flex", gap: "15px" }}>
        <div
          style={{
            flex: 1,
            backgroundColor: "#ecfdf5",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #a7f3d0",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9em", color: "#065f46" }}>
            إجمالي أرباحي
          </p>
          <strong style={{ fontSize: "1.5em", color: "#059669" }}>
            {wallet.total_earnings || 0} ريال
          </strong>
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: "#fef2f2",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9em", color: "#991b1b" }}>
            مستحقات المنصة
          </p>
          <strong style={{ fontSize: "1.5em", color: "#dc2626" }}>
            {wallet.commission_owed || 0} ريال
          </strong>
        </div>
      </div>
    </div>
  );
}
