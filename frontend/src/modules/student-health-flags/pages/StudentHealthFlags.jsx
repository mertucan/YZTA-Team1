import { useEffect, useMemo, useState } from "react";
import { getStudents } from "../../../api/students";
import {
  createStudentHealthFlag,
  getStudentHealthFlags,
  updateStudentHealthFlag,
} from "../api/studentHealthFlags";

const conditionOptions = [
  { value: "diabetes", label: "Diyabet" },
  { value: "celiac", label: "Colyak" },
  { value: "allergy", label: "Alerji" },
  { value: "hypertension", label: "Hipertansiyon" },
  { value: "other", label: "Diger" },
];

const severityOptions = [
  { value: "low", label: "Dusuk" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yuksek" },
];

const severityStyle = {
  low: { label: "Dusuk", color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" },
  medium: { label: "Orta", color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)" },
  high: { label: "Yuksek", color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)" },
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
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Saglik Bayraklari</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
          Diyabet, colyak ve benzeri kronik rahatsizliklar icin ogrenci bazli menu kisitlari
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Aktif Bayrak", value: activeCount, color: "var(--accent)" },
          { label: "Isaretli Ogrenci", value: flaggedStudentCount, color: "var(--purple)" },
          { label: "Yuksek Oncelik", value: highRiskCount, color: "var(--red)" },
        ].map((item) => (
          <div key={item.label} style={statCard}>
            <div style={{ ...statBar, background: item.color }} />
            <div style={statLabel}>{item.label}</div>
            <div style={statValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={cardHd}>Yeni Kisitlama / Bayrak Ekle</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1.3fr 1fr 1.2fr .8fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={fieldLabel}>Ogrenci</div>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} style={input}>
              <option value="">Ogrenci sec</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={fieldLabel}>Rahatsizlik</div>
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
            <div style={fieldLabel}>Bayrak Basligi</div>
            <input
              value={form.flag_label}
              placeholder={`${selectedConditionLabel} menu kisiti`}
              onChange={(e) => setForm({ ...form, flag_label: e.target.value })}
              style={input}
            />
          </div>

          <div>
            <div style={fieldLabel}>Oncelik</div>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={input}>
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button onClick={handleAdd} style={btnPrimary} data-toast="Saglik bayragi eklendi">Ekle</button>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={fieldLabel}>Not</div>
            <input
              value={form.notes}
              placeholder="Orn. Glutensiz menu, dusuk sekerli secenek, alerjen uyarisi..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={input}
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ ...cardHd, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1 }}>Ogrenci Saglik Kisitlari</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ogrenci veya not ara..." style={{ ...input, width: 260 }} />
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={{ ...input, width: 150 }}>
            <option value="active">Aktifler</option>
            <option value="inactive">Pasifler</option>
            <option value="all">Tumu</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "var(--text3)" }}>Yukleniyor...</div>
        ) : filteredFlags.length === 0 ? (
          <div style={{ padding: 28, color: "var(--text3)", textAlign: "center" }}>Kayit bulunamadi.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Ogrenci", "Bayrak", "Oncelik", "Not", "Durum", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
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
                          data-toast={flag.is_active ? "Saglik bayragi pasiflestirildi" : "Saglik bayragi aktiflestirildi"}
                        >
                          {flag.is_active ? "Pasiflestir" : "Aktiflestir"}
                        </button>
                      </div>
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

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const th = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)", verticalAlign: "top" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const pill = { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700 };
const statCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px", boxShadow: "var(--shadow)", position: "relative", overflow: "hidden" };
const statBar = { position: "absolute", top: 0, left: 0, right: 0, height: 3 };
const statLabel = { fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const statValue = { fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)" };
