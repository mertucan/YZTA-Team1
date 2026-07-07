import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/AppProviders";

const CATERING_SESSION_KEY = "catering_mock_session";

const labels = {
  "/dashboard": "Dashboard",
  "/ingredients": "Malzeme Deposu",
  "/meals": "Yemekler",
  "/students": "Öğrenciler",
  "/absences": "Devamsızlık",
  "/modules/health-tracker": "Sağlık Takibi",
  "/modules/student-health-flags": "Sağlık Bayrakları",
  "/modules/ai-menu-planner": "AI Menü Planlayıcı",
  "/modules/catering-management": "Catering Dashboard",
  "/modules/catering-management/universities": "Üniversiteler",
  "/modules/catering-management/users": "Kullanıcılar",
  "/modules/catering-management/menu-assignments": "Menü Atamaları",
  "/modules/catering-management/companies": "Firmalar & Lisanslar",
};

function readCateringSession() {
  try {
    const raw = localStorage.getItem(CATERING_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [cateringSession, setCateringSession] = useState(() => readCateringSession());

  useEffect(() => {
    const refresh = () => setCateringSession(readCateringSession());
    window.addEventListener("storage", refresh);
    window.addEventListener("catering-session-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("catering-session-changed", refresh);
    };
  }, []);

  const activeLabel =
    labels[pathname] ??
    Object.entries(labels).find(([route]) => pathname.startsWith(`${route}/`))?.[1] ??
    "Sayfa";

  const handleCateringLogout = () => {
    localStorage.removeItem(CATERING_SESSION_KEY);
    window.dispatchEvent(new Event("catering-session-changed"));
    navigate("/dashboard");
  };

  return (
    <header style={s.header}>
      <div style={s.left}>
        <span style={s.breadcrumb}>
          YemekhanAI / <b style={s.breadcrumbStrong}>{activeLabel}</b>
        </span>
        <span style={s.schoolBadge}>🏛️ A Üniversitesi</span>
      </div>

      <div style={s.actions}>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Aydınlık moda geç" : "Karanlık moda geç"}
          title={isDark ? "Aydınlık moda geç" : "Karanlık moda geç"}
          style={{
            ...s.themeSwitch,
            background: isDark ? "linear-gradient(135deg, #1e293b, #0f172a)" : "linear-gradient(135deg, #eef6ff, #ffffff)",
          }}
        >
          <span style={{ ...s.switchIcon, left: 10 }}>☀️</span>
          <span style={{ ...s.switchIcon, right: 10 }}>🌙</span>
          <span style={{ ...s.switchKnob, transform: isDark ? "translateX(28px)" : "translateX(0)" }}>
            {isDark ? "🌙" : "☀️"}
          </span>
        </button>

        <button onClick={() => navigate("/absences")} style={s.button}>✈️ Devamsızlık Ekle</button>
        <button onClick={() => navigate("/ingredients")} style={{ ...s.button, ...s.primaryButton }}>+ Malzeme Ekle</button>

        {cateringSession && (
          <button type="button" onClick={handleCateringLogout} style={s.logoutButton}>
            ↩ Çıkış Yap
          </button>
        )}
      </div>
    </header>
  );
}

const s = {
  header: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "0 24px",
    height: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 5,
    boxShadow: "var(--shadow)",
  },
  left: { display: "flex", alignItems: "center", gap: 12 },
  breadcrumb: { fontSize: 13, color: "var(--text2)" },
  breadcrumbStrong: { color: "var(--text)", fontWeight: 500 },
  schoolBadge: {
    fontSize: 11,
    color: "var(--text2)",
    padding: "3px 10px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 20,
  },
  actions: { display: "flex", alignItems: "center", gap: 8 },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid var(--border2)",
    background: "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
  },
  primaryButton: {
    background: "var(--accent)",
    borderColor: "var(--accent)",
    color: "#fff",
  },
  logoutButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid var(--red-border)",
    background: "var(--red-bg)",
    color: "var(--red)",
    cursor: "pointer",
  },
  themeSwitch: {
    width: 66,
    height: 34,
    borderRadius: 999,
    border: "1px solid var(--border2)",
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    padding: 3,
    cursor: "pointer",
    boxShadow: "inset 0 1px 4px rgba(15, 23, 42, 0.12)",
  },
  switchIcon: {
    position: "absolute",
    fontSize: 14,
    lineHeight: 1,
    opacity: 0.55,
  },
  switchKnob: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--surface)",
    display: "grid",
    placeItems: "center",
    fontSize: 13,
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.22)",
    transition: "transform .2s ease",
  },
};
