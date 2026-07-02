import { useEffect, useState } from "react";
import { getDashboardStats } from "../api/dashboard";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "var(--text3)", padding: 32 }}>Yükleniyor...</div>;
  if (!stats)  return <div style={{ color: "var(--red)" }}>Veriler alınamadı.</div>;

  const statCards = [
    { label: "Toplam Öğrenci",    value: stats.total_students,    color: "var(--accent)" },
    { label: "Toplam Devamsızlık",value: stats.total_absences,    color: "var(--amber)" },
    { label: "Malzeme Türü",      value: stats.total_ingredients, color: "var(--green)" },
    { label: "Yemek Sayısı",      value: stats.total_meals,       color: "var(--purple)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Genel Bakış</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>A Üniversitesi Yemekhane Paneli</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {statCards.map((c) => (
          <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", boxShadow: "var(--shadow)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.color, borderRadius: "var(--radius) var(--radius) 0 0" }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--mono)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {stats.low_stock_ingredients.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }}>
          <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 }}>
            📉 Düşük Stok Uyarısı
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Malzeme", "Birim", "Stok", "Kalori"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.low_stock_ingredients.map((ing) => (
                <tr key={ing.id}>
                  <td style={{ ...td, fontWeight: 500, color: "var(--text)" }}>{ing.name}</td>
                  <td style={td}>{ing.unit}</td>
                  <td style={{ ...td, fontFamily: "var(--mono)", color: "var(--red)", fontWeight: 600 }}>{ing.stock}</td>
                  <td style={td}>{ing.calories} kcal</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
