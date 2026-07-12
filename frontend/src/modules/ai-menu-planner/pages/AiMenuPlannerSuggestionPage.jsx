// AI Destekli Menü Planlayıcı — ÖNERİ (UX sadeleştirme denemesi)
// Mevcut AiMenuPlannerPage.jsx'in işlevini korur; arayüz düzeni sadeleştirilmiştir.
// Bu sürümde ek olarak: sekmelerin hemen altında tek "aktif taslak" önizlemesi,
// yeni üretimde önceki onaylanmamış taslağın otomatik silinmesi (birikme yok),
// menü seviyesinde "kaç kişi/porsiyon" seçimi — onaylı menüde bile değiştirilebilir,
// değişiklik Dashboard'a yansır (kalem porsiyonu güncellenir).
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  getMenus,
  getMenu,
  generateMenu,
  createManualMenu,
  addMealItem,
  removeMenuItem,
  approveMenu,
  deleteMenu,
  updateMenuPortions,
  updateMenuItemPortions,
  getSeasonalRevisions,
} from "../api/aiMenuPlanner";
import { getIngredients } from "../../../api/ingredients";
import { getMeals } from "../../../api/meals";
import { getStudents } from "../../../api/students";
import { formatLocalDate, todayLocal } from "../../../utils/date";

const DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const CATEGORIES = ["Çorba", "Ana Yemek", "Ara Sıcak", "Tahıl (Pilav/Makarna)", "Yoğurt/Salata", "Tatlı/Meyve"];

const SEASONAL_MONTHS_BY_NAME = [
  { keys: ["domates", "salatalik", "salatalık", "biber", "patlican", "patlıcan", "kabak", "fasulye", "karpuz", "kavun"], months: [6, 7, 8, 9] },
  { keys: ["ispanak", "pirasa", "pırasa", "lahana", "kereviz", "brokoli", "karnabahar", "turp"], months: [11, 12, 1, 2, 3] },
  { keys: ["bezelye", "enginar", "bakla", "cilek", "çilek", "marul"], months: [3, 4, 5] },
  { keys: ["havuç", "havuc", "patates", "sogan", "soğan", "elma"], months: [1, 2, 3, 4, 9, 10, 11, 12] },
];

const seasonalInstruction =
  "Mevsiminde olan, yerel tedarik edilebilen ve birim fiyat/stok avantajı bulunan sebze-meyveleri önceliklendir. Benzer besin değerinde daha ucuz mevsimsel alternatif varsa menüyü ona göre revize et.";

const nextMonday = () => {
  const d = new Date();
  const diff = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return formatLocalDate(d);
};

const budgetStatus = (totalCost, budget) => {
  const pct = budget ? (totalCost / budget) * 100 : 0;
  if (pct > 100) return { color: "var(--red)", label: "Bütçe Aşıldı", pct };
  if (pct > 85) return { color: "var(--amber)", label: "Bütçeye Yakın", pct };
  return { color: "var(--green)", label: "Bütçe İçinde", pct };
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
const intValue = (v) => String(v).replace(/\D/g, "").replace(/^0+(?=\d)/, "");

function normalizeText(value) {
  return String(value || "").toLocaleLowerCase("tr-TR");
}

function isIngredientSeasonal(ingredient, month) {
  if (Array.isArray(ingredient.season_months)) return ingredient.season_months.includes(month);
  if (ingredient.season_start_month && ingredient.season_end_month) {
    const start = Number(ingredient.season_start_month);
    const end = Number(ingredient.season_end_month);
    return start <= end ? month >= start && month <= end : month >= start || month <= end;
  }
  const name = normalizeText(ingredient.name);
  const match = SEASONAL_MONTHS_BY_NAME.find((item) => item.keys.some((key) => name.includes(key)));
  return match ? match.months.includes(month) : false;
}

function buildSeasonalInsights(ingredients, weekStartDate) {
  const month = new Date(`${weekStartDate}T00:00:00`).getMonth() + 1;
  const priced = ingredients.filter((i) => Number(i.price) > 0);
  const avgPrice = priced.length ? priced.reduce((sum, i) => sum + Number(i.price || 0), 0) / priced.length : 0;
  return ingredients
    .map((ingredient) => {
      const price = Number(ingredient.price || 0);
      const stock = Number(ingredient.stock || 0);
      const seasonal = isIngredientSeasonal(ingredient, month);
      const local = Boolean(ingredient.is_local || ingredient.local || ingredient.origin_region);
      const cheap = avgPrice > 0 && price > 0 && price <= avgPrice * 0.85;
      const abundant = stock >= 10;
      const score = (seasonal ? 3 : 0) + (local ? 2 : 0) + (cheap ? 2 : 0) + (abundant ? 1 : 0);
      return { ...ingredient, seasonal, local, cheap, abundant, score };
    })
    .filter((ingredient) => ingredient.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.stock || 0) - Number(a.stock || 0))
    .slice(0, 6);
}

