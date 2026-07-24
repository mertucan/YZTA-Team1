import { useEffect, useMemo, useState } from "react";
import { getExpenses, getExpenseSummary, getExpenseAiInsights, getMaterialExpenses, createExpense, deleteExpense } from "../api/expenses";
import { todayLocal } from "../utils/date";

const CATEGORIES = ["Personel", "Elektrik", "Su", "Doğalgaz", "Tamir-Bakım", "Kira", "Temizlik", "Diğer"];
const emptyForm = { category: "Personel", description: "", amount: "", expense_date: todayLocal() };

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [materials, setMaterials] = useState(null);
  const [matOpen, setMatOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(todayLocal().slice(0, 7)); // "" = Tümü

  const refresh = () => {
    getExpenses().then(setItems).catch(() => setError("Harcamalar yüklenemedi (tablo oluşturuldu mu?)")).finally(() => setLoading(false));
    getExpenseSummary().then(setSummary).catch(() => {});
    getMaterialExpenses(selectedMonth || undefined).then(setMaterials).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);
  // Ay değişince malzeme özetini o aya göre yeniden çek (top/total aya göre süzülür)
  useEffect(() => { getMaterialExpenses(selectedMonth || undefined).then(setMaterials).catch(() => {}); }, [selectedMonth]);

  const handleAdd = async () => {
    if (!form.category || form.amount === "") return;
    setError("");
    try {
      await createExpense({ ...form, amount: Number(form.amount) || 0 });
      setForm({ ...emptyForm, expense_date: form.expense_date });
      refresh();
    } catch {
      setError("Harcama eklenemedi. Supabase'de 'expenses' tablosu oluşturuldu mu?");
    }
  };

  const handleDelete = async (id) => { await deleteExpense(id); refresh(); };

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    try {
      setAi(await getExpenseAiInsights());
    } catch {
      setError("AI analizi alınamadı.");
    } finally {
      setAiLoading(false);
    }
  };

  const monthLabel = (m) => {
    if (!m) return "Tüm Aylar";
    const d = new Date(`${m}-01T00:00:00`);
    return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  };

  // Ay seçenekleri: harcama tarihleri + malzeme aylarının birleşimi + bu ay
  const monthOptions = useMemo(() => {
    const set = new Set();
    items.forEach((e) => { const m = String(e.expense_date || "").slice(0, 7); if (m) set.add(m); });
    (materials?.by_month || []).forEach((m) => set.add(m.month));
    set.add(todayLocal().slice(0, 7));
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [items, materials]);

  // Seçili aya ait manuel harcamalar
  const monthItems = useMemo(
    () => (selectedMonth ? items.filter((e) => String(e.expense_date || "").startsWith(selectedMonth)) : items),
    [items, selectedMonth],
  );

  const filtered = useMemo(() => monthItems.filter((e) => {
    const q = search.toLowerCase();
    return `${e.category} ${e.description || ""}`.toLowerCase().includes(q);
  }), [monthItems, search]);

  const matTotal = Number(materials?.total || 0); // sunucu tarafında aya göre süzülü
  const manualTotal = useMemo(() => monthItems.reduce((s, e) => s + Number(e.amount || 0), 0), [monthItems]);
  const generalTotal = manualTotal + matTotal;

  // Kategori dağılımı (seçili ay) — manuel kalemler + malzeme tek bar
  const catDist = useMemo(() => {
    const map = {};
    monthItems.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
    const arr = Object.entries(map).map(([category, amount]) => ({ category, amount }));
    if (matTotal > 0) arr.push({ category: "Malzeme (Gıda)", amount: matTotal });
    return arr.sort((a, b) => b.amount - a.amount);
  }, [monthItems, matTotal]);
  const maxCat = catDist[0]?.amount || 1;
  const maxMatMonth = Math.max(1, ...(materials?.by_month || []).map((m) => Number(m.amount || 0)));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>💸 Harcamalar</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
            Personel, elektrik, su, tamir ve malzeme giderleri — ay bazında takip ve analiz
          </div>
        </div>
        <div>
          <div style={fieldLabel}>Ay</div>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ ...input, minWidth: 170 }}>
            <option value="">Tüm Aylar</option>
            {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
      </div>

      {/* Özet kartlar (seçili ay) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: `Genel Toplam · ${monthLabel(selectedMonth)}`, value: `${fmt(generalTotal)} TL`, color: "var(--red)" },
          { label: "İşletme Gideri (manuel)", value: `${fmt(manualTotal)} TL`, color: "var(--accent)" },
          { label: "Malzeme Gideri (otomatik)", value: `${fmt(matTotal)} TL`, color: "var(--amber)" },
          { label: "Kayıt Sayısı", value: monthItems.length, color: "var(--purple)" },
        ].map((c) => (
          <div key={c.label} style={statCard}>
            <div style={statLabel}>{c.label}</div>
            <div style={{ ...statValue, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Ekleme formu */}
      <div style={card}>
        <div style={cardHd}>➕ Yeni Harcama Ekle</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={fieldLabel}>Kategori</div>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={fieldLabel}>Açıklama</div>
            <input value={form.description} placeholder="Örn: Temmuz aşçı maaşı" onChange={(e) => setForm({ ...form, description: e.target.value })} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>Tutar (TL)</div>
            <input type="number" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>Tarih</div>
            <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} style={input} />
          </div>
          <button onClick={handleAdd} style={btnPrimary}>Ekle</button>
        </div>
        {error && <div style={{ padding: "0 18px 14px", fontSize: 12, color: "var(--red)" }}>{error}</div>}
      </div>

      {/* Malzeme Giderleri — konsolide (yer kaplamasın diye tek kart, açılır) */}
      {matTotal > 0 && (
        <div style={card}>
          <button
            onClick={() => setMatOpen((o) => !o)}
            style={{ ...cardHd, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: matOpen ? "1px solid var(--border)" : "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
          >
            <span>🥕 Malzeme Giderleri <span style={{ fontWeight: 400, color: "var(--text3)" }}>· {monthLabel(selectedMonth)} (fiili alımlardan · {materials.batch_count} parti)</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b style={{ fontFamily: "var(--mono)", color: "var(--amber)" }}>{fmt(matTotal)} TL</b>
              <span style={{ color: "var(--text3)" }}>{matOpen ? "▾" : "▸"}</span>
            </span>
          </button>
          {matOpen && (
            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>En Çok Harcanan Malzemeler</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(materials.top_ingredients || []).map((t) => (
                    <div key={t.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--text2)" }}>{t.name}</span>
                      <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmt(t.amount)} TL</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Aylık Malzeme Alımı <span style={{ fontWeight: 400, textTransform: "none" }}>(tıkla → o ayı seç)</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {(materials.by_month || []).map((m) => {
                    const active = m.month === selectedMonth;
                    return (
                      <div key={m.month} onClick={() => setSelectedMonth(m.month)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: !selectedMonth || active ? 1 : 0.55 }}>
                        <span style={{ width: 60, fontSize: 11, color: active ? "var(--amber)" : "var(--text2)", fontWeight: active ? 700 : 400, fontFamily: "var(--mono)" }}>{m.month}</span>
                        <div style={{ flex: 1, height: 8, background: "var(--surface3, #eee)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.round((m.amount / maxMatMonth) * 100)}%`, background: "var(--amber)", borderRadius: 4 }} />
                        </div>
                        <span style={{ width: 90, textAlign: "right", fontSize: 11, fontFamily: "var(--mono)" }}>{fmt(m.amount)} TL</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <div style={{ padding: "0 18px 12px", fontSize: 11, color: "var(--text3)" }}>
            ℹ Sipariş "teslim alındı" olunca veya Malzeme Deposu'nda birim fiyatlı parti eklenince buraya otomatik yansır.
          </div>
        </div>
      )}

      {/* Kategori dağılımı (seçili ay · malzeme dahil) */}
      {catDist.length > 0 && (
        <div style={card}>
          <div style={cardHd}>📊 Kategori Dağılımı · {monthLabel(selectedMonth)}</div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            {catDist.map((c) => (
              <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 120, fontSize: 12, color: "var(--text2)" }}>{c.category}</span>
                <div style={{ flex: 1, height: 10, background: "var(--surface3, #eee)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((c.amount / maxCat) * 100)}%`, background: c.category === "Malzeme (Gıda)" ? "var(--amber)" : "var(--accent)", borderRadius: 5 }} />
                </div>
                <span style={{ width: 110, textAlign: "right", fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)" }}>{fmt(c.amount)} TL</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Gider Analizi */}
      <div style={card}>
        <div style={{ ...cardHd, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>🤖 AI Gider Analizi</span>
          <button onClick={handleAiAnalyze} disabled={aiLoading} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 12, opacity: aiLoading ? 0.6 : 1 }}>
            {aiLoading ? "Analiz ediliyor..." : ai ? "Yeniden Analiz Et" : "Analiz Et"}
          </button>
        </div>
        <div style={{ padding: 18 }}>
          {!ai ? (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              Giderlerinizi yapay zeka ile analiz edin: en ağır kalemler, aylık trend ve somut tasarruf önerileri.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{ai.headline}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 14 }}>
                {ai.generated_by === "gemini" ? "Gemini AI ile üretildi" : "Kural tabanlı analiz (Gemini anahtarı yoksa)"}
              </div>

              {ai.observations?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Gözlemler</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                    {ai.observations.map((o, i) => <li key={i} style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.45 }}>{o}</li>)}
                  </ul>
                </div>
              )}

              {ai.suggestions?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Tasarruf Önerileri</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 10 }}>
                    {ai.suggestions.map((s, i) => (
                      <div key={i} style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>💡 {s.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.45 }}>{s.detail}</div>
                        {s.potential_saving && (
                          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "var(--green,#16a34a)" }}>
                            Tahmini kazanım: {s.potential_saving}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Liste */}
      <div style={card}>
        <div style={cardHd}>🧾 Harcama Listesi · {monthLabel(selectedMonth)}</div>
        <div style={{ padding: "12px 18px" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Kategori veya açıklama ara..." style={input} />
        </div>
        {loading ? <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Tarih", "Kategori", "Açıklama", "Tutar", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td style={td} colSpan={5}>Kayıt yok.</td></tr>}
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...td, fontFamily: "var(--mono)" }}>{e.expense_date}</td>
                  <td style={td}><span style={catTag}>{e.category}</span></td>
                  <td style={td}>{e.description || "—"}</td>
                  <td style={{ ...td, fontWeight: 700, fontFamily: "var(--mono)" }}>{fmt(e.amount)} TL</td>
                  <td style={td}><button onClick={() => handleDelete(e.id)} style={btnSm}>Sil</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const th = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const statCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", boxShadow: "var(--shadow)" };
const statLabel = { fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 };
const statValue = { fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)" };
const catTag = { fontSize: 11, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 5, padding: "2px 8px", fontWeight: 600 };
