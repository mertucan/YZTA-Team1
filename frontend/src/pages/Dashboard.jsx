import { useEffect, useMemo, useRef, useState } from "react";
import { getDashboardStats } from "../api/dashboard";
import { getMenus, getMenu } from "../modules/ai-menu-planner/api/aiMenuPlanner";

const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const ALL_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const ALL_DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const formatShort = (date) => `${String(date.getDate()).padStart(2, "0")} ${TR_MONTHS_SHORT[date.getMonth()]}`;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

function pickRepresentative(menusForWeek) {
  // Önce onaylı menü; onaylı yoksa en dolu (en çok kalemli) taslak; eşitse en yeni.
  return [...menusForWeek].sort((a, b) => {
    if (a.status !== b.status) return a.status === "approved" ? -1 : 1;
    const ai = a.items?.length || 0;
    const bi = b.items?.length || 0;
    if (ai !== bi) return bi - ai;
    return b.id - a.id;
  })[0];
}

function dayStats(items, day) {
  const dayItems = items.filter((it) => it.day_of_week === day);
  let totalCost = 0;
  let portions = null;
  const mealNames = [];
  dayItems.forEach((it) => {
    if (it.portions) {
      totalCost += (it.estimated_cost || 0) * it.portions;
      portions = Math.max(portions || 0, it.portions);
    } else {
      totalCost += it.estimated_cost || 0;
    }
    if (!mealNames.includes(it.meal_name)) mealNames.push(it.meal_name);
  });
  const perPerson = portions ? totalCost / portions : null;
  return { dayItems, mealNames, totalCost, portions, perPerson };
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menusDetailed, setMenusDetailed] = useState(null);
  const [modalInfo, setModalInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollerRef = useRef(null);
  const currentWeekRef = useRef(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const loadAll = () => {
    setLoading(true);
    setStatsError(false);
    getDashboardStats()
      .then(setStats)
      .catch(() => setStatsError(true))
      .finally(() => setLoading(false));

    getMenus()
      .then(async (list) => {
        const results = await Promise.allSettled(list.map((m) => getMenu(m.id)));
        setMenusDetailed(results.filter((r) => r.status === "fulfilled").map((r) => r.value));
      })
      .catch(() => setMenusDetailed([]));
  };

  useEffect(() => { loadAll(); }, []);

  const weekCards = useMemo(() => {
    if (!menusDetailed) return [];
    const byWeek = new Map();
    menusDetailed.forEach((m) => {
      const key = m.week_start_date;
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key).push(m);
    });
    const today = startOfDay(new Date());
    return Array.from(byWeek.entries())
      .map(([weekStartStr, menusForWeek]) => {
        const menu = pickRepresentative(menusForWeek);
        const weekStart = startOfDay(new Date(weekStartStr));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const isCurrent = today >= weekStart && today <= weekEnd;
        const isPast = today > weekEnd;
        return { menu, weekStart, weekEnd, isCurrent, isPast };
      })
      .sort((a, b) => a.weekStart - b.weekStart);
  }, [menusDetailed]);

  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [weekCards.length]);

  const handlePointerDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = { isDown: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
    setIsDragging(true);
  };
  const handlePointerMove = (e) => {
    if (!dragRef.current.isDown) return;
    const el = scrollerRef.current;
    const dx = e.pageX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };
  const endDrag = () => {
    dragRef.current.isDown = false;
    setIsDragging(false);
  };

  const openDayModal = (day, dayDate, dayItems) => {
    if (dragRef.current.moved) return;
    setModalInfo({ day, dayDate, dayItems });
  };

  if (loading) return <div style={{ color: "var(--text3)", padding: 32 }}>Yükleniyor...</div>;
  if (statsError || !stats) {
    return (
      <div style={{ padding: 32, color: "var(--red)" }}>
        Veriler alınamadı.{" "}
        <button onClick={loadAll} style={{ marginLeft: 8, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
          Tekrar Dene
        </button>
      </div>
    );
  }

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

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>🗓️ Haftalık Menü Takvimi</div>
      {menusDetailed === null ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 24, color: "var(--text3)", fontSize: 12, marginBottom: 24 }}>
          Yükleniyor...
        </div>
      ) : weekCards.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 24, color: "var(--text3)", fontSize: 12, marginBottom: 24 }}>
          Henüz oluşturulmuş haftalık menü yok. AI Destekli Menü Planlayıcı'dan bir hafta oluşturabilirsiniz.
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{
            display: "flex", gap: 16, overflowX: "auto", marginBottom: 24,
            padding: "18px 16px 10px",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: isDragging ? "none" : "auto",
            scrollSnapType: isDragging ? "none" : "x proximity",
          }}
        >
          {weekCards.map(({ menu, weekStart, weekEnd, isCurrent, isPast }) => {
            const today = startOfDay(new Date());
            return (
              <div
                key={menu.id}
                ref={isCurrent ? currentWeekRef : null}
                style={{
                  flex: "0 0 auto",
                  scrollSnapAlign: "center",
                  background: isCurrent ? "var(--accent-bg)" : "var(--surface)",
                  border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  boxShadow: isCurrent ? "0 8px 24px rgba(37,99,235,.20)" : "var(--shadow)",
                  padding: "14px 16px 16px",
                  position: "relative",
                  opacity: isPast && !isCurrent ? 0.75 : 1,
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: "absolute", top: -11, left: 14, fontSize: 9, fontWeight: 700,
                    background: "var(--accent)", color: "#fff", padding: "2px 8px", borderRadius: 999,
                    letterSpacing: ".04em", boxShadow: "0 2px 6px rgba(37,99,235,.35)",
                  }}>
                    BU HAFTA
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, marginTop: isCurrent ? 4 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? "var(--accent)" : "var(--text)" }}>
                    {formatShort(weekStart)} – {formatShort(weekEnd)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>
                    {menu.status === "approved" ? "✓ Onaylandı" : "Taslak"} · Bütçe {menu.budget.toFixed(0)} TL
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 130px)", gap: 8 }}>
                  {ALL_DAYS.map((day, idx) => {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + idx);
                    const isToday = sameDay(dayDate, today);
                    const { dayItems, mealNames, totalCost, portions, perPerson } = dayStats(menu.items, day);
                    return (
                      <div
                        key={day}
                        onClick={() => openDayModal(day, dayDate, dayItems)}
                        style={{
                          border: isToday ? "2px solid var(--green)" : "1px solid var(--border2)",
                          boxShadow: isToday ? "0 0 0 3px rgba(34,197,94,.15)" : "none",
                          borderRadius: 8,
                          background: "var(--surface2)",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: 150,
                          cursor: dayItems.length ? "pointer" : "default",
                        }}
                      >
                        <div style={{
                          padding: "6px 8px", fontSize: 10, fontWeight: 700,
                          color: isToday ? "var(--green)" : "var(--text2)",
                          borderBottom: "1px solid var(--border2)",
                          display: "flex", justifyContent: "space-between",
                        }}>
                          <span>{ALL_DAYS_SHORT[idx]}</span>
                          <span style={{ fontWeight: 500, color: "var(--text3)" }}>{String(dayDate.getDate()).padStart(2, "0")}.{String(dayDate.getMonth() + 1).padStart(2, "0")}</span>
                        </div>
                        <div style={{ padding: "6px 8px", flex: 1 }}>
                          {mealNames.length === 0 ? (
                            <div style={{ fontSize: 10, color: "var(--text3)" }}>—</div>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, color: "var(--text2)" }}>
                              {mealNames.map((name) => (
                                <li key={name} style={{ marginBottom: 3 }}>{name}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div style={{ padding: "6px 8px", borderTop: "1px solid var(--border2)", fontSize: 9, color: "var(--text3)", display: "grid", gap: 2 }}>
                          <div>👥 {portions ?? "—"} kişi</div>
                          <div>💰 {totalCost.toFixed(0)} TL</div>
                          <div>🎫 {perPerson !== null ? `${perPerson.toFixed(2)} TL/kişi` : "—"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {modalInfo && (
        <div onClick={() => setModalInfo(null)} style={overlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{modalInfo.day} · {formatShort(modalInfo.dayDate)}</div>
              <button onClick={() => setModalInfo(null)} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
            {modalInfo.dayItems.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)" }}>Bu gün için planlanmış yemek yok.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Yemek", "Kategori", "Kaç Porsiyon", "Toplam Maliyet"].map((h) => <th key={h} style={thModal}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {modalInfo.dayItems.map((it) => {
                    const total = it.portions ? (it.estimated_cost || 0) * it.portions : (it.estimated_cost || 0);
                    return (
                      <tr key={it.id}>
                        <td style={tdModal}><span style={{ fontWeight: 600, color: "var(--text)" }}>{it.meal_name}</span></td>
                        <td style={tdModal}>{it.category || "—"}</td>
                        <td style={tdModal}>{it.portions ? `${it.portions} porsiyon` : (it.quantity ? `${it.quantity} ${it.unit || ""}` : "—")}</td>
                        <td style={{ ...tdModal, fontFamily: "var(--mono)", fontWeight: 600 }}>
                          {total.toFixed(2)} TL
                          {it.portions ? <span style={{ color: "var(--text3)", fontWeight: 400 }}> ({(it.estimated_cost || 0).toFixed(2)} TL/porsiyon)</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const thModal = { textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", padding: "6px 10px", borderBottom: "1px solid var(--border)" };
const tdModal = { padding: "8px 10px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
};
const modalStyle = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
  boxShadow: "0 20px 60px rgba(0,0,0,.35)", padding: 20, width: "min(560px, 90vw)", maxHeight: "80vh", overflowY: "auto",
};
