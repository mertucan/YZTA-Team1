import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/AppProviders";

const CATERING_SESSION_KEY = "catering_mock_session";

function readCateringSession() {
  try {
    const raw = localStorage.getItem(CATERING_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Topbar() {
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

  const handleCateringLogout = () => {
    localStorage.removeItem(CATERING_SESSION_KEY);
    window.dispatchEvent(new Event("catering-session-changed"));
    navigate("/modules/catering-management", { replace: true });
  };

  const handleCateringLogin = () => {
    navigate("/modules/catering-management");
  };

  return (
    <header style={s.header}>
      <div style={s.actions}>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Aydınlık moda geç" : "Karanlık moda geç"}
          title={isDark ? "Aydınlık moda geç" : "Karanlık moda geç"}
          style={{
            ...s.themeSwitch,
            background: isDark ? "linear-gradient(135deg, #222321, #141414)" : "linear-gradient(135deg, #fff7ec, #ffffff)",
          }}
        >
          <span style={{ ...s.switchTrackIcon, left: 10 }}><SunIcon /></span>
          <span style={{ ...s.switchTrackIcon, right: 10 }}><MoonIcon /></span>
          <span style={{ ...s.switchKnob, transform: isDark ? "translateX(28px)" : "translateX(0)" }}>
            {isDark ? <MoonIcon /> : <SunIcon />}
          </span>
        </button>

        {cateringSession ? (
          <button type="button" onClick={handleCateringLogout} style={s.logoutButton}>
            Çıkış Yap
          </button>
        ) : (
          <button type="button" onClick={handleCateringLogin} style={s.loginButton}>
            Giriş Yap
          </button>
        )}
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 14.4A7.8 7.8 0 0 1 9.6 4 8.8 8.8 0 1 0 20 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
    justifyContent: "flex-end",
    position: "sticky",
    top: 0,
    zIndex: 5,
    boxShadow: "var(--shadow)",
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
  loginButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid var(--accent)",
    background: "var(--accent)",
    color: "#fff",
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
    color: "var(--text2)",
    overflow: "hidden",
    boxShadow: "inset 0 1px 4px rgba(15, 23, 42, 0.10), 0 8px 22px rgba(24, 24, 24, 0.06)",
  },
  switchTrackIcon: {
    position: "absolute",
    display: "grid",
    placeItems: "center",
    opacity: 0.38,
    pointerEvents: "none",
  },
  switchKnob: {
    width: 30,
    height: 26,
    borderRadius: 999,
    background: "var(--surface)",
    color: "var(--accent)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.22)",
    transition: "transform .22s ease, color .22s ease, background .22s ease",
    zIndex: 1,
  },
};
