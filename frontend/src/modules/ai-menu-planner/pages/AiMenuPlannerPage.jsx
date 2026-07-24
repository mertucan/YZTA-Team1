import { Fragment, useEffect, useMemo, useState } from "react";
import {
  getMenus,
  getMenu,
  generateMenu,
  createManualMenu,
  updateMenuPortions,
  addMealItem,
  removeMenuItem,
  approveMenu,
  deleteMenu,
  getSeasonalRevisions,
} from "../api/aiMenuPlanner";
import { getIngredients } from "../../../api/ingredients";
import { getMeals } from "../../../api/meals";
import { formatLocalDate, todayLocal } from "../../../utils/date";

const DAYS_OF_WEEK = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const CATEGORIES = [
  "Çorba",
  "Ana Yemek",
  "Ara Sıcak",
  "Tahıl (Pilav/Makarna)",
  "Yoğurt/Salata",
  "Tatlı/Meyve",
];

const SEASONAL_MONTHS_BY_NAME = [
  {
    keys: [
      "domates",
      "salatalik",
      "salatalık",
      "biber",
      "patlican",
      "patlıcan",
      "kabak",
      "fasulye",
      "karpuz",
      "kavun",
    ],
    months: [6, 7, 8, 9],
  },
  {
    keys: [
      "ispanak",
      "pirasa",
      "pırasa",
      "lahana",
      "kereviz",
      "brokoli",
      "karnabahar",
      "turp",
    ],
    months: [11, 12, 1, 2, 3],
  },
  {
    keys: ["bezelye", "enginar", "bakla", "cilek", "çilek", "marul"],
    months: [3, 4, 5],
  },
  {
    keys: ["havuç", "havuc", "patates", "sogan", "soğan", "elma"],
    months: [1, 2, 3, 4, 9, 10, 11, 12],
  },
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

function normalizeText(value) {
  return String(value || "").toLocaleLowerCase("tr-TR");
}

function isIngredientSeasonal(ingredient, month) {
  if (Array.isArray(ingredient.season_months))
    return ingredient.season_months.includes(month);
  if (ingredient.season_start_month && ingredient.season_end_month) {
    const start = Number(ingredient.season_start_month);
    const end = Number(ingredient.season_end_month);
    return start <= end
      ? month >= start && month <= end
      : month >= start || month <= end;
  }
  const name = normalizeText(ingredient.name);
  const match = SEASONAL_MONTHS_BY_NAME.find((item) =>
    item.keys.some((key) => name.includes(key)),
  );
  return match ? match.months.includes(month) : false;
}

function buildSeasonalInsights(ingredients, weekStartDate) {
  const month = new Date(`${weekStartDate}T00:00:00`).getMonth() + 1;
  const priced = ingredients.filter((i) => Number(i.price) > 0);
  const avgPrice = priced.length
    ? priced.reduce((sum, i) => sum + Number(i.price || 0), 0) / priced.length
    : 0;

  return ingredients
    .map((ingredient) => {
      const price = Number(ingredient.price || 0);
      const stock = Number(ingredient.stock || 0);
      const seasonal = isIngredientSeasonal(ingredient, month);
      const local = Boolean(
        ingredient.is_local || ingredient.local || ingredient.origin_region,
      );
      const cheap = avgPrice > 0 && price > 0 && price <= avgPrice * 0.85;
      const abundant = stock >= 10;
      const score =
        (seasonal ? 3 : 0) +
        (local ? 2 : 0) +
        (cheap ? 2 : 0) +
        (abundant ? 1 : 0);
      return { ...ingredient, seasonal, local, cheap, abundant, score };
    })
    .filter((ingredient) => ingredient.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || Number(b.stock || 0) - Number(a.stock || 0),
    )
    .slice(0, 6);
}

function MenuDetailPanel({
  menu,
  ingredientsById,
  mealsByCategory,
  seasonalInsights,
  getPicker,
  setPickerField,
  onAddMeal,
  onRemoveItem,
  onApprove,
  onUpdatePortions,
  onDelete,
  onSeasonalRevisions,
  seasonalRevisions,
  revisionsLoading,
}) {
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
        <div
          style={{
            padding: "10px 18px",
            fontSize: 12,
            color: "var(--text2)",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          Yönetici talimatı: <em>{menu.notes}</em>
        </div>
      )}

      <div style={summaryGrid}>
        {[
          {
            label: "Harcanan",
            value: `${menu.total_cost.toFixed(2)} TL`,
            color: status.color,
          },
          {
            label: "Bütçe",
            value: `${menu.budget.toFixed(2)} TL`,
            color: "var(--accent)",
          },
          {
            label: "Kalan Bütçe",
            value: `${(menu.budget - menu.total_cost).toFixed(2)} TL`,
            color:
              menu.budget - menu.total_cost < 0 ? "var(--red)" : "var(--green)",
          },
          {
            label: "Kişi Başı Maliyet",
            value: `${(menu.total_cost / Math.max(menu.portions || 1, 1)).toFixed(2)} TL`,
            color: "var(--accent)",
          },
          {
            label: "Toplam Kalori",
            value: `${menu.total_calories.toFixed(0)} kcal`,
            color: "var(--purple)",
          },
          {
            label: "Protein / Demir",
            value: `${menu.total_protein.toFixed(0)}g / ${menu.total_iron.toFixed(1)}mg`,
            color: "var(--green)",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              borderRadius: 8,
              padding: "12px 14px",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: s.color,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "0 18px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>
          {status.label}
        </span>
        {onUpdatePortions && (
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--text2)",
            }}
          >
            Kişi Sayısı:
            <input
              type="number"
              min={1}
              defaultValue={menu.portions || 40}
              key={menu.portions}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => {
                const v = Math.max(parseInt(e.target.value, 10) || 1, 1);
                if (v !== menu.portions) onUpdatePortions(v);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
              disabled={menu.status === "approved"}
              title={menu.status === "approved" ? "Onaylı menü değiştirilemez" : "Kişi sayısını değiştir — maliyet yeniden hesaplanır"}
              style={{ ...input, width: 90, padding: "5px 8px" }}
            />
          </label>
        )}
      </div>

      {(seasonalInsights || []).length > 0 && (
        <div style={insightGrid}>
          <div style={insightBox}>
            <div style={insightTitle}>Mevsimsel Fırsatlar</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {seasonalInsights.slice(0, 5).map((ingredient) => (
                <span key={ingredient.id} style={pill}>
                  {ingredient.name}{" "}
                  {ingredient.cheap
                    ? "· uygun fiyat"
                    : ingredient.seasonal
                      ? "· mevsimde"
                      : "· stoklu"}
                </span>
              ))}
            </div>
          </div>
          <div style={insightBox}>
            <div style={insightTitle}>Revizyon Notu</div>
            <div
              style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.45 }}
            >
              AI üretiminde bu malzemeler ucuzluk, stok ve yerellik sinyali
              olarak öne alınır; mevcut taslakta aynı kategoriden daha ekonomik
              alternatif seçimi için kullanılabilir.
            </div>
          </div>
        </div>
      )}

      <div style={dayGrid}>
        {DAYS_OF_WEEK.map((day) => {
          const dayItems = itemsByDay[day] || [];
          const aiItems = dayItems.filter((it) => it.ingredient_id);
          const mealItems = dayItems.filter(
            (it) => it.meal_id || it.source === "PARTNER_PRODUCT" || it.partner_product_integration_id,
          );
          const sel = getPicker(day);
          return (
            <div key={day} style={dayCard}>
              <div
                style={{
                  background: "var(--surface2)",
                  padding: "8px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {day}
              </div>
              <div style={{ padding: 10, flex: 1 }}>
                {aiItems.length > 0 && (
                  <>
                    <div
                      style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}
                    >
                      {aiItems[0].meal_name}
                    </div>
                    {aiItems.map((item) => {
                      const ing = ingredientsById[item.ingredient_id];
                      return (
                        <div
                          key={item.id}
                          style={{
                            fontSize: 11,
                            color: "var(--text2)",
                            marginBottom: 2,
                          }}
                        >
                          {ing?.name || `#${item.ingredient_id}`} —{" "}
                          {item.quantity}
                          {ing?.unit || ""}
                        </div>
                      );
                    })}
                  </>
                )}

                {mealItems.length === 0 && aiItems.length === 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      marginBottom: 6,
                    }}
                  >
                    —
                  </div>
                )}

                {mealItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      background: "var(--surface2)",
                      borderRadius: 6,
                      padding: "4px 7px",
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.meal_name}</div>
                      <div style={{ color: "var(--text3)", fontSize: 10 }}>
                        {item.source === "PARTNER_PRODUCT" || item.partner_product_integration_id
                          ? "Partner ürün"
                          : item.category} · {item.calories} kcal
                      </div>
                    </div>
                    <button onClick={() => onRemoveItem(item.id)} style={btnX}>
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: 8,
                  borderTop: "1px solid var(--border)",
                  background: "var(--surface2)",
                }}
              >
                <select
                  value={sel.category}
                  onChange={(e) =>
                    setPickerField(day, "category", e.target.value)
                  }
                  style={inputXs}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={sel.meal_id}
                  onChange={(e) =>
                    setPickerField(day, "meal_id", e.target.value)
                  }
                  style={{ ...inputXs, marginTop: 4 }}
                >
                  <option value="">Yemek seçin...</option>
                  {(mealsByCategory[sel.category] || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onAddMeal(day)}
                  disabled={!sel.meal_id}
                  style={{ ...btnSm, width: "100%", marginTop: 4 }}
                >
                  + Ekle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "0 18px 18px",
        }}
      >
        {menu.status !== "approved" && (
          <button onClick={onApprove} style={btnSm}>
            Onayla
          </button>
        )}
        <button
          onClick={onSeasonalRevisions}
          disabled={revisionsLoading}
          style={{
            ...btnSm,
            borderColor: "var(--green)",
            color: "var(--green)",
          }}
        >
          {revisionsLoading
            ? "Analiz ediliyor..."
            : "Mevsimsel Revizyon Öner"}
        </button>
        {menu.status === "draft" && (
          <button onClick={onDelete} style={{ ...btnSm, color: "var(--red)" }}>
            Menüyü Sil
          </button>
        )}
      </div>

      {seasonalRevisions && (
        <div style={{ padding: "0 18px 18px" }}>
          <div style={insightBox}>
            <div
              style={{
                ...insightTitle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span>Mevsimsel Revizyon Önerileri</span>
              <span
                style={{ fontWeight: 400, fontSize: 11, color: "var(--text2)" }}
              >
                Toplam tasarruf:{" "}
                <strong style={{ color: "var(--green)" }}>
                  {seasonalRevisions.total_estimated_savings.toFixed(2)} TL
                </strong>
                {" · "}Ortalama yerel oran:{" "}
                <strong style={{ color: "var(--accent)" }}>
                  %
                  {(
                    seasonalRevisions.average_local_ingredient_ratio * 100
                  ).toFixed(0)}
                </strong>
              </span>
            </div>
            {seasonalRevisions.revisions.length === 0 ? (
              <div
                style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}
              >
                Bu menü için geçerli bir mevsimsel revizyon önerisi bulunamadı.
                Malzeme deposuna mevsim ve yerellik bilgisi eklenirse öneri
                kalitesi artar.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {seasonalRevisions.revisions.map((rev) => (
                  <div
                    key={rev.menu_item_id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginBottom: 4,
                      }}
                    >
                      {rev.day_of_week} — {rev.category}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>
                        {rev.current_meal_name}
                      </span>
                      <span style={{ color: "var(--text3)", margin: "0 6px" }}>
                        yerine
                      </span>
                      <span style={{ color: "var(--green)", fontWeight: 600 }}>
                        {rev.suggested_meal_name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        marginBottom: 5,
                      }}
                    >
                      {rev.estimated_savings > 0 && (
                        <span
                          style={{
                            ...pill,
                            borderColor: "var(--green)",
                            color: "var(--green)",
                          }}
                        >
                          {rev.estimated_savings.toFixed(2)} TL
                          tasarruf/porsiyon
                        </span>
                      )}
                      {rev.local_ingredient_ratio > 0 && (
                        <span
                          style={{
                            ...pill,
                            borderColor: "var(--accent)",
                            color: "var(--accent)",
                          }}
                        >
                          %{(rev.local_ingredient_ratio * 100).toFixed(0)}{" "}
                          yerel
                        </span>
                      )}
                      {rev.seasonal_score > 0 && (
                        <span
                          style={{
                            ...pill,
                            borderColor: "#16a34a",
                            color: "#16a34a",
                          }}
                        >
                          %{(rev.seasonal_score * 100).toFixed(0)} mevsimsel
                        </span>
                      )}
                      {rev.price_advantage_score > 0 && (
                        <span
                          style={{
                            ...pill,
                            borderColor: "var(--amber)",
                            color: "var(--amber)",
                          }}
                        >
                          %{(rev.price_advantage_score * 100).toFixed(0)}{" "}
                          fiyat avantajı
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>
                      {rev.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiMenuPlannerPage() {
  const [ingredientsById, setIngredientsById] = useState({});
  const [meals, setMeals] = useState([]);
  const [menus, setMenus] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(nextMonday());
  const [budget, setBudget] = useState(1000);
  const [portions, setPortions] = useState(40);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [seasonalMode, setSeasonalMode] = useState(true);
  const [localPriority, setLocalPriority] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [seasonalRevisions, setSeasonalRevisions] = useState(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  const refreshMenus = () => getMenus().then(setMenus);

  useEffect(() => {
    getIngredients().then((list) => {
      setIngredients(list);
      setIngredientsById(Object.fromEntries(list.map((i) => [i.id, i])));
    });
    getMeals().then(setMeals);
    refreshMenus();
  }, []);

  const mealsByCategory = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
    meals.forEach((m) => {
      if (map[m.category]) map[m.category].push(m);
    });
    return map;
  }, [meals]);

  const seasonalInsights = useMemo(
    () => buildSeasonalInsights(ingredients, weekStartDate),
    [ingredients, weekStartDate],
  );

  const openMenu = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      setSeasonalRevisions(null);
      return;
    }
    setPicker({});
    setSeasonalRevisions(null);
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
      const seasonalParts = [];
      if (seasonalMode) seasonalParts.push(seasonalInstruction);
      if (localPriority)
        seasonalParts.push(
          "Yerel üretici veya bölge bilgisi olan malzemeleri, maliyet ve besin dengesi uygunsa önceliklendir.",
        );
      if (seasonalInsights.length > 0) {
        seasonalParts.push(
          `Bu hafta fırsat olarak öne çıkan malzemeler: ${seasonalInsights.map((i) => i.name).join(", ")}.`,
        );
      }
      const combinedInstructions = [extraInstructions.trim(), ...seasonalParts]
        .filter(Boolean)
        .join("\n");
      const menu = await generateMenu({
        week_start_date: weekStartDate,
        budget: parseFloat(budget) || 0,
        portions: Math.max(parseInt(portions, 10) || 1, 1),
        extra_instructions: combinedInstructions || null,
      });
      setPicker({});
      setExpandedId(menu.id);
      setExpandedDetail(menu);
      refreshMenus();
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Menü oluşturulamadı. GEMINI_API_KEY tanımlı mı kontrol edin.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManual = async () => {
    setError(null);
    try {
      const menu = await createManualMenu({
        week_start_date: weekStartDate,
        budget: parseFloat(budget) || 0,
        portions: Math.max(parseInt(portions, 10) || 1, 1),
      });
      setPicker({});
      setExpandedId(menu.id);
      setExpandedDetail(menu);
      refreshMenus();
    } catch (e) {
      setError(e.response?.data?.detail || "Boş menü oluşturulamadı.");
    }
  };

  const handleUpdatePortions = async (newPortions) => {
    if (!expandedDetail) return;
    const p = Math.max(parseInt(newPortions, 10) || 1, 1);
    const updated = await updateMenuPortions(expandedDetail.id, p);
    setExpandedDetail(updated);
    refreshMenus();
  };

  const handleApprove = async () => {
    if (!expandedDetail) return;
    const updated = await approveMenu(expandedDetail.id);
    setExpandedDetail({ ...expandedDetail, status: updated.status });
    refreshMenus();
  };

  const handleSeasonalRevisions = async () => {
    if (!expandedDetail) return;
    setRevisionsLoading(true);
    try {
      const data = await getSeasonalRevisions(expandedDetail.id);
      setSeasonalRevisions(data);
    } catch (e) {
      setSeasonalRevisions({
        revisions: [],
        total_estimated_savings: 0,
        average_local_ingredient_ratio: 0,
        revision_count: 0,
        menu_id: expandedDetail.id,
        week_start_date: expandedDetail.week_start_date,
      });
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteMenu(id);
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
    }
    refreshMenus();
  };

  const getPicker = (day) =>
    picker[day] || { category: CATEGORIES[0], meal_id: "" };
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
    await addMealItem(expandedDetail.id, {
      day_of_week: day,
      category: sel.category,
      meal_id: Number(sel.meal_id),
    });
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
    () =>
      menus
        .filter((m) => m.week_start_date >= today)
        .sort((a, b) => a.week_start_date.localeCompare(b.week_start_date)),
    [menus],
  );
  const pastMenus = useMemo(
    () =>
      menus
        .filter((m) => m.week_start_date < today)
        .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date)),
    [menus],
  );

  const renderMenuTable = (list, emptyMsg) =>
    list.length === 0 ? (
      <div style={{ padding: 24, color: "var(--text3)", fontSize: 12 }}>
        {emptyMsg}
      </div>
    ) : (
      <div style={tableWrap}>
        <table style={menuTable}>
          <thead>
            <tr>
              {["Hafta", "Bütçe", "Harcanan", "Kalan", "Durum", ""].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
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
                    <td
                      style={{
                        ...td,
                        fontWeight: 600,
                        color: remaining < 0 ? "var(--red)" : "var(--green)",
                      }}
                    >
                      {remaining.toFixed(2)} TL
                    </td>
                    <td style={td}>
                      {m.status === "approved" ? "Onaylandı" : "Taslak"}
                    </td>
                    <td style={td}>
                      <button onClick={() => openMenu(m.id)} style={btnSm}>
                        {isOpen ? "Kapat" : "Görüntüle"}
                      </button>{" "}
                      {m.status === "draft" && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          style={{ ...btnSm, color: "var(--red)" }}
                        >
                          Sil
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && expandedDetail && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 0,
                          borderBottom: "1px solid var(--border)",
                          background: "var(--surface2)",
                        }}
                      >
                        <MenuDetailPanel
                          menu={expandedDetail}
                          ingredientsById={ingredientsById}
                          mealsByCategory={mealsByCategory}
                          seasonalInsights={seasonalInsights}
                          getPicker={getPicker}
                          setPickerField={setPickerField}
                          onAddMeal={handleAddMeal}
                          onRemoveItem={handleRemoveItem}
                          onApprove={handleApprove}
                          onUpdatePortions={handleUpdatePortions}
                          onDelete={() => handleDelete(m.id)}
                          onSeasonalRevisions={handleSeasonalRevisions}
                          seasonalRevisions={seasonalRevisions}
                          revisionsLoading={revisionsLoading}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <div style={eyebrow}>Operasyon Paneli</div>
          <div style={pageTitle}>AI Destekli Menü Planlayıcı</div>
        </div>
        <div style={pageSubtitle}>
          Depodaki mevcut malzemelerle, Pazartesi'den Pazar'a her gün her
          kategoriden bir yemek önerir — ya da Yemek Kategorisi kataloğundan gün
          ve kategori bazında elle seçim yapın
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>Yeni Haftalık Menü Oluştur</div>
        <div style={formGrid}>
          <div>
            <div style={fieldLabel}>Hafta Başlangıcı (Pazartesi)</div>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              style={input}
            />
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
          <div>
            <div style={fieldLabel}>Kişi Sayısı (Porsiyon)</div>
            <input
              type="number"
              min={1}
              value={portions}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPortions(e.target.value)}
              onBlur={() => { if (!portions || Number(portions) < 1) setPortions(1); }}
              style={input}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={btnPrimary}
          >
            {generating ? "Oluşturuluyor..." : "AI ile Oluştur"}
          </button>
          <button onClick={handleCreateManual} style={btnSecondary}>
            Boş Menü Oluştur (Katalogdan Seç)
          </button>
        </div>
        <div style={{ padding: "0 18px 18px" }}>
          <div style={toggleGrid}>
            <label style={toggleBox}>
              <input
                type="checkbox"
                checked={seasonalMode}
                onChange={(e) => setSeasonalMode(e.target.checked)}
              />
              <span>
                <strong>Mevsimsel fırsatları önceliklendir</strong>
                <small>
                  {" "}
                  Ucuz, stoklu ve mevsimindeki sebze-meyveleri AI talimatına
                  ekler.
                </small>
              </span>
            </label>
            <label style={toggleBox}>
              <input
                type="checkbox"
                checked={localPriority}
                onChange={(e) => setLocalPriority(e.target.checked)}
              />
              <span>
                <strong>Yerel ürün kullanımını artır</strong>
                <small>
                  {" "}
                  Malzeme kaydında yerel/bölge bilgisi varsa revizyonda öne
                  alır.
                </small>
              </span>
            </label>
          </div>
          {seasonalInsights.length > 0 && (
            <div style={{ ...insightBox, marginBottom: 12 }}>
              <div style={insightTitle}>
                Bu Haftanın Otomatik Fırsat Analizi
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {seasonalInsights.map((ingredient) => (
                  <span key={ingredient.id} style={pill}>
                    {ingredient.name} ·{" "}
                    {Number(ingredient.stock || 0).toFixed(0)}
                    {ingredient.unit} ·{" "}
                    {Number(ingredient.price || 0).toFixed(2)} TL
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={fieldLabel}>
            Ek Talimat (opsiyonel) — yalnızca AI üretimi için
          </div>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder='Örn: "Az yağlı olsun", "Haftada en fazla 2 gün kırmızı et", "Vejetaryen ağırlıklı olsun"'
            rows={2}
            style={{ ...input, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
        {error && (
          <div
            style={{
              padding: "0 18px 16px",
              fontSize: 12,
              color: "var(--red)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={cardHd}>
          Güncel Menüler{" "}
          <span style={{ fontWeight: 400, color: "var(--text3)" }}>
            (bugün ve sonraki günler, sırayla)
          </span>
        </div>
        {renderMenuTable(currentMenus, "Güncel bir menü yok.")}
      </div>

      <div style={card}>
        <div
          style={{
            ...cardHd,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => setShowPast(!showPast)}
        >
          <span>
            Geçmiş Menüler{" "}
            <span style={{ fontWeight: 400, color: "var(--text3)" }}>
              ({pastMenus.length})
            </span>
          </span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            {showPast ? "▲ Gizle" : "▼ Göster"}
          </span>
        </div>
        {showPast && renderMenuTable(pastMenus, "Geçmiş menü yok.")}
      </div>
    </div>
  );
}

const card = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow)",
  marginBottom: 16,
};
const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 16,
  marginBottom: 20,
};
const eyebrow = {
  color: "var(--ingredients-accent)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  marginBottom: 4,
};
const pageTitle = {
  color: "var(--ingredients-text)",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 30,
  lineHeight: 1.05,
  fontWeight: 700,
};
const pageSubtitle = {
  color: "var(--ingredients-muted)",
  fontSize: 13,
  fontWeight: 700,
  paddingBottom: 3,
  textAlign: "right",
  maxWidth: 640,
};
const cardHd = {
  padding: "14px 18px 12px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  fontWeight: 600,
};
const fieldLabel = {
  fontSize: 11,
  color: "var(--text2)",
  marginBottom: 5,
  fontWeight: 500,
};
const input = {
  width: "100%",
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  borderRadius: 7,
  padding: "7px 12px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
};
const inputXs = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border2)",
  borderRadius: 6,
  padding: "5px 6px",
  fontSize: 10,
  color: "var(--text)",
  outline: "none",
};
const formGrid = {
  padding: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  alignItems: "end",
};
const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
  gap: 14,
  padding: 18,
};
const insightGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  padding: "0 18px 18px",
};
const dayGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: 10,
  padding: "0 18px 18px",
  maxWidth: "100%",
};
const dayCard = {
  minWidth: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  background: "var(--surface)",
};
const tableWrap = { width: "100%", maxWidth: "100%", overflowX: "auto" };
const menuTable = {
  width: "100%",
  minWidth: 680,
  borderCollapse: "collapse",
  tableLayout: "fixed",
};
const toggleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginBottom: 12,
};
const toggleBox = {
  display: "flex",
  gap: 9,
  alignItems: "flex-start",
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  color: "var(--text2)",
  cursor: "pointer",
};
const insightBox = {
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  borderRadius: 8,
  padding: "10px 12px",
};
const insightTitle = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: 7,
};
const pill = {
  display: "inline-flex",
  alignItems: "center",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 10,
  color: "var(--text2)",
};
const th = {
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--text3)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  padding: "10px 18px",
  borderBottom: "1px solid var(--border)",
};
const td = {
  padding: "10px 18px",
  fontSize: 12,
  color: "var(--text2)",
  borderBottom: "1px solid var(--border)",
};
const btnPrimary = {
  background: "var(--accent)",
  border: "none",
  color: "#fff",
  padding: "8px 18px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const btnSecondary = {
  background: "var(--surface2)",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  padding: "8px 18px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const btnSm = {
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  color: "var(--text2)",
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
};
const btnX = {
  background: "none",
  border: "none",
  color: "var(--red)",
  cursor: "pointer",
  fontSize: 11,
  padding: "0 2px",
};
