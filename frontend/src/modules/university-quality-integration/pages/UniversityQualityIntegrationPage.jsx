import { useEffect, useMemo, useState } from "react";
import {
  downloadQualityExport,
  getQualityAiInsights,
  getQualityExportHistory,
  getQualityExportPreview,
  getRankingOrganizations,
} from "../api/universityQualityIntegration";
import LoadingSpinner from "../../../components/LoadingSpinner";

const emptyPreview = {
  organization: null,
  dataset: {
    menu_count: 0,
    approved_menu_count: 0,
    item_count: 0,
    healthy_menu_ratio: 0,
    menu_diversity_score: 0,
    plant_forward_ratio: 0,
    approved_menu_ratio: 0,
    data_coverage_ratio: 0,
    average_calories: 0,
    average_protein: 0,
    average_iron: 0,
    average_cost_per_menu: 0,
    evidence_readiness_score: 0,
    nutrition_quality_score: 0,
    score_label: "Kanıta Hazırlık",
    score_weights: [],
    methodology_basis: "",
    methodology_url: "",
    methodology_note: "",
  },
  methodology: [],
  fields: [],
  export_allowed: false,
  suppression_reason: null,
};

const fieldLabels = {
  evidence_readiness_score: "Kanıta Hazırlık Skoru",
  nutrition_quality_score: "Beslenme Bileşeni",
  healthy_menu_ratio: "Sağlıklı Menü Oranı",
  menu_diversity_score: "Çeşitlilik Skoru",
  plant_forward_ratio: "Bitkisel Odak Oranı",
  approved_menu_ratio: "Onaylı Menü Oranı",
  data_coverage_ratio: "Veri Kapsama Oranı",
  average_calories: "Ortalama Kalori",
  average_protein: "Ortalama Protein",
  average_iron: "Ortalama Demir",
  average_cost_per_menu: "Menü Maliyeti",
};

const methodologyReferences = [
  {
    organization: "QS Sustainability",
    source: "QS Sustainability Rankings methodology",
    url: "https://www.topuniversities.com/sustainability-rankings",
    officialFocus: "Quality of Life, kampüste sağlık/iyi oluş ve sürdürülebilir kurum göstergeleri",
    moduleMapping: "Beslenme bileşeni, sağlıklı menü oranı, veri kapsama ve çeşitlilik ağırlıklandırılır.",
  },
  {
    organization: "THE Impact Rankings",
    source: "THE Impact Rankings methodology",
    url: "https://www.timeshighereducation.com/world-university-rankings/impact-rankings-2025-methodology",
    officialFocus: "SDG 2 Zero Hunger, SDG 3 Good Health and Well-being, kanıt destekli politika/veri yaklaşımı",
    moduleMapping: "Sağlıklı menü, beslenme bileşeni, veri kapsama, onaylı menü ve çeşitlilik ağırlıklandırılır.",
  },
  {
    organization: "UI GreenMetric",
    source: "UI GreenMetric Sustainable University Rankings questionnaire",
    url: "https://uigreenmetric.com/rankings/guidelines/university/questionnaire",
    officialFocus: "Sağlık altyapısı, SDG etkisi, organik atık ve operasyonel sürdürülebilirlik kanıtları",
    moduleMapping: "Bitkisel odak, onaylı menü, veri kapsama, maliyet verimliliği ve çeşitlilik ağırlıklandırılır.",
  },
];

