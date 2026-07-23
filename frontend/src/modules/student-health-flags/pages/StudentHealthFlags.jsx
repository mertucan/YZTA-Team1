import { useEffect, useMemo, useState } from "react";
import { getStudents } from "../../../api/students";
import {
  createStudentHealthFlag,
  getStudentHealthFlags,
  updateStudentHealthFlag,
} from "../api/studentHealthFlags";
import LoadingSpinner from "../../../components/LoadingSpinner";

const conditionOptions = [
  { value: "diabetes", label: "Diyabet" },
  { value: "celiac", label: "Çölyak" },
  { value: "allergy", label: "Alerji" },
  { value: "hypertension", label: "Hipertansiyon" },
  { value: "other", label: "Diğer" },
];

const severityOptions = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
];

const severityStyle = {
  low: { label: "Düşük", color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" },
  medium: { label: "Orta", color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)" },
  high: { label: "Yüksek", color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)" },
};

const emptyForm = {
  student_id: "",
  condition_type: "diabetes",
  flag_label: "",
  severity: "medium",
  notes: "",
  is_active: true,
};

export default function StudentHealthFlags() {
  const [students, setStudents] = useState([]);
  const [flags, setFlags] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");
  const [formOpen, setFormOpen] = useState(true);
  const [flagsOpen, setFlagsOpen] = useState(false);

  const refresh = () =>
    Promise.all([getStudents(), getStudentHealthFlags()])
      .then(([studentRows, flagRows]) => {
        setStudents(studentRows);
        setFlags(flagRows);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const filteredFlags = useMemo(() => {
    return flags.filter((flag) => {
      const student = flag.students || {};
      const haystack = `${student.first_name || ""} ${student.last_name || ""} ${flag.flag_label} ${flag.notes || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus =
        activeFilter === "all" ||
        (activeFilter === "active" && flag.is_active) ||
        (activeFilter === "inactive" && !flag.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [flags, search, activeFilter]);

  const activeCount = flags.filter((flag) => flag.is_active).length;
  const highRiskCount = flags.filter((flag) => flag.is_active && flag.severity === "high").length;
  const flaggedStudentCount = new Set(flags.filter((flag) => flag.is_active).map((flag) => flag.student_id)).size;

  const handleAdd = async () => {
    if (!form.student_id || !form.flag_label.trim()) return;

    await createStudentHealthFlag({
      ...form,
      student_id: Number(form.student_id),
      notes: form.notes.trim() || null,
    });
    setForm(emptyForm);
    refresh();
  };

  const toggleActive = async (flag) => {
    await updateStudentHealthFlag(flag.id, { is_active: !flag.is_active });
    refresh();
  };

  const selectedConditionLabel = conditionOptions.find((item) => item.value === form.condition_type)?.label || "";

  return (
    <div>
      <div style={pageHeader}>
        <div style={pageTitle}>Sağlık Bayrakları</div>
      </div>

      <div style={summaryGrid}>
        {[
          { label: "Aktif Bayrak", value: activeCount, color: "var(--accent)" },
          { label: "İşaretli Öğrenci", value: flaggedStudentCount, color: "var(--purple)" },
          { label: "Yüksek Öncelik", value: highRiskCount, color: "var(--red)" },
        ].map((item) => (
          <div key={item.label} style={statCard}>
            <div style={{ ...statBar, background: item.color }} />
            <div style={statLabel}>{item.label}</div>
            <div style={statValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <button type="button" onClick={() => setFormOpen((open) => !open)} style={accordionHeader} aria-expanded={formOpen}>
          <div>
            <div style={cardTitle}>Yeni Kısıtlama / Bayrak Ekle</div>
            <div style={cardHint}>Öğrenci bazlı rahatsızlık, alerji veya menü kısıtı tanımlayın.</div>
          </div>
          <span style={accordionToggle}>{formOpen ? "Kapat" : "Aç"}</span>
        </button>
        {formOpen && (
        <div style={formGrid}>
          <div>
            <div style={fieldLabel}>Öğrenci</div>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} style={input}>
              <option value="">Öğrenci seç</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={fieldLabel}>Rahatsızlık</div>
            <select
              value={form.condition_type}
              onChange={(e) => {
                const label = conditionOptions.find((item) => item.value === e.target.value)?.label || "";
                setForm({ ...form, condition_type: e.target.value, flag_label: form.flag_label || label });
              }}
              style={input}
            >
              {conditionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={fieldLabel}>Bayrak Başlığı</div>
            <input
              value={form.flag_label}
              placeholder={`${selectedConditionLabel} menü kısıtı`}
              onChange={(e) => setForm({ ...form, flag_label: e.target.value })}
              style={input}
            />
          </div>

          <div>
            <div style={fieldLabel}>Öncelik</div>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={input}>
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button onClick={handleAdd} style={btnPrimary} data-toast="Sağlık bayrağı eklendi">Ekle</button>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={fieldLabel}>Not</div>
            <input
              value={form.notes}
              placeholder="Örn. Glutensiz menü, düşük şekerli seçenek, alerjen uyarısı..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={input}
            />
          </div>
        </div>
        )}
      </div>

      <div style={card}>
        <button type="button" onClick={() => setFlagsOpen((open) => !open)} style={accordionHeader} aria-expanded={flagsOpen}>
          <div>
            <div style={cardTitle}>Öğrenci Sağlık Kısıtları</div>
            <div style={cardHint}>Kayıtları öğrenci, not veya durum filtresiyle inceleyin.</div>
          </div>
          <span style={accordionToggle}>{flagsOpen ? "Kapat" : "Aç"}</span>
        </button>
        {flagsOpen && (
          <>
            <div style={listToolbar}>
              <div style={activeListLabel}>{filteredFlags.length} kayıt gösteriliyor</div>
              <div style={filterActions}>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Öğrenci veya not ara..." style={{ ...input, maxWidth: 300 }} />
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={{ ...input, maxWidth: 150 }}>
                  <option value="active">Aktifler</option>
                  <option value="inactive">Pasifler</option>
                  <option value="all">Tümü</option>
                </select>
              </div>
            </div>
            {loading ? (
              <LoadingSpinner label="Sağlık kısıtları yükleniyor" minHeight={180} size={38} />
            ) : filteredFlags.length === 0 ? (
              <div style={emptyState}>Kayıt bulunamadı.</div>
            ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Öğrenci", "Bayrak", "Öncelik", "Not", "Durum", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredFlags.map((flag) => {
                const student = flag.students || {};
                const severity = severityStyle[flag.severity] || severityStyle.medium;

                return (
                  <tr key={flag.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>
                        {student.first_name} {student.last_name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                        {student.national_id || `ID: ${flag.student_id}`}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{flag.flag_label}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>
                        {conditionOptions.find((item) => item.value === flag.condition_type)?.label || flag.condition_type}
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ ...pill, background: severity.bg, color: severity.color, borderColor: severity.border }}>
                        {severity.label}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 340 }}>{flag.notes || "-"}</td>
                    <td style={td}>
                      <span style={{ ...pill, background: flag.is_active ? "var(--green-bg)" : "var(--surface2)", color: flag.is_active ? "var(--green)" : "var(--text3)", borderColor: flag.is_active ? "var(--green-border)" : "var(--border2)" }}>
                        {flag.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => toggleActive(flag)}
                          style={flag.is_active ? btnSm : btnPrimary}
                          data-toast={flag.is_active ? "Sağlık bayrağı pasifleştirildi" : "Sağlık bayrağı aktifleştirildi"}
                        >
                          {flag.is_active ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 14px 36px rgba(24, 24, 24, 0.07)", marginBottom: 16, overflow: "hidden" };
const pageHeader = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 14 };
const pageTitle = { color: "var(--ingredients-text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, lineHeight: 1.05, fontWeight: 700 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 };
const cardTitle = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.15, fontWeight: 700 };
const cardHint = { color: "var(--text3)", fontSize: 12, marginTop: 4, fontWeight: 600 };
const accordionHeader = { width: "100%", padding: "15px 18px 13px", border: "none", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer" };
const accordionToggle = { color: "var(--accent)", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const formGrid = { padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)) auto", gap: 10, alignItems: "end" };
const listToolbar = { padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--surface2)", borderBottom: "1px solid var(--border)" };
const activeListLabel = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700 };
const filterActions = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", flex: 1 };
const emptyState = { padding: 28, color: "var(--text3)", textAlign: "center" };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 700 };
const input = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" };
const th = { textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)", verticalAlign: "top" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const pill = { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700 };
const statCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", boxShadow: "var(--shadow)", position: "relative", overflow: "hidden" };
const statBar = { position: "absolute", top: 0, left: 0, right: 0, height: 3 };
const statLabel = { fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const statValue = { fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)" };
