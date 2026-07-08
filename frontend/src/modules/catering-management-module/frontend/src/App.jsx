import {
  Award,
  Building2,
  Calendar,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Globe,
  Key,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "./icons.jsx";
import { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  API_BASE_URL,
  CATERING_SESSION_KEY,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "./api";
import { isSupabaseConfigured, supabase } from "./supabase";
import { useRealtimeData } from "./hooks/useRealtimeData";
import { RealtimeIndicator } from "./components/RealtimeIndicator";

const ROLE_LABELS = {
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
};

const ROLE_ACCESS = {
  dashboard: [
    "SUPER_ADMIN",
    "CATERING_ADMIN",
    "UNIVERSITY_ADMIN",
    "DIETITIAN",
    "CHEF",
    "FINANCE_MANAGER",
    "OPERATIONS_MANAGER",
    "STUDENT",
    "SYSTEM_SUPPORT",
    "WAREHOUSE_STAFF",
    "PURCHASING_STAFF",
  ],
  universities: ["SUPER_ADMIN", "CATERING_ADMIN", "UNIVERSITY_ADMIN"],
  users: [
    "SUPER_ADMIN",
    "CATERING_ADMIN",
    "UNIVERSITY_ADMIN",
    "SYSTEM_SUPPORT",
  ],
  menuAssignments: [
    "SUPER_ADMIN",
    "CATERING_ADMIN",
    "UNIVERSITY_ADMIN",
    "DIETITIAN",
    "CHEF",
  ],
  companies: ["SUPER_ADMIN", "CATERING_ADMIN", "FINANCE_MANAGER"],
  inventory: [
    "SUPER_ADMIN",
    "CATERING_ADMIN",
    "CHEF",
    "WAREHOUSE_STAFF",
    "OPERATIONS_MANAGER",
    "PURCHASING_STAFF",
  ],
  meals: ["SUPER_ADMIN", "CATERING_ADMIN", "DIETITIAN", "CHEF"],
  aiMenu: ["SUPER_ADMIN", "CATERING_ADMIN", "DIETITIAN", "CHEF"],
  allergies: ["SUPER_ADMIN", "DIETITIAN", "UNIVERSITY_ADMIN", "STUDENT"],
  holidays: ["SUPER_ADMIN", "CATERING_ADMIN", "UNIVERSITY_ADMIN", "STUDENT"],
  dorms: ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "STUDENT"],
  reports: [
    "SUPER_ADMIN",
    "CATERING_ADMIN",
    "FINANCE_MANAGER",
    "OPERATIONS_MANAGER",
    "SYSTEM_SUPPORT",
  ],
  yokUniv: [
    "SUPER_ADMIN",
    "CATERING_ADMIN",
    "UNIVERSITY_ADMIN",
    "SYSTEM_SUPPORT",
  ],
};

function roleCan(role, key) {
  return Boolean(
    role && (role === "SUPER_ADMIN" || ROLE_ACCESS[key]?.includes(role)),
  );
}

function getCateringRouteKey(pathname) {
  if (pathname.endsWith("/universities")) return "universities";
  if (pathname.endsWith("/users")) return "users";
  if (pathname.endsWith("/menu-assignments")) return "menuAssignments";
  if (pathname.endsWith("/companies")) return "companies";
  if (pathname.endsWith("/inventory")) return "inventory";
  if (pathname.endsWith("/meals")) return "meals";
  if (pathname.endsWith("/ai-menu")) return "aiMenu";
  if (pathname.endsWith("/allergies")) return "allergies";
  if (pathname.endsWith("/holidays")) return "holidays";
  if (pathname.endsWith("/dorms")) return "dorms";
  if (pathname.endsWith("/reports")) return "reports";
  if (pathname.endsWith("/yok-univ")) return "yokUniv";
  return "dashboard";
}

function getPasswordStrength(password) {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Çok zayıf", "Zayıf", "Orta", "İyi", "Güçlü"];
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#16a34a"];
  const suggestions = [];

  if (password.length < 8) suggestions.push("8+ karakter kullan");
  if (!(/[a-z]/.test(password) && /[A-Z]/.test(password)))
    suggestions.push("Büyük/küçük harf ekle");
  if (!/\d/.test(password)) suggestions.push("Rakam ekle");
  if (!/[^A-Za-z0-9]/.test(password)) suggestions.push("Sembol ekle");

  return {
    score,
    label: password ? labels[score] : "Şifre gücü",
    color: password ? colors[score] : "var(--border2)",
    suggestions,
  };
}

function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password);
  return (
    <div style={{ display: "grid", gap: 7, marginTop: -4 }}>
      <div
        style={{
          height: 7,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 5,
        }}
      >
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            style={{
              borderRadius: 999,
              background:
                strength.score >= level ? strength.color : "var(--surface3)",
              transition: "background .18s ease",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 11,
          color: "var(--text3)",
        }}
      >
        <strong style={{ color: strength.color }}>{strength.label}</strong>
        <span>
          {strength.suggestions.slice(0, 2).join(" · ") ||
            "Bu şifre gayet iyi görünüyor."}
        </span>
      </div>
    </div>
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getRegisterValidation({
  companyName,
  fullName,
  email,
  password,
  confirmPassword,
  acceptedTerms,
}) {
  const errors = [];
  const strength = getPasswordStrength(password);

  if (companyName.trim().length < 2) errors.push("Firma adını girin.");
  if (fullName.trim().length < 2) errors.push("Ad soyad bilgisini girin.");
  if (!isValidEmail(email)) errors.push("Geçerli bir e-posta girin.");
  if (password.length < 6) errors.push("Şifre en az 6 karakter olmalı.");
  if (strength.score < 2) errors.push("Daha güçlü bir şifre seçin.");
  if (password !== confirmPassword) errors.push("Şifreler eşleşmiyor.");
  if (!acceptedTerms) errors.push("Kullanım şartlarını onaylayın.");

  return errors;
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  autoComplete,
}) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <div className="password-field">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          title={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

const DASH_COLORS = [
  "#22d3ee",
  "#38bdf8",
  "#2563eb",
  "#c026d3",
  "#f472b6",
  "#10b981",
];
const WEEK_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum"];

function formatTRNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function digitsOnly(value, maxLength) {
  const digits = String(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function integerInputValue(value, { min = 0, max } = {}) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  const normalizedDigits = digits.replace(/^0+(?=\d)/, "");
  const nextValue = Math.max(min, Number(normalizedDigits));
  return typeof max === "number" ? Math.min(max, nextValue) : nextValue;
}

function nextSteppedValue(value, step, { min = 0, max } = {}) {
  const base = value === "" ? min : Number(value);
  const safeBase = Number.isFinite(base) ? base : min;
  const nextValue = Math.max(min, safeBase + step);
  return typeof max === "number" ? Math.min(max, nextValue) : nextValue;
}

function positiveInt(value, fallback = 1) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
}

function nonNegativeInt(value, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : fallback;
}

function licenseMatchesForm(license, form) {
  return (
    license.plan_name === form.plan_name &&
    Number(license.max_users) === positiveInt(form.max_users, 1) &&
    Number(license.max_universities) ===
      positiveInt(form.max_universities, 1) &&
    license.start_date === form.start_date &&
    license.expire_date === form.expire_date &&
    Boolean(license.status) === Boolean(form.status)
  );
}

function NumericStepper({ value, onChange, min = 0, max, placeholder = "0" }) {
  return (
    <div className="numeric-stepper">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) =>
          onChange(integerInputValue(e.target.value, { min, max }))
        }
        onFocus={(e) => {
          if (String(value) === String(min)) {
            onChange("");
          }
          e.target.select();
        }}
        onBlur={() => {
          if (value === "") {
            onChange(min);
          }
        }}
        placeholder={placeholder}
      />
      <div className="numeric-stepper-actions">
        <button
          type="button"
          onClick={() => onChange(nextSteppedValue(value, 1, { min, max }))}
          aria-label="Artır"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onChange(nextSteppedValue(value, -1, { min, max }))}
          aria-label="Azalt"
        >
          -
        </button>
      </div>
    </div>
  );
}

