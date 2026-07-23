import { useEffect, useMemo, useState } from "react";
import { getMeals, createMeal, updateMeal, deleteMeal } from "../api/meals";
import { getIngredients } from "../api/ingredients";
import LoadingSpinner from "../components/LoadingSpinner";

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
  const ingredientUsageCount = items.reduce((sum, meal) => sum + (meal.items?.length || 0), 0);
  const summary = [
    { label: "Toplam yemek", value: items.length },
    { label: "Aktif kategori", value: countsByCategory[activeCategory] || 0 },
    { label: "Malzeme kaydı", value: ingredientUsageCount },
    { label: "Depo malzemesi", value: ingredients.length },
  ];

  return (
    <div>
      <div style={pageHeader}>
        <div style={pageTitle}>Yemek Kategorisi</div>
      </div>

      <div style={summaryGrid}>
        {summary.map((item) => (
          <div key={item.label} style={summaryCard}>
            <div style={summaryLabel}>{item.label}</div>
            <div style={summaryValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={cardHdSplit}>
          <div>
            <div style={cardTitle}>{editingId ? "Yemeği Düzenle" : "Yeni Yemek Ekle"}</div>
            <div style={cardHint}>Porsiyon, kategori ve 1 porsiyonluk malzeme miktarlarını tanımlayın.</div>
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <div style={formGrid}>
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

          <div style={sectionTitle}>Kullanılan Malzemeler</div>
          <div style={sectionHint}>Miktar 1 porsiyon içindir; sistem depodaki stokla otomatik karşılaştırır.</div>
          {form.items.map((it, index) => {
            const ing = ingredientMap[Number(it.ingredient_id)];
            const totalNeeded = it.quantity !== "" ? Number(it.quantity) * portionsNum : 0;
            const overStock = ing && totalNeeded > ing.stock;
            return (
              <div key={index}>
                <div style={ingredientRow}>
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
          <button onClick={addItemRow} style={{ ...btnSm, marginTop: 10 }}>+ Malzeme Ekle</button>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleSubmit} style={btnPrimary}>{editingId ? "Güncelle" : "Ekle"}</button>
            {editingId && <button onClick={resetForm} style={btnSm}>İptal</button>}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={cardHdSplit}>
          <div>
            <div style={cardTitle}>Kategori Listesi</div>
            <div style={cardHint}>Kategori seçin, ardından yemek adıyla filtreleyin.</div>
          </div>
        </div>
        <div style={categoryTabs}>
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
        <div style={listToolbar}>
          <div style={activeCategoryLabel}>{activeCategory} Listesi</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bu kategoride yemek ara..."
            style={{ ...input, maxWidth: 360 }}
          />
        </div>
        {loading ? <LoadingSpinner label="Yemek listesi yükleniyor" minHeight={180} size={38} /> : (
          visibleItems.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text3)", fontSize: 13 }}>Bu kategoride henüz yemek yok.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
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
            </div>
          )
        )}
      </div>
    </div>
  );
}

const card       = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 14px 36px rgba(24, 24, 24, 0.07)", marginBottom: 16, overflow: "hidden" };
const pageHeader = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 14 };
const pageTitle = { color: "var(--ingredients-text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, lineHeight: 1.05, fontWeight: 700 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 };
const summaryCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "13px 15px", boxShadow: "0 10px 26px rgba(24, 24, 24, 0.06)" };
const summaryLabel = { color: "var(--text3)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 };
const summaryValue = { color: "var(--text)", fontSize: 24, lineHeight: 1, fontWeight: 800, fontFamily: "var(--mono)" };
const cardHd     = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const cardHdSplit = { padding: "15px 18px 13px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const cardTitle = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.15, fontWeight: 700 };
const cardHint = { color: "var(--text3)", fontSize: 12, marginTop: 4, fontWeight: 600 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 };
const sectionTitle = { color: "var(--text3)", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 };
const sectionHint = { color: "var(--text3)", fontSize: 12, marginBottom: 10 };
const ingredientRow = { display: "grid", gridTemplateColumns: "minmax(220px, 1.6fr) minmax(120px, 1fr) auto", gap: 8, marginTop: 7 };
const categoryTabs = { padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: 7, borderBottom: "1px solid var(--border)", background: "var(--surface)" };
const listToolbar = { padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--surface2)", borderBottom: "1px solid var(--border)" };
const activeCategoryLabel = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 700 };
const input      = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" };
const th         = { textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" };
const td         = { padding: "11px 16px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const btnSm      = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const tabBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)",
  padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
};
const tabBtnActive = { ...tabBtn, background: "var(--accent-bg)", borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 700 };
const tabCount = { background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--text3)", borderRadius: 999, fontSize: 10, padding: "1px 6px", fontFamily: "var(--mono)" };
const tabCountActive = { ...tabCount, background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" };
