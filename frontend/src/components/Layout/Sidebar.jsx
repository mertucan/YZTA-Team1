import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import tabloDotLogo from "../../assets/tablo-dot-logo.png";
import { modules } from "../../modules";

const CATERING_SESSION_KEY = "catering_mock_session";

const recordItems = [
  { to: "/ingredients", icon: "□", label: "Malzeme Deposu" },
  { to: "/meals", icon: "◐", label: "Yemek Kategorisi" },
  { to: "/students", icon: "◎", label: "Öğrenciler" },
  { to: "/absences", icon: "✦", label: "Devamsızlık" },
];

const cateringItems = [
  { to: "/modules/catering-management/universities", icon: "◇", label: "Üniversiteler" },
  { to: "/modules/catering-management/users", icon: "◌", label: "Kullanıcılar" },
  { to: "/modules/catering-management/menu-assignments", icon: "▦", label: "Menü Atamaları" },
];

const roleLabels = {
  SUPER_ADMIN: "Süper Admin",
  CATERING_ADMIN: "Catering Yöneticisi",
  UNIVERSITY_ADMIN: "Üniversite Yöneticisi",
  DIETITIAN: "Diyetisyen",
  CHEF: "Şef",
  FINANCE_MANAGER: "Finans Yöneticisi",
  OPERATIONS_MANAGER: "Operasyon Yöneticisi",
  STUDENT: "Öğrenci",
  SYSTEM_SUPPORT: "Sistem Destek",
  WAREHOUSE_STAFF: "Depo Görevlisi",
  PURCHASING_STAFF: "Satın Alma Sorumlusu",
  RESEARCHER: "Araştırmacı",
  PARTNER_COMPANY: "Partner Firma",
};

const moduleRoles = {
  "health-tracker": ["DIETITIAN", "RESEARCHER", "UNIVERSITY_ADMIN", "CATERING_ADMIN", "SUPER_ADMIN"],
  "health-risk-analysis": ["DIETITIAN", "RESEARCHER", "UNIVERSITY_ADMIN", "CATERING_ADMIN", "SUPER_ADMIN"],
  "student-health-flags": ["DIETITIAN", "UNIVERSITY_ADMIN", "SUPER_ADMIN"],
  "ai-menu-planner": ["DIETITIAN", "CHEF"],
  "research-export": ["RESEARCHER", "UNIVERSITY_ADMIN"],
  "university-quality-integration": ["UNIVERSITY_ADMIN", "SUPER_ADMIN"],
  "partner-products": ["PARTNER_COMPANY", "DIETITIAN", "CHEF", "CATERING_ADMIN", "SUPER_ADMIN"],
};

const recordRoles = {
  "/ingredients": ["CHEF", "OPERATIONS_MANAGER", "WAREHOUSE_STAFF", "PURCHASING_STAFF"],
  "/meals": ["DIETITIAN", "CHEF"],
  "/students": ["UNIVERSITY_ADMIN", "DIETITIAN", "RESEARCHER"],
  "/absences": ["UNIVERSITY_ADMIN", "OPERATIONS_MANAGER"],
};

