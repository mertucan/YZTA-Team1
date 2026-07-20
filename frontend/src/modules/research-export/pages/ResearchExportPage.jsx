import { useEffect, useMemo, useState } from "react";
import {
  getResearchExportHistory,
  getResearchExportPreview,
  getResearchExportTables,
  sendResearchExportEmail,
} from "../api/researchExport";

const emptyPreview = {
  record_count: 0,
  subject_count: 0,
  table_count: 0,
  tables: [],
  fields: [],
  brevo_configured: false,
  export_allowed: false,
  suppression_reason: null,
  min_subjects: 5,
};

const statusLabels = {
  SENT: "Mail gonderildi",
  EMAIL_NOT_CONFIGURED: "Brevo eksik",
  DELIVERY_FAILED: "Gonderim basarisiz",
  CREATED: "Olusturuldu",
};

const getTableKind = (table) => {
  if (table.requires_min_subjects) return "Anonim";
  if (table.id.includes("meal")) return "Yemek";
  if (table.id.includes("ingredient")) return "Malzeme";
  if (table.id.includes("menu")) return "Menu";
  if (table.id.includes("company") || table.id.includes("universit")) return "Kurum";
  return "Veri";
};

export default function ResearchExportPage() {
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [tables, setTables] = useState([]);
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [preview, setPreview] = useState(emptyPreview);
  const [history, setHistory] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectedTables = useMemo(
    () => selectedTableIds.map((id) => tables.find((table) => table.id === id)).filter(Boolean),
    [selectedTableIds, tables],
  );
  const availableTables = useMemo(
    () => tables.filter((table) => !selectedTableIds.includes(table.id)),
    [tables, selectedTableIds],
  );
  const previewByTable = useMemo(
    () => new Map((preview.tables || []).map((table) => [table.id, table])),
    [preview.tables],
  );
  const previewMatchesSelection = useMemo(() => {
    const previewIds = preview.selected_table_ids || [];
    return previewIds.length === selectedTableIds.length
      && previewIds.every((id, index) => id === selectedTableIds[index]);
  }, [preview.selected_table_ids, selectedTableIds]);

  const filtersReady = (!filters.startDate || filters.startDate.length === 10)
    && (!filters.endDate || filters.endDate.length === 10);

  useEffect(() => {
    let ignore = false;
    setLoadingTables(true);
    getResearchExportTables()
      .then((data) => {
        if (ignore) return;
        setTables(data.tables || []);
        setSelectedTableIds(data.default_table_ids || ["student_meals"]);
      })
      .catch((error) => {
        if (!ignore) setMessage({ type: "error", text: error.response?.data?.detail || "Tablo listesi alinamadi." });
      })
      .finally(() => {
        if (!ignore) setLoadingTables(false);
      });
    refreshHistory();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!filtersReady || loadingTables || selectedTableIds.length === 0) {
      setPreview((current) => ({ ...current, tables: [], record_count: 0, table_count: 0, export_allowed: false }));
      return;
    }

    let ignore = false;
    setLoadingPreview(true);
    getResearchExportPreview(filters, selectedTableIds)
      .then((data) => {
        if (!ignore) setPreview(data);
      })
      .catch((error) => {
        if (!ignore) setMessage({ type: "error", text: error.response?.data?.detail || "On izleme alinamadi." });
      })
      .finally(() => {
        if (!ignore) setLoadingPreview(false);
      });
    return () => {
      ignore = true;
    };
  }, [filters, filtersReady, loadingTables, selectedTableIds]);

  const handleFilterChange = (key, value) => {
    setMessage(null);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const addTable = (tableId) => {
    setMessage(null);
    setSelectedTableIds((current) => current.includes(tableId) ? current : [...current, tableId]);
  };

  const removeTable = (tableId) => {
    setMessage(null);
    setSelectedTableIds((current) => current.filter((id) => id !== tableId));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage(null);
    setSending(true);
    sendResearchExportEmail({ recipientEmail, recipientName, ...filters, tableIds: selectedTableIds })
      .then((result) => {
        setPreview((current) => ({ ...current, ...result }));
        if (result.delivery_status === "SENT") {
          setMessage({ type: "success", text: `${result.attachments?.length || selectedTableIds.length} CSV dosyasi mail ekinde gonderildi.` });
        } else if (result.delivery_status === "EMAIL_NOT_CONFIGURED") {
          setMessage({ type: "warning", text: "Export kaydedildi, fakat Brevo ayarlari eksik oldugu icin mail gonderilmedi." });
        } else {
          setMessage({ type: "warning", text: result.delivery_message || "Export olusturuldu, gonderim durumu kontrol edilmeli." });
        }
        refreshHistory();
      })
      .catch((error) => {
        setMessage({ type: "error", text: error.response?.data?.detail || "Export gonderimi basarisiz oldu." });
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
          <div style={s.title}>Arastirma Veri Exportu</div>
          <div style={s.subtitle}>Anonimlestirilmis tablolari secin, ASCII uyumlu CSV ekleri olarak maille gonderin.</div>
        </div>
        <span style={{ ...s.badge, ...(preview.brevo_configured ? s.badgeOk : s.badgeWarn) }}>
          {preview.brevo_configured ? "Brevo hazir" : "Brevo eksik"}
        </span>
      </div>

      <section style={s.panel}>
        <div style={s.panelHeader}>
          <div>
            <div style={s.panelTitle}>Export Edilebilir Tablolar</div>
            <div style={s.panelHint}>Bir tabloya tiklayinca alttaki gonderim listesine eklenir.</div>
          </div>
          <span style={s.count}>{availableTables.length} uygun tablo</span>
        </div>

        {loadingTables ? (
          <div style={s.empty}>Tablolar yukleniyor...</div>
        ) : (
          <div style={s.tableGrid}>
            {availableTables.map((table) => (
              <button
                key={table.id}
                type="button"
                style={s.tableCard}
                onClick={() => addTable(table.id)}
                title={table.description}
              >
                <span style={s.tableTop}>
                  <span style={s.tableIcon}>{table.requires_min_subjects ? "#" : "+"}</span>
                  <span style={s.tableCopy}>
                    <span style={s.tableName}>{table.label}</span>
                    <span style={s.tableId}>{table.id}</span>
                  </span>
                </span>
                <span style={s.tableFooter}>
                  <span style={s.tableBadge}>{getTableKind(table)}</span>
                  <span style={s.tableMeta}>{table.fields.length} alan</span>
                  {table.requires_min_subjects && (
                    <span style={s.tableMeta}>min {preview.min_subjects} ozne</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div style={s.mainGrid}>
        <section style={s.panel}>
          <div style={s.panelHeader}>
            <div>
              <div style={s.panelTitle}>Secilen Export Menusu</div>
              <div style={s.panelHint}>Bu listedeki her tablo ayri CSV dosyasi olarak mail ekine eklenir.</div>
            </div>
            <span style={s.count}>{selectedTables.length} tablo</span>
          </div>

          {selectedTables.length === 0 ? (
            <div style={s.dropEmpty}>Ustteki tablolara tiklayarak buraya ekleyin.</div>
          ) : (
            <div style={s.selectedList}>
              {selectedTables.map((table) => {
                const tablePreview = previewByTable.get(table.id);
                return (
                  <div key={table.id} style={s.selectedItem}>
                    <div>
                      <div style={s.selectedTitle}>{table.label}</div>
                      <div style={s.selectedMeta}>
                        {loadingPreview || !previewMatchesSelection ? "Hesaplaniyor..." : `${tablePreview?.record_count ?? 0} kayit`}
                        {tablePreview?.contains_subjects ? ` · ${tablePreview.subject_count} anonim ozne` : ""}
                      </div>
                    </div>
                    <button type="button" style={s.removeButton} onClick={() => removeTable(table.id)}>Kaldir</button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={s.summaryGrid}>
            <Metric label="Toplam kayit" value={loadingPreview || !previewMatchesSelection ? "..." : preview.record_count} />
            <Metric label="Anonim ozne" value={loadingPreview || !previewMatchesSelection ? "..." : preview.subject_count} />
            <Metric label="CSV dosyasi" value={loadingPreview || !previewMatchesSelection ? "..." : preview.table_count} />
          </div>

          <div style={{ ...s.notice, ...(preview.export_allowed ? s.noticeOk : s.noticeWarn) }}>
            {preview.export_allowed
              ? "Export hazir. Ogrenci ve kullanici idleri anonim koda donusturulur; ad, soyad, TC, e-posta, telefon ve adres alanlari aktarilmaz."
              : preview.suppression_reason || `Kisi iceren tablolar icin en az ${preview.min_subjects} anonim ozne gerekir.`}
          </div>
        </section>

        <form style={s.panel} onSubmit={handleSubmit}>
          <div style={s.panelTitle}>Mail Gonderimi</div>

          <label style={s.label}>
            Baslangic tarihi
            <input style={s.input} type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
          </label>
          <label style={s.label}>
            Bitis tarihi
            <input style={s.input} type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
          </label>
          <label style={s.label}>
            Alici e-posta
            <input style={s.input} type="email" required value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="researcher@example.edu" />
          </label>
          <label style={s.label}>
            Alici adi
            <input style={s.input} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Dr. Arastirmaci" />
          </label>

          <button style={{ ...s.button, opacity: sending ? 0.72 : 1 }} disabled={sending || loadingPreview || !preview.export_allowed || selectedTableIds.length === 0}>
            {sending ? "Gonderiliyor..." : "Secili Tablolari Maille"}
          </button>

          {message && (
            <div style={{ ...s.message, ...s[message.type] }}>{message.text}</div>
          )}
        </form>
      </div>

      <section style={{ ...s.panel, marginTop: 16 }}>
        <button type="button" style={s.historyHeader} onClick={() => setHistoryOpen((open) => !open)}>
          <span style={s.panelTitleInline}>Son Exportlar</span>
          <span style={s.historyToggle}>{historyOpen ? "Kapat" : `Ac (${history.length})`}</span>
        </button>
        {historyOpen && (
          history.length === 0 ? (
            <div style={s.empty}>Henuz export kaydi yok.</div>
          ) : (
            <div style={s.historyList}>
              {history.map((item) => (
                <div key={item.id} style={s.historyItem}>
                  <div>
                    <div style={s.historyTitle}>{item.recipient_email}</div>
                    <div style={s.historyMeta}>
                      {item.record_count} kayit · {item.subject_count} ozne · {formatDate(item.created_at)}
                    </div>
                  </div>
                  <span style={{ ...s.status, ...statusStyle(item.status) }}>
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={s.metric}>
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
  title: { fontSize: 20, fontWeight: 800, color: "var(--text)" },
  subtitle: { fontSize: 13, color: "var(--text2)", marginTop: 4 },
  badge: { borderRadius: 18, padding: "6px 12px", fontSize: 12, fontWeight: 800, border: "1px solid", whiteSpace: "nowrap" },
  badgeOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  badgeWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  panel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, boxShadow: "var(--shadow)" },
  panelHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  panelTitle: { fontSize: 15, fontWeight: 800, color: "var(--text)" },
  panelTitleInline: { fontSize: 15, fontWeight: 800, color: "var(--text)" },
  panelHint: { fontSize: 12, color: "var(--text3)", marginTop: 4 },
  count: { border: "1px solid var(--border2)", borderRadius: 18, color: "var(--text2)", background: "var(--surface2)", padding: "5px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  tableGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 },
  tableCard: { minHeight: 92, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10, textAlign: "left", border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", borderRadius: 8, padding: 12, cursor: "pointer" },
  tableTop: { display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 },
  tableIcon: { width: 28, height: 28, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 8, background: "var(--accent-bg)", color: "var(--accent)", fontSize: 16, fontWeight: 900 },
  tableCopy: { display: "grid", gap: 3, minWidth: 0 },
  tableName: { fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tableId: { fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tableFooter: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 },
  tableBadge: { border: "1px solid var(--border2)", borderRadius: 14, background: "var(--surface)", color: "var(--text2)", padding: "3px 7px", fontSize: 11, fontWeight: 800 },
  tableMeta: { color: "var(--text3)", fontSize: 11, fontWeight: 700 },
  mainGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)", gap: 16, marginTop: 16 },
  dropEmpty: { minHeight: 134, display: "grid", placeItems: "center", border: "1px dashed var(--border2)", borderRadius: 8, color: "var(--text3)", background: "var(--surface2)", fontSize: 13 },
  selectedList: { display: "grid", gap: 8 },
  selectedItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--border)", background: "var(--surface2)", borderRadius: 8, padding: 12 },
  selectedTitle: { fontSize: 13, fontWeight: 800, color: "var(--text)" },
  selectedMeta: { fontSize: 12, color: "var(--text3)", marginTop: 3 },
  removeButton: { border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text2)", background: "var(--surface)", padding: "7px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 14 },
  metric: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, minHeight: 72 },
  metricLabel: { fontSize: 11, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: 900, color: "var(--text)", fontFamily: "var(--mono)", overflowWrap: "anywhere" },
  notice: { marginTop: 14, border: "1px solid", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.55 },
  noticeOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  noticeWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  label: { display: "grid", gap: 6, color: "var(--text2)", fontSize: 12, fontWeight: 800, marginBottom: 12 },
  input: { minHeight: 38, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", outline: "none" },
  button: { width: "100%", minHeight: 42, border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 900, marginTop: 4, cursor: "pointer" },
  message: { marginTop: 12, borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.5, border: "1px solid" },
  success: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  warning: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  error: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
  empty: { color: "var(--text3)", fontSize: 13 },
  historyHeader: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "transparent", border: "none", padding: 0, margin: 0, cursor: "pointer", textAlign: "left" },
  historyToggle: { border: "1px solid var(--border2)", borderRadius: 18, background: "var(--surface2)", color: "var(--text2)", padding: "5px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  historyList: { display: "grid", gap: 8, marginTop: 12 },
  historyItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" },
  historyTitle: { fontSize: 13, fontWeight: 800, color: "var(--text)" },
  historyMeta: { fontSize: 12, color: "var(--text3)", marginTop: 2 },
  status: { borderRadius: 18, padding: "4px 10px", fontSize: 11, fontWeight: 800, border: "1px solid", whiteSpace: "nowrap" },
  statusOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  statusWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  statusError: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
};
