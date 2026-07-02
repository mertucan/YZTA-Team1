import { useState } from "react";
import { NavLink } from "react-router-dom";
import { modules } from "../../modules";

const recordItems = [
  { to: "/ingredients", icon: "📦", label: "Malzeme Deposu" },
  { to: "/meals",       icon: "🍽️", label: "Yemekler" },
  { to: "/students",    icon: "🎓", label: "Öğrenciler" },
  { to: "/absences",    icon: "✈️", label: "Devamsızlık" },
];

export default function Sidebar() {
  const [recordsOpen, setRecordsOpen] = useState(true);

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoIcon}>🎓</div>
        <div>
          <div style={s.logoText}>YemekhanAI</div>
          <div style={s.logoSub}>Üniversite Beslenme Sistemi</div>
        </div>
      </div>

      <nav style={s.nav}>
        <NavLink to="/dashboard" style={navStyle} end>
          <span style={s.ico}>🏠</span> Dashboard
        </NavLink>

        <button onClick={() => setRecordsOpen((o) => !o)} style={s.groupBtn}>
          <span style={{ ...s.sectionLabel, flex: 1 }}>Kayıtlar</span>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>{recordsOpen ? "▾" : "▸"}</span>
        </button>
        {recordsOpen && recordItems.map((item) => (
          <NavLink key={item.to} to={item.to} style={subNavStyle}>
            <span style={s.ico}>{item.icon}</span> {item.label}
          </NavLink>
        ))}

        {modules.length > 0 && (
          <>
            <div style={{ ...s.sectionLabel, padding: "14px 8px 5px" }}>Modüller</div>
            {modules.map((mod) => (
              <NavLink key={mod.id} to={mod.route} style={navStyle}>
                <span style={s.ico}>{mod.icon}</span> {mod.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div style={s.foot}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px" }}>
          <div style={s.avatar}>Y</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Yönetici</div>
            <div style={{ fontSize: 10, color: "var(--text3)" }}>Yemekhane Müdürü</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const navStyle = ({ isActive }) => ({
  display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8,
  color: isActive ? "var(--accent)" : "var(--text2)",
  background: isActive ? "var(--accent-bg)" : "transparent",
  fontWeight: isActive ? 500 : 400, fontSize: 13,
  textDecoration: "none", marginBottom: 1, transition: "all .15s",
});

const subNavStyle = ({ isActive }) => ({ ...navStyle({ isActive }), paddingLeft: 24 });

const s = {
  sidebar:      { width: 230, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10, boxShadow: "var(--shadow)" },
  logo:         { padding: "18px 16px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 },
  logoIcon:     { width: 34, height: 34, background: "var(--accent)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 },
  logoText:     { fontSize: 15, fontWeight: 600 },
  logoSub:      { fontSize: 10, color: "var(--text3)", marginTop: 1 },
  nav:          { padding: "10px 8px", flex: 1, overflowY: "auto" },
  sectionLabel: { fontSize: 10, fontWeight: 600, color: "var(--text3)", letterSpacing: ".07em", textTransform: "uppercase" },
  groupBtn:     { display: "flex", alignItems: "center", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "10px 8px 5px", textAlign: "left" },
  ico:          { fontSize: 16, width: 20, textAlign: "center" },
  foot:         { padding: "12px 8px", borderTop: "1px solid var(--border)" },
  avatar:       { width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" },
};