function DashboardMetricCard({ tone, label, value, sub, children }) {
  return (
    <article className={`catering-dash-metric ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
      {children && <div className="catering-dash-metric-art">{children}</div>}
    </article>
  );
}

function DashboardPanel({ title, meta, children, className = "" }) {
  return (
    <section className={`catering-dash-panel ${className}`}>
      <div className="catering-dash-panel-head">
        <h3>{title}</h3>
        {meta && <span>{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function CapacityLineChart({ totalStudents, activeUsers }) {
  const maxValue = Math.max(totalStudents, activeUsers, 1);
  const studentPoints = [
    0,
    0,
    0,
    0,
    0,
    Math.max(6, 290 * (totalStudents / maxValue)),
  ];
  const userY = 294 - Math.max(2, 290 * (activeUsers / maxValue));
  const studentPath = studentPoints
    .map((value, index) => {
      const x = 24 + index * 154;
      const y = 294 - value;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const areaPath = `${studentPath} L794,294 L24,294 Z`;

  return (
    <div className="capacity-chart">
      <svg viewBox="0 0 820 320" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((row) => (
          <line
            key={row}
            x1="24"
            x2="794"
            y1={36 + row * 64}
            y2={36 + row * 64}
          />
        ))}
        {[0, 1, 2, 3, 4].map((row) => {
          const value = Math.round(maxValue - (maxValue / 4) * row);
          return (
            <text key={row} x="0" y={40 + row * 64}>
              {formatTRNumber(value)}
            </text>
          );
        })}
        <path className="chart-area" d={areaPath} />
        <path className="chart-line student" d={studentPath} />
        <path className="chart-line user" d={`M24,${userY} L794,${userY}`} />
      </svg>
    </div>
  );
}

function RoleWaveChart({ activeUsers }) {
  return (
    <div className="role-wave">
      <svg viewBox="0 0 420 190" preserveAspectRatio="none">
        <path
          className="role-wave-fill"
          d="M0,128 C45,155 78,105 126,92 C171,80 178,116 220,82 C252,56 269,20 315,34 C356,47 352,113 420,74 L420,190 L0,190 Z"
        />
        <path
          className="role-wave-line"
          d="M0,128 C45,155 78,105 126,92 C171,80 178,116 220,82 C252,56 269,20 315,34 C356,47 352,113 420,74"
        />
        <circle cx="288" cy="36" r="12" />
      </svg>
      <div className="role-wave-footer">Aktif kullanıcı: {activeUsers}</div>
    </div>
  );
}

function RoleDistributionChart({ users }) {
  const roleCounts = users.reduce((acc, user) => {
    const role = user.role_name || "UNKNOWN";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const items = Object.entries(roleCounts)
    .map(([role, value]) => ({
      role,
      label: ROLE_LABELS[role] || role,
      value,
      active: users.filter((user) => user.role_name === role && user.is_active)
        .length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) {
    return <div className="chart-empty">Kullanıcı verisi yok.</div>;
  }

  return (
    <div className="role-bars">
      {items.map((item, index) => (
        <div key={item.role} className="role-bar-row">
          <div className="role-bar-head">
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
          <div className="role-bar-track">
            <span
              style={{
                width: `${Math.max(7, (item.value / max) * 100)}%`,
                background: DASH_COLORS[index % DASH_COLORS.length],
              }}
            />
          </div>
          <small>{item.active} aktif</small>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items, total, center, emptyText }) {
  if (!items.length || total <= 0) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  let offset = 25;
  return (
    <div className="donut-layout">
      <svg className="donut" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="42" />
        {items.map((item, index) => {
          const dash = (item.value / total) * 264;
          const node = (
            <circle
              key={item.name}
              cx="60"
              cy="60"
              r="42"
              stroke={DASH_COLORS[index % DASH_COLORS.length]}
              strokeDasharray={`${dash} ${264 - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return node;
        })}
        {center && (
          <text x="60" y="58" textAnchor="middle">
            {center.title}
          </text>
        )}
        {center && (
          <text
            x="60"
            y="76"
            textAnchor="middle"
            className="donut-center-value"
          >
            {center.value}
          </text>
        )}
      </svg>
      <div className="donut-legend">
        {items.slice(0, 5).map((item, index) => (
          <div key={item.name}>
            <i
              style={{ background: DASH_COLORS[index % DASH_COLORS.length] }}
            />
            <span>{item.name}</span>
            <b>{Math.round((item.value / total) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuBars({ menuAssignments }) {
  const counts = WEEK_DAYS.map((_, index) => {
    return menuAssignments.filter((menu) => {
      const day = new Date(menu.start_date).getDay();
      return day === index + 1;
    }).length;
  });
  const max = Math.max(...counts, 1);

  if (!counts.some(Boolean)) {
    return <div className="chart-empty">Menü ataması verisi yok.</div>;
  }

  return (
    <div className="menu-bars">
      {counts.map((value, index) => (
        <div key={WEEK_DAYS[index]} className="menu-bar-col">
          <strong>{value}</strong>
          <div className="menu-bar-track">
            <span
              style={{
                height: value ? `${Math.max(8, (value / max) * 100)}%` : "0%",
              }}
            />
          </div>
          <small>{WEEK_DAYS[index]}</small>
        </div>
      ))}
    </div>
  );
}

function CateringDashboard({
  dashboard,
  universities,
  users,
  menuAssignments,
  dateFilter,
  onDateFilterToggle,
  companyFilter,
  onCompanyFilterChange,
  companies,
  currentUser,
}) {
  const totalStudents = universities.reduce(
    (sum, university) => sum + Number(university.student_count || 0),
    0,
  );
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = Math.max(users.length - activeUsers, 0);
  const activeMenus = menuAssignments.filter(
    (menu) => menu.status === "ACTIVE",
  ).length;
  const publishedMenus = menuAssignments.filter(
    (menu) => menu.is_published,
  ).length;
  const universityCount =
    companyFilter === "all"
      ? (dashboard?.total_universities ?? universities.length)
      : universities.length;
  const universityItems = universities
    .filter((university) => Number(university.student_count || 0) > 0)
    .map((university) => ({
      name: university.university_name,
      value: Number(university.student_count || 0),
    }))
    .sort((a, b) => b.value - a.value);
  const userItems = [
    { name: "Aktif", value: activeUsers },
    { name: "Pasif", value: inactiveUsers },
  ].filter((item) => item.value > 0);

  return (
    <>
      <header className="content-header catering-dash-header">
        <div>
          <span>CATERING CRM</span>
          <h1>Genel Bakış</h1>
        </div>
        <div className="catering-dash-filters">
          <button
            type="button"
            className={dateFilter === "30d" ? "active" : ""}
            onClick={onDateFilterToggle}
          >
            <Calendar size={14} />{" "}
            {dateFilter === "30d" ? "Son 30 gün" : "Tüm zamanlar"}
          </button>
          {currentUser?.role_name === "SUPER_ADMIN" && companies?.length > 0 ? (
            <select
              className="dash-company-select"
              value={companyFilter}
              onChange={(e) => onCompanyFilterChange(e.target.value)}
            >
              <option value="all">Tüm firmalar</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name}
                </option>
              ))}
            </select>
          ) : (
            <button type="button" style={{ cursor: "default", opacity: 0.7 }}>
              {companies?.[0]?.company_name || "Tüm firmalar"}
            </button>
          )}
          <button type="button">
            Lisans {dashboard?.active_license ? "aktif" : "pasif"}
          </button>
        </div>
      </header>

      <div className="catering-dash-shell">
        <div className="catering-dash-metrics">
          <DashboardMetricCard
            tone="student"
            label="Toplam Öğrenci"
            value={formatTRNumber(totalStudents)}
            sub={`${universityCount} Üniversite kaydı`}
          />
          <DashboardMetricCard
            tone="menu"
            label="Aktif Menü"
            value={formatTRNumber(activeMenus)}
            sub={`${publishedMenus} yayınlanan menü`}
          />
          <DashboardMetricCard
            tone="compact"
            label="Kullanıcılar"
            value={`${activeUsers}`}
            sub={`${activeUsers} aktif`}
          >
            <Users size={24} />
          </DashboardMetricCard>
          <DashboardMetricCard
            tone="compact"
            label="Lisans"
            value={dashboard?.active_license ? "Aktif" : "Pasif"}
            sub={
              dashboard?.license_days_left != null
                ? `${dashboard.license_days_left} gün kaldı`
                : "Süre bilgisi yok"
            }
          >
            <Award size={24} />
          </DashboardMetricCard>
        </div>

        <div className="catering-dash-grid">
          <DashboardPanel
            title="Öğrenci Kapasitesi ve Aktif Kullanıcı"
            className="wide"
          >
            <CapacityLineChart
              totalStudents={totalStudents}
              activeUsers={activeUsers}
            />
          </DashboardPanel>
          <DashboardPanel title="Roller ve Kullanıcılar">
            <RoleDistributionChart users={users} />
          </DashboardPanel>
          <DashboardPanel
            title="Üniversite Dağılımı"
            meta={`${formatTRNumber(totalStudents)} Öğrenci`}
          >
            <DonutChart
              items={universityItems}
              total={totalStudents}
              emptyText="Üniversite/Öğrenci verisi yok."
            />
          </DashboardPanel>
          <DashboardPanel
            title="Kullanıcı Durumu"
            meta={`${users.length} kullanıcı`}
          >
            <DonutChart
              items={userItems}
              total={Math.max(users.length, 1)}
              center={{ title: "Aktif", value: activeUsers }}
              emptyText="Kullanıcı verisi yok."
            />
          </DashboardPanel>
          <DashboardPanel title="Menü Atamaları / Gün">
            <MenuBars menuAssignments={menuAssignments} />
          </DashboardPanel>
        </div>
      </div>
    </>
  );
}

function CateringManagementContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setCompanyName("");
    setAcceptedTerms(false);
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setAuthMode("login");
  };

  const [dashboard, setDashboard] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [users, setUsers] = useState([]);
  const [menuAssignments, setMenuAssignments] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [dateFilter, setDateFilter] = useState("30d");
  const [companyFilter, setCompanyFilter] = useState("all");

  // Modals state
  const [modalType, setModalType] = useState(null);

  // Selected item for edit/license
  const [selectedUniv, setSelectedUniv] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);

  // Form Fields states
  const [univForm, setUnivForm] = useState({
    university_name: "",
    city: "",
    student_count: 0,
    status: true,
    company_id: "",
  });

  const [userForm, setUserForm] = useState({
    auth_user_id: "",
    email: "",
    full_name: "",
    role_name: "DIETITIAN",
    university_id: "",
    phone: "",
    is_active: true,
    company_id: "",
  });

  const [menuForm, setMenuForm] = useState({
    menu_id: "",
    university_id: "",
    start_date: "",
    end_date: "",
    status: "ACTIVE",
    is_published: false,
    company_id: "",
  });

  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    tax_number: "",
    email: "",
    phone: "",
    address: "",
    plan_name: "Starter",
    max_users: 5,
    max_universities: 2,
    start_date: "",
    expire_date: "",
    status: true,
  });

  const [licenseForm, setLicenseForm] = useState({
    plan_name: "Starter",
    max_users: 5,
    max_universities: 2,
    start_date: "",
    expire_date: "",
    status: true,
  });

  // Init auth check
  useEffect(() => {
    const hasMock = localStorage.getItem(CATERING_SESSION_KEY);
    if (hasMock) {
      setIsAuthed(true);
      setSessionReady(true);
      return;
    }
    if (!isSupabaseConfigured) {
      setIsAuthed(false);
      setSessionReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(Boolean(data.session));
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthed(true);
      } else if (!localStorage.getItem(CATERING_SESSION_KEY)) {
        setIsAuthed(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncSession = () => {
      const hasMock = Boolean(localStorage.getItem(CATERING_SESSION_KEY));
      if (!hasMock) {
        setIsAuthed(false);
        setCurrentUser(null);
        setDashboard(null);
        setUniversities([]);
        setUsers([]);
        setMenuAssignments([]);
        setCompanies([]);
        setModalType(null);
        resetAuthForm();
        setLoading(false);
      }
    };
    window.addEventListener("storage", syncSession);
    window.addEventListener("catering-session-changed", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("catering-session-changed", syncSession);
    };
  }, []);

  // Fetch current user details on auth
  useEffect(() => {
    if (!isAuthed) {
      setCurrentUser(null);
      return;
    }
    setLoading(true);
    apiGet("/users")
      .then((profiles) => {
        const mockSessionStr = localStorage.getItem(CATERING_SESSION_KEY);
        if (mockSessionStr) {
          try {
            const mockSession = JSON.parse(mockSessionStr);
            const myProfile = profiles.find(
              (p) => p.email === mockSession.user.email,
            );
            if (myProfile) {
              setCurrentUser(myProfile);
            } else if (mockSession.user.email === "superadmin@catering.com") {
              setCurrentUser({
                id: "00000000-0000-0000-0000-000000000000",
                auth_user_id: "00000000-0000-0000-0000-000000000000",
                company_id: null,
                university_id: null,
                email: mockSession.user.email,
                full_name: "Süper Admin Yetkilisi",
                role_name: "SUPER_ADMIN",
                phone: null,
                is_active: true,
                created_at: new Date().toISOString(),
              });
            }
          } catch {
            // ignore
          }
          return;
        }

        // Find current authenticated user's profile
        supabase.auth.getUser().then(({ data }) => {
          const authId = data.user?.id;
          const myProfile = profiles.find((p) => p.auth_user_id === authId);
          if (myProfile) {
            setCurrentUser(myProfile);
          } else {
            // Super admin or out-of-band profile creation fallback
            // Create a temporary representation if not in table
            setCurrentUser({
              id: "00000000-0000-0000-0000-000000000000",
              auth_user_id: authId || "",
              company_id: null,
              university_id: null,
              email: data.user?.email || "superadmin@system.local",
              full_name: "Sistem Yöneticisi",
              role_name: "SUPER_ADMIN",
              phone: null,
              is_active: true,
              created_at: new Date().toISOString(),
            });
          }
        });
      })
      .catch((err) => {
        setError(err.message);
        if (
          err.message.includes("profile not found") ||
          err.message.includes("not active") ||
          err.message.includes("Oturum bulunamadı") ||
          err.message.includes("Forbidden") ||
          err.message.includes("403") ||
          err.message.includes("401")
        ) {
          localStorage.removeItem(CATERING_SESSION_KEY);
          window.dispatchEvent(new Event("catering-session-changed"));
          setIsAuthed(false);
          setCurrentUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [isAuthed]);

  // Load view data
  const loadData = (silent = false) => {
    if (!isAuthed) return Promise.resolve();
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    const fetches = [
      apiGet("/dashboard"),
      apiGet("/universities"),
      apiGet("/users"),
      apiGet("/menu-assignments"),
    ];

    if (currentUser?.role_name === "SUPER_ADMIN") {
      fetches.push(apiGet("/companies"));
    } else if (currentUser?.company_id) {
      fetches.push(apiGet(`/companies/${currentUser.company_id}`));
    }

    return Promise.all(fetches)
      .then(
        ([dashboardData, universityData, userData, menuData, companyData]) => {
          setDashboard(dashboardData);
          setUniversities(universityData);
          setUsers(userData);
          setMenuAssignments(menuData);
          if (companyData) {
            setCompanies(
              Array.isArray(companyData) ? companyData : [companyData],
            );
          }
        },
      )
      .catch((err) => setError(err.message))
      .finally(() => {
        if (!silent) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    if (isAuthed && currentUser) {
      // Initial full load (with loading spinner)
      loadData(false);
    }
  }, [isAuthed, currentUser]);

  useEffect(() => {
    if (!isAuthed || !currentUser) return;
    const routeKey = getCateringRouteKey(location.pathname);
    if (!roleCan(currentUser.role_name, routeKey)) {
      navigate("/modules/catering-management", { replace: true });
    }
  }, [isAuthed, currentUser, location.pathname, navigate]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  const { status: realtimeStatus } = useRealtimeData({
    enabled: isAuthed && !!currentUser,
    initialUniversities: universities,
    initialUsers: users,
    initialMenus: menuAssignments,
    initialCompanies: companies,
    onUniversityChange: setUniversities,
    onUserChange: setUsers,
    onMenuChange: setMenuAssignments,
    onCompanyChange: setCompanies,
  });

  const licenseTone = useMemo(() => {
    if (!dashboard?.active_license) return "danger";
    if ((dashboard.license_days_left ?? 999) <= 30) return "warning";
    return "success";
  }, [dashboard]);

  const dashFilteredData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    let filteredMenus = menuAssignments;
    if (dateFilter === "30d") {
      filteredMenus = filteredMenus.filter(
        (m) => new Date(m.created_at) >= cutoff,
      );
    }

    if (companyFilter !== "all") {
      const cid = parseInt(companyFilter, 10);
      return {
        universities: universities.filter((u) => u.company_id === cid),
        users: users.filter((u) => u.company_id === cid),
        menuAssignments: filteredMenus.filter((m) => m.company_id === cid),
      };
    }

    return { universities, users, menuAssignments: filteredMenus };
  }, [universities, users, menuAssignments, dateFilter, companyFilter]);

  async function signIn() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      let data;
      let sessionToken;
      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        throw new Error("Geçerli bir e-posta girin.");
      }
      if (!password) {
        throw new Error("Şifrenizi girin.");
      }

      try {
        if (!isSupabaseConfigured) {
          throw new Error("Supabase yapilandirilmamis, yerel login deneniyor.");
        }
        // 1. Try signing in via Supabase Auth
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
        if (authError) throw authError;
        if (!authData.session) throw new Error("Oturum başlatılamadı.");

        // 2. Fetch the user profile from backend
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.session.access_token}`,
          },
        });
        data = await response.json();
        if (!response.ok)
          throw new Error(data.detail ?? "Profil bilgisi alınamadı.");
        sessionToken = authData.session.access_token;
      } catch (supabaseErr) {
        // Fallback: Try backend login directly (useful for local seed users not in Supabase Auth)
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        const fallbackData = await response.json();
        if (!response.ok) {
          throw new Error(fallbackData.detail ?? "Giriş başarısız.");
        }
        data = fallbackData.user;
        sessionToken = fallbackData.access_token;
      }

      const mockSession = {
        access_token: sessionToken,
        user: {
          email: data.email,
          id: data.auth_user_id,
          full_name: data.full_name,
          role_name: data.role_name,
        },
      };
      localStorage.setItem(CATERING_SESSION_KEY, JSON.stringify(mockSession));
      window.dispatchEvent(new Event("catering-session-changed"));
      setIsAuthed(true);
      setCurrentUser(data);
      setInfo("Başarıyla giriş yapıldı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const validationErrors = getRegisterValidation({
        companyName,
        fullName,
        email: normalizedEmail,
        password,
        confirmPassword,
        acceptedTerms,
      });
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          full_name: fullName,
          email: normalizedEmail,
          password,
          auth_user_id: crypto.randomUUID(),
          role_name: "CATERING_ADMIN",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "Firma kaydı oluşturulamadı.");
      }

      const mockSession = {
        access_token: data.access_token,
        user: {
          email: data.user.email,
          id: data.user.auth_user_id,
          full_name: data.user.full_name,
          role_name: data.user.role_name,
        },
      };
      localStorage.setItem(CATERING_SESSION_KEY, JSON.stringify(mockSession));
      window.dispatchEvent(new Event("catering-session-changed"));
      setIsAuthed(true);
      setCurrentUser(data.user);
      setInfo("Firma kaydı oluşturuldu ve başarıyla giriş yapıldı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    localStorage.removeItem(CATERING_SESSION_KEY);
    window.dispatchEvent(new Event("catering-session-changed"));
    setIsAuthed(false);
    setCurrentUser(null);
    navigate("/modules/catering-management", { replace: true });
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    resetAuthForm();
    setError(null);
    setInfo(null);
    setDashboard(null);
    setUniversities([]);
    setUsers([]);
    setMenuAssignments([]);
    setCompanies([]);
  }

  // Action handlers
  const handleAddUniv = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        currentUser?.role_name === "SUPER_ADMIN"
          ? `/universities?company_id=${univForm.company_id}`
          : "/universities";
      await apiPost(url, {
        university_name: univForm.university_name,
        city: univForm.city || null,
        student_count:
          univForm.student_count === "" ? null : nonNegativeInt(univForm.student_count),
      });
      setModalType(null);
      setInfo("Üniversite başarıyla eklendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUniv = async () => {
    if (!selectedUniv) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/universities/${selectedUniv.id}`, {
        university_name: univForm.university_name,
        city: univForm.city || null,
        student_count:
          univForm.student_count === "" ? null : nonNegativeInt(univForm.student_count),
        status: univForm.status,
      });
      setModalType(null);
      setInfo("Üniversite başarıyla güncellendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUniv = async (id) => {
    if (!confirm("Bu üniversiteyi silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/universities/${id}`);
      setInfo("Üniversite başarıyla silindi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        currentUser?.role_name === "SUPER_ADMIN"
          ? `/users?company_id=${userForm.company_id}`
          : "/users";
      await apiPost(url, {
        auth_user_id: userForm.auth_user_id,
        email: userForm.email,
        full_name: userForm.full_name,
        role_name: userForm.role_name,
        phone: userForm.phone || null,
        university_id: userForm.university_id || null,
      });
      setModalType(null);
      setInfo("Kullanıcı başarıyla eklendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/users/${selectedUser.id}`, {
        full_name: userForm.full_name,
        phone: userForm.phone || null,
        is_active: userForm.is_active,
        role_name: userForm.role_name,
        university_id: userForm.university_id || null,
      });
      setModalType(null);
      setInfo("Kullanıcı başarıyla güncellendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/users/${id}`);
      setInfo("Kullanıcı başarıyla silindi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        currentUser?.role_name === "SUPER_ADMIN"
          ? `/menu-assignments?company_id=${menuForm.company_id}`
          : "/menu-assignments";
      await apiPost(url, {
        menu_id: menuForm.menu_id,
        university_id: menuForm.university_id,
        start_date: menuForm.start_date,
        end_date: menuForm.end_date,
        status: menuForm.status,
        is_published: menuForm.is_published,
      });
      setModalType(null);
      setInfo("Menü ataması başarıyla eklendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMenu = async () => {
    if (!selectedMenu) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/menu-assignments/${selectedMenu.id}`, {
        start_date: menuForm.start_date,
        end_date: menuForm.end_date,
        status: menuForm.status,
        is_published: menuForm.is_published,
      });
      setModalType(null);
      setInfo("Menü ataması başarıyla güncellendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm("Bu menü atamasını silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/menu-assignments/${id}`);
      setInfo("Menü ataması başarıyla silindi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiPost("/companies", {
        ...companyForm,
        tax_number: companyForm.tax_number || null,
        max_users: positiveInt(companyForm.max_users, 1),
        max_universities: positiveInt(companyForm.max_universities, 1),
      });
      setModalType(null);
      setInfo("Firma ve lisansı başarıyla eklendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/companies/${selectedCompany.id}`, {
        company_name: companyForm.company_name,
        tax_number: companyForm.tax_number || null,
        email: companyForm.email || null,
        phone: companyForm.phone || null,
        address: companyForm.address || null,
        status: companyForm.status,
      });
      setModalType(null);
      setInfo("Firma başarıyla güncellendi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLicense = async () => {
    const companyId = selectedLicense?.company_id ?? selectedCompany?.id;
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(
        `/companies/${companyId}/license`,
        {
          ...licenseForm,
          max_users: positiveInt(licenseForm.max_users, 1),
          max_universities: positiveInt(licenseForm.max_universities, 1),
        },
      );
      const updatedLicense = await apiGet(`/companies/${companyId}/license`);
      if (!licenseMatchesForm(updatedLicense, licenseForm)) {
        throw new Error("Lisans kaydı doğrulanamadı. Lütfen tekrar deneyin.");
      }
      setSelectedLicense(updatedLicense);
      setCompanies((items) =>
        items.map((company) =>
          company.id === companyId
            ? { ...company, license: updatedLicense }
            : company,
        ),
      );
      setModalType(null);
      setInfo("Lisans başarıyla güncellendi.");
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (
      !confirm(
        "Firma silindiğinde bağlı tüm üniversiteler, lisans ve kullanıcılar silinecektir. Emin misiniz?",
      )
    )
      return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/companies/${id}`);
      setInfo("Firma başarıyla silindi.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  // Modal opens helper
  const openAddUnivModal = () => {
    setUnivForm({
      university_name: "",
      city: "",
      student_count: 0,
      status: true,
      company_id: companies[0]?.id || "",
    });
    setModalType("add-univ");
  };

  const openEditUnivModal = (univ) => {
    setSelectedUniv(univ);
    setUnivForm({
      university_name: univ.university_name,
      city: univ.city || "",
      student_count: univ.student_count || 0,
      status: univ.status,
      company_id: univ.company_id,
    });
    setModalType("edit-univ");
  };

  const openAddUserModal = () => {
    setUserForm({
      auth_user_id: crypto.randomUUID(), // Mock generate uuid for client ease
      email: "",
      full_name: "",
      role_name: "DIETITIAN",
      university_id: universities[0]?.id || "",
      phone: "",
      is_active: true,
      company_id: companies[0]?.id || "",
    });
    setModalType("add-user");
  };

  const openEditUserModal = (user) => {
    setSelectedUser(user);
    setUserForm({
      auth_user_id: user.auth_user_id,
      email: user.email,
      full_name: user.full_name,
      role_name: user.role_name,
      university_id: user.university_id || "",
      phone: user.phone || "",
      is_active: user.is_active,
      company_id: user.company_id || "",
    });
    setModalType("edit-user");
  };

  const openAddMenuModal = () => {
    setMenuForm({
      menu_id: crypto.randomUUID(),
      university_id: universities[0]?.id || "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      status: "ACTIVE",
      is_published: false,
      company_id: companies[0]?.id || "",
    });
    setModalType("add-menu");
  };

  const openEditMenuModal = (menu) => {
    setSelectedMenu(menu);
    setMenuForm({
      menu_id: menu.menu_id,
      university_id: menu.university_id,
      start_date: menu.start_date,
      end_date: menu.end_date,
      status: menu.status,
      is_published: menu.is_published,
      company_id: menu.company_id,
    });
    setModalType("edit-menu");
  };

  const openAddCompanyModal = () => {
    setCompanyForm({
      company_name: "",
      tax_number: "",
      email: "",
      phone: "",
      address: "",
      plan_name: "Starter",
      max_users: 5,
      max_universities: 2,
      start_date: new Date().toISOString().split("T")[0],
      expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      status: true,
    });
    setModalType("add-company");
  };

  const openEditCompanyModal = (company) => {
    setSelectedCompany(company);
    setCompanyForm({
      company_name: company.company_name,
      tax_number: company.tax_number || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      plan_name: "Starter",
      max_users: 5,
      max_universities: 2,
      start_date: "",
      expire_date: "",
      status: company.status,
    });
    setModalType("edit-company");
  };

  const openEditLicenseModal = async (company) => {
    setSelectedCompany(company);
    try {
      setLoading(true);
      const lic = await apiGet(`/companies/${company.id}/license`);
      setSelectedLicense(lic);
      setLicenseForm({
        plan_name: lic.plan_name,
        max_users: lic.max_users,
        max_universities: lic.max_universities,
        start_date: lic.start_date,
        expire_date: lic.expire_date,
        status: lic.status,
      });
      setModalType("edit-license");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lisans bilgisi yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <main className="loading-container">
        <div className="spinner"></div>
        <p>Catering SaaS Başlatılıyor...</p>
      </main>
    );
  }

  const normalizedAuthEmail = email.trim().toLowerCase();
  const registerErrors = getRegisterValidation({
    companyName,
    fullName,
    email: normalizedAuthEmail,
    password,
    confirmPassword,
    acceptedTerms,
  });
  const loginDisabled = loading || !isValidEmail(normalizedAuthEmail) || !password;
  const registerDisabled = loading || registerErrors.length > 0;

  if (!isAuthed) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <header className="login-header">
            <div className="logo-shield animate-pulse">
              <ShieldCheck size={40} />
            </div>
            <h1>Catering Yönetim Paneli</h1>
            <p>Çok kiracılı SaaS operasyonlarına güvenli erişim sağlayın.</p>
          </header>

          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${authMode === "login" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("login");
                setError(null);
                setInfo(null);
              }}
            >
              Giriş Yap
            </button>
            <button
              className={`auth-tab-btn ${authMode === "register" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("register");
                setError(null);
                setInfo(null);
              }}
            >
              Kayıt Ol
            </button>
          </div>

          {authMode === "login" ? (
            <div className="login-form">
              <div className="input-group">
                <label>E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@catering.com"
                />
              </div>

              <PasswordField
                label="Şifre"
                value={password}
                onChange={setPassword}
                visible={showLoginPassword}
                onToggle={() => setShowLoginPassword((value) => !value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <button
                disabled={loginDisabled}
                className="btn btn-primary"
                onClick={signIn}
              >
                {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              </button>
            </div>
          ) : (
            <div className="login-form">
              <div className="input-group">
                <label>Firma Adı</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Lale Catering A.Ş."
                />
              </div>

              <div className="input-group">
                <label>Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                />
              </div>
              <div className="input-group">
                <label>E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@catering.com"
                />
              </div>

              <PasswordField
                label="Şifre"
                value={password}
                onChange={setPassword}
                visible={showRegisterPassword}
                onToggle={() => setShowRegisterPassword((value) => !value)}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
              />

              <PasswordStrength password={password} />

              <PasswordField
                label="Şifre Tekrar"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                placeholder="Şifrenizi tekrar girin"
                autoComplete="new-password"
              />

              <div className="auth-checklist">
                {[
                  ["Firma", companyName.trim().length >= 2],
                  ["Ad soyad", fullName.trim().length >= 2],
                  ["E-posta", isValidEmail(normalizedAuthEmail)],
                  ["Güçlü şifre", getPasswordStrength(password).score >= 2],
                  ["Şifre eşleşmesi", password && password === confirmPassword],
                ].map(([label, ok]) => (
                  <span key={label} className={ok ? "ok" : ""}>
                    <Check size={12} /> {label}
                  </span>
                ))}
              </div>

              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>Kullanım şartlarını ve veri işleme politikasını kabul ediyorum.</span>
              </label>

              <button
                disabled={registerDisabled}
                className="btn btn-primary"
                onClick={handleRegister}
              >
                {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol ve Giriş Yap"}
              </button>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginTop: "1rem" }}>
              {error}
            </div>
          )}
          {info && (
            <div className="alert alert-success" style={{ marginTop: "1rem" }}>
              {info}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {info && (
        <div className="alert alert-success">
          <span>{info}</span>
          <button className="close-btn" onClick={() => setInfo(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Views */}
      <Routes>
        <Route
          index
          element={
            <CateringDashboard
              dashboard={dashboard}
              universities={dashFilteredData.universities}
              users={dashFilteredData.users}
              menuAssignments={dashFilteredData.menuAssignments}
              dateFilter={dateFilter}
              onDateFilterToggle={() =>
                setDateFilter((f) => (f === "30d" ? "all" : "30d"))
              }
              companyFilter={companyFilter}
              onCompanyFilterChange={setCompanyFilter}
              companies={companies}
              currentUser={currentUser}
            />
          }
        />

        <Route
          path="inventory"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">📦</div>
              <h2>Malzeme Deposu</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="meals"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🍳</div>
              <h2>Yapılacak Yemekler</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="ai-menu"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🪄</div>
              <h2>AI Menü Planı</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="allergies"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🚨</div>
              <h2>Alerji Profilleri</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="holidays"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🏖️</div>
              <h2>Tatil & Devamsızlık</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="dorms"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🏢</div>
              <h2>Yurtlar</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="reports"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">📈</div>
              <h2>Raporlar</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route
          path="yok-univ"
          element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🎓</div>
              <h2>YÖK / Üniversite</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer
                ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu
                sonrasında aktif hale gelecektir.
              </p>
            </div>
          }
        />

        <Route element={<Outlet />}>
          <Route
            path="universities"
            element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Üniversiteler</h1>
                    <p>
                      Catering firmasının hizmet sağladığı kayıtlı
                      üniversiteler.
                    </p>
                  </div>
                  {["SUPER_ADMIN", "CATERING_ADMIN"].includes(
                    currentUser?.role_name || "",
                  ) && (
                    <button
                      className="btn btn-primary"
                      onClick={openAddUnivModal}
                    >
                      <Plus size={16} /> Yeni Üniversite Ekle
                    </button>
                  )}
                </header>

                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Üniversite Adı</th>
                        <th>Şehir</th>
                        <th>Öğrenci Sayısı</th>
                        <th>Durum</th>
                        <th>Kayıt Tarihi</th>
                        <th className="actions-col">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {universities.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center">
                            Kayıtlı üniversite bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        universities.map((univ) => (
                          <tr key={univ.id}>
                            <td>
                              <strong>{univ.university_name}</strong>
                            </td>
                            <td>{univ.city ?? "-"}</td>
                            <td>
                              {univ.student_count?.toLocaleString() ?? "-"}
                            </td>
                            <td>
                              <span
                                className={`pill pill-${univ.status ? "active" : "inactive"}`}
                              >
                                {univ.status ? "Aktif" : "Pasif"}
                              </span>
                            </td>
                            <td>
                              {new Date(univ.created_at).toLocaleDateString(
                                "tr-TR",
                              )}
                            </td>
                            <td className="actions-col">
                              {["SUPER_ADMIN", "CATERING_ADMIN"].includes(
                                currentUser?.role_name || "",
                              ) ? (
                                <>
                                  <button
                                    className="icon-btn btn-edit"
                                    onClick={() => openEditUnivModal(univ)}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    className="icon-btn btn-delete"
                                    onClick={() => handleDeleteUniv(univ.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            }
          />

          <Route
            path="users"
            element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Kullanıcı Yönetimi</h1>
                    <p>
                      Catering personeli ve üniversite yöneticisi hesapları.
                    </p>
                  </div>
                  {[
                    "SUPER_ADMIN",
                    "CATERING_ADMIN",
                    "UNIVERSITY_ADMIN",
                  ].includes(currentUser?.role_name || "") && (
                    <button
                      className="btn btn-primary"
                      onClick={openAddUserModal}
                    >
                      <Plus size={16} /> Yeni Kullanıcı Davet Et
                    </button>
                  )}
                </header>

                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Ad Soyad</th>
                        <th>E-posta</th>
                        <th>Rol</th>
                        <th>Hizmet Yeri (Üniversite)</th>
                        <th>Telefon</th>
                        <th>Durum</th>
                        <th className="actions-col">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center">
                            Kayıtlı kullanıcı bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => {
                          const uName =
                            universities.find(
                              (u) => u.id === user.university_id,
                            )?.university_name || "-";
                          return (
                            <tr key={user.id}>
                              <td>
                                <strong>{user.full_name}</strong>
                              </td>
                              <td>{user.email}</td>
                              <td>
                                <span
                                  className={`badge badge-role ${user.role_name.toLowerCase()}`}
                                >
                                  {ROLE_LABELS[user.role_name] ||
                                    user.role_name}
                                </span>
                              </td>
                              <td>{uName}</td>
                              <td>{user.phone ?? "-"}</td>
                              <td>
                                <span
                                  className={`pill pill-${user.is_active ? "active" : "inactive"}`}
                                >
                                  {user.is_active ? "Aktif" : "Pasif"}
                                </span>
                              </td>
                              <td className="actions-col">
                                {[
                                  "SUPER_ADMIN",
                                  "CATERING_ADMIN",
                                  "UNIVERSITY_ADMIN",
                                ].includes(currentUser?.role_name || "") ? (
                                  <>
                                    <button
                                      className="icon-btn btn-edit"
                                      onClick={() => openEditUserModal(user)}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    {user.auth_user_id !==
                                      currentUser?.auth_user_id && (
                                      <button
                                        className="icon-btn btn-delete"
                                        onClick={() =>
                                          handleDeleteUser(user.id)
                                        }
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            }
          />

          <Route
            path="menu-assignments"
            element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Menü Atamaları</h1>
                    <p>
                      AI ile oluşturulan menülerin üniversiteler bazında
                      planlama ve takvimi.
                    </p>
                  </div>
                  {["SUPER_ADMIN", "CATERING_ADMIN", "DIETITIAN"].includes(
                    currentUser?.role_name || "",
                  ) && (
                    <button
                      className="btn btn-primary"
                      onClick={openAddMenuModal}
                    >
                      <Plus size={16} /> Menü Ata
                    </button>
                  )}
                </header>

                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Menü ID</th>
                        <th>Üniversite</th>
                        <th>Başlangıç Tarihi</th>
                        <th>Bitiş Tarihi</th>
                        <th>Durum</th>
                        <th>Yayın Durumu</th>
                        <th>Atayan Yetkili</th>
                        <th className="actions-col">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center">
                            Kayıtlı menü ataması bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        menuAssignments.map((menu) => {
                          const uName =
                            universities.find(
                              (u) => u.id === menu.university_id,
                            )?.university_name || "-";
                          const assignerName =
                            users.find((u) => u.id === menu.assigned_by)
                              ?.full_name || "Bilinmiyor";
                          return (
                            <tr key={menu.id}>
                              <td>
                                <span className="mono">
                                  {menu.menu_id.substring(0, 8)}...
                                </span>
                              </td>
                              <td>
                                <strong>{uName}</strong>
                              </td>
                              <td>
                                {new Date(menu.start_date).toLocaleDateString(
                                  "tr-TR",
                                )}
                              </td>
                              <td>
                                {new Date(menu.end_date).toLocaleDateString(
                                  "tr-TR",
                                )}
                              </td>
                              <td>
                                <span
                                  className={`pill pill-${menu.status.toLowerCase()}`}
                                >
                                  {menu.status === "ACTIVE"
                                    ? "Aktif"
                                    : menu.status === "INACTIVE"
                                      ? "Pasif"
                                      : "Arşivlendi"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`pill pill-${menu.is_published ? "active" : "inactive"}`}
                                >
                                  {menu.is_published ? "Yayınlandı" : "Taslak"}
                                </span>
                              </td>
                              <td>{assignerName}</td>
                              <td className="actions-col">
                                {[
                                  "SUPER_ADMIN",
                                  "CATERING_ADMIN",
                                  "DIETITIAN",
                                ].includes(currentUser?.role_name || "") ? (
                                  <>
                                    <button
                                      className="icon-btn btn-edit"
                                      onClick={() => openEditMenuModal(menu)}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    {["SUPER_ADMIN", "CATERING_ADMIN"].includes(
                                      currentUser?.role_name || "",
                                    ) && (
                                      <button
                                        className="icon-btn btn-delete"
                                        onClick={() =>
                                          handleDeleteMenu(menu.id)
                                        }
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            }
          />

          <Route
            path="companies"
            element={
              roleCan(currentUser?.role_name, "companies") ? (
                <>
                  <header className="content-header">
                    <div>
                      <h1>Catering Firmaları & Lisans Planları</h1>
                      <p>
                        SaaS platformuna kayıtlı tüm catering firmaları,
                        limitleri ve lisansları.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={openAddCompanyModal}
                    >
                      <Plus size={16} /> Yeni Firma Ekle
                    </button>
                  </header>

                  <div className="table-card">
                    <table>
                      <thead>
                        <tr>
                          <th>Firma Adı</th>
                          <th>Vergi No</th>
                          <th>E-posta</th>
                          <th>Telefon</th>
                          <th>Durum</th>
                          <th>Lisans Planı</th>
                          <th>Limitler (Üniv/Kullanıcı)</th>
                          <th className="actions-col-wide">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center">
                              Kayıtlı firma bulunamadı.
                            </td>
                          </tr>
                        ) : (
                          companies.map((comp) => (
                            <tr key={comp.id}>
                              <td>
                                <strong>{comp.company_name}</strong>
                              </td>
                              <td>{comp.tax_number ?? "-"}</td>
                              <td>{comp.email ?? "-"}</td>
                              <td>{comp.phone ?? "-"}</td>
                              <td>
                                <span
                                  className={`pill pill-${comp.status ? "active" : "inactive"}`}
                                >
                                  {comp.status ? "Aktif" : "Pasif"}
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-plan">
                                  {comp.license?.plan_name ?? "-"}
                                </span>
                              </td>
                              <td>
                                {comp.license
                                  ? `${comp.license.max_universities} / ${comp.license.max_users}`
                                  : "Lisans bilgisi yok"}
                              </td>
                              <td className="actions-col-wide">
                                <button
                                  className="icon-btn btn-edit"
                                  title="Firmayı Düzenle"
                                  onClick={() => openEditCompanyModal(comp)}
                                >
                                  <Edit2 size={14} /> Firma
                                </button>
                                <button
                                  className="icon-btn btn-license"
                                  title="Lisansı Düzenle"
                                  onClick={() => openEditLicenseModal(comp)}
                                >
                                  <Award size={14} /> Lisans
                                </button>
                                <button
                                  className="icon-btn btn-delete"
                                  title="Firmayı Sil"
                                  onClick={() => handleDeleteCompany(comp.id)}
                                >
                                  <Trash2 size={14} /> Sil
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <Navigate to="/modules/catering-management" replace />
              )
            }
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/modules/catering-management" replace />}
        />
      </Routes>

      {/* Modals */}
      {modalType && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>
                {modalType === "add-univ" && "Üniversite Ekle"}
                {modalType === "edit-univ" && "Üniversite Düzenle"}
                {modalType === "add-user" && "Kullanıcı Ekle"}
                {modalType === "edit-user" && "Kullanıcı Düzenle"}
                {modalType === "add-menu" && "Menü Ata"}
                {modalType === "edit-menu" && "Menü Atamasını Düzenle"}
                {modalType === "add-company" && "Firma Ekle"}
                {modalType === "edit-company" && "Firma Bilgilerini Düzenle"}
                {modalType === "edit-license" &&
                  `Lisans Yönetimi - ${selectedCompany?.company_name}`}
              </h2>
              <button className="close-btn" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              {/* Add / Edit University */}
              {(modalType === "add-univ" || modalType === "edit-univ") && (
                <>
                  {currentUser?.role_name === "SUPER_ADMIN" &&
                    modalType === "add-univ" && (
                      <div className="input-group">
                        <label>Firma</label>
                        <select
                          value={univForm.company_id}
                          onChange={(e) =>
                            setUnivForm({
                              ...univForm,
                              company_id: e.target.value,
                            })
                          }
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  <div className="input-group">
                    <label>Üniversite Adı</label>
                    <input
                      type="text"
                      value={univForm.university_name}
                      onChange={(e) =>
                        setUnivForm({
                          ...univForm,
                          university_name: e.target.value,
                        })
                      }
                      placeholder="Örn. İstanbul Teknik Üniversitesi"
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Şehir</label>
                      <input
                        type="text"
                        value={univForm.city}
                        onChange={(e) =>
                          setUnivForm({ ...univForm, city: e.target.value })
                        }
                        placeholder="Örn. İstanbul"
                      />
                    </div>
                    <div className="input-group">
                      <label>Öğrenci Sayısı</label>
                      <NumericStepper
                        value={univForm.student_count}
                        min={0}
                        placeholder="0"
                        onChange={(student_count) =>
                          setUnivForm({ ...univForm, student_count })
                        }
                      />
                    </div>
                  </div>
                  {modalType === "edit-univ" && (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="univ_status"
                        checked={univForm.status}
                        onChange={(e) =>
                          setUnivForm({ ...univForm, status: e.target.checked })
                        }
                      />
                      <label htmlFor="univ_status">Aktif Üniversite</label>
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={
                      modalType === "add-univ" ? handleAddUniv : handleEditUniv
                    }
                  >
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </>
              )}

              {/* Add / Edit User */}
              {(modalType === "add-user" || modalType === "edit-user") && (
                <>
                  {currentUser?.role_name === "SUPER_ADMIN" &&
                    modalType === "add-user" && (
                      <div className="input-group">
                        <label>Firma</label>
                        <select
                          value={userForm.company_id}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              company_id: e.target.value,
                            })
                          }
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  {modalType === "add-user" && (
                    <div className="input-group">
                      <label>Auth User ID (Supabase UID)</label>
                      <input
                        type="text"
                        value={userForm.auth_user_id}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            auth_user_id: e.target.value,
                          })
                        }
                        placeholder="UUID girin veya otomatik oluşanı kullanın"
                      />
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <label>E-posta</label>
                      <input
                        type="email"
                        value={userForm.email}
                        disabled={modalType === "edit-user"}
                        onChange={(e) =>
                          setUserForm({ ...userForm, email: e.target.value })
                        }
                        placeholder="Örn. ahmet@catering.com"
                      />
                    </div>
                    <div className="input-group">
                      <label>Ad Soyad</label>
                      <input
                        type="text"
                        value={userForm.full_name}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Ahmet Yılmaz"
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Telefon</label>
                      <input
                        type="text"
                        value={userForm.phone}
                        onChange={(e) =>
                          setUserForm({ ...userForm, phone: e.target.value })
                        }
                        placeholder="555-1234"
                      />
                    </div>
                    <div className="input-group">
                      <label>Rol</label>
                      <select
                        value={userForm.role_name}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            role_name: e.target.value,
                          })
                        }
                      >
                        {currentUser?.role_name === "SUPER_ADMIN" && (
                          <option value="SUPER_ADMIN">Süper Admin</option>
                        )}
                        {currentUser?.role_name !== "UNIVERSITY_ADMIN" && (
                          <option value="CATERING_ADMIN">
                            Catering Yöneticisi
                          </option>
                        )}
                        <option value="UNIVERSITY_ADMIN">
                          Üniversite Yöneticisi
                        </option>
                        <option value="DIETITIAN">Diyetisyen</option>
                        <option value="WAREHOUSE_STAFF">Depo Görevlisi</option>
                        <option value="PURCHASING_STAFF">
                          Satın Alma Sorumlusu
                        </option>
                      </select>
                    </div>
                  </div>
                  {userForm.role_name !== "SUPER_ADMIN" &&
                    userForm.role_name !== "CATERING_ADMIN" && (
                      <div className="input-group">
                        <label>Görevli Olduğu Üniversite</label>
                        <select
                          value={userForm.university_id}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              university_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Seçiniz...</option>
                          {universities.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.university_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  {modalType === "edit-user" && (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="user_active"
                        checked={userForm.is_active}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            is_active: e.target.checked,
                          })
                        }
                      />
                      <label htmlFor="user_active">
                        Aktif Kullanıcı Hesabı
                      </label>
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={
                      modalType === "add-user" ? handleAddUser : handleEditUser
                    }
                  >
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </>
              )}

              {/* Add / Edit Menu Assignment */}
              {(modalType === "add-menu" || modalType === "edit-menu") && (
                <>
                  {currentUser?.role_name === "SUPER_ADMIN" &&
                    modalType === "add-menu" && (
                      <div className="input-group">
                        <label>Firma</label>
                        <select
                          value={menuForm.company_id}
                          onChange={(e) =>
                            setMenuForm({
                              ...menuForm,
                              company_id: e.target.value,
                            })
                          }
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  {modalType === "add-menu" && (
                    <div className="input-group">
                      <label>
                        Menü ID (AI Modülünden Gelen Benzersiz Kimlik)
                      </label>
                      <input
                        type="text"
                        value={menuForm.menu_id}
                        onChange={(e) =>
                          setMenuForm({ ...menuForm, menu_id: e.target.value })
                        }
                        placeholder="UUID formatında"
                      />
                    </div>
                  )}
                  {modalType === "add-menu" && (
                    <div className="input-group">
                      <label>Üniversite</label>
                      <select
                        value={menuForm.university_id}
                        onChange={(e) =>
                          setMenuForm({
                            ...menuForm,
                            university_id: e.target.value,
                          })
                        }
                      >
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.university_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <label>Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={menuForm.start_date}
                        onChange={(e) =>
                          setMenuForm({
                            ...menuForm,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={menuForm.end_date}
                        onChange={(e) =>
                          setMenuForm({ ...menuForm, end_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Durum</label>
                      <select
                        value={menuForm.status}
                        onChange={(e) =>
                          setMenuForm({ ...menuForm, status: e.target.value })
                        }
                      >
                        <option value="ACTIVE">Aktif</option>
                        <option value="INACTIVE">Pasif</option>
                        <option value="ARCHIVED">Arşivlendi</option>
                      </select>
                    </div>
                    <div className="checkbox-group mt-large">
                      <input
                        type="checkbox"
                        id="is_published"
                        checked={menuForm.is_published}
                        onChange={(e) =>
                          setMenuForm({
                            ...menuForm,
                            is_published: e.target.checked,
                          })
                        }
                      />
                      <label htmlFor="is_published">Öğrencilere Yayınla</label>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={
                      modalType === "add-menu" ? handleAddMenu : handleEditMenu
                    }
                  >
                    {loading ? "Kaydediliyor..." : "Menüyü Ata"}
                  </button>
                </>
              )}

              {/* Add / Edit Company */}
              {(modalType === "add-company" ||
                modalType === "edit-company") && (
                <>
                  <div className="input-group">
                    <label>Firma Adı</label>
                    <input
                      type="text"
                      value={companyForm.company_name}
                      onChange={(e) =>
                        setCompanyForm({
                          ...companyForm,
                          company_name: e.target.value,
                        })
                      }
                      placeholder="Örn. Lale Catering A.Ş."
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Vergi / TC Numarası</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={companyForm.tax_number}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            tax_number: digitsOnly(e.target.value, 11),
                          })
                        }
                        placeholder="11 haneli numara"
                      />
                    </div>
                    <div className="input-group">
                      <label>Firma E-postası</label>
                      <input
                        type="email"
                        value={companyForm.email}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="kurumsal@lale.com"
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Telefon</label>
                      <input
                        type="text"
                        value={companyForm.phone}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            phone: e.target.value,
                          })
                        }
                        placeholder="555-555-5555"
                      />
                    </div>
                    <div className="input-group">
                      <label>Adres</label>
                      <input
                        type="text"
                        value={companyForm.address}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            address: e.target.value,
                          })
                        }
                        placeholder="Karanfil Sok. No: 12"
                      />
                    </div>
                  </div>

                  {modalType === "add-company" && (
                    <fieldset className="license-fieldset">
                      <legend>İlk Lisans Kurulumu</legend>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Plan Adı</label>
                          <select
                            value={companyForm.plan_name}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                plan_name: e.target.value,
                              })
                            }
                          >
                            <option value="Starter">Starter</option>
                            <option value="Professional">Professional</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Max Üniversite Limiti</label>
                          <NumericStepper
                            value={companyForm.max_universities}
                            min={1}
                            placeholder="1"
                            onChange={(max_universities) =>
                              setCompanyForm({
                                ...companyForm,
                                max_universities,
                              })
                            }
                          />
                        </div>
                        <div className="input-group">
                          <label>Max Kullanıcı Limiti</label>
                          <NumericStepper
                            value={companyForm.max_users}
                            min={1}
                            placeholder="1"
                            onChange={(max_users) =>
                              setCompanyForm({ ...companyForm, max_users })
                            }
                          />
                        </div>
                      </div>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Başlangıç Tarihi</label>
                          <input
                            type="date"
                            value={companyForm.start_date}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                start_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="input-group">
                          <label>Bitiş Tarihi</label>
                          <input
                            type="date"
                            value={companyForm.expire_date}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                expire_date: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </fieldset>
                  )}

                  {modalType === "edit-company" && (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="comp_status"
                        checked={companyForm.status}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            status: e.target.checked,
                          })
                        }
                      />
                      <label htmlFor="comp_status">Aktif Firma Hesabı</label>
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={
                      modalType === "add-company"
                        ? handleAddCompany
                        : handleEditCompany
                    }
                  >
                    {loading ? "Kaydediliyor..." : "Firma Kaydet"}
                  </button>
                </>
              )}

              {/* Edit License */}
              {modalType === "edit-license" && selectedLicense && (
                <>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Plan Adı</label>
                      <select
                        value={licenseForm.plan_name}
                        onChange={(e) =>
                          setLicenseForm({
                            ...licenseForm,
                            plan_name: e.target.value,
                          })
                        }
                      >
                        <option value="Starter">Starter</option>
                        <option value="Professional">Professional</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Maksimum Üniversite</label>
                      <NumericStepper
                        value={licenseForm.max_universities}
                        min={1}
                        placeholder="1"
                        onChange={(max_universities) =>
                          setLicenseForm({
                            ...licenseForm,
                            max_universities,
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Maksimum Kullanıcı</label>
                      <NumericStepper
                        value={licenseForm.max_users}
                        min={1}
                        placeholder="1"
                        onChange={(max_users) =>
                          setLicenseForm({ ...licenseForm, max_users })
                        }
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Lisans Başlangıcı</label>
                      <input
                        type="date"
                        value={licenseForm.start_date}
                        onChange={(e) =>
                          setLicenseForm({
                            ...licenseForm,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Lisans Bitişi</label>
                      <input
                        type="date"
                        value={licenseForm.expire_date}
                        onChange={(e) =>
                          setLicenseForm({
                            ...licenseForm,
                            expire_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="lic_active"
                      checked={licenseForm.status}
                      onChange={(e) =>
                        setLicenseForm({
                          ...licenseForm,
                          status: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="lic_active">Lisans Aktif</label>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleEditLicense}
                  >
                    {loading
                      ? "Kaydediliyor..."
                      : "Lisans Bilgilerini Güncelle"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <div className="catering-management-scope">
      <CateringManagementContent />
    </div>
  );
}
