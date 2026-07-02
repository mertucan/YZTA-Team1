import { useEffect, useState } from "react";
import { getMeals, createMeal, deleteMeal } from "../api/meals";

const emptyForm = { name: "", stock: 0, ingredient_id: null, rating_id: null, calories: 0 };

export default function Meals() {
  const [items, setItems]     = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const refresh = () => getMeals().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    await createMeal(form);
    setForm(emptyForm);
    refresh();
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>🍽️ Yemekler</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>Yemek kataloğu</div>
      </div>

      <div style={card}>
        <div style={cardHd}>➕ Yeni Yemek Ekle</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={fieldLabel}>Yemek Adı</div>
            <input value={form.name} placeholder="Örn: Mercimek Çorbası" onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>Stok (porsiyon)</div>
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>Kalori (kişi başı)</div>
            <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: parseFloat(e.target.value) || 0 })} style={input} />
          </div>
          <button onClick={handleAdd} style={btnPrimary}>Ekle</button>
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>🍽️ Yemek Listesi</div>
        {loading ? <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Yemek", "Stok", "Kalori", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td style={td}><span style={{ fontWeight: 500, color: "var(--text)" }}>{m.name}</span></td>
                  <td style={{ ...td, fontFamily: "var(--mono)" }}>{m.stock}</td>
                  <td style={{ ...td, fontFamily: "var(--mono)" }}>{m.calories} kcal</td>
                  <td style={td}><button onClick={() => deleteMeal(m.id).then(refresh)} style={btnSm}>Sil</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const card       = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd     = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input      = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const th         = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td         = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm      = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
