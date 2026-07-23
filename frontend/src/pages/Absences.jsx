import { useEffect, useRef, useState } from "react";
import { getAbsences, createAbsence, deleteAbsence, bulkCreateAbsences } from "../api/absences";
import { getStudents } from "../api/students";
import { downloadTemplate, parseSheet, pickField } from "../utils/excel";
import LoadingSpinner from "../components/LoadingSpinner";

const emptyForm = { student_id: 0, absence_date: "" };

// Excel'den gelen çeşitli tarih formatlarını YYYY-MM-DD'ye çevirir.
function normalizeDate(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  // 2026-07-15
  let m = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // 15.07.2026 veya 15/07/2026
  m = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // Excel seri numarası (nadir; raw:false ile genelde gelmez)
  if (/^\d+$/.test(value)) {
    const serial = Number(value);
    if (serial > 59 && serial < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  return "";
}

export default function Absences() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [studentQuery, setStudentQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [absenceListOpen, setAbsenceListOpen] = useState(false);
  const fileInputRef = useRef(null);

  const refresh = () =>
    getAbsences()
      .then(setItems)
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
    getStudents().then(setStudents);
  }, []);

  const handleDownloadTemplate = () => {
    downloadTemplate(
      ["TC Kimlik No", "Tarih (YYYY-AA-GG)"],
      [
        ["10000000002", "2026-07-15"],
        ["10000000003", "2026-07-16"],
      ],
      "devamsizlik_sablonu",
      "Devamsızlık"
    );
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const rows = await parseSheet(file);
      // TC -> öğrenci id eşlemesi
      const byNationalId = new Map(students.map((s) => [String(s.national_id), s.id]));
      const parsed = [];
      const formatErrors = [];
      rows.forEach((row, idx) => {
        const nationalId = String(pickField(row, ["TC Kimlik No", "TC", "TCKN", "national_id"])).replace(/\D/g, "");
        const dateRaw = pickField(row, ["Tarih (YYYY-AA-GG)", "Tarih", "absence_date", "date"]);
        const rowNo = idx + 2;

        if (!nationalId && !dateRaw) return; // boş satır
        if (nationalId.length !== 11) {
          formatErrors.push({ row: rowNo, message: `Geçersiz TC Kimlik No: "${nationalId}"` });
          return;
        }
        const student_id = byNationalId.get(nationalId);
        if (!student_id) {
          formatErrors.push({ row: rowNo, message: `TC "${nationalId}" ile kayıtlı öğrenci bulunamadı` });
          return;
        }
        const absence_date = normalizeDate(dateRaw);
        if (!absence_date) {
          formatErrors.push({ row: rowNo, message: `Geçersiz tarih: "${dateRaw}" (YYYY-AA-GG bekleniyor)` });
          return;
        }
        parsed.push({ student_id, absence_date, _row: rowNo });
      });

      if (parsed.length === 0) {
        setImportResult({ successCount: 0, errors: formatErrors, total: rows.length });
      } else {
        const { successCount, errors } = await bulkCreateAbsences(parsed);
        setImportResult({ successCount, errors: [...formatErrors, ...errors], total: parsed.length + formatErrors.length });
        refresh();
      }
    } catch (err) {
      setImportResult({ successCount: 0, errors: [{ row: "-", message: err?.message || "Dosya okunamadı." }], total: 0 });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedStudent = students.find((s) => s.id === form.student_id);
  const filteredItems = items.filter((a) => {
    const q = search.toLowerCase();
    const s = a.students;
    if (!s) return false;
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.national_id.includes(search);
  });
  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = items.filter((item) => item.absence_date >= today).length;
  const summary = [
    { label: "Toplam kayıt", value: items.length },
    { label: "Listelenen kayıt", value: filteredItems.length },
    { label: "Yaklaşan gün", value: upcomingCount },
    { label: "Öğrenci havuzu", value: students.length },
  ];

  const studentMatches = studentQuery
    ? students
        .filter((s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentQuery.toLowerCase()) ||
          s.national_id.includes(studentQuery)
        )
        .slice(0, 8)
    : [];

  const handleAdd = async () => {
    if (form.student_id <= 0 || !form.absence_date) return;
    setError("");
    setSuccess("");
    setAdding(true);
    try {
      await createAbsence(form);
      setForm(emptyForm);
      setStudentQuery("");
      setSuccess("Devamsızlık başarıyla eklendi.");
      refresh();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Devamsızlık eklenemedi.",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div style={pageHeader}>
        <div style={pageTitle}>Devamsızlık Kayıtları</div>
      </div>

      <div style={summaryGrid}>
        {summary.map((item) => (
          <div key={item.label} style={summaryCard}>
            <div style={summaryLabel}>{item.label}</div>
            <div style={summaryValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={cardHdSplit}>
          <div>
            <div style={cardTitle}>Devamsızlık Ekle</div>
            <div style={cardHint}>Yemekhanede olmayacak öğrencileri tek tek veya Excel dosyasıyla ekleyin.</div>
          </div>
          <div style={headerActions}>
            <button onClick={handleDownloadTemplate} style={btnGhost}>Örnek Şablon İndir</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ ...btnPrimary, opacity: importing ? 0.7 : 1 }}>
              {importing ? "Yükleniyor..." : "Excel ile Yükle"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelected}
              style={{ display: "none" }}
            />
          </div>
        </div>
        {importResult && (
          <div style={resultBox}>
            <div style={{ color: "var(--green, #38a169)", fontWeight: 600 }}>
              {importResult.successCount} devamsızlık eklendi{importResult.total ? ` (${importResult.total} satır işlendi)` : ""}.
            </div>
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 6, color: "var(--red, #e53e3e)" }}>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>{importResult.errors.length} satır eklenemedi:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {importResult.errors.slice(0, 8).map((e, i) => (
                    <li key={i}>Satır {e.row}: {e.message}</li>
                  ))}
                  {importResult.errors.length > 8 && <li>... ve {importResult.errors.length - 8} satır daha</li>}
                </ul>
              </div>
            )}
          </div>
        )}
        <div
          style={formGrid}
        >
          <div style={{ position: "relative" }}>
            <div style={fieldLabel}>Öğrenci</div>
            {selectedStudent ? (
              <div
                style={{
                  ...input,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {selectedStudent.first_name} {selectedStudent.last_name}{" "}
                  <span style={{ color: "var(--text3)", fontFamily: "var(--mono)" }}>
                    ({selectedStudent.national_id})
                  </span>
                </span>
                <button
                  onClick={() => setForm({ ...form, student_id: 0 })}
                  style={{ ...btnSm, padding: "1px 8px" }}
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={studentQuery}
                placeholder="İsim veya TC ile ara..."
                onChange={(e) => setStudentQuery(e.target.value)}
                style={input}
              />
            )}
            {!selectedStudent && studentQuery && studentMatches.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: "var(--surface)",
                  border: "1px solid var(--border2)",
                  borderRadius: 7,
                  marginTop: 4,
                  boxShadow: "var(--shadow)",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {studentMatches.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setForm({ ...form, student_id: s.id });
                      setStudentQuery("");
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {s.first_name} {s.last_name}{" "}
                    <span style={{ color: "var(--text3)", fontFamily: "var(--mono)" }}>
                      ({s.national_id})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={fieldLabel}>Tarih</div>
            <input
              type="date"
              value={form.absence_date}
              onChange={(e) =>
                setForm({ ...form, absence_date: e.target.value })
              }
              style={input}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{
              ...btnPrimary,
              opacity: adding ? 0.7 : 1,
              cursor: adding ? "not-allowed" : "pointer",
            }}
          >
            {adding ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>
        {error && (
          <div
            style={{
              padding: "0 18px 14px",
              fontSize: 12,
              color: "var(--red, #e53e3e)",
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: "0 18px 14px",
              fontSize: 12,
              color: "var(--green, #38a169)",
            }}
          >
            {success}
          </div>
        )}
      </div>

      <div style={card}>
        <button
          type="button"
          onClick={() => setAbsenceListOpen((open) => !open)}
          style={accordionHeader}
          aria-expanded={absenceListOpen}
        >
          <div>
            <div style={cardTitle}>Devamsızlık Listesi</div>
            <div style={cardHint}>Kayıtları isim veya TC kimlik numarasıyla filtreleyin.</div>
          </div>
          <span style={accordionToggle}>{absenceListOpen ? "Kapat" : "Aç"}</span>
        </button>
        {absenceListOpen && (
          <>
            <div style={listToolbar}>
              <div style={activeListLabel}>{filteredItems.length} kayıt gösteriliyor</div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İsim veya TC ile ara..."
                style={{ ...input, maxWidth: 360 }}
              />
            </div>
            {loading ? (
              <LoadingSpinner label="Devamsızlık listesi yükleniyor" minHeight={180} size={38} />
            ) : filteredItems.length === 0 ? (
              <div style={emptyState}>Kayıt bulunamadı.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Ad Soyad", "TC Kimlik No", "Tarih", ""].map((h) => (
                        <th key={h} style={th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((a) => (
                      <tr key={a.id}>
                        <td style={td}>{a.students?.first_name} {a.students?.last_name}</td>
                        <td style={{ ...td, fontFamily: "var(--mono)" }}>{a.students?.national_id}</td>
                        <td style={{ ...td, fontFamily: "var(--mono)" }}>
                          {a.absence_date}
                        </td>
                        <td style={td}>
                          <button
                            onClick={() => deleteAbsence(a.id).then(refresh)}
                            style={btnSm}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
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

const card = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  boxShadow: "0 14px 36px rgba(24, 24, 24, 0.07)",
  marginBottom: 16,
  overflow: "hidden",
};
const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 16,
  marginBottom: 14,
};
const pageTitle = {
  color: "var(--ingredients-text)",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 700,
};
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 };
const summaryCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "13px 15px", boxShadow: "0 10px 26px rgba(24, 24, 24, 0.06)" };
const summaryLabel = { color: "var(--text3)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 };
const summaryValue = { color: "var(--text)", fontSize: 24, lineHeight: 1, fontWeight: 800, fontFamily: "var(--mono)" };
const cardHdSplit = {
  padding: "15px 18px 13px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface2)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const cardTitle = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.15, fontWeight: 700 };
const cardHint = { color: "var(--text3)", fontSize: 12, marginTop: 4, fontWeight: 600 };
const headerActions = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const resultBox = { padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface)", fontSize: 12 };
const formGrid = { padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr)) auto", gap: 10, alignItems: "end" };
const accordionHeader = { width: "100%", padding: "15px 18px 13px", border: "none", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer" };
const accordionToggle = { color: "var(--accent)", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const listToolbar = { padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--surface2)", borderBottom: "1px solid var(--border)" };
const activeListLabel = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700 };
const emptyState = { padding: 24, color: "var(--text3)", fontSize: 13 };
const fieldLabel = {
  fontSize: 11,
  color: "var(--text2)",
  marginBottom: 5,
  fontWeight: 700,
};
const input = {
  width: "100%",
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  borderRadius: 7,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};
const th = {
  textAlign: "left",
  fontSize: 10,
  fontWeight: 800,
  color: "var(--text3)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  padding: "11px 16px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface2)",
};
const td = {
  padding: "11px 16px",
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
  fontWeight: 800,
  cursor: "pointer",
};
const btnSm = {
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  color: "var(--text2)",
  padding: "5px 10px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
};
const btnGhost = {
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  color: "var(--text)",
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
