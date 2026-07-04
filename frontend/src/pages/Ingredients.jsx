import { useEffect, useState } from "react";
import { getIngredients, createIngredient, deleteIngredient } from "../api/ingredients";

const emptyForm = { name: "", unit: "kg", stock: 0, calories: 0, protein: 0, iron: 0, price: 0, expiry_date: "" };

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
};

const expiryStyle = (days) => {
  if (days === null) return { color: "var(--text3)", label: "—" };
  if (days < 0) return { color: "var(--red)", label: "Süresi geçti" };
  if (days <= 3) return { color: "var(--red)", label: `${days} gün` };
  if (days <= 7) return { color: "var(--amber)", label: `${days} gün` };
  return { color: "var(--green)", label: `${days} gün` };
};

export default function Ingredients() {
  const [items, setItems]     = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const refresh = () => getIngredients().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    await createIngredient({ ...form, expiry_date: form.expiry_date || null });
    setForm(emptyForm);
    refresh();
  };

  const fields = [
    { label: "Malzeme Adı",  key: "name",        type: "text",   placeholder: "Örn: Pirinç" },
    { label: "Stok Miktarı", key: "stock",       type: "number", placeholder: "0" },
    { label: "Fiyat (TL)",   key: "price",       type: "number", placeholder: "0" },
    { label: "Kalori",       key: "calories",    type: "number", placeholder: "0" },
    { label: "Protein (g)",  key: "protein",     type: "number", placeholder: "0" },
    { label: "Demir (mg)",   key: "iron",        type: "number", placeholder: "0" },
    { label: "Son Kul. Tarihi", key: "expiry_date", type: "date", placeholder: "" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>📦 Malzeme Deposu</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>Güncel stok durumu</div>
      </div>

      <div style={card}>
        <div style={cardHd}>➕ Yeni Malzeme Ekle</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, alignItems: "end" }}>
          {fields.map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <div style={fieldLabel}>{label}</div>
              <input type={type} value={form[key]} placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
                style={input} />
            </div>
          ))}
          <div>
            <div style={fieldLabel}>Birim</div>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={input}>
              {["kg", "lt", "adet", "paket", "kutu"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} style={{ ...btnPrimary, alignSelf: "end" }}>Ekle</button>
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>🗃️ Stok Listesi</div>
        {loading ? <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Malzeme", "Birim", "Stok", "Fiyat", "Kalori", "Protein", "Demir", "SKT", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const days = daysUntil(i.expiry_date);
                const exp  = expiryStyle(days);
                return (
                  <tr key={i.id}>
                    <td style={td}><span style={{ fontWeight: 500, color: "var(--text)" }}>{i.name}</span></td>
                    <td style={td}>{i.unit}</td>
                    <td style={{ ...td, fontFamily: "var(--mono)", fontWeight: 600, color: i.stock < 20 ? "var(--red)" : i.stock < 50 ? "var(--amber)" : "var(--green)" }}>{i.stock}</td>
                    <td style={td}>{i.price?.toFixed(2)} TL</td>
                    <td style={td}>{i.calories} kcal</td>
                    <td style={td}>{i.protein} g</td>
                    <td style={td}>{i.iron} mg</td>
                    <td style={{ ...td, fontWeight: 600, color: exp.color }}>{exp.label}</td>
                    <td style={td}><button onClick={() => deleteIngredient(i.id).then(refresh)} style={btnSm}>Sil</button></td>
                  </tr>
                );
              })}
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
