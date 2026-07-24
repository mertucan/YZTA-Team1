import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import tabloDotLogo from "../../assets/tablo-dot-logo.png";
import { modules } from "../../modules";

const CATERING_SESSION_KEY = "catering_mock_session";

const recordItems = [
  { to: "/ingredients", icon: "box", label: "Malzeme Deposu" },
  { to: "/meals", icon: "utensils", label: "Yemek Kategorisi" },
  { to: "/students", icon: "graduation", label: "Öğrenciler" },
  { to: "/absences", icon: "calendar", label: "Devamsızlık" },
  { to: "/expenses", icon: "box", label: "Harcamalar" },
  { to: "/orders", icon: "cart", label: "Siparişler" },
];

const cateringItems = [
  { to: "/modules/catering-management/universities", icon: "university", label: "Üniversiteler" },
  { to: "/modules/catering-management/users", icon: "users", label: "Kullanıcılar" },
  { to: "/modules/catering-management/menu-assignments", icon: "calendar-check", label: "Menü Atamaları" },
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
  "/expenses": ["OPERATIONS_MANAGER", "FINANCE_MANAGER", "CATERING_ADMIN"],
  "/orders": ["OPERATIONS_MANAGER", "PURCHASING_STAFF", "WAREHOUSE_STAFF", "CATERING_ADMIN"],
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

function NavIcon({ name }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    home: (
      <svg {...common}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
    box: (
      <svg {...common}>
        <path d="M21 8.5 12 3 3 8.5l9 5.5 9-5.5Z" />
        <path d="M3 8.5V16l9 5 9-5V8.5" />
        <path d="M12 14v7" />
      </svg>
    ),
    utensils: (
      <svg {...common}>
        <path d="M7 3v8" />
        <path d="M4.5 3v8" />
        <path d="M9.5 3v8" />
        <path d="M4.5 11h5L8 21H6l-1.5-10Z" />
        <path d="M16 3c2.2 1.6 3.5 4 3.5 7.2V21h-2V14h-3V8.5c0-2.2.5-4 1.5-5.5Z" />
      </svg>
    ),
    graduation: (
      <svg {...common}>
        <path d="M22 9 12 4 2 9l10 5 10-5Z" />
        <path d="M6 11.5V16c2.9 2.4 9.1 2.4 12 0v-4.5" />
        <path d="M22 9v6" />
      </svg>
    ),
    calendar: (
      <svg {...common}>
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16" />
      </svg>
    ),
    university: (
      <svg {...common}>
        <path d="M3 9h18" />
        <path d="M5 9l7-5 7 5" />
        <path d="M6 10v8" />
        <path d="M10 10v8" />
        <path d="M14 10v8" />
        <path d="M18 10v8" />
        <path d="M4 20h16" />
      </svg>
    ),
    users: (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.7-3.5 2.6-5 5.5-5s4.8 1.5 5.5 5" />
        <path d="M16 11a2.6 2.6 0 0 0 0-5" />
        <path d="M17 15c2 .4 3.2 1.8 3.7 5" />
      </svg>
    ),
    "calendar-check": (
      <svg {...common}>
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16" />
        <path d="m8.5 15 2 2 4.5-5" />
      </svg>
    ),
    building: (
      <svg {...common}>
        <rect x="4" y="3" width="10" height="18" rx="1.5" />
        <path d="M14 8h6v13" />
        <path d="M7 7h3" />
        <path d="M7 11h3" />
        <path d="M7 15h3" />
        <path d="M8 21v-3h3v3" />
      </svg>
    ),
    health: (
      <svg {...common}>
        <path d="M12 21s-8-4.8-8-11a4.7 4.7 0 0 1 8-3.3A4.7 4.7 0 0 1 20 10c0 6.2-8 11-8 11Z" />
        <path d="M8 12h3l1-2 1.5 4 1-2H16" />
      </svg>
    ),
    risk: (
      <svg {...common}>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
    tag: (
      <svg {...common}>
        <path d="M20 13 11 4H4v7l9 9 7-7Z" />
        <path d="M7.5 7.5h.01" />
      </svg>
    ),
    spark: (
      <svg {...common}>
        <path d="M12 3v5" />
        <path d="M12 16v5" />
        <path d="M4 12h5" />
        <path d="M15 12h5" />
        <path d="m6 6 3 3" />
        <path d="m15 15 3 3" />
        <path d="m18 6-3 3" />
        <path d="m9 15-3 3" />
      </svg>
    ),
    "menu-plan": (
      <svg {...common}>
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16" />
        <path d="M8 14h3" />
        <path d="M8 17h2" />
        <path d="m14 16 1.5 1.5L19 14" />
      </svg>
    ),
    brain: (
      <svg {...common}>
        <path d="M9 4a3 3 0 0 0-3 3v.5A3.5 3.5 0 0 0 4 14a3 3 0 0 0 3 3h1" />
        <path d="M15 4a3 3 0 0 1 3 3v.5A3.5 3.5 0 0 1 20 14a3 3 0 0 1-3 3h-1" />
        <path d="M9 4v16" />
        <path d="M15 4v16" />
        <path d="M9 9h3" />
        <path d="M12 14h3" />
      </svg>
    ),
    export: (
      <svg {...common}>
        <path d="M14 3h5v5" />
        <path d="m19 3-8 8" />
        <path d="M11 5H5v14h14v-6" />
      </svg>
    ),
    award: (
      <svg {...common}>
        <circle cx="12" cy="8" r="5" />
        <path d="m8.5 12.5-1.2 7 4.7-2.5 4.7 2.5-1.2-7" />
      </svg>
    ),
    cart: (
      <svg {...common}>
        <path d="M4 5h2l2 10h9l2-7H7" />
        <circle cx="10" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    ),
    "file-text": (
      <svg {...common}>
        <path d="M14 3H6v18h12V7l-4-4Z" />
        <path d="M14 3v4h4" />
        <path d="M8 12h8" />
        <path d="M8 16h6" />
      </svg>
    ),
    key: (
      <svg {...common}>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12 21 2" />
        <path d="m16 7 3 3" />
        <path d="m18 5 2 2" />
      </svg>
    ),
  };

  return icons[name] || icons.home;
}

export default function Sidebar() {
  const [recordsOpen, setRecordsOpen] = useState(true);
  const [cateringOpen, setCateringOpen] = useState(true);
  const [modulesOpen, setModulesOpen] = useState(true);
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
    if (!isCateringUser) return [];
    if (role === "SUPER_ADMIN") {
      return modules.filter((mod) => mod.id !== "catering-management");
    }
    if (role === "CATERING_ADMIN") {
      return modules.filter((mod) => moduleRoles[mod.id]?.includes(role));
    }
    return modules.filter((mod) => moduleRoles[mod.id]?.includes(role));
  }, [isCateringUser, role]);

  const visibleRecordItems = useMemo(() => {
    if (!isCateringUser || role === "SUPER_ADMIN") return recordItems;
    if (role === "CATERING_ADMIN") return recordItems.filter((item) => item.to !== "/students");
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
      <div style={{ ...s.logo, justifyContent: "center" }}>
        <Link to={logoRoute} style={s.logoLink}>
          <img src={tabloDotLogo} alt="TabloDot" style={s.logoImage} />
        </Link>
      </div>

      <nav className="app-sidebar-nav" style={s.nav}>
        <NavLink to={dashboardRoute} style={navStyle} end>
          <span style={s.ico}><NavIcon name="home" /></span>
          <span style={s.navLabel}>Kontrol Paneli</span>
        </NavLink>

        {visibleRecordItems.length > 0 && (
          <>
            <button onClick={() => setRecordsOpen((open) => !open)} style={s.groupBtn}>
              <span style={{ ...s.sectionLabel, flex: 1 }}>Kayıtlar</span>
              <span style={s.chevron}>{recordsOpen ? "▾" : "▸"}</span>
            </button>
            {recordsOpen && visibleRecordItems.map((item) => (
              <NavLink key={item.to} to={item.to} style={subNavStyle}>
                <span style={s.ico}><NavIcon name={item.icon} /></span>
                <span style={s.navLabel}>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {isCateringUser && ["CATERING_ADMIN", "SUPER_ADMIN"].includes(role) && (
          <>
            <button onClick={() => setCateringOpen((open) => !open)} style={s.groupBtn}>
              <span style={{ ...s.sectionLabel, flex: 1 }}>Catering Yönetimi</span>
              <span style={s.chevron}>{cateringOpen ? "▾" : "▸"}</span>
            </button>
            {cateringOpen && cateringItems.map((item) => (
              <NavLink key={item.to} to={item.to} style={navStyle}>
                <span style={s.ico}><NavIcon name={item.icon} /></span>
                <span style={s.navLabel}>{item.label}</span>
              </NavLink>
            ))}
            {cateringOpen && role === "SUPER_ADMIN" && (
              <NavLink to="/modules/catering-management/companies" style={navStyle}>
                <span style={s.ico}><NavIcon name="building" /></span>
                <span style={s.navLabel}>Firmalar & Lisanslar</span>
              </NavLink>
            )}
          </>
        )}

        {visibleModules.length > 0 && (
          <>
            <button onClick={() => setModulesOpen((open) => !open)} style={s.groupBtn}>
              <span style={{ ...s.sectionLabel, flex: 1 }}>Modüller</span>
              <span style={s.chevron}>{modulesOpen ? "▾" : "▸"}</span>
            </button>
            {modulesOpen && visibleModules.map((mod) => (
              <NavLink key={mod.id} to={mod.route} style={navStyle}>
                <span style={s.ico}><NavIcon name={mod.icon} /></span>
                <span style={s.navLabel}>{mod.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {isCateringUser && (
        <div style={s.foot}>
          <div style={s.userCard}>
            <div style={s.avatar}>{initials || "T"}</div>
            <div style={{ minWidth: 0 }}>
              <div style={s.userName}>{displayName}</div>
              <div style={s.userRole}>{displayRole}</div>
            </div>
          </div>
        </div>
      )}
      {!isCateringUser && (
        <div style={s.foot}>
          <Link to="/modules/catering-management" style={s.loginFootButton}>
            Giriş Yap
          </Link>
        </div>
      )}
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
  color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.76)",
  background: isActive ? "rgba(232, 128, 0, 0.22)" : "transparent",
  border: isActive ? "1px solid rgba(232, 128, 0, 0.46)" : "1px solid transparent",
  fontWeight: isActive ? 700 : 500,
  fontSize: 13,
  textDecoration: "none",
  marginBottom: 3,
  transition: "background .15s, border-color .15s, color .15s",
});

const subNavStyle = ({ isActive }) => ({
  ...navStyle({ isActive }),
  paddingLeft: 10,
});

const s = {
  sidebar: {
    width: 230,
    background: "linear-gradient(180deg, #181818 0%, #222321 58%, #141414 100%)",
    borderRight: "1px solid rgba(255, 255, 255, 0.10)",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 10,
    boxShadow: "18px 0 50px rgba(0, 0, 0, 0.18)",
    overflow: "hidden",
  },
  logo: {
    height: 54,
    padding: "0 14px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    color: "#ffffff",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    flex: 1,
  },
  logoImage: {
    width: 118,
    height: "auto",
    flexShrink: 0,
    display: "block",
  },
  logoText: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    color: "#ffffff",
  },
  logoSub: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.58)",
    marginTop: 4,
    whiteSpace: "nowrap",
  },
  nav: {
    padding: "14px 10px",
    flex: 1,
    overflowY: "auto",
  },
  navLabel: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "rgba(255, 255, 255, 0.54)",
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
    color: "rgba(255, 255, 255, 0.54)",
  },
  ico: {
    width: 22,
    height: 22,
    minWidth: 22,
    borderRadius: 7,
    display: "inline-grid",
    placeItems: "center",
    lineHeight: 0,
    color: "#e88000",
    background: "rgba(255, 255, 255, 0.10)",
    fontSize: 13,
    flexShrink: 0,
  },
  foot: {
    padding: "12px 10px",
    borderTop: "1px solid rgba(255, 255, 255, 0.10)",
  },
  loginFootButton: {
    minHeight: 40,
    borderRadius: 8,
    background: "#e88000",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(232, 128, 0, 0.52)",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px",
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.10)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "#e88000",
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
    color: "#ffffff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userRole: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.58)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