export default function UniversityQualityIntegrationPage() {
  const [organizations, setOrganizations] = useState([]);
  const [filters, setFilters] = useState({ organizationId: "qs", startDate: "", endDate: "" });
  const [exportFormat, setExportFormat] = useState("csv");
  const [preview, setPreview] = useState(emptyPreview);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  const filtersReady = (!filters.startDate || filters.startDate.length === 10)
    && (!filters.endDate || filters.endDate.length === 10);

  useEffect(() => {
    getRankingOrganizations()
      .then((data) => {
        setOrganizations(data);
        if (data?.[0]?.id) setFilters((current) => ({ ...current, organizationId: current.organizationId || data[0].id }));
      })
      .catch(() => setOrganizations([]));
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!filtersReady) return;

    let ignore = false;
    setLoading(true);
    getQualityExportPreview(filters)
      .then((data) => {
        if (!ignore) setPreview(data);
      })
      .catch((error) => {
        if (!ignore) setMessage({ type: "error", text: error.response?.data?.detail || "Ön izleme alınamadı." });
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [filters, filtersReady]);

  const dataset = preview.dataset || emptyPreview.dataset;
  const requiredFields = preview.organization?.required_fields || [];
  const methodology = preview.methodology || [];
  const scoreWeights = dataset.score_weights || [];

  const periodLabel = useMemo(() => {
    const start = dataset.period_start ? new Date(dataset.period_start).toLocaleDateString("tr-TR") : "-";
    const end = dataset.period_end ? new Date(dataset.period_end).toLocaleDateString("tr-TR") : "-";
    return `${start} / ${end}`;
  }, [dataset.period_start, dataset.period_end]);

  const handleFilterChange = (key, value) => {
    setMessage(null);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleExport = () => {
    setMessage(null);
    setExporting(true);
    downloadQualityExport({ ...filters, exportFormat })
      .then(() => {
        setMessage({ type: "success", text: "Dışa aktarım dosyası oluşturuldu ve denetim kaydı eklendi." });
        refreshHistory();
      })
      .catch((error) => {
        setMessage({ type: "error", text: error.response?.data?.detail || "Dışa aktarım oluşturulamadı." });
      })
      .finally(() => setExporting(false));
  };

  const handleGenerateInsights = () => {
    setAiLoading(true);
    setMessage(null);
    getQualityAiInsights(filters)
      .then(setAiInsights)
      .catch((error) => {
        setMessage({ type: "error", text: error.response?.data?.detail || "AI analizi üretilemedi." });
      })
      .finally(() => setAiLoading(false));
  };

  function refreshHistory() {
    getQualityExportHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Üniversite Beslenme Kalitesi Entegrasyonu</div>
          <div style={s.subtitle}>Resmi sıralama metodolojilerine kanıt veri paketi hazırlar</div>
        </div>
        <div style={s.scoreBox}>
          <span style={s.scoreLabel}>{dataset.score_label || "Kanıta Hazırlık"}</span>
          <strong style={s.score}>{loading ? "..." : dataset.evidence_readiness_score}</strong>
          <span style={s.scoreWarning}>Resmi sıralama puanı değildir; seçili metodolojiye göre kanıt hazırlığını gösterir.</span>
        </div>
      </div>

      <section style={s.explainer}>
        <button type="button" style={s.explainerHeader} onClick={() => setExplainerOpen((open) => !open)}>
          <strong>Bu modül ne yapar?</strong>
          <span style={s.historyToggle}>{explainerOpen ? "Kapat" : "Detayları Aç"}</span>
        </button>
        {explainerOpen && (
          <>
            <span>
              Üniversitenin yemekhane ve menü verilerinden sağlık, sürdürülebilirlik, veri kapsama ve operasyonel kalite metrikleri üretir. QS Sustainability,
              THE Impact Rankings ve UI GreenMetric gibi kuruluşların resmi metodoloji başlıklarına eşlenen doğrulanabilir kanıt veri seti hazırlar.
              Nihai sıralama puanını hesaplamaz; resmi başvuruda kullanılabilecek kurumsal kanıt paketini CSV veya JSON olarak dışa aktarır.
            </span>
            <div style={s.quickLinks}>
              {methodologyReferences.map((reference) => (
                <a key={reference.organization} href={reference.url} target="_blank" rel="noreferrer" style={s.quickLink}>
                  {reference.organization}
                </a>
              ))}
            </div>
          </>
        )}
      </section>

      <section style={s.toolbar}>
        <label style={s.label}>
          Kuruluş
          <select style={s.input} value={filters.organizationId} onChange={(e) => handleFilterChange("organizationId", e.target.value)}>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        </label>
        <label style={s.label}>
          Başlangıç
          <input style={s.input} type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
        </label>
        <label style={s.label}>
          Bitiş
          <input style={s.input} type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
        </label>
        <div style={s.segment}>
          {["csv", "json"].map((format) => (
            <button
              key={format}
              type="button"
              style={{ ...s.segmentBtn, ...(exportFormat === format ? s.segmentActive : null) }}
              onClick={() => setExportFormat(format)}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
        <button style={{ ...s.button, opacity: exporting || !preview.export_allowed ? 0.7 : 1 }} disabled={exporting || loading || !preview.export_allowed} onClick={handleExport}>
          {exporting ? "Hazırlanıyor..." : "Dışa Aktar"}
        </button>
      </section>

      {message && <div style={{ ...s.message, ...s[message.type] }}>{message.text}</div>}

      {scoreWeights.length > 0 && (
        <section style={s.weightPanel}>
          <div style={s.weightTitle}>Seçili metodoloji ağırlıkları</div>
          <div style={s.weightGrid}>
            {scoreWeights.map((item) => (
              <div key={item.component} style={s.weightItem}>
                <span>{item.label}</span>
                <strong>%{item.weight_percent}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={s.aiPanel}>
        <div>
          <div style={s.panelTitleInline}>AI Kanıt Özeti ve Eksik Kanıt Analizi</div>
          <div style={s.aiSubtitle}>Seçili metodolojiye göre başvuru anlatımı, zayıf kanıt alanları ve uygulanabilir aksiyonlar üretir.</div>
        </div>
        <button style={{ ...s.aiButton, opacity: aiLoading || loading || !preview.export_allowed ? 0.7 : 1 }} disabled={aiLoading || loading || !preview.export_allowed} onClick={handleGenerateInsights}>
          {aiLoading ? "AI analiz ediyor..." : "AI Analizi Üret"}
        </button>
        {aiInsights && (
          <div style={s.aiResultGrid}>
            <section style={s.aiResultCard}>
              <div style={s.aiCardTitle}>Kanıt Özeti</div>
              <p style={s.aiText}>{aiInsights.evidence_summary}</p>
              <span style={s.aiSource}>{aiInsights.generated_by === "gemini" ? "Gemini ile üretildi" : "Yerel analiz ile üretildi"}</span>
            </section>
            <section style={s.aiResultCard}>
              <div style={s.aiCardTitle}>Eksik Kanıtlar</div>
              <ul style={s.aiList}>
                {(aiInsights.missing_evidence || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section style={s.aiResultCard}>
              <div style={s.aiCardTitle}>Önerilen Aksiyonlar</div>
              <ul style={s.aiList}>
                {(aiInsights.recommended_actions || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <div style={s.aiNote}>{aiInsights.application_note}</div>
          </div>
        )}
      </section>

      <div style={s.grid}>
        <section style={s.panel}>
          <div style={s.panelTitle}>Kurumsal Veri Seti</div>
          <div style={s.metricGrid}>
            <Metric label="Menü" value={loading ? <LoadingSpinner minHeight={24} size={22} /> : dataset.menu_count} />
            <Metric label="Onaylı" value={loading ? <LoadingSpinner minHeight={24} size={22} /> : dataset.approved_menu_count} />
            <Metric label="Kalem" value={loading ? <LoadingSpinner minHeight={24} size={22} /> : dataset.item_count} />
            <Metric label="Dönem" value={loading ? <LoadingSpinner minHeight={24} size={22} /> : periodLabel} wide />
          </div>
          <div style={{ ...s.notice, ...(preview.export_allowed ? s.noticeOk : s.noticeWarn) }}>
            {preview.export_allowed
              ? dataset.methodology_note || "Veri seti resmi başlıklara kanıt olarak hazır. Dosya kişi verisi içermez."
              : preview.suppression_reason || "Dışa aktarım için yeterli menü verisi yok."}
          </div>
        </section>

        <section style={s.panel}>
          <div style={s.panelTitle}>Metrikler</div>
          <div style={s.kpiList}>
            <Kpi label="Beslenme Bileşeni" value={dataset.nutrition_quality_score} />
            <Kpi label="Sağlıklı Menü" value={formatPercent(dataset.healthy_menu_ratio)} />
            <Kpi label="Çeşitlilik" value={dataset.menu_diversity_score} />
            <Kpi label="Bitkisel Odak" value={formatPercent(dataset.plant_forward_ratio)} />
            <Kpi label="Veri Kapsama" value={formatPercent(dataset.data_coverage_ratio)} />
            <Kpi label="Kalori" value={dataset.average_calories} />
            <Kpi label="Protein" value={`${dataset.average_protein} g`} />
            <Kpi label="Demir" value={`${dataset.average_iron} mg`} />
            <Kpi label="Maliyet" value={`${dataset.average_cost_per_menu} TL`} />
          </div>
        </section>
      </div>

      <section style={{ ...s.panel, marginTop: 16 }}>
        <div style={s.panelTitle}>Resmi Dayanak ve Alan Eşleşmesi</div>
        <div style={s.basisBox}>
          <div style={s.basisText}>{dataset.methodology_basis || preview.organization?.basis || "Seçilen kuruluş için metodoloji eşleşmesi hazırlanıyor."}</div>
          {dataset.methodology_url && (
            <a href={dataset.methodology_url} target="_blank" rel="noreferrer" style={s.sourceLink}>Resmi metodoloji kaynağı</a>
          )}
        </div>
        <div style={s.fieldGrid}>
          {requiredFields.map((field) => (
            <span key={field} style={s.fieldPill}>{fieldLabels[field] || field}</span>
          ))}
        </div>
      </section>

      <section style={{ ...s.panel, marginTop: 16 }}>
        <div style={s.panelTitle}>Hesaplama Yöntemi</div>
        <div style={s.methodList}>
          {methodology.map((item) => (
            <div key={item.metric} style={s.methodItem}>
              <div style={s.methodHead}>
                <strong>{item.metric}</strong>
                <span>{item.current_value}</span>
              </div>
              <div style={s.methodFormula}>{item.formula}</div>
              <div style={s.methodBasis}>{item.official_basis}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...s.panel, marginTop: 16 }}>
        <div style={s.panelTitle}>Metodoloji Kaynakçası</div>
        <div style={s.referenceIntro}>
          Aşağıdaki kaynaklar resmi başvuru puanını hesaplamak için değil, modüldeki kanıt veri setinin hangi resmi metodoloji başlıklarına dayandırıldığını göstermek için kullanılır.
        </div>
        <div style={s.referenceGrid}>
          {methodologyReferences.map((reference) => (
            <article key={reference.organization} style={s.referenceCard}>
              <div style={s.referenceOrg}>{reference.organization}</div>
              <a href={reference.url} target="_blank" rel="noreferrer" style={s.referenceLink}>{reference.source}</a>
              <div style={s.referenceBlock}>
                <span style={s.referenceLabel}>Resmi odak</span>
                <p style={s.referenceText}>{reference.officialFocus}</p>
              </div>
              <div style={s.referenceBlock}>
                <span style={s.referenceLabel}>Modüldeki karşılığı</span>
                <p style={s.referenceText}>{reference.moduleMapping}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...s.panel, marginTop: 16 }}>
        <button type="button" style={s.historyHeader} onClick={() => setHistoryOpen((open) => !open)}>
          <span style={s.panelTitleInline}>Son Dışa Aktarımlar</span>
          <span style={s.historyToggle}>{historyOpen ? "Kapat" : `Aç (${history.length})`}</span>
        </button>
        {historyOpen && (
          history.length === 0 ? (
            <div style={s.empty}>Henüz kurumsal export kaydı yok.</div>
          ) : (
            <div style={s.historyList}>
              {history.map((item) => (
                <div key={item.id} style={s.historyItem}>
                  <div>
                    <div style={s.historyTitle}>{item.organization_name}</div>
                    <div style={s.historyMeta}>
                      {item.export_format.toUpperCase()} · {item.menu_count} menü · hazırlık {Number(item.nutrition_quality_score).toFixed(2)} · {formatDate(item.created_at)}
                    </div>
                  </div>
                  <span style={s.status}>{item.status}</span>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, wide = false }) {
  return (
    <div style={{ ...s.metric, gridColumn: wide ? "span 2" : "auto" }}>
      <span style={s.metricLabel}>{label}</span>
      <strong style={s.metricValue}>{value}</strong>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div style={s.kpi}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const s = {
  page: { display: "grid", gap: 0 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 },
  title: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, lineHeight: 1.05, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "var(--text2)", marginTop: 4 },
  scoreBox: { width: 220, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "10px 12px", textAlign: "right", boxShadow: "var(--shadow)" },
  scoreLabel: { display: "block", color: "var(--text3)", fontSize: 11, fontWeight: 800, textTransform: "uppercase" },
  score: { display: "block", color: "var(--accent)", fontSize: 28, fontFamily: "var(--mono)", marginTop: 2 },
  scoreWarning: { display: "block", color: "var(--text3)", fontSize: 10, lineHeight: 1.35, marginTop: 5 },
  explainer: { display: "grid", gap: 6, marginBottom: 16, padding: 14, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", boxShadow: "var(--shadow)", color: "var(--text2)", fontSize: 13, lineHeight: 1.6 },
  explainerHeader: { width: "100%", border: "none", background: "transparent", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 0, cursor: "pointer", textAlign: "left", fontSize: 13 },
  quickLinks: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 },
  quickLink: { border: "1px solid var(--border2)", borderRadius: 18, background: "var(--surface2)", color: "var(--accent)", padding: "5px 10px", fontSize: 12, fontWeight: 900, textDecoration: "none" },
  toolbar: { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 150px 150px auto 130px", gap: 10, alignItems: "end", marginBottom: 16 },
  weightPanel: { marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: 14, boxShadow: "var(--shadow)" },
  weightTitle: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700, marginBottom: 10 },
  weightGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 },
  weightItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: "8px 10px", color: "var(--text2)", fontSize: 12 },
  aiPanel: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "start", marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: 16, boxShadow: "var(--shadow)" },
  aiSubtitle: { color: "var(--text2)", fontSize: 12, lineHeight: 1.5, marginTop: 4 },
  aiButton: { minHeight: 38, border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 900, padding: "0 14px", cursor: "pointer", whiteSpace: "nowrap" },
  aiResultGrid: { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginTop: 2 },
  aiResultCard: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: 14, minHeight: 150 },
  aiCardTitle: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, lineHeight: 1.15, fontWeight: 700, marginBottom: 8 },
  aiText: { color: "var(--text2)", fontSize: 12, lineHeight: 1.6, margin: 0 },
  aiSource: { display: "inline-flex", marginTop: 10, border: "1px solid var(--border2)", borderRadius: 18, padding: "4px 8px", color: "var(--text3)", fontSize: 11, fontWeight: 800 },
  aiList: { margin: 0, paddingLeft: 18, color: "var(--text2)", fontSize: 12, lineHeight: 1.6 },
  aiNote: { gridColumn: "1 / -1", border: "1px solid var(--amber-border)", borderRadius: 8, background: "var(--amber-bg)", color: "var(--amber)", padding: 10, fontSize: 12, lineHeight: 1.5 },
  label: { display: "grid", gap: 6, color: "var(--text2)", fontSize: 12, fontWeight: 800 },
  input: { minHeight: 38, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", outline: "none" },
  segment: { display: "flex", border: "1px solid var(--border2)", borderRadius: 8, overflow: "hidden", minHeight: 38, background: "var(--surface)" },
  segmentBtn: { width: 58, border: 0, background: "transparent", color: "var(--text2)", fontWeight: 900, cursor: "pointer" },
  segmentActive: { background: "var(--accent)", color: "#fff" },
  button: { minHeight: 38, border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 900, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(340px, .8fr)", gap: 16 },
  panel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, boxShadow: "var(--shadow)" },
  panelTitle: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700, marginBottom: 14 },
  panelTitleInline: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700 },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 },
  metric: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, minHeight: 78 },
  metricLabel: { display: "block", color: "var(--text3)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 },
  metricValue: { color: "var(--text)", fontSize: 20, fontFamily: "var(--mono)", overflowWrap: "anywhere" },
  notice: { marginTop: 16, border: "1px solid", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.55 },
  noticeOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  noticeWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  kpiList: { display: "grid", gap: 8 },
  kpi: { display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--border)", padding: "8px 0", color: "var(--text2)", fontSize: 13 },
  fieldGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  fieldPill: { border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", borderRadius: 18, padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  basisBox: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)" },
  basisText: { color: "var(--text2)", fontSize: 13, lineHeight: 1.55 },
  sourceLink: { color: "var(--accent)", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" },
  methodList: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  methodItem: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: 14, minHeight: 154 },
  methodHead: { display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text)", fontSize: 13 },
  methodFormula: { color: "var(--text2)", fontSize: 12, lineHeight: 1.55, marginTop: 6 },
  methodBasis: { color: "var(--text3)", fontSize: 12, lineHeight: 1.5, marginTop: 4 },
  referenceIntro: { color: "var(--text2)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 },
  referenceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 },
  referenceCard: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: 14, display: "grid", gap: 10, minHeight: 210 },
  referenceOrg: { color: "var(--text)", fontSize: 14, fontWeight: 900 },
  referenceLink: { color: "var(--accent)", fontSize: 12, fontWeight: 900, textDecoration: "none" },
  referenceBlock: { display: "grid", gap: 4 },
  referenceLabel: { color: "var(--text3)", fontSize: 11, fontWeight: 900, textTransform: "uppercase" },
  referenceText: { color: "var(--text2)", fontSize: 12, lineHeight: 1.55, margin: 0 },
  message: { marginBottom: 14, borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.5, border: "1px solid" },
  success: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  error: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
  empty: { color: "var(--text3)", fontSize: 13 },
  historyHeader: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "transparent", border: "none", padding: 0, margin: 0, cursor: "pointer", textAlign: "left" },
  historyToggle: { border: "1px solid var(--border2)", borderRadius: 18, background: "var(--surface2)", color: "var(--text2)", padding: "5px 10px", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" },
  historyList: { display: "grid", gap: 8 },
  historyItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" },
  historyTitle: { fontSize: 13, fontWeight: 800, color: "var(--text)" },
  historyMeta: { fontSize: 12, color: "var(--text3)", marginTop: 2 },
  status: { borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 900, border: "1px solid var(--green-border)", color: "var(--green)", background: "var(--green-bg)" },
};
