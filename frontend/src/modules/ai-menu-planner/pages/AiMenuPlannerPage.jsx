import { Fragment, useEffect, useMemo, useState } from "react";
import { getMenus, getMenu, generateMenu, createManualMenu, addMealItem, removeMenuItem, approveMenu, deleteMenu } from "../api/aiMenuPlanner";
import { getIngredients } from "../../../api/ingredients";
import { getMeals } from "../../../api/meals";
import { formatLocalDate, todayLocal } from "../../../utils/date";

const DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const CATEGORIES = [
  "Çorba",
  "Ana Yemek",
  "Ara Sıcak",
  "Tahıl (Pilav/Makarna)",
  "Yoğurt/Salata",
  "Tatlı/Meyve",
];

const nextMonday = () => {
  const d = new Date();
  const diff = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return formatLocalDate(d);
};

const budgetStatus = (totalCost, budget) => {
  const pct = budget ? (totalCost / budget) * 100 : 0;
  if (pct > 100) return { color: "var(--red)", label: "Bütçe Aşıldı" };
  if (pct > 85) return { color: "var(--amber)", label: "Bütçeye Yakın" };
  return { color: "var(--green)", label: "Bütçe İçinde" };
};

function numericValue(value) {
  const normalized = String(value)
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/^0+(?=\d)/, "");
  if (!normalized || normalized === ".") return "";
  return normalized;
}

