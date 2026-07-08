import { Fragment, useEffect, useState } from "react";
import {
  getIngredients, createIngredient, updateIngredient, deleteIngredient,
  getBatches, createBatch, deleteBatch,
} from "../api/ingredients";

const emptyForm = { name: "", unit: "kg", calories: 0, protein: 0, iron: 0, price: 0 };
const emptyBatchForm = { quantity: "", purchase_date: new Date().toISOString().slice(0, 10), expiry_date: "" };

function numericValue(value) {
  const normalized = String(value)
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/^0+(?=\d)/, "");
  if (!normalized || normalized === ".") return "";
  return normalized;
}

function numericPayloadValue(value) {
  return value === "" ? 0 : Number(value);
}

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

function BatchPanel({ ingredient, onStockChanged }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyBatchForm);

  const refresh = () => getBatches(ingredient.id).then(setBatches).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, [ingredient.id]);

  const handleAdd = async () => {
    if (!form.quantity || !form.purchase_date) return;
    await createBatch(ingredient.id, {
      quantity: numericPayloadValue(form.quantity),
      purchase_date: form.purchase_date,
      expiry_date: form.expiry_date || null,
    });
    setForm(emptyBatchForm);
    await refresh();
    onStockChanged();
  };

  const handleDelete = async (batchId) => {
    await deleteBatch(ingredient.id, batchId);
    await refresh();
    onStockChanged();
  };

  return (
    <div style={{ padding: "12px 18px 18px", background: "var(--surface2)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
        {ingredient.name} — Alınan Partiler
      </div>
      {loading ? <div style={{ fontSize: 12, color: "var(--text3)" }}>Yükleniyor...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead>
            <tr>{["Miktar", "Alınma Tarihi", "SKT", ""].map((h) => <th key={h} style={thSm}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {batches.length === 0 && (
              <tr><td style={tdSm} colSpan={4}>Henüz parti eklenmemiş.</td></tr>
            )}
            {batches.map((b) => {
              const days = daysUntil(b.expiry_date);
              const exp = expiryStyle(days);
              return (
                <tr key={b.id}>
                  <td style={{ ...tdSm, fontFamily: "var(--mono)", fontWeight: 600 }}>{b.quantity} {ingredient.unit}</td>
                  <td style={tdSm}>{b.purchase_date}</td>
                  <td style={{ ...tdSm, fontWeight: 600, color: exp.color }}>{exp.label}</td>
                  <td style={tdSm}><button onClick={() => handleDelete(b.id)} style={btnXs}>Sil</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <div>
          <div style={fieldLabelSm}>Miktar ({ingredient.unit})</div>
          <input
            type="text" inputMode="decimal" value={form.quantity} placeholder="0"
            onChange={(e) => setForm({ ...form, quantity: numericValue(e.target.value) })}
            style={inputSm}
          />
        </div>
        <div>
          <div style={fieldLabelSm}>Alınma Tarihi</div>
          <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={inputSm} />
        </div>
        <div>
          <div style={fieldLabelSm}>Son Kul. Tarihi</div>
          <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} style={inputSm} />
        </div>
        <button onClick={handleAdd} style={btnPrimarySm}>+ Parti Ekle</button>
      </div>
    </div>
  );
}

export default function Ingredients() {
  const [items, setItems]     = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const refresh = () => getIngredients().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const fields = [
    { label: "Malzeme Adı",  key: "name",        type: "text" },
    { label: "Fiyat (TL)",   key: "price",       type: "number" },
    { label: "Kalori",       key: "calories",    type: "number" },
    { label: "Protein (g)",  key: "protein",     type: "number" },
    { label: "Demir (mg)",   key: "iron",        type: "number" },
  ];

  const handleSubmit = async () => {
    if (!form.name) return;
    const payload = {
      ...form,
      price: numericPayloadValue(form.price),
      calories: numericPayloadValue(form.calories),
      protein: numericPayloadValue(form.protein),
      iron: numericPayloadValue(form.iron),
    };
    if (editingId) {
      await updateIngredient(editingId, payload);
    } else {
      await createIngredient(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name, unit: item.unit, price: item.price,
      calories: item.calories, protein: item.protein, iron: item.iron,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>📦 Malzeme Deposu</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>Güncel stok durumu</div>
      </div>

      <div style={card}>
        <div style={cardHd}>{editingId ? "✏️ Malzemeyi Düzenle" : "➕ Yeni Malzeme Ekle"}</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, alignItems: "end" }}>
          {fields.map(({ label, key, type }) => (
            <div key={key}>
              <div style={fieldLabel}>{label}</div>
              <input
                type={type === "number" ? "text" : type}
                inputMode={type === "number" ? "decimal" : undefined}
                value={form[key]}
                onFocus={(e) => {
                  if (type === "number" && Number(form[key]) === 0) {
                    setForm({ ...form, [key]: "" });
                  }
                  e.target.select();
                }}
                onBlur={() => {
                  if (type === "number" && form[key] === "") {
                    setForm({ ...form, [key]: 0 });
                  }
                }}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]: type === "number" ? numericValue(e.target.value) : e.target.value,
                  })
                }
                style={input} />
            </div>
          ))}
          <div>
            <div style={fieldLabel}>Birim</div>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={input}>
              {["kg", "lt", "adet", "paket", "kutu"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSubmit} style={{ ...btnPrimary, flex: 1 }}>{editingId ? "Güncelle" : "Ekle"}</button>
            {editingId && <button onClick={cancelEdit} style={btnSm}>İptal</button>}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>🗃️ Stok Listesi <span style={{ fontWeight: 400, color: "var(--text3)" }}>(her malzeme kendi partilerinin toplamıdır — detay için satıra tıklayın)</span></div>
        {loading ? <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["", "Malzeme", "Birim", "Toplam Stok", "Fiyat", "Kalori", "Protein", "Demir", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <Fragment key={i.id}>
                  <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}>
                    <td style={{ ...td, width: 22, color: "var(--text3)" }}>{expandedId === i.id ? "▾" : "▸"}</td>
                    <td style={td}><span style={{ fontWeight: 500, color: "var(--text)" }}>{i.name}</span></td>
                    <td style={td}>{i.unit}</td>
                    <td style={{ ...td, fontFamily: "var(--mono)", fontWeight: 600, color: i.stock < 20 ? "var(--red)" : i.stock < 50 ? "var(--amber)" : "var(--green)" }}>{i.stock}</td>
                    <td style={td}>{i.price?.toFixed(2)} TL</td>
                    <td style={td}>{i.calories} kcal</td>
                    <td style={td}>{i.protein} g</td>
                    <td style={td}>{i.iron} mg</td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(i)} style={btnSm}>Düzenle</button>{" "}
                      <button onClick={() => deleteIngredient(i.id).then(refresh)} style={btnSm}>Sil</button>
                    </td>
                  </tr>
                  {expandedId === i.id && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
                        <BatchPanel ingredient={i} onStockChanged={refresh} />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
const fieldLabelSm = { fontSize: 10, color: "var(--text2)", marginBottom: 4, fontWeight: 500 };
const input      = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const inputSm    = { width: "100%", background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "var(--text)", outline: "none" };
const th         = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const thSm       = { textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 8px", borderBottom: "1px solid var(--border2)" };
const td         = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const tdSm       = { padding: "6px 8px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border2)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnPrimarySm = { background: "var(--accent)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer" };
const btnSm      = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const btnXs      = { background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "2px 8px", borderRadius: 5, fontSize: 10, cursor: "pointer" };
