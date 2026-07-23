import { useEffect, useRef, useState } from "react";
import { getStudents, createStudent, deleteStudent, bulkCreateStudents } from "../api/students";
import { downloadTemplate, parseSheet, pickField } from "../utils/excel";
import LoadingSpinner from "../components/LoadingSpinner";

const emptyForm = { first_name: "", last_name: "", national_id: "", age: 18 };

function digitsOnly(value, maxLength) {
  const digits = String(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function integerInputValue(value, min = 0) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return Math.max(min, Number(digits.replace(/^0+(?=\d)/, "")));
}

export default function Students() {
  const [items, setItems]     = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [studentListOpen, setStudentListOpen] = useState(false);
  const fileInputRef = useRef(null);

  const refresh = () => getStudents().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!form.first_name || !form.national_id) return;
    await createStudent(form);
    setForm(emptyForm);
    refresh();
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(
      ["Ad", "Soyad", "TC Kimlik No", "Yaş"],
      [
        ["Ahmet", "Yılmaz", "10000000099", 20],
        ["Ayşe", "Demir", "10000000098", 19],
      ],
      "ogrenci_sablonu",
      "Öğrenciler"
    );
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const rows = await parseSheet(file);
      const parsed = [];
      const formatErrors = [];
      rows.forEach((row, idx) => {
        const first_name = pickField(row, ["Ad", "Ad ", "İsim", "Isim", "first_name"]);
        const last_name = pickField(row, ["Soyad", "last_name"]);
        const national_id = digitsOnly(pickField(row, ["TC Kimlik No", "TC", "TCKN", "national_id"]));
        const ageRaw = pickField(row, ["Yaş", "Yas", "age"]);
        const age = Number(digitsOnly(ageRaw)) || 0;
        const rowNo = idx + 2;

        if (!first_name && !last_name && !national_id && !ageRaw) return; // boş satır atla
        if (national_id.length !== 11) {
          formatErrors.push({ row: rowNo, message: `TC Kimlik No 11 haneli olmalı (girilen: "${national_id}")` });
          return;
        }
        if (!first_name) {
          formatErrors.push({ row: rowNo, message: "Ad boş olamaz" });
          return;
        }
        parsed.push({ first_name, last_name, national_id, age });
      });

      if (parsed.length === 0) {
        setImportResult({ successCount: 0, errors: formatErrors, total: rows.length });
      } else {
        const { successCount, errors } = await bulkCreateStudents(parsed);
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

  const fields = [
    { label: "Ad",           key: "first_name",  placeholder: "Ad" },
    { label: "Soyad",        key: "last_name",   placeholder: "Soyad" },
    { label: "TC Kimlik No", key: "national_id", placeholder: "11 hane" },
  ];
  const filteredItems = items.filter((s) => {
    const q = search.toLowerCase();
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.national_id.includes(search);
  });
  const avgAge = items.length
    ? Math.round(items.reduce((sum, student) => sum + Number(student.age || 0), 0) / items.length)
    : 0;
  const summary = [
    { label: "Toplam öğrenci", value: items.length },
    { label: "Listelenen kayıt", value: filteredItems.length },
    { label: "Ortalama yaş", value: avgAge || "-" },
    { label: "İçe aktarma", value: importResult ? importResult.successCount : "-" },
  ];

  return (
    <div>
      <div style={pageHeader}>
        <div style={pageTitle}>Öğrenciler</div>
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
            <div style={cardTitle}>Yeni Öğrenci Ekle</div>
            <div style={cardHint}>Tek kayıt ekleyin veya Excel dosyasıyla toplu öğrenci aktarın.</div>
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
            <div style={{ color: "var(--green)", fontWeight: 600 }}>
              {importResult.successCount} öğrenci eklendi{importResult.total ? ` (${importResult.total} satır işlendi)` : ""}.
            </div>
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 6, color: "var(--red)" }}>
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
        <div style={formGrid}>
          {fields.map(({ label, key, placeholder }) => (
            <div key={key}>
              <div style={fieldLabel}>{label}</div>
              <input
                value={form[key]}
                placeholder={placeholder}
                inputMode={key === "national_id" ? "numeric" : undefined}
                maxLength={key === "national_id" ? 11 : undefined}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]:
                      key === "national_id"
                        ? digitsOnly(e.target.value, 11)
                        : e.target.value,
                  })
                }
                style={input}
              />
            </div>
          ))}
          <div>
            <div style={fieldLabel}>Yaş</div>
            <input
              type="text"
              inputMode="numeric"
              value={form.age}
              onFocus={(e) => {
                if (String(form.age) === "18") {
                  setForm({ ...form, age: "" });
                }
                e.target.select();
              }}
              onBlur={() => {
                if (form.age === "") {
                  setForm({ ...form, age: 18 });
                }
              }}
              onChange={(e) =>
                setForm({ ...form, age: integerInputValue(e.target.value, 0) })
              }
              style={input}
            />
          </div>
          <button onClick={handleAdd} style={btnPrimary}>Ekle</button>
        </div>
      </div>

      <div style={card}>
        <button
          type="button"
          onClick={() => setStudentListOpen((open) => !open)}
          style={accordionHeader}
          aria-expanded={studentListOpen}
        >
          <div>
            <div style={cardTitle}>Öğrenci Listesi</div>
            <div style={cardHint}>Kayıtları isim veya TC kimlik numarasıyla hızlıca filtreleyin.</div>
          </div>
          <span style={accordionToggle}>{studentListOpen ? "Kapat" : "Aç"}</span>
        </button>
        {studentListOpen && (
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
            {loading ? <LoadingSpinner label="Öğrenci listesi yükleniyor" minHeight={180} size={38} /> : (
              filteredItems.length === 0 ? (
                <div style={emptyState}>Kayıt bulunamadı.</div>
              ) : (
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Ad Soyad", "TC Kimlik No", "Yaş", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredItems.map((s) => (
                    <tr key={s.id}>
                      <td style={td}><span style={{ fontWeight: 500, color: "var(--text)" }}>{s.first_name} {s.last_name}</span></td>
                      <td style={{ ...td, fontFamily: "var(--mono)" }}>{s.national_id}</td>
                      <td style={td}>{s.age}</td>
                      <td style={td}><button onClick={() => deleteStudent(s.id).then(refresh)} style={btnSm}>Sil</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

const card       = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 14px 36px rgba(24, 24, 24, 0.07)", marginBottom: 16, overflow: "hidden" };
const pageHeader = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 14 };
const pageTitle = { color: "var(--ingredients-text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, lineHeight: 1.05, fontWeight: 700 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 };
const summaryCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "13px 15px", boxShadow: "0 10px 26px rgba(24, 24, 24, 0.06)" };
const summaryLabel = { color: "var(--text3)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 };
const summaryValue = { color: "var(--text)", fontSize: 24, lineHeight: 1, fontWeight: 800, fontFamily: "var(--mono)" };
const cardHdSplit = { padding: "15px 18px 13px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const cardTitle = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.15, fontWeight: 700 };
const cardHint = { color: "var(--text3)", fontSize: 12, marginTop: 4, fontWeight: 600 };
const accordionHeader = { width: "100%", padding: "15px 18px 13px", border: "none", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer" };
const accordionToggle = { color: "var(--accent)", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const headerActions = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const resultBox = { padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface)", fontSize: 12 };
const formGrid = { padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr)) auto", gap: 10, alignItems: "end" };
const listToolbar = { padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--surface2)", borderBottom: "1px solid var(--border)" };
const activeListLabel = { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700 };
const emptyState = { padding: 24, color: "var(--text3)", fontSize: 13 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 700 };
const input      = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" };
const th         = { textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" };
const td         = { padding: "11px 16px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const btnSm      = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const btnGhost   = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