function readCateringSession() {
  try {
    const raw = localStorage.getItem(CATERING_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Sidebar() {
  const [recordsOpen, setRecordsOpen] = useState(true);
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

  const isCateringUser = Boolean(cateringSession);
  const user = cateringSession?.user;
  const role = user?.role_name;
  const dashboardRoute = isCateringUser ? "/modules/catering-management" : "/dashboard";
  const logoRoute = isCateringUser ? dashboardRoute : "/";

  const visibleModules = useMemo(() => {
    if (!isCateringUser) return modules.filter((mod) => mod.id === "catering-management");
    if (role === "SUPER_ADMIN") {
      return modules.filter((mod) => mod.id !== "catering-management");
    }
    if (role === "CATERING_ADMIN") {
      return modules.filter((mod) => moduleRoles[mod.id]?.includes(role));
    }
    return modules.filter((mod) => moduleRoles[mod.id]?.includes(role));
  }, [isCateringUser, role]);

  const visibleRecordItems = useMemo(() => {
    if (!isCateringUser || ["CATERING_ADMIN", "SUPER_ADMIN"].includes(role)) return recordItems;
    return recordItems.filter((item) => recordRoles[item.to]?.includes(role));
  }, [isCateringUser, role]);

  const displayName = user?.full_name || user?.email || "Yönetici";
  const displayRole = role ? (roleLabels[role] || role) : "Yemekhane Müdürü";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="app-sidebar" style={s.sidebar}>
      <Link to={logoRoute} style={s.logo}>
        <img src={tabloDotLogo} alt="TabloDot" style={s.logoImage} />
      </Link>

      <nav className="app-sidebar-nav" style={s.nav}>
        <NavLink to={dashboardRoute} style={navStyle} end>
          <span style={s.ico}>⌂</span> Dashboard
        </NavLink>

        {visibleRecordItems.length > 0 && (
          <>
            <button onClick={() => setRecordsOpen((open) => !open)} style={s.groupBtn}>
              <span style={{ ...s.sectionLabel, flex: 1 }}>Kayıtlar</span>
              <span style={s.chevron}>{recordsOpen ? "▾" : "▸"}</span>
            </button>
            {recordsOpen && visibleRecordItems.map((item) => (
              <NavLink key={item.to} to={item.to} style={subNavStyle}>
                <span style={s.ico}>{item.icon}</span> {item.label}
              </NavLink>
            ))}
          </>
        )}

        {isCateringUser && ["CATERING_ADMIN", "SUPER_ADMIN"].includes(role) && (
          <>
            <div style={{ ...s.sectionLabel, padding: "18px 10px 7px" }}>Catering Yönetimi</div>
            {cateringItems.map((item) => (
              <NavLink key={item.to} to={item.to} style={navStyle}>
                <span style={s.ico}>{item.icon}</span> {item.label}
              </NavLink>
            ))}
            {role === "SUPER_ADMIN" && (
              <NavLink to="/modules/catering-management/companies" style={navStyle}>
                <span style={s.ico}>◆</span> Firmalar & Lisanslar
              </NavLink>
            )}
          </>
        )}

        {visibleModules.length > 0 && (
          <>
            <div style={{ ...s.sectionLabel, padding: "18px 10px 7px" }}>Modüller</div>
            {visibleModules.map((mod) => (
              <NavLink key={mod.id} to={mod.route} style={navStyle}>
                <span style={s.ico}>{mod.icon}</span>{" "}
                {mod.id === "catering-management" ? "Catering Yönetimi Giriş" : mod.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div style={s.foot}>
        <div style={s.userCard}>
          <div style={s.avatar}>{initials || "T"}</div>
          <div style={{ minWidth: 0 }}>
            <div style={s.userName}>{displayName}</div>
            <div style={s.userRole}>{displayRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const navStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 38,
  padding: "8px 10px",
  borderRadius: 8,
  color: isActive ? "#fffaf2" : "#d8cfc5",
  background: isActive ? "rgba(196, 111, 53, 0.22)" : "transparent",
  border: isActive ? "1px solid rgba(196, 111, 53, 0.46)" : "1px solid transparent",
  fontWeight: isActive ? 700 : 500,
  fontSize: 13,
  textDecoration: "none",
  marginBottom: 3,
  transition: "background .15s, border-color .15s, color .15s",
});

const subNavStyle = ({ isActive }) => ({
  ...navStyle({ isActive }),
  paddingLeft: 18,
});

const s = {
  sidebar: {
    width: 230,
    background: "linear-gradient(180deg, #171411 0%, #211c18 58%, #15120f 100%)",
    borderRight: "1px solid rgba(255, 250, 242, 0.10)",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 10,
    boxShadow: "18px 0 50px rgba(31, 27, 23, 0.18)",
  },
  logo: {
    padding: "26px 14px 22px",
    borderBottom: "1px solid rgba(255, 250, 242, 0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    color: "#fffaf2",
  },
  logoImage: {
    width: 148,
    height: "auto",
    flexShrink: 0,
    display: "block",
  },
  logoText: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    color: "#fffaf2",
  },
  logoSub: {
    fontSize: 10,
    color: "#b9aea4",
    marginTop: 4,
    whiteSpace: "nowrap",
  },
  nav: {
    padding: "14px 10px",
    flex: 1,
    overflowY: "auto",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "#9e9084",
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  groupBtn: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "14px 10px 7px",
    textAlign: "left",
  },
  chevron: {
    fontSize: 11,
    color: "#9e9084",
  },
  ico: {
    width: 22,
    height: 22,
    borderRadius: 7,
    display: "inline-grid",
    placeItems: "center",
    color: "#c46f35",
    background: "rgba(255, 250, 242, 0.06)",
    fontSize: 13,
    flexShrink: 0,
  },
  foot: {
    padding: "12px 10px",
    borderTop: "1px solid rgba(255, 250, 242, 0.10)",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px",
    borderRadius: 8,
    background: "rgba(255, 250, 242, 0.06)",
    border: "1px solid rgba(255, 250, 242, 0.08)",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "#c46f35",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    color: "#fff",
    flexShrink: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#fffaf2",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userRole: {
    fontSize: 10,
    color: "#b9aea4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