function plainBadges(rev) {
  const badges = [];
  if (rev.estimated_savings > 0) badges.push({ text: `💰 ${rev.estimated_savings.toFixed(2)} TL tasarruf/porsiyon`, color: "var(--green)" });
  if (rev.seasonal_ingredients?.length) badges.push({ text: `🌿 Mevsiminde: ${rev.seasonal_ingredients.slice(0, 3).join(", ")}`, color: "#16a34a" });
  if (rev.local_ingredients?.length) badges.push({ text: `🌍 Yerel: ${rev.local_ingredients.slice(0, 3).join(", ")}`, color: "var(--accent)" });
  if (rev.price_advantage_score > 0) badges.push({ text: "📉 Piyasadan ucuz malzeme", color: "var(--amber)" });
  return badges;
}

// ─── Tek yemek kalemi (kendi kişi sayısı düzenlenebilir) ───
function MealItemRow({ item, onRemoveItem, onChangeItemPortions, canRemove }) {
  const [val, setVal] = useState(String(item.portions ?? ""));
  useEffect(() => { setVal(String(item.portions ?? "")); }, [item.portions]);
  const apply = () => {
    const n = Math.max(parseInt(val, 10) || 0, 1);
    if (n !== item.portions) onChangeItemPortions(item.id, n);
    else setVal(String(item.portions ?? ""));
  };
  return (
    <div style={mealChip}>
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{item.meal_name}</div>
            <div style={{ color: "var(--text3)", fontSize: 10 }}>{item.category} · {item.calories} kcal</div>
          </div>
          {canRemove && <button onClick={() => onRemoveItem(item.id)} style={btnX} title="Kaldır">✕</button>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>👥</span>
          <input
            value={val}
            inputMode="numeric"
            onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))}
            onFocus={(e) => e.target.select()}
            onBlur={apply}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            style={{ ...inputXs, width: 46, padding: "2px 5px", textAlign: "center" }}
            title="Bu yemeği kaç kişi yiyecek"
          />
          <span style={{ fontSize: 10, color: "var(--text3)" }}>kişi</span>
        </div>
      </div>
    </div>
  );
}

