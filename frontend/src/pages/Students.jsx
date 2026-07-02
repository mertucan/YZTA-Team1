import { useEffect, useState } from "react";
import { getStudents, createStudent, deleteStudent } from "../api/students";

const emptyForm = { first_name: "", last_name: "", national_id: "", age: 18 };

export default function Students() {
  const [items, setItems]     = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const refresh = () => getStudents().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!form.first_name || !form.national_id) return;
    await createStudent(form);
    setForm(emptyForm);
    refresh();
  };

  const fields = [
    { label: "Ad",           key: "first_name",  placeholder: "Ad" },
    { label: "Soyad",        key: "last_name",   placeholder: "Soyad" },
    { label: "TC Kimlik No", key: "national_id", placeholder: "11 hane" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>🎓 Öğrenciler</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>Kayıtlı öğrenci listesi</div>
      </div>

      <div style={card}>
        <div style={cardHd}>➕ Yeni Öğrenci Ekle</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          {fields.map(({ label, key, placeholder }) => (
            <div key={key}>
              <div style={fieldLabel}>{label}</div>
              <input value={form[key]} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={input} />
            </div>
          ))}
          <div>
            <div style={fieldLabel}>Yaş</div>
            <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 18 })} style={input} />
          </div>
          <button onClick={handleAdd} style={btnPrimary}>Ekle</button>
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>👥 Öğrenci Listesi</div>
        {loading ? <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Ad Soyad", "TC Kimlik No", "Yaş", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td style={td}><span style={{ fontWeight: 500, color: "var(--text)" }}>{s.first_name} {s.last_name}</span></td>
                  <td style={{ ...td, fontFamily: "var(--mono)" }}>{s.national_id}</td>
                  <td style={td}>{s.age}</td>
                  <td style={td}><button onClick={() => deleteStudent(s.id).then(refresh)} style={btnSm}>Sil</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const card       = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd     = { padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600 };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input      = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const th         = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td         = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm      = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
