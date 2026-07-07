import { useEffect, useMemo, useState } from "react";
import { getMenus, getMenu, generateMenu, approveMenu } from "../api/aiMenuPlanner";
import { getIngredients } from "../../../api/ingredients";

const DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

const nextMonday = () => {
  const d = new Date();
  const diff = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

const budgetStatus = (totalCost, budget) => {
  const pct = budget ? (totalCost / budget) * 100 : 0;
  if (pct > 100) return { color: "var(--red)", label: "Bütçe Aşıldı" };
  if (pct > 85) return { color: "var(--amber)", label: "Bütçeye Yakın" };
  return { color: "var(--green)", label: "Bütçe İçinde" };
};

export default function AiMenuPlannerPage() {
  const [ingredientsById, setIngredientsById] = useState({});
  const [menus, setMenus]           = useState([]);
  const [current, setCurrent]       = useState(null);
  const [weekStartDate, setWeekStartDate] = useState(nextMonday());
  const [budget, setBudget]         = useState(1000);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState(null);

  const refreshMenus = () => getMenus().then(setMenus);

  useEffect(() => {
    getIngredients().then((list) => {
      setIngredientsById(Object.fromEntries(list.map((i) => [i.id, i])));
    });
    refreshMenus();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const menu = await generateMenu({
        week_start_date: weekStartDate,
        budget: parseFloat(budget) || 0,
        extra_instructions: extraInstructions.trim() || null,
      });
      setCurrent(menu);
      refreshMenus();
    } catch (e) {
      setError(e.response?.data?.detail || "Menü oluşturulamadı. GEMINI_API_KEY tanımlı mı kontrol edin.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!current) return;
    const updated = await approveMenu(current.id);
    setCurrent({ ...current, status: updated.status });
    refreshMenus();
  };

  const itemsByDay = useMemo(() => {
    if (!current) return {};
    return current.items.reduce((acc, item) => {
      (acc[item.day_of_week] ??= []).push(item);
      return acc;
    }, {});
  }, [current]);

  const status = current ? budgetStatus(current.total_cost, current.budget) : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>🤖 AI Menü Planlayıcı</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
          Gemini + RAG (stoktaki malzeme/fiyat/besin verisi) ile bütçeye göre haftalık menü üretimi
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>📅 Yeni Haftalık Menü Oluştur</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={fieldLabel}>Hafta Başlangıcı (Pazartesi)</div>
            <input type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>Haftalık Bütçe (TL)</div>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} style={input} />
          </div>
          <button onClick={handleGenerate} disabled={generating} style={btnPrimary}>
            {generating ? "Oluşturuluyor..." : "✨ AI ile Oluştur"}
          </button>
        </div>
        <div style={{ padding: "0 18px 18px" }}>
          <div style={fieldLabel}>Ek Talimat (opsiyonel) — AI'ı yönlendirmek için</div>
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

      {current && (
        <div style={card}>
          <div style={{ ...cardHd, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>🗓️ {current.week_start_date} Haftası {current.status === "approved" ? "· ✓ Onaylandı" : "· Taslak"}</span>
            {current.status !== "approved" && (
              <button onClick={handleApprove} style={btnSm}>Onayla</button>
            )}
          </div>
          {current.notes && (
            <div style={{ padding: "10px 18px", fontSize: 12, color: "var(--text2)", background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
              💬 Yönetici talimatı: <em>{current.notes}</em>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, padding: 18 }}>
            {[
              { label: "Harcanan",        value: `${current.total_cost.toFixed(2)} TL`, color: status.color },
              { label: "Bütçe",           value: `${current.budget.toFixed(2)} TL`,     color: "var(--accent)" },
              { label: "Kalan Bütçe",     value: `${(current.budget - current.total_cost).toFixed(2)} TL`, color: current.budget - current.total_cost < 0 ? "var(--red)" : "var(--green)" },
              { label: "Toplam Kalori",   value: `${current.total_calories.toFixed(0)} kcal`, color: "var(--purple)" },
              { label: "Protein / Demir", value: `${current.total_protein.toFixed(0)}g / ${current.total_iron.toFixed(1)}mg`, color: "var(--green)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 18px 14px", fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${DAYS_OF_WEEK.length}, 1fr)`, gap: 10, padding: "0 18px 18px" }}>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: "var(--surface2)", padding: "8px 10px", fontSize: 11, fontWeight: 700 }}>{day}</div>
                <div style={{ padding: 10 }}>
                  {(itemsByDay[day] || []).length === 0
                    ? <div style={{ fontSize: 11, color: "var(--text3)" }}>—</div>
                    : (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{itemsByDay[day][0].meal_name}</div>
                        {itemsByDay[day].map((item) => {
                          const ing = ingredientsById[item.ingredient_id];
                          return (
                            <div key={item.id} style={{ fontSize: 11, color: "var(--text2)", marginBottom: 2 }}>
                              {ing?.name || `#${item.ingredient_id}`} — {item.quantity}{ing?.unit || ""}
                            </div>
                          );
                        })}
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <div style={cardHd}>📜 Geçmiş Menüler</div>
        {menus.length === 0 ? (
          <div style={{ padding: 24, color: "var(--text3)", fontSize: 12 }}>Henüz oluşturulmuş menü yok.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Hafta", "Bütçe", "Harcanan", "Kalan", "Durum", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {menus.map((m) => {
                const remaining = m.budget - m.total_cost;
                return (
                <tr key={m.id}>
                  <td style={td}>{m.week_start_date}</td>
                  <td style={td}>{m.budget.toFixed(2)} TL</td>
                  <td style={td}>{m.total_cost.toFixed(2)} TL</td>
                  <td style={{ ...td, fontWeight: 600, color: remaining < 0 ? "var(--red)" : "var(--green)" }}>{remaining.toFixed(2)} TL</td>
                  <td style={td}>{m.status === "approved" ? "✓ Onaylandı" : "Taslak"}</td>
                  <td style={td}>
                    <button onClick={() => getMenu(m.id).then(setCurrent)} style={btnSm}>
                      Görüntüle
                    </button>
                  </td>
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
