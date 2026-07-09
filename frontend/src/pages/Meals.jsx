import { useEffect, useMemo, useState } from "react";
import { getMeals, createMeal, updateMeal, deleteMeal } from "../api/meals";
import { getIngredients } from "../api/ingredients";

const CATEGORIES = [
  "Çorba",
  "Ana Yemek",
  "Ara Sıcak",
  "Tahıl (Pilav/Makarna)",
  "Yoğurt/Salata",
  "Tatlı/Meyve",
];

const emptyItem = { ingredient_id: "", quantity: "" };
const emptyForm = { name: "", category: CATEGORIES[0], portions: 40, items: [{ ...emptyItem }] };

function numericValue(value) {
  const normalized = String(value)
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/^0+(?=\d)/, "");
  if (!normalized || normalized === ".") return "";
  return normalized;
}

function formatQty(value) {
  const num = Number(value);
  if (!isFinite(num)) return "0";
  return Number(num.toFixed(3)).toString();
}

export default function Meals() {
  const [items, setItems]     = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const refresh = () => getMeals().then(setItems).finally(() => setLoading(false));
  useEffect(() => {
    refresh();
    getIngredients().then(setIngredients);
  }, []);

  const ingredientMap = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.id, i])),
    [ingredients]
  );

  const resetForm = () => {
    setForm({ ...emptyForm, category: activeCategory, items: [{ ...emptyItem }] });
    setEditingId(null);
  };

  const handleItemChange = (index, field, value) => {
    const nextItems = form.items.map((it, i) => (i === index ? { ...it, [field]: value } : it));
    setForm({ ...form, items: nextItems });
  };

  const addItemRow = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItemRow = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) });

  const portionsNum = Number(form.portions) || 1;

  const handleSubmit = async () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      category: form.category,
      portions: portionsNum,
      // form.items miktarları 1 porsiyon içindir; depoya kaydedilen toplam = miktar * porsiyon
      items: form.items
        .filter((it) => it.ingredient_id && it.quantity !== "")
        .map((it) => ({ ingredient_id: Number(it.ingredient_id), quantity: Number(it.quantity) * portionsNum })),
    };
    if (editingId) {
      await updateMeal(editingId, payload);
    } else {
      await createMeal(payload);
    }
    resetForm();
    refresh();
  };

  const startEdit = (meal) => {
    setEditingId(meal.id);
    setActiveCategory(meal.category);
    setForm({
      name: meal.name,
      category: meal.category,
      portions: meal.portions,
      // depodaki toplam miktarı 1 porsiyona geri çevir
      items: meal.items.length
        ? meal.items.map((it) => ({ ingredient_id: String(it.ingredient_id), quantity: formatQty(it.quantity / meal.portions) }))
        : [{ ...emptyItem }],
    });
  };

  const countsByCategory = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    items.forEach((m) => {
      if (counts[m.category] !== undefined) counts[m.category] += 1;
    });
    return counts;
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((m) => m.category === activeCategory && m.name.toLowerCase().includes(search.toLowerCase())),
    [items, activeCategory, search]
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>🍽️ Yemek Kategorisi</div>
      </div>

      <div style={card}>
        <div style={cardHd}>{editingId ? "✏️ Yemeği Düzenle" : "➕ Yeni Yemek Ekle"}</div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 0.8fr", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={fieldLabel}>Yemek Adı</div>
              <input value={form.name} placeholder="Örn: Mercimek Çorbası" onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} />
            </div>
            <div>
              <div style={fieldLabel}>Kategori</div>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={fieldLabel}>Porsiyon (kaç kişilik pişirilecek)</div>
              <input
                type="text" inputMode="numeric" value={form.portions}
                onChange={(e) => setForm({ ...form, portions: numericValue(e.target.value) })}
                style={input}
              />
            </div>
          </div>

          <div style={fieldLabel}>Kullanılan Malzemeler — miktar 1 porsiyon içindir, depodaki stokla karşılaştırılır</div>
          {form.items.map((it, index) => {
            const ing = ingredientMap[Number(it.ingredient_id)];
            const totalNeeded = it.quantity !== "" ? Number(it.quantity) * portionsNum : 0;
            const overStock = ing && totalNeeded > ing.stock;
            return (
              <div key={index}>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr auto", gap: 8, marginTop: 6 }}>
                  <select value={it.ingredient_id} onChange={(e) => handleItemChange(index, "ingredient_id", e.target.value)} style={input}>
                    <option value="">Malzeme seçin...</option>
                    {ingredients.map((opt) => <option key={opt.id} value={opt.id}>{opt.name} ({opt.unit}) — depoda {opt.stock}{opt.unit}</option>)}
                  </select>
                  <input
                    type="text" inputMode="decimal" placeholder="1 porsiyon miktarı"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", numericValue(e.target.value))}
                    style={input}
                  />
                  <button onClick={() => removeItemRow(index)} style={btnSm}>Kaldır</button>
                </div>
                {ing && it.quantity !== "" && (
                  <div style={{ fontSize: 10, marginTop: 3, color: overStock ? "var(--red)" : "var(--text3)" }}>
                    {portionsNum} porsiyon için toplam {formatQty(totalNeeded)}{ing.unit} gerekir
                    {overStock ? ` — depoda yalnızca ${ing.stock}${ing.unit} var!` : ` (depoda ${ing.stock}${ing.unit})`}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={addItemRow} style={{ ...btnSm, marginTop: 8 }}>+ Malzeme Ekle</button>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleSubmit} style={btnPrimary}>{editingId ? "Güncelle" : "Ekle"}</button>
            {editingId && <button onClick={resetForm} style={btnSm}>İptal</button>}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ ...cardHd, display: "flex", flexWrap: "wrap", gap: 6, borderBottom: "1px solid var(--border)" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              style={activeCategory === c ? tabBtnActive : tabBtn}
            >
              {c}
              <span style={activeCategory === c ? tabCountActive : tabCount}>{countsByCategory[c]}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 18px 2px", fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>
          🍽️ {activeCategory} Listesi
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Bu kategoride yemek ara..."
            style={input}
          />
        </div>
        {loading ? <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div> : (
          visibleItems.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text3)", fontSize: 13 }}>Bu kategoride henüz yemek yok.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Yemek", "Porsiyon", "Kalori", "Protein", "Demir", "Malzemeler (1 Porsiyon)", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {visibleItems.map((m) => (
                  <tr key={m.id}>
                    <td style={td}><span style={{ fontWeight: 500, color: "var(--text)" }}>{m.name}</span></td>
                    <td style={{ ...td, fontFamily: "var(--mono)" }}>{m.portions}</td>
                    <td style={{ ...td, fontFamily: "var(--mono)" }}>{m.calories} kcal</td>
                    <td style={{ ...td, fontFamily: "var(--mono)" }}>{m.protein} g</td>
                    <td style={{ ...td, fontFamily: "var(--mono)" }}>{m.iron} mg</td>
                    <td style={{ ...td, fontSize: 11, color: "var(--text3)", maxWidth: 260 }}>
                      {m.items.map((it) => `${it.ingredient_name} (${formatQty(it.quantity / m.portions)}${it.unit})`).join(", ") || "—"}
                    </td>
                    <td style={td}>
                      <button onClick={() => startEdit(m)} style={btnSm}>Düzenle</button>{" "}
                      <button onClick={() => deleteMeal(m.id).then(refresh)} style={btnSm}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
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
const tabBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)",
  padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
};
const tabBtnActive = { ...tabBtn, background: "var(--accent-bg)", borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 700 };
const tabCount = { background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--text3)", borderRadius: 999, fontSize: 10, padding: "1px 6px", fontFamily: "var(--mono)" };
const tabCountActive = { ...tabCount, background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" };