function MenuDetailPanel({ menu, ingredientsById, mealsByCategory, getPicker, setPickerField, onAddMeal, onRemoveItem, onApprove, onDelete }) {
  const itemsByDay = useMemo(() => {
    return menu.items.reduce((acc, item) => {
      (acc[item.day_of_week] ??= []).push(item);
      return acc;
    }, {});
  }, [menu]);

  const status = budgetStatus(menu.total_cost, menu.budget);

  return (
    <div>
      {menu.notes && (
        <div style={{ padding: "10px 18px", fontSize: 12, color: "var(--text2)", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          💬 Yönetici talimatı: <em>{menu.notes}</em>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, padding: 18 }}>
        {[
          { label: "Harcanan",        value: `${menu.total_cost.toFixed(2)} TL`, color: status.color },
          { label: "Bütçe",           value: `${menu.budget.toFixed(2)} TL`,     color: "var(--accent)" },
          { label: "Kalan Bütçe",     value: `${(menu.budget - menu.total_cost).toFixed(2)} TL`, color: menu.budget - menu.total_cost < 0 ? "var(--red)" : "var(--green)" },
          { label: "Toplam Kalori",   value: `${menu.total_calories.toFixed(0)} kcal`, color: "var(--purple)" },
          { label: "Protein / Demir", value: `${menu.total_protein.toFixed(0)}g / ${menu.total_iron.toFixed(1)}mg`, color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--surface)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 18px 14px", fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</div>

      <div style={{ display: "flex", gap: 10, padding: "0 18px 18px", overflowX: "auto" }}>
        {DAYS_OF_WEEK.map((day) => {
          const dayItems = itemsByDay[day] || [];
          const aiItems = dayItems.filter((it) => it.ingredient_id);
          const mealItems = dayItems.filter((it) => it.meal_id);
          const sel = getPicker(day);
          return (
            <div key={day} style={{ flex: "0 0 170px", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
              <div style={{ background: "var(--surface2)", padding: "8px 10px", fontSize: 11, fontWeight: 700 }}>{day}</div>
              <div style={{ padding: 10, flex: 1 }}>
                {aiItems.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{aiItems[0].meal_name}</div>
                    {aiItems.map((item) => {
                      const ing = ingredientsById[item.ingredient_id];
                      return (
                        <div key={item.id} style={{ fontSize: 11, color: "var(--text2)", marginBottom: 2 }}>
                          {ing?.name || `#${item.ingredient_id}`} — {item.quantity}{ing?.unit || ""}
                        </div>
                      );
                    })}
                  </>
                )}

                {mealItems.length === 0 && aiItems.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>—</div>
                )}

                {mealItems.map((item) => (
                  <div key={item.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 11, background: "var(--surface2)", borderRadius: 6, padding: "4px 7px", marginBottom: 4,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.meal_name}</div>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>{item.category} · {item.calories} kcal</div>
                    </div>
                    <button onClick={() => onRemoveItem(item.id)} style={btnX}>✕</button>
                  </div>
                ))}
              </div>

              <div style={{ padding: 8, borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                <select value={sel.category} onChange={(e) => setPickerField(day, "category", e.target.value)} style={inputXs}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sel.meal_id} onChange={(e) => setPickerField(day, "meal_id", e.target.value)} style={{ ...inputXs, marginTop: 4 }}>
                  <option value="">Yemek seçin...</option>
                  {(mealsByCategory[sel.category] || []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <button onClick={() => onAddMeal(day)} disabled={!sel.meal_id} style={{ ...btnSm, width: "100%", marginTop: 4 }}>+ Ekle</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 18px 18px" }}>
        {menu.status !== "approved" && <button onClick={onApprove} style={btnSm}>Onayla</button>}
        {menu.status === "draft" && <button onClick={onDelete} style={{ ...btnSm, color: "var(--red)" }}>🗑 Menüyü Sil</button>}
      </div>
    </div>
  );
}

export default function AiMenuPlannerPage() {
  const [ingredientsById, setIngredientsById] = useState({});
  const [meals, setMeals]           = useState([]);
  const [menus, setMenus]           = useState([]);
  const [expandedId, setExpandedId]         = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [showPast, setShowPast]     = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(nextMonday());
  const [budget, setBudget]         = useState(1000);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState(null);
  const [picker, setPicker]         = useState({});

  const refreshMenus = () => getMenus().then(setMenus);

  useEffect(() => {
    getIngredients().then((list) => {
      setIngredientsById(Object.fromEntries(list.map((i) => [i.id, i])));
    });
    getMeals().then(setMeals);
    refreshMenus();
  }, []);

  const mealsByCategory = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
    meals.forEach((m) => { if (map[m.category]) map[m.category].push(m); });
    return map;
  }, [meals]);

  const openMenu = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setPicker({});
    const detail = await getMenu(id);
    setExpandedId(id);
    setExpandedDetail(detail);
  };

  const refreshExpanded = async () => {
    if (!expandedId) return;
    setExpandedDetail(await getMenu(expandedId));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const menu = await generateMenu({
        week_start_date: weekStartDate,
        budget: parseFloat(budget) || 0,
        extra_instructions: extraInstructions.trim() || null,
      });
      setPicker({});
      setExpandedId(menu.id);
      setExpandedDetail(menu);
      refreshMenus();
    } catch (e) {
      setError(e.response?.data?.detail || "Menü oluşturulamadı. GEMINI_API_KEY tanımlı mı kontrol edin.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManual = async () => {
    setError(null);
    try {
      const menu = await createManualMenu({ week_start_date: weekStartDate, budget: parseFloat(budget) || 0 });
      setPicker({});
      setExpandedId(menu.id);
      setExpandedDetail(menu);
      refreshMenus();
    } catch (e) {
      setError(e.response?.data?.detail || "Boş menü oluşturulamadı.");
    }
  };

  const handleApprove = async () => {
    if (!expandedDetail) return;
    const updated = await approveMenu(expandedDetail.id);
    setExpandedDetail({ ...expandedDetail, status: updated.status });
    refreshMenus();
  };

  const handleDelete = async (id) => {
    await deleteMenu(id);
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
    }
    refreshMenus();
  };

  const getPicker = (day) => picker[day] || { category: CATEGORIES[0], meal_id: "" };
  const setPickerField = (day, field, value) => {
    const cur = getPicker(day);
    const next = { ...cur, [field]: value };
    if (field === "category") next.meal_id = "";
    setPicker({ ...picker, [day]: next });
  };

  const handleAddMeal = async (day) => {
    if (!expandedDetail) return;
    const sel = getPicker(day);
    if (!sel.meal_id) return;
    await addMealItem(expandedDetail.id, { day_of_week: day, category: sel.category, meal_id: Number(sel.meal_id) });
    await refreshExpanded();
    refreshMenus();
    setPickerField(day, "meal_id", "");
  };

  const handleRemoveItem = async (itemId) => {
    if (!expandedDetail) return;
    await removeMenuItem(expandedDetail.id, itemId);
    await refreshExpanded();
    refreshMenus();
  };

  const today = todayLocal();
  const currentMenus = useMemo(
    () => menus.filter((m) => m.week_start_date >= today).sort((a, b) => a.week_start_date.localeCompare(b.week_start_date)),
    [menus]
  );
  const pastMenus = useMemo(
    () => menus.filter((m) => m.week_start_date < today).sort((a, b) => b.week_start_date.localeCompare(a.week_start_date)),
    [menus]
  );

  const renderMenuTable = (list, emptyMsg) => (
    list.length === 0 ? (
      <div style={{ padding: 24, color: "var(--text3)", fontSize: 12 }}>{emptyMsg}</div>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{["Hafta", "Bütçe", "Harcanan", "Kalan", "Durum", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {list.map((m) => {
            const remaining = m.budget - m.total_cost;
            const isOpen = expandedId === m.id;
            return (
              <Fragment key={m.id}>
                <tr>
                  <td style={td}>{m.week_start_date}</td>
                  <td style={td}>{m.budget.toFixed(2)} TL</td>
                  <td style={td}>{m.total_cost.toFixed(2)} TL</td>
                  <td style={{ ...td, fontWeight: 600, color: remaining < 0 ? "var(--red)" : "var(--green)" }}>{remaining.toFixed(2)} TL</td>
                  <td style={td}>{m.status === "approved" ? "✓ Onaylandı" : "Taslak"}</td>
                  <td style={td}>
                    <button onClick={() => openMenu(m.id)} style={btnSm}>{isOpen ? "Kapat" : "Görüntüle"}</button>{" "}
                    {m.status === "draft" && (
                      <button onClick={() => handleDelete(m.id)} style={{ ...btnSm, color: "var(--red)" }}>Sil</button>
                    )}
                  </td>
                </tr>
                {isOpen && expandedDetail && (
                  <tr>
                    <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
                      <MenuDetailPanel
                        menu={expandedDetail}
                        ingredientsById={ingredientsById}
                        mealsByCategory={mealsByCategory}
                        getPicker={getPicker}
                        setPickerField={setPickerField}
                        onAddMeal={handleAddMeal}
                        onRemoveItem={handleRemoveItem}
                        onApprove={handleApprove}
                        onDelete={() => handleDelete(m.id)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    )
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>🤖 AI Destekli Menü Planlayıcı</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
          Depodaki mevcut malzemelerle, Pazartesi'den Pazar'a her gün her kategoriden bir yemek önerir — ya da Yemek Kategorisi kataloğundan gün ve kategori bazında elle seçim yapın
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>📅 Yeni Haftalık Menü Oluştur</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={fieldLabel}>Hafta Başlangıcı (Pazartesi)</div>
            <input type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>Haftalık Bütçe (TL)</div>
            <input
              type="text"
              inputMode="decimal"
              value={budget}
              onFocus={(e) => {
                if (Number(budget) === 0) setBudget("");
                e.target.select();
              }}
              onBlur={() => {
                if (budget === "") setBudget(0);
              }}
              onChange={(e) => setBudget(numericValue(e.target.value))}
              style={input}
            />
          </div>
          <button onClick={handleGenerate} disabled={generating} style={btnPrimary}>
            {generating ? "Oluşturuluyor..." : "✨ AI ile Oluştur"}
          </button>
          <button onClick={handleCreateManual} style={btnSecondary}>
            📋 Boş Menü Oluştur (Katalogdan Seç)
          </button>
        </div>
        <div style={{ padding: "0 18px 18px" }}>
          <div style={fieldLabel}>Ek Talimat (opsiyonel) — yalnızca AI üretimi için</div>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder='Örn: "Az yağlı olsun", "Haftada en fazla 2 gün kırmızı et", "Vejetaryen ağırlıklı olsun"'
            rows={2}
            style={{ ...input, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
        {error && <div style={{ padding: "0 18px 16px", fontSize: 12, color: "var(--red)" }}>{error}</div>}
      </div>

      <div style={card}>
        <div style={cardHd}>📆 Güncel Menüler <span style={{ fontWeight: 400, color: "var(--text3)" }}>(bugün ve sonraki günler, sırayla)</span></div>
        {renderMenuTable(currentMenus, "Güncel bir menü yok.")}
      </div>

      <div style={card}>
        <div
          style={{ ...cardHd, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setShowPast(!showPast)}
        >
          <span>🗄️ Geçmiş Menüler <span style={{ fontWeight: 400, color: "var(--text3)" }}>({pastMenus.length})</span></span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{showPast ? "▲ Gizle" : "▼ Göster"}</span>
        </div>
        {showPast && renderMenuTable(pastMenus, "Geçmiş menü yok.")}
      </div>
    </div>
  );
}

const card       = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd     = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input      = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const inputXs    = { width: "100%", background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 6px", fontSize: 10, color: "var(--text)", outline: "none" };
const th         = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td         = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const btnSecondary = { background: "var(--surface2)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const btnSm      = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const btnX       = { background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 11, padding: "0 2px" };
