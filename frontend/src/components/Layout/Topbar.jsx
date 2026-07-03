import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/AppProviders";

const labels = {
  "/dashboard": "Dashboard",
  "/ingredients": "Malzeme Deposu",
  "/meals": "Yemekler",
  "/students": "Öğrenciler",
  "/absences": "Devamsızlık",
  "/modules/health-tracker": "Sağlık Takibi",
  "/modules/student-health-flags": "Sağlık Bayrakları",
};

const btnStyle = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
  fontSize: 12, fontWeight: 500, border: "1px solid var(--border2)", background: "var(--surface)",
  color: "var(--text)", cursor: "pointer",
};

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 5, boxShadow: "var(--shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--text2)" }}>
          YemekhanAI / <b style={{ color: "var(--text)", fontWeight: 500 }}>{labels[pathname] ?? "Sayfa"}</b>
        </span>
        <span style={{ fontSize: 11, color: "var(--text2)", padding: "3px 10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 20 }}>
          🏛️ A Üniversitesi
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={toggleTheme}
          style={btnStyle}
          data-toast={`${isDark ? "Aydınlık" : "Karanlık"} mod açıldı`}
        >
          {isDark ? "☀️ Aydınlık Mod" : "🌙 Karanlık Mod"}
        </button>
        <button onClick={() => navigate("/absences")} style={btnStyle} data-toast="Devamsızlık sayfası açıldı">✈️ Devamsızlık Ekle</button>
        <button onClick={() => navigate("/ingredients")} style={{ ...btnStyle, background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }} data-toast="Malzeme sayfası açıldı">+ Malzeme Ekle</button>
      </div>
    </header>
  );
}