// ─── Günlük plan kartı ───
function DayCard({ day, dayItems, mealsByCategory, ingredientsById, picker, onPickerField, onAddMeal, onRemoveItem, onChangeItemPortions, readOnly }) {
  const aiItems = dayItems.filter((it) => it.ingredient_id);
  const mealItems = dayItems.filter((it) => it.meal_id);
  return (
    <div style={dayCard}>
      <div style={dayCardHd}>{day}</div>
      <div style={{ padding: 10, flex: 1 }}>
        {mealItems.length === 0 && aiItems.length === 0 && <div style={{ fontSize: 11, color: "var(--text3)" }}>—</div>}
        {mealItems.map((item) => (
          <MealItemRow
            key={item.id}
            item={item}
            onRemoveItem={onRemoveItem}
            onChangeItemPortions={onChangeItemPortions}
            canRemove={!readOnly}
          />
        ))}
        {aiItems.length > 0 && (
          <div style={mealChip}>
            <div style={{ width: "100%" }}>
              <div style={{ fontWeight: 600 }}>{aiItems[0].meal_name}</div>
              <details style={{ marginTop: 4 }}>
                <summary style={{ fontSize: 10, color: "var(--text3)", cursor: "pointer" }}>Malzemeler ({aiItems.length}) ▾</summary>
                <div style={{ marginTop: 4 }}>
                  {aiItems.map((item) => {
                    const ing = ingredientsById[item.ingredient_id];
                    return (
                      <div key={item.id} style={{ fontSize: 10, color: "var(--text2)", marginBottom: 2 }}>
                        {ing?.name || `#${item.ingredient_id}`} — {item.quantity}{ing?.unit || ""}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
      {!readOnly && (
        <div style={dayCardFoot}>
          <select value={picker.category} onChange={(e) => onPickerField(day, "category", e.target.value)} style={inputXs}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={picker.meal_id} onChange={(e) => onPickerField(day, "meal_id", e.target.value)} style={{ ...inputXs, marginTop: 4 }}>
            <option value="">Yemek seçin...</option>
            {(mealsByCategory[picker.category] || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={() => onAddMeal(day)} disabled={!picker.meal_id} style={{ ...btnSm, width: "100%", marginTop: 4 }}>+ Ekle</button>
        </div>
      )}
    </div>
  );
}

// ─── Aktif menü/taslak paneli ───
function MenuDetailPanel({ menu, ingredientsById, mealsByCategory, studentCount, getPicker, setPickerField, onAddMeal, onRemoveItem, onChangeItemPortions, onApprove, onDelete, onSeasonalRevisions, onChangePortions, portionsSaving, revisionsLoading }) {
  const itemsByDay = useMemo(() => {
    return menu.items.reduce((acc, item) => {
      (acc[item.day_of_week] ??= []).push(item);
      return acc;
    }, {});
  }, [menu]);

  const status = budgetStatus(menu.total_cost, menu.budget);
  const isApproved = menu.status === "approved";
  const portions = menu.portions || 40;
  const perPerson = portions > 0 ? menu.total_cost / portions : 0;

  // Elle serbest giriş; menü porsiyonu değişince senkron kalır
  const [manualPortions, setManualPortions] = useState(String(portions));
  useEffect(() => { setManualPortions(String(menu.portions || 40)); }, [menu.portions]);
  const applyManual = () => {
    const n = Math.max(parseInt(manualPortions, 10) || 0, 1);
    onChangePortions(n);
  };

  return (
    <div style={{ padding: "4px 0 8px" }}>
      {menu.notes && <div style={notesBar}>💬 Yönetici talimatı: <em>{menu.notes}</em></div>}

      {/* ÖZET */}
      <SectionTitle>📊 Özet</SectionTitle>
      <div style={summaryGrid}>
        {[
          { label: "Bütçe", value: `${menu.budget.toFixed(2)} TL`, color: "var(--accent)" },
          { label: "Toplam Harcanan", value: `${menu.total_cost.toFixed(2)} TL`, color: status.color },
          { label: "Kişi Başı", value: `${perPerson.toFixed(2)} TL`, color: "var(--text)" },
          { label: "Toplam Kalori (kişi)", value: `${menu.total_calories.toFixed(0)} kcal`, color: "var(--purple)" },
          { label: "Protein / Demir (kişi)", value: `${menu.total_protein.toFixed(0)}g / ${menu.total_iron.toFixed(1)}mg`, color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} style={summaryTile}>
            <div style={summaryTileLabel}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Kaç kişi / porsiyon — elle girilebilir + hızlı ön ayarlar; onaylı menüde bile değiştirilebilir */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px 10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>👥 Kaç kişi için:</span>
        <input
          type="text"
          inputMode="numeric"
          value={manualPortions}
          onChange={(e) => setManualPortions(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") applyManual(); }}
          onFocus={(e) => e.target.select()}
          style={{ ...input, width: 90 }}
        />
        <button onClick={applyManual} disabled={portionsSaving} style={btnPrimary}>Uygula</button>
        {studentCount ? (
          <button onClick={() => onChangePortions(studentCount)} disabled={portionsSaving} style={portions === studentCount ? portionChipActive : portionChip}>
            Öğrenci sayısı ({studentCount})
          </button>
        ) : null}
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          (şu an <strong>{portions}</strong> kişi{portionsSaving ? " · kaydediliyor…" : ""}) — Dashboard'a yansır
        </span>
      </div>

      {/* Bütçe çubuğu */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{ height: 8, borderRadius: 999, background: "var(--surface2)", overflow: "hidden", border: "1px solid var(--border2)" }}>
          <div style={{ width: `${Math.min(status.pct, 100)}%`, height: "100%", background: status.color, transition: "width .3s" }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: status.color, marginTop: 5 }}>
          {status.label} · bütçenin %{status.pct.toFixed(0)}'i kullanıldı
        </div>
      </div>

      {/* GÜNLÜK PLAN — onaylı menü de düzenlenebilir; değişiklikler Dashboard'a yansır */}
      <SectionTitle>🗓️ Günlük Plan {isApproved && <span style={{ fontWeight: 400, color: "var(--text3)" }}>(onaylı — düzenlemeler Dashboard'a yansır)</span>}</SectionTitle>
      <div style={dayGrid}>
        {DAYS_OF_WEEK.map((day) => (
          <DayCard
            key={day}
            day={day}
            dayItems={itemsByDay[day] || []}
            mealsByCategory={mealsByCategory}
            ingredientsById={ingredientsById}
            picker={getPicker(day)}
            onPickerField={setPickerField}
            onAddMeal={onAddMeal}
            onRemoveItem={onRemoveItem}
            onChangeItemPortions={onChangeItemPortions}
            readOnly={false}
          />
        ))}
      </div>

      {/* İŞLEMLER */}
      <SectionTitle>⚙️ İşlemler</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 18px 16px" }}>
        {!isApproved && <button onClick={onApprove} style={btnPrimary}>✓ Taslağı Onayla</button>}
        {isApproved && <span style={{ ...pill, borderColor: "var(--green)", color: "var(--green)", alignSelf: "center" }}>✓ Onaylandı</span>}
        <button onClick={onSeasonalRevisions} disabled={revisionsLoading} style={{ ...btnSecondary, borderColor: "var(--green)", color: "var(--green)" }}>
          {revisionsLoading ? "Analiz ediliyor..." : "🌿 Mevsimsel Revizyon Öner"}
        </button>
        <button onClick={onDelete} style={{ ...btnSm, color: "var(--red)" }}>🗑 Menüyü Sil</button>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ padding: "12px 18px 8px", fontSize: 12, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</div>;
}

function RevisionModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🌿 Mevsimsel Revizyon Önerileri</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
          Toplam tahmini tasarruf: <strong style={{ color: "var(--green)" }}>{data.total_estimated_savings.toFixed(2)} TL</strong>
          {" · "}Ortalama yerel oran: <strong style={{ color: "var(--accent)" }}>%{(data.average_local_ingredient_ratio * 100).toFixed(0)}</strong>
        </div>
        {data.revisions.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            Bu menü için geçerli bir mevsimsel revizyon önerisi bulunamadı.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.revisions.map((rev) => (
              <div key={rev.menu_item_id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{rev.day_of_week} — {rev.category}</div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "var(--red)", fontWeight: 600 }}>{rev.current_meal_name}</span>
                  <span style={{ color: "var(--text3)", margin: "0 6px" }}>→</span>
                  <span style={{ color: "var(--green)", fontWeight: 600 }}>{rev.suggested_meal_name}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {plainBadges(rev).map((b, i) => <span key={i} style={{ ...pill, borderColor: b.color, color: b.color }}>{b.text}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiMenuPlannerSuggestionPage() {
  const [ingredientsById, setIngredientsById] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [meals, setMeals] = useState([]);
  const [menus, setMenus] = useState([]);
  const [studentCount, setStudentCount] = useState(null);
  const [portionsTouched, setPortionsTouched] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Tek aktif menü/taslak (sekmelerin hemen altında önizlenir; listede "ortada açılmaz")
  const [active, setActive] = useState(null);
  const [lastDraftId, setLastDraftId] = useState(null); // create butonuyla üretilen son taslak

  const [createMode, setCreateMode] = useState("ai");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [weekStartDate, setWeekStartDate] = useState(nextMonday());
  const [budget, setBudget] = useState(1000);
  const [portionsInput, setPortionsInput] = useState(40);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [seasonalMode, setSeasonalMode] = useState(true);
  const [localPriority, setLocalPriority] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [portionsSaving, setPortionsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState({});
  const [seasonalRevisions, setSeasonalRevisions] = useState(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  const refreshMenus = () => getMenus().then(setMenus);

  useEffect(() => {
    getIngredients().then((list) => {
      setIngredients(list);
      setIngredientsById(Object.fromEntries(list.map((i) => [i.id, i])));
    });
    getMeals().then(setMeals);
    // Öğrenci sayısı: "kaç kişi" alanının otomatik varsayılanı (kullanıcı elle değiştirmediyse)
    getStudents().then((list) => {
      const n = Array.isArray(list) ? list.length : 0;
      setStudentCount(n);
      if (n > 0) {
        setPortionsInput((prev) => (portionsTouched ? prev : n));
      }
    });
    refreshMenus();
  }, []);

  const mealsByCategory = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
    meals.forEach((m) => { if (map[m.category]) map[m.category].push(m); });
    return map;
  }, [meals]);

  const seasonalInsights = useMemo(() => buildSeasonalInsights(ingredients, weekStartDate), [ingredients, weekStartDate]);

  const setActiveFresh = (menu) => {
    setActive(menu);
    setPicker({});
    setSeasonalRevisions(null);
  };

  // Yeni üretimden önce, create butonuyla üretilmiş önceki ONAYLANMAMIŞ taslağı sil (birikme yok)
  const dropPreviousDraft = async () => {
    if (lastDraftId) {
      try { await deleteMenu(lastDraftId); } catch { /* zaten yoksa geç */ }
      setLastDraftId(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await dropPreviousDraft();
      const seasonalParts = [];
      if (seasonalMode) seasonalParts.push(seasonalInstruction);
      if (localPriority) seasonalParts.push("Yerel üretici veya bölge bilgisi olan malzemeleri, maliyet ve besin dengesi uygunsa önceliklendir.");
      if (seasonalInsights.length > 0) seasonalParts.push(`Bu hafta fırsat olarak öne çıkan malzemeler: ${seasonalInsights.map((i) => i.name).join(", ")}.`);
      const combinedInstructions = [extraInstructions.trim(), ...seasonalParts].filter(Boolean).join("\n");
      const menu = await generateMenu({
        week_start_date: weekStartDate,
        budget: parseFloat(budget) || 0,
        portions: Number(portionsInput) || 40,
        extra_instructions: combinedInstructions || null,
      });
      setActiveFresh(menu);
      setLastDraftId(menu.id);
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
      await dropPreviousDraft();
      const menu = await createManualMenu({
        week_start_date: weekStartDate,
        budget: parseFloat(budget) || 0,
        portions: Number(portionsInput) || 40,
      });
      setActiveFresh(menu);
      setLastDraftId(menu.id);
      refreshMenus();
    } catch (e) {
      setError(e.response?.data?.detail || "Boş menü oluşturulamadı.");
    }
  };

  const handleApprove = async () => {
    if (!active) return;
    const updated = await approveMenu(active.id);
    setActive({ ...active, status: updated.status });
    if (active.id === lastDraftId) setLastDraftId(null); // artık kalıcı, atılmayacak
    refreshMenus();
  };

  // Listedeki (aşağıdaki) taslak satırından doğrudan onay
  const handleApproveById = async (id) => {
    await approveMenu(id);
    if (active && active.id === id) setActive({ ...active, status: "approved" });
    if (lastDraftId === id) setLastDraftId(null);
    refreshMenus();
  };

  const handleChangePortions = async (n) => {
    if (!active) return;
    setPortionsSaving(true);
    try {
      const updated = await updateMenuPortions(active.id, n);
      setActive(updated);
      refreshMenus();
    } finally {
      setPortionsSaving(false);
    }
  };

  const handleSeasonalRevisions = async () => {
    if (!active) return;
    setRevisionsLoading(true);
    try {
      setSeasonalRevisions(await getSeasonalRevisions(active.id));
    } catch {
      setSeasonalRevisions({ revisions: [], total_estimated_savings: 0, average_local_ingredient_ratio: 0, revision_count: 0, menu_id: active.id, week_start_date: active.week_start_date });
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteMenu(id);
    if (active && active.id === id) setActive(null);
    if (lastDraftId === id) setLastDraftId(null);
    refreshMenus();
  };

  const openFromList = async (id) => {
    if (active && active.id === id) { setActive(null); return; }
    setActiveFresh(await getMenu(id));
  };

  const getPicker = (day) => picker[day] || { category: CATEGORIES[0], meal_id: "" };
  const setPickerField = (day, field, value) => {
    const cur = getPicker(day);
    const next = { ...cur, [field]: value };
    if (field === "category") next.meal_id = "";
    setPicker({ ...picker, [day]: next });
  };

  const handleAddMeal = async (day) => {
    if (!active) return;
    const sel = getPicker(day);
    if (!sel.meal_id) return;
    const updated = await addMealItem(active.id, { day_of_week: day, category: sel.category, meal_id: Number(sel.meal_id) });
    setActive(updated);
    refreshMenus();
    setPickerField(day, "meal_id", "");
  };

  const handleRemoveItem = async (itemId) => {
    if (!active) return;
    const updated = await removeMenuItem(active.id, itemId);
    setActive(updated);
    refreshMenus();
  };

  const handleChangeItemPortions = async (itemId, n) => {
    if (!active) return;
    const updated = await updateMenuItemPortions(active.id, itemId, n);
    setActive(updated);
    refreshMenus();
  };

  const today = todayLocal();
  const currentMenus = useMemo(() => menus.filter((m) => m.week_start_date >= today).sort((a, b) => a.week_start_date.localeCompare(b.week_start_date)), [menus, today]);
  const pastMenus = useMemo(() => menus.filter((m) => m.week_start_date < today).sort((a, b) => b.week_start_date.localeCompare(a.week_start_date)), [menus, today]);

  const renderMenuTable = (list, emptyMsg) =>
    list.length === 0 ? (
      <div style={{ padding: 24, color: "var(--text3)", fontSize: 12 }}>{emptyMsg}</div>
    ) : (
      <div style={tableWrap}>
        <table style={menuTable}>
          <thead>
            <tr>{["Hafta", "Kişi", "Bütçe", "Harcanan", "Durum", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} style={active && active.id === m.id ? { background: "var(--accent-bg)" } : undefined}>
                <td style={td}>{m.week_start_date}</td>
                <td style={td}>{m.portions || 40}</td>
                <td style={td}>{m.budget.toFixed(0)} TL</td>
                <td style={td}>{m.total_cost.toFixed(0)} TL</td>
                <td style={td}>{m.status === "approved" ? "✓ Onaylandı" : "Taslak"}</td>
                <td style={td}>
                  <button onClick={() => openFromList(m.id)} style={btnSm}>{active && active.id === m.id ? "Kapat" : "Aç"}</button>{" "}
                  {m.status === "draft" && <button onClick={() => handleApproveById(m.id)} style={{ ...btnSm, color: "var(--green)" }}>Onayla</button>}{" "}
                  {m.status === "draft" && <button onClick={() => handleDelete(m.id)} style={{ ...btnSm, color: "var(--red)" }}>Sil</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>🤖 AI Destekli Menü Planlayıcı Öneri</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
          Sadeleştirilmiş arayüz denemesi — üretilen taslak hemen aşağıda çıkar, tıklayıp onaylarsın.
        </div>
      </div>

      <div style={stepper}>
        {["1) Hafta + bütçe + kişi seç", "2) AI üretsin ya da katalogdan seç", "3) Taslağı gün gün düzenle", "4) Onayla"].map((s, i) => <span key={i} style={stepChip}>{s}</span>)}
      </div>

      <div style={card}>
        {/* R1: mod sekmeleri */}
        <div style={tabRow}>
          <button onClick={() => setCreateMode("ai")} style={createMode === "ai" ? tabActive : tab}>🤖 AI'ya bıraktır</button>
          <button onClick={() => setCreateMode("manual")} style={createMode === "manual" ? tabActive : tab}>✍️ Kendim seçeyim</button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" }}>
            <div>
              <div style={fieldLabel}>Hafta Başlangıcı (Pazartesi)</div>
              <input type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} style={input} />
            </div>
            <div>
              <div style={fieldLabel}>Haftalık Bütçe (TL)</div>
              <input type="text" inputMode="decimal" value={budget}
                onFocus={(e) => { if (Number(budget) === 0) setBudget(""); e.target.select(); }}
                onBlur={() => { if (budget === "") setBudget(0); }}
                onChange={(e) => setBudget(numericValue(e.target.value))} style={input} />
            </div>
            <div>
              <div style={fieldLabel}>
                Kaç kişi / porsiyon
                {studentCount != null && (
                  <span style={{ color: "var(--text3)", fontWeight: 400 }}> · öğrenci sayısı: {studentCount}</span>
                )}
              </div>
              <input type="text" inputMode="numeric" value={portionsInput}
                onFocus={(e) => e.target.select()}
                onBlur={() => { if (portionsInput === "" || Number(portionsInput) < 1) setPortionsInput(studentCount || 40); }}
                onChange={(e) => { setPortionsTouched(true); setPortionsInput(intValue(e.target.value)); }}
                style={input} />
            </div>
            {createMode === "ai" ? (
              <button onClick={handleGenerate} disabled={generating} style={btnPrimary}>{generating ? "Oluşturuluyor..." : "✨ AI ile Taslak Üret"}</button>
            ) : (
              <button onClick={handleCreateManual} style={btnPrimary}>📋 Boş Taslak Oluştur</button>
            )}
          </div>

          {createMode === "ai" ? (
            <>
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setAdvancedOpen((v) => !v)} style={advancedToggle}>
                  {advancedOpen ? "▲" : "▼"} Gelişmiş (Mevsimsel &amp; Yerel) ayarlar
                </button>
                {advancedOpen && (
                  <div style={{ marginTop: 10 }}>
                    <div style={toggleGrid}>
                      <label style={toggleBox}>
                        <input type="checkbox" checked={seasonalMode} onChange={(e) => setSeasonalMode(e.target.checked)} />
                        <span><strong>Mevsimsel fırsatları önceliklendir</strong><small> Ucuz, stoklu ve mevsimindeki sebze-meyveleri AI talimatına ekler.</small></span>
                      </label>
                      <label style={toggleBox}>
                        <input type="checkbox" checked={localPriority} onChange={(e) => setLocalPriority(e.target.checked)} />
                        <span><strong>Yerel ürün kullanımını artır</strong><small> Malzeme kaydında yerel/bölge bilgisi varsa öne alır.</small></span>
                      </label>
                    </div>
                    {seasonalInsights.length > 0 && (
                      <div style={insightBox}>
                        <div style={insightTitle}>Bu Haftanın Fırsat Malzemeleri</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {seasonalInsights.map((ing) => (
                            <span key={ing.id} style={pill}>
                              {ing.name} · {Number(ing.stock || 0).toFixed(0)}{ing.unit} · {Number(ing.price || 0).toFixed(2)} TL
                              {ing.seasonal ? " · mevsimde" : ing.cheap ? " · uygun fiyat" : ing.local ? " · yerel" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={fieldLabel}>Ek Talimat (opsiyonel)</div>
                <textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)}
                  placeholder='Örn: "Az yağlı olsun", "Haftada en fazla 2 gün kırmızı et"' rows={2}
                  style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)" }}>
              Boş bir taslak oluşturulur; aşağıdaki önizlemede her gün için kategori seçip yemekleri elle eklersiniz.
            </div>
          )}
        </div>

        {error && <div style={{ padding: "0 18px 16px", fontSize: 12, color: "var(--red)" }}>{error}</div>}

        {/* Aktif taslak/menü — sekmelerin hemen altında, tek yerde */}
        {active && (
          <div style={{ borderTop: "2px solid var(--accent)", background: "var(--surface2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", flexWrap: "wrap", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                {active.status === "approved" ? "✓ Onaylı Menü" : "📝 Aktif Taslak"} · {active.week_start_date} haftası
              </div>
              <button onClick={() => setActive(null)} style={btnSm}>Kapat</button>
            </div>
            <MenuDetailPanel
              menu={active}
              ingredientsById={ingredientsById}
              mealsByCategory={mealsByCategory}
              studentCount={studentCount}
              getPicker={getPicker}
              setPickerField={setPickerField}
              onAddMeal={handleAddMeal}
              onRemoveItem={handleRemoveItem}
              onChangeItemPortions={handleChangeItemPortions}
              onApprove={handleApprove}
              onDelete={() => handleDelete(active.id)}
              onSeasonalRevisions={handleSeasonalRevisions}
              onChangePortions={handleChangePortions}
              portionsSaving={portionsSaving}
              revisionsLoading={revisionsLoading}
            />
          </div>
        )}
      </div>

      <div style={card}>
        <div style={cardHd}>📆 Güncel Menüler <span style={{ fontWeight: 400, color: "var(--text3)" }}>(bugün ve sonrası — açmak için "Aç")</span></div>
        {renderMenuTable(currentMenus, "Güncel bir menü yok.")}
      </div>

      <div style={card}>
        <div style={{ ...cardHd, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowPast(!showPast)}>
          <span>🗄️ Geçmiş Menüler <span style={{ fontWeight: 400, color: "var(--text3)" }}>({pastMenus.length})</span></span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{showPast ? "▲ Gizle" : "▼ Göster"}</span>
        </div>
        {showPast && renderMenuTable(pastMenus, "Geçmiş menü yok.")}
      </div>

      <RevisionModal data={seasonalRevisions} onClose={() => setSeasonalRevisions(null)} />
    </div>
  );
}

// ─── Stiller ───
const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const inputXs = { width: "100%", background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 6, padding: "5px 6px", fontSize: 10, color: "var(--text)", outline: "none" };

const stepper = { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 };
const stepChip = { fontSize: 11, color: "var(--text2)", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 999, padding: "5px 12px" };

const tabRow = { display: "flex", gap: 6, padding: "10px 12px 0", borderBottom: "1px solid var(--border)" };
const tab = { background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "var(--text2)", padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" };
const tabActive = { ...tab, color: "var(--accent)", borderBottomColor: "var(--accent)", fontWeight: 700 };

const advancedToggle = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" };

const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 12, padding: "0 18px 12px" };
const summaryTile = { background: "var(--surface)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" };
const summaryTileLabel = { fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 };

const portionChip = { background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--text2)", borderRadius: 999, padding: "4px 12px", fontSize: 12, cursor: "pointer" };
const portionChipActive = { ...portionChip, background: "var(--accent)", borderColor: "var(--accent)", color: "#fff", fontWeight: 700 };

const dayGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 10, padding: "0 18px 12px", maxWidth: "100%" };
const dayCard = { minWidth: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--surface)" };
const dayCardHd = { background: "var(--surface2)", padding: "8px 10px", fontSize: 11, fontWeight: 700 };
const dayCardFoot = { padding: 8, borderTop: "1px solid var(--border)", background: "var(--surface2)" };
const mealChip = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 11, background: "var(--surface2)", borderRadius: 6, padding: "4px 7px", marginBottom: 4 };

const notesBar = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", background: "var(--surface)", borderBottom: "1px solid var(--border)" };

const tableWrap = { width: "100%", maxWidth: "100%", overflowX: "auto" };
const menuTable = { width: "100%", minWidth: 620, borderCollapse: "collapse", tableLayout: "fixed" };
const toggleGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 };
const toggleBox = { display: "flex", gap: 9, alignItems: "flex-start", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text2)", cursor: "pointer" };
const insightBox = { background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px" };
const insightTitle = { fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 7 };
const pill = { display: "inline-flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 8px", fontSize: 10, color: "var(--text2)" };
const th = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const btnSecondary = { background: "var(--surface2)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const btnSm = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const btnX = { background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 11, padding: "0 2px" };

const overlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 };
const modal = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "0 20px 60px rgba(0,0,0,.35)", padding: 20, width: "min(600px, 92vw)", maxHeight: "82vh", overflowY: "auto" };
