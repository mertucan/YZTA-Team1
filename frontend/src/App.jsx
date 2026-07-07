import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import Topbar from "./components/Layout/Topbar";
import Dashboard from "./pages/Dashboard";
import Ingredients from "./pages/Ingredients";
import Meals from "./pages/Meals";
import Students from "./pages/Students";
import Absences from "./pages/Absences";
import { modules } from "./modules";

function WelcomePage() {
  const features = [
    ["AI menü planlama", "Stok, bütçe ve besin değerleriyle haftalık menü üretimi."],
    ["Catering yönetimi", "Firma, lisans, üniversite ve kullanıcı operasyonları tek ekranda."],
    ["Öğrenci takibi", "Devamsızlık, sağlık uyarıları ve yemek tüketim verileriyle görünürlük."],
  ];

  return (
    <div style={welcomeStyles.page}>
      <header style={welcomeStyles.nav}>
        <div style={welcomeStyles.brandMark}>Y</div>
        <strong style={welcomeStyles.brandText}>YemekhanAI</strong>
        <Link to="/modules/catering-management" style={welcomeStyles.navButton}>Catering Girişi</Link>
      </header>

      <main style={welcomeStyles.wrap}>
        <section style={welcomeStyles.hero}>
          <div style={welcomeStyles.heroCopy}>
            <div style={welcomeStyles.badge}>Üniversite Beslenme Sistemi</div>
            <h1 style={welcomeStyles.title}>Kampüs yemek operasyonlarını daha akıllı yönetin.</h1>
            <p style={welcomeStyles.text}>
              YemekhanAI; malzeme stoğu, AI menü planlama, öğrenci verileri ve catering
              yönetimini sade bir panelde birleştirir. Ekipleriniz daha hızlı karar alır,
              öğrencileriniz daha dengeli menülere ulaşır.
            </p>
            <div style={welcomeStyles.actions}>
              <Link to="/modules/catering-management" style={welcomeStyles.primary}>Catering Girişi</Link>
              <Link to="/dashboard" style={welcomeStyles.secondary}>Ana Dashboard</Link>
            </div>
          </div>

          <div style={welcomeStyles.preview}>
            <div style={welcomeStyles.previewTop}>
              <span style={welcomeStyles.statusDot} />
              Canlı Operasyon Özeti
            </div>
            <div style={welcomeStyles.metricGrid}>
              <div style={welcomeStyles.metricCard}><span>Aktif Menü</span><strong>12</strong></div>
              <div style={welcomeStyles.metricCard}><span>Üniversite</span><strong>13</strong></div>
              <div style={welcomeStyles.metricCard}><span>Öğrenci</span><strong>579K</strong></div>
              <div style={welcomeStyles.metricCard}><span>Lisans</span><strong>Aktif</strong></div>
            </div>
            <div style={welcomeStyles.chart}>
              <span style={{ ...welcomeStyles.chartBar, height: "34%" }} />
              <span style={{ ...welcomeStyles.chartBar, height: "48%" }} />
              <span style={{ ...welcomeStyles.chartBar, height: "40%" }} />
              <span style={{ ...welcomeStyles.chartBar, height: "72%" }} />
              <span style={{ ...welcomeStyles.chartBar, height: "58%" }} />
            </div>
          </div>
        </section>

        <section style={welcomeStyles.features}>
          {features.map(([title, description]) => (
            <article key={title} style={welcomeStyles.featureCard}>
              <span style={welcomeStyles.featureIcon}>+</span>
              <h2 style={welcomeStyles.featureTitle}>{title}</h2>
              <p style={welcomeStyles.featureText}>{description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

function AppShell() {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return (
      <Routes>
        <Route path="/" element={<WelcomePage />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ marginLeft: 230, flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ padding: 24, flex: 1 }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/students" element={<Students />} />
            <Route path="/absences" element={<Absences />} />

            {modules.map((mod) => (
              <Route key={mod.id} path={`${mod.route}/*`} element={<mod.component />} />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}

const welcomeStyles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #ecfdf5 100%)",
    color: "var(--text)",
  },
  nav: {
    width: "min(1180px, 100%)",
    margin: "0 auto",
    height: 58,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "var(--accent)",
    color: "white",
    fontWeight: 900,
  },
  brandText: {
    fontSize: 18,
    color: "var(--text)",
  },
  navButton: {
    marginLeft: "auto",
    minHeight: 38,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 14px",
    borderRadius: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "var(--shadow-sm)",
  },
  wrap: {
    width: "min(1180px, 100%)",
    margin: "52px auto 0",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
    gap: 28,
    alignItems: "stretch",
  },
  heroCopy: {
    padding: "58px 0",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.09)",
    color: "var(--accent)",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 18,
  },
  title: {
    maxWidth: 700,
    margin: 0,
    color: "var(--text)",
    fontSize: 54,
    lineHeight: 1.02,
    letterSpacing: 0,
  },
  text: {
    maxWidth: 650,
    margin: "20px 0 0",
    color: "var(--text2)",
    fontSize: 17,
    lineHeight: 1.75,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 32,
  },
  primary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "0 20px",
    borderRadius: 8,
    background: "var(--accent)",
    color: "white",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 18px 38px rgba(37, 99, 235, 0.24)",
  },
  secondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "0 20px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    color: "var(--text)",
    background: "rgba(255,255,255,0.76)",
    fontWeight: 900,
    textDecoration: "none",
  },
  preview: {
    borderRadius: 8,
    border: "1px solid rgba(148, 163, 184, 0.32)",
    background: "rgba(255,255,255,0.82)",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
    padding: 22,
    minHeight: 420,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  previewTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "var(--text2)",
    fontSize: 13,
    fontWeight: 800,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 0 5px rgba(16, 185, 129, 0.14)",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  metricCard: {
    padding: 16,
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "grid",
    gap: 8,
  },
  chart: {
    flex: 1,
    minHeight: 180,
    display: "flex",
    alignItems: "end",
    gap: 14,
    padding: "18px 16px",
    borderRadius: 8,
    background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
  },
  chartBar: {
    flex: 1,
    borderRadius: "8px 8px 4px 4px",
    background: "linear-gradient(180deg, #22d3ee 0%, #2563eb 100%)",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginTop: 26,
  },
  featureCard: {
    borderRadius: 8,
    border: "1px solid rgba(148, 163, 184, 0.28)",
    background: "rgba(255,255,255,0.72)",
    padding: 22,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "rgba(16, 185, 129, 0.12)",
    color: "#059669",
    fontWeight: 900,
  },
  featureTitle: {
    margin: "16px 0 8px",
    color: "var(--text)",
    fontSize: 17,
  },
  featureText: {
    margin: 0,
    color: "var(--text2)",
    lineHeight: 1.65,
    fontSize: 14,
  },
};

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
