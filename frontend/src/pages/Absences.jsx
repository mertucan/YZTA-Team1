import { useEffect, useState } from "react";
import { getAbsences, createAbsence, deleteAbsence } from "../api/absences";

const emptyForm = { student_id: 0, absence_date: "" };

export default function Absences() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = () =>
    getAbsences()
      .then(setItems)
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async () => {
    if (form.student_id <= 0 || !form.absence_date) return;
    setError("");
    setSuccess("");
    setAdding(true);
    try {
      await createAbsence(form);
      setForm(emptyForm);
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
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          ✈️ Devamsızlık Kayıtları
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>
          Öğrencilerin yemekhanede olmayacağı günler
        </div>
      </div>

      <div style={card}>
        <div style={cardHd}>➕ Devamsızlık Ekle</div>
        <div
          style={{
            padding: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={fieldLabel}>Öğrenci ID</div>
            <input
              type="number"
              value={form.student_id || ""}
              placeholder="Öğrenci ID"
              onChange={(e) =>
                setForm({ ...form, student_id: parseInt(e.target.value) || 0 })
              }
              style={input}
            />
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
        <div style={cardHd}>📅 Devamsızlık Listesi</div>
        {loading ? (
          <div style={{ padding: 24, color: "var(--text3)" }}>
            Yükleniyor...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Öğrenci ID", "Tarih", ""].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{a.student_id}</td>
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
        )}
      </div>
    </div>
  );
}

const card = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow)",
  marginBottom: 16,
};
const cardHd = {
  padding: "14px 18px 12px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  fontWeight: 600,
};
const fieldLabel = {
  fontSize: 11,
  color: "var(--text2)",
  marginBottom: 5,
  fontWeight: 500,
};
const input = {
  width: "100%",
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  borderRadius: 7,
  padding: "7px 12px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
};
const th = {
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--text3)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  padding: "10px 18px",
  borderBottom: "1px solid var(--border)",
};
const td = {
  padding: "10px 18px",
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
  fontWeight: 500,
  cursor: "pointer",
};
const btnSm = {
  background: "var(--surface2)",
  border: "1px solid var(--border2)",
  color: "var(--text2)",
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
};
