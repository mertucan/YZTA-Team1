import { useEffect, useMemo, useState } from "react";
import { getMealLogs, getCaloriesByStudent } from "../api/healthTracker";
import LoadingSpinner from "../../../components/LoadingSpinner";

const DAILY_RECOMMENDED = 2000;

const getStatus = (cal, count) => {
  if (count === 0) return "low";
  const avg = cal / count;
  if (avg < 200) return "low";
  if (avg > 500) return "high";
  return "ok";
};

const statusStyle = {
  low:  { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)", label: "Düşük Kalori" },
  ok:   { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)", label: "Normal" },
  high: { color: "var(--red)",   bg: "var(--red-bg)",   border: "var(--red-border)",   label: "Yüksek Kalori" },
};

export default function HealthDashboard() {
  const [logs, setLogs]           = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    Promise.all([getMealLogs(), getCaloriesByStudent()])
      .then(([l, s]) => { setLogs(l); setSummaries(s); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => summaries.filter((s) => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const status = getStatus(s.total_calories, s.meal_count);
    return name.includes(search.toLowerCase()) && (statusFilter === "all" || status === statusFilter);
  }), [summaries, search, statusFilter]);

  const selectedLogs = useMemo(() =>
    logs.filter((l) => l.students?.id === selectedStudent),
    [logs, selectedStudent]
  );

  const totalCalories = summaries.reduce((a, s) => a + s.total_calories, 0);
  const avgPerStudent = summaries.length ? Math.round(totalCalories / summaries.length) : 0;
  const highRisk      = summaries.filter((s) => getStatus(s.total_calories, s.meal_count) === "high").length;
  const lowRisk       = summaries.filter((s) => getStatus(s.total_calories, s.meal_count) === "low").length;
  const maxCal        = Math.max(...summaries.map((s) => s.total_calories), 1);

  if (loading) return <LoadingSpinner label="Sağlık takibi verileri yükleniyor" minHeight="calc(100vh - 120px)" size={48} />;

  return (
    <div style={page}>
      <div style={pageHeader}>
        <div style={pageTitle}>Sağlık & Kalori Takibi</div>
      </div>

      <div style={summaryGrid}>
        {[
          { label: "Takip Edilen Öğrenci",  value: summaries.length,          color: "var(--accent)" },
          { label: "Toplam Öğün Kaydı",     value: logs.length,               color: "var(--purple)" },
          { label: "Öğrenci Başı Ort. Kal", value: `${avgPerStudent} kcal`,   color: "var(--green)" },
          { label: "Dikkat Gerektiren",     value: highRisk + lowRisk,        color: "var(--red)" },
        ].map((c) => (
          <div key={c.label} style={summaryCard}>
            <div style={{ ...summaryBar, background: c.color }} />
            <div style={summaryLabel}>{c.label}</div>
            <div style={summaryValue}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={contentGrid}>
        <div>
          <div style={filterBar}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Öğrenci ara..."
              style={searchInput} />
            <div style={filterButtons}>
            {["all", "ok", "low", "high"].map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all .15s",
                  background: statusFilter === f ? "var(--accent)" : "var(--surface2)",
                  borderColor: statusFilter === f ? "var(--accent)" : "var(--border2)",
                  color: statusFilter === f ? "#fff" : "var(--text2)" }}>
                {f === "all" ? "Tümü" : f === "ok" ? "Normal" : f === "low" ? "Düşük" : "Yüksek"}
              </button>
            ))}
            </div>
          </div>

          {/* Öğrenci kartları */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text3)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>Sonuç bulunamadı.</div>
            )}
            {filtered.map((s) => {
              const status    = getStatus(s.total_calories, s.meal_count);
              const st        = statusStyle[status];
              const barPct    = Math.min(100, Math.round((s.total_calories / maxCal) * 100));
              const isSelected = selectedStudent === s.student_id;
              return (
                <div key={s.student_id} onClick={() => setSelectedStudent(isSelected ? null : s.student_id)}
                  style={{ background: "var(--surface)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", boxShadow: isSelected ? "0 0 0 3px var(--accent-bg)" : "0 10px 26px rgba(24, 24, 24, 0.06)", transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-bg)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 13 }}>{s.first_name} {s.last_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.meal_count} öğün kaydı</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", color: st.color }}>{s.total_calories.toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>kcal toplam</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "var(--surface3)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <div style={{ height: "100%", width: `${barPct}%`, background: st.color, borderRadius: 3, transition: "width .4s" }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", minWidth: 36, textAlign: "right" }}>{barPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detay paneli */}
        <div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 14px 36px rgba(24, 24, 24, 0.07)", position: "sticky", top: 70, overflow: "hidden" }}>
            {selectedStudent === null ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Detay görmek için<br />bir öğrenci seçin</div>
              </div>
            ) : (() => {
              const student = summaries.find((s) => s.student_id === selectedStudent);
              if (!student) return null;
              const status  = getStatus(student.total_calories, student.meal_count);
              const st      = statusStyle[status];
              const avgMeal = student.meal_count ? Math.round(student.total_calories / student.meal_count) : 0;
              return (
                <>
                  <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-bg)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{student.first_name} {student.last_name}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, borderBottom: "1px solid var(--border)" }}>
                    {[
                      { label: "Toplam Kalori",  value: `${student.total_calories.toFixed(0)} kcal` },
                      { label: "Öğün Sayısı",    value: student.meal_count },
                      { label: "Öğün Başı Ort.", value: `${avgMeal} kcal` },
                      { label: "Hedef",           value: `${DAILY_RECOMMENDED} kcal/gün` },
                    ].map((m) => (
                      <div key={m.label} style={{ padding: "12px 16px", background: "var(--surface2)" }}>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 15 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "12px 18px 6px", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Öğün Geçmişi</div>
                  <div style={{ maxHeight: 340, overflowY: "auto" }}>
                    {selectedLogs.length === 0
                      ? <div style={{ padding: "16px 18px", fontSize: 12, color: "var(--text3)" }}>Kayıt bulunamadı.</div>
                      : selectedLogs.map((log) => (
                        <div key={log.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{log.meals?.name}</div>
                            <div style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(log.consumed_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                          <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>{log.meals?.calories ?? "—"} kcal</div>
                        </div>
                      ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

const page = { display: "grid", gap: 16 };
const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 16,
  marginBottom: 0,
};
const pageTitle = {
  color: "var(--ingredients-text)",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 700,
};
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 };
const summaryCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "15px 16px", boxShadow: "0 10px 26px rgba(24, 24, 24, 0.06)", position: "relative", overflow: "hidden" };
const summaryBar = { position: "absolute", top: 0, left: 0, right: 0, height: 3 };
const summaryLabel = { fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const summaryValue = { fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--text)" };
const contentGrid = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 380px)", gap: 16 };
const filterBar = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", gap: 10, alignItems: "center", boxShadow: "0 10px 26px rgba(24, 24, 24, 0.06)", flexWrap: "wrap" };
const searchInput = { flex: "1 1 240px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const filterButtons = { display: "flex", gap: 8, flexWrap: "wrap" };
