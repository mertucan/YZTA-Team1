import { useEffect, useMemo, useState } from "react";
import {
  getResearchExportHistory,
  getResearchExportPreview,
  sendResearchExportEmail,
} from "../api/researchExport";

const emptyPreview = {
  record_count: 0,
  subject_count: 0,
  date_min: null,
  date_max: null,
  fields: [],
  brevo_configured: false,
  export_allowed: false,
  suppression_reason: null,
  min_subjects: 5,
};

const fieldLabels = {
  subject_code: "Anonim özne kodu",
  age_group: "Yaş grubu",
  consumed_at: "Tüketim zamanı",
  meal_name: "Yemek",
  meal_category: "Kategori",
  calories: "Kalori",
  protein: "Protein",
  iron: "Demir",
};

const statusLabels = {
  SENT: "Mail gönderildi",
  EMAIL_NOT_CONFIGURED: "Brevo eksik",
  DELIVERY_FAILED: "Gönderim başarısız",
  CREATED: "Oluşturuldu",
};

export default function ResearchExportPage() {
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [preview, setPreview] = useState(emptyPreview);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  const filtersReady = (!filters.startDate || filters.startDate.length === 10)
    && (!filters.endDate || filters.endDate.length === 10);

  useEffect(() => {
    if (!filtersReady) return;

    let ignore = false;
    setLoading(true);
    getResearchExportPreview(filters)
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

  useEffect(() => {
    refreshHistory();
  }, []);

  const dateRangeLabel = useMemo(() => {
    if (!preview.date_min && !preview.date_max) return "-";
    const start = preview.date_min ? new Date(preview.date_min).toLocaleDateString("tr-TR") : "-";
    const end = preview.date_max ? new Date(preview.date_max).toLocaleDateString("tr-TR") : "-";
    return `${start} / ${end}`;
  }, [preview.date_min, preview.date_max]);

  const handleFilterChange = (key, value) => {
    setMessage(null);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage(null);
    setSending(true);
    sendResearchExportEmail({ recipientEmail, recipientName, ...filters })
      .then((result) => {
        setPreview((current) => ({ ...current, ...result }));
        if (result.delivery_status === "SENT") {
          setMessage({ type: "success", text: "Mail gönderildi. CSV dosyası ek olarak iletildi." });
        } else if (result.delivery_status === "EMAIL_NOT_CONFIGURED") {
          setMessage({ type: "warning", text: "Export kaydedildi, fakat Brevo ayarları eksik olduğu için mail gönderilmedi." });
        } else {
          setMessage({ type: "warning", text: result.delivery_message || "Export oluşturuldu, gönderim durumu kontrol edilmeli." });
        }
        refreshHistory();
      })
      .catch((error) => {
        setMessage({ type: "error", text: error.response?.data?.detail || "Export gönderimi başarısız oldu." });
        refreshHistory();
      })
      .finally(() => setSending(false));
  };

  function refreshHistory() {
    getResearchExportHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Araştırma Verisi Export</div>
          <div style={s.subtitle}>Anonimleştirilmiş beslenme verisini CSV eki olarak paylaşın.</div>
        </div>
        <span style={{ ...s.badge, ...(preview.brevo_configured ? s.badgeOk : s.badgeWarn) }}>
          {preview.brevo_configured ? "Brevo hazır" : "Brevo eksik"}
        </span>
      </div>

      <div style={s.grid}>
        <section style={s.panel}>
          <div style={s.panelTitle}>Export Kapsamı</div>
          <div style={s.stats}>
            <Metric label="Kayıt" value={loading ? "..." : preview.record_count} />
            <Metric label="Anonim özne" value={loading ? "..." : preview.subject_count} />
            <Metric label="Tarih aralığı" value={loading ? "..." : dateRangeLabel} wide />
          </div>

          <div style={s.fieldBox}>
            <div style={s.smallTitle}>CSV alanları</div>
            <div style={s.fieldGrid}>
              {(preview.fields || []).map((field) => (
                <span key={field} style={s.fieldPill}>{fieldLabels[field] || field}</span>
              ))}
            </div>
          </div>

          <div style={{ ...s.notice, ...(preview.export_allowed ? s.noticeOk : s.noticeWarn) }}>
            {preview.export_allowed
              ? "Veri anonimlik eşiğini karşılıyor. Dosyada doğrudan kimlik alanı bulunmaz; yaş tekil değer yerine yaş grubu olarak verilir."
              : preview.suppression_reason || `Export için en az ${preview.min_subjects} anonim özne gerekir.`}
          </div>
        </section>

        <form style={s.panel} onSubmit={handleSubmit}>
          <div style={s.panelTitle}>Gönderim</div>

          <label style={s.label}>
            Başlangıç tarihi
            <input style={s.input} type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
          </label>
          <label style={s.label}>
            Bitiş tarihi
            <input style={s.input} type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
          </label>
          <label style={s.label}>
            Alıcı e-posta
            <input style={s.input} type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="researcher@example.edu" />
          </label>
          <label style={s.label}>
            Alıcı adı
            <input style={s.input} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Dr. Araştırmacı" />
          </label>

          <button style={{ ...s.button, opacity: sending ? 0.72 : 1 }} disabled={sending || loading || !preview.export_allowed}>
            {sending ? "Gönderiliyor..." : "CSV Dosyası Gönder"}
          </button>

          {message && (
            <div style={{ ...s.message, ...s[message.type] }}>{message.text}</div>
          )}
        </form>
      </div>

      <section style={{ ...s.panel, marginTop: 16 }}>
        <div style={s.panelTitle}>Son Exportlar</div>
        {history.length === 0 ? (
          <div style={s.empty}>Henüz export kaydı yok.</div>
        ) : (
          <div style={s.historyList}>
            {history.map((item) => (
              <div key={item.id} style={s.historyItem}>
                <div>
                  <div style={s.historyTitle}>{item.recipient_email}</div>
                  <div style={s.historyMeta}>
                    {item.record_count} kayıt · {item.subject_count} özne · {formatDate(item.created_at)}
                  </div>
                </div>
                <span style={{ ...s.status, ...statusStyle(item.status) }}>
                  {statusLabels[item.status] || item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, wide = false }) {
  return (
    <div style={{ ...s.metric, gridColumn: wide ? "span 2" : "auto" }}>
      <div style={s.metricLabel}>{label}</div>
      <div style={s.metricValue}>{value}</div>
    </div>
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusStyle(status) {
  if (status === "SENT") return s.statusOk;
  if (status === "DELIVERY_FAILED") return s.statusError;
  return s.statusWarn;
}

const s = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: "var(--text)" },
  subtitle: { fontSize: 13, color: "var(--text2)", marginTop: 4 },
  badge: { borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: "1px solid", whiteSpace: "nowrap" },
  badgeOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  badgeWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap: 16 },
  panel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, boxShadow: "var(--shadow)" },
  panelTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--text)" },
  stats: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 16 },
  metric: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, minHeight: 82 },
  metricLabel: { fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 },
  metricValue: { fontSize: 21, fontWeight: 800, color: "var(--text)", fontFamily: "var(--mono)", overflowWrap: "anywhere" },
  fieldBox: { borderTop: "1px solid var(--border)", paddingTop: 16 },
  smallTitle: { fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 10 },
  fieldGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  fieldPill: { border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text2)", borderRadius: 18, padding: "5px 10px", fontSize: 12, fontWeight: 600 },
  notice: { marginTop: 18, border: "1px solid", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.6 },
  noticeOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  noticeWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  label: { display: "grid", gap: 6, color: "var(--text2)", fontSize: 12, fontWeight: 700, marginBottom: 12 },
  input: { minHeight: 38, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", outline: "none" },
  button: { width: "100%", minHeight: 42, border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 800, marginTop: 4 },
  message: { marginTop: 12, borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.5, border: "1px solid" },
  success: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  warning: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  error: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
  empty: { color: "var(--text3)", fontSize: 13 },
  historyList: { display: "grid", gap: 8 },
  historyItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" },
  historyTitle: { fontSize: 13, fontWeight: 700, color: "var(--text)" },
  historyMeta: { fontSize: 12, color: "var(--text3)", marginTop: 2 },
  status: { borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 800, border: "1px solid", whiteSpace: "nowrap" },
  statusOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  statusWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  statusError: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
};
