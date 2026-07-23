import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import Topbar from "./components/Layout/Topbar";
import Dashboard from "./pages/Dashboard";
import Ingredients from "./pages/Ingredients";
import Meals from "./pages/Meals";
import Students from "./pages/Students";
import Absences from "./pages/Absences";
import { modules } from "./modules";
import tabloDotLogo from "./assets/tablo-dot-logo.png";

function WelcomePage() {
  const features = [
    ["AI menü planlama", "Stok, bütçe ve besin değerleriyle haftalık menü üretimi."],
    ["Catering yönetimi", "Firma, lisans, üniversite ve kullanıcı operasyonları tek ekranda."],
    ["Öğrenci takibi", "Devamsızlık, sağlık uyarıları ve yemek tüketim verileriyle görünürlük."],
  ];

  const metrics = [
    ["Aktif Menü", "12"],
    ["Üniversite", "13"],
    ["Öğrenci", "579K"],
    ["Lisans", "Aktif"],
  ];

  return (
    <div className="welcome-home">
      <main className="welcome-card">
        <header className="welcome-nav">
          <img src={tabloDotLogo} alt="TabloDot" className="welcome-logo" />
          <Link to="/modules/catering-management" className="welcome-login">Giriş Yap</Link>
        </header>

        <section className="welcome-hero">
          <h1>Kampüs yemek operasyonlarını daha akıllı yönetin.</h1>
          <p>
            TabloDot; malzeme stoğu, AI menü planlama, öğrenci verileri ve catering
            yönetimini sade bir panelde birleştirir. Ekipleriniz daha hızlı karar alır.
          </p>
          <div className="welcome-actions">
            <Link to="/modules/catering-management" className="welcome-primary">Giriş Yap</Link>
            <Link to="/dashboard" className="welcome-secondary">Ana Panel</Link>
          </div>
        </section>

        <section className="welcome-summary">
          <strong>Canlı Operasyon Özeti</strong>
          <div className="welcome-metrics">
            {metrics.map(([label, value]) => (
              <div key={label} className="welcome-metric">
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="welcome-bars">
            {[48, 62, 39, 57, 72, 84, 60, 77, 92, 65].map((height, index) => (
              <span key={index}>
                <i className="orange" style={{ height: `${height}%` }} />
                <i className="muted" style={{ height: `${Math.max(34, height - 12)}%` }} />
              </span>
            ))}
          </div>
        </section>

        <section className="welcome-features">
          {features.map(([title, description]) => (
            <article key={title}>
              <span>+</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>

      </main>
    </div>
  );
}

function DualWelcomePage() {
  const features = [
    ["AI menü planlama", "Stok, bütçe ve besin değerleriyle haftalık menü üretimi."],
    ["Catering yönetimi", "Firma, lisans, üniversite ve kullanıcı operasyonları tek ekranda."],
    ["Öğrenci takibi", "Devamsızlık, sağlık uyarıları ve yemek tüketim verileriyle görünürlük."],
  ];

  const metrics = [
    ["Aktif Menü", "12"],
    ["Üniversite", "13"],
    ["Öğrenci", "579K"],
    ["Lisans", "Aktif"],
  ];

  return (
    <div style={homeStyles.page}>
      <main style={homeStyles.showcase}>
        <section style={homeStyles.darkPanel}>
          <header style={homeStyles.darkNav}>
            <img src={tabloDotLogo} alt="TabloDot" style={homeStyles.darkLogo} />
            <Link to="/modules/catering-management" style={homeStyles.darkLogin}>Giriş Yap</Link>
          </header>

          <div style={homeStyles.darkGrid}>
            <div>
              <h1 style={homeStyles.darkTitle}>Kampüs yemek operasyonlarını daha akıllı yönetin.</h1>
              <p style={homeStyles.darkText}>
                TabloDot; malzeme stoğu, AI menü planlama, öğrenci verileri ve catering
                yönetimini sade bir panelde birleştirir. Ekipleriniz daha hızlı karar alır,
                öğrencileriniz daha dengeli menülere ulaşır.
              </p>
              <div style={homeStyles.darkActions}>
                <Link to="/modules/catering-management" style={homeStyles.darkPrimary}>Giriş Yap / Kayıt Ol</Link>
                <Link to="/dashboard" style={homeStyles.darkSecondary}>Ana Panel</Link>
              </div>
            </div>

            <div style={homeStyles.darkSummary}>
              <strong style={homeStyles.summaryTitle}>Canlı Operasyon Özeti</strong>
              <div style={homeStyles.darkMetricGrid}>
                {metrics.map(([label, value], index) => (
                  <div key={label} style={homeStyles.darkMetric}>
                    <span style={homeStyles.metricIcon}>{index + 1}</span>
                    <div>
                      <small style={homeStyles.darkMetricLabel}>{label}</small>
                      <b style={homeStyles.darkMetricValue}>{value}</b>
                    </div>
                  </div>
                ))}
              </div>
              <div style={homeStyles.darkBars}>
                {[58, 34, 68, 50, 82, 63, 88, 72].map((height, index) => (
                  <span key={index} style={{ ...homeStyles.barPair, height: `${height}%` }}>
                    <i style={homeStyles.blueBar} />
                    <i style={homeStyles.orangeBar} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={homeStyles.darkFeatures}>
            {features.map(([title, description]) => (
              <article key={title} style={homeStyles.darkFeature}>
                <span style={homeStyles.featurePlus}>+</span>
                <h2 style={homeStyles.darkFeatureTitle}>{title}</h2>
                <p style={homeStyles.darkFeatureText}>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div style={homeStyles.divider} aria-hidden="true" />

        <aside style={homeStyles.lightPanel}>
          <header style={homeStyles.lightNav}>
            <img src={tabloDotLogo} alt="TabloDot" style={homeStyles.lightLogo} />
            <Link to="/modules/catering-management" style={homeStyles.lightLogin}>Giriş Yap</Link>
          </header>

          <section style={homeStyles.lightHero}>
            <h2 style={homeStyles.lightTitle}>Kampüs yemek operasyonlarını daha akıllı yönetin.</h2>
            <p style={homeStyles.lightText}>
              TabloDot; malzeme stoğu, AI menü planlama, öğrenci verileri ve catering
              yönetimini sade bir panelde birleştirir. Ekipleriniz daha hızlı karar alır.
            </p>
            <div style={homeStyles.lightActions}>
              <Link to="/modules/catering-management" style={homeStyles.lightPrimary}>Giriş Yap</Link>
              <Link to="/dashboard" style={homeStyles.lightSecondary}>Ana Panel</Link>
            </div>
          </section>

          <section style={homeStyles.lightSummary}>
            <strong style={homeStyles.lightSummaryTitle}>Canlı Operasyon Özeti</strong>
            <div style={homeStyles.lightMetricGrid}>
              {metrics.map(([label, value]) => (
                <div key={label} style={homeStyles.lightMetric}>
                  <small style={homeStyles.lightMetricLabel}>{label}</small>
                  <b style={homeStyles.lightMetricValue}>{value}</b>
                </div>
              ))}
            </div>
            <div style={homeStyles.lightBars}>
              {[48, 62, 39, 57, 72, 84, 60, 77, 92, 65].map((height, index) => (
                <span key={index} style={homeStyles.lightBarGroup}>
                  <i style={{ ...homeStyles.lightOrangeBar, height: `${height}%` }} />
                  <i style={{ ...homeStyles.lightGrayBar, height: `${Math.max(34, height - 12)}%` }} />
                </span>
              ))}
            </div>
          </section>

          <div style={homeStyles.lightFeatures}>
            {features.map(([title, description]) => (
              <article key={title} style={homeStyles.lightFeature}>
                <span style={homeStyles.lightFeatureIcon}>+</span>
                <h3 style={homeStyles.lightFeatureTitle}>{title}</h3>
                <p style={homeStyles.lightFeatureText}>{description}</p>
              </article>
            ))}
          </div>

          <nav style={homeStyles.mobileTabs} aria-label="Alt navigasyon">
            {["Bugun", "Haftalik", "Profil"].map((item) => (
              <Link key={item} to={item === "Bugun" ? "/modules/catering-management" : "/dashboard"} style={homeStyles.mobileTab}>
                <span style={homeStyles.mobileTabIcon} />
                {item}
              </Link>
            ))}
          </nav>
        </aside>
      </main>
    </div>
  );
}

function LegacyWelcomePage() {
  const features = [
    ["AI menü planlama", "Stok, bütçe ve besin değerleriyle haftalık menü üretimi."],
    ["Catering yönetimi", "Firma, lisans, üniversite ve kullanıcı operasyonları tek ekranda."],
    ["Öğrenci takibi", "Devamsızlık, sağlık uyarıları ve yemek tüketim verileriyle görünürlük."],
  ];

  return (
    <div style={welcomeStyles.page}>
      <header style={welcomeStyles.nav}>
        <div style={welcomeStyles.brandMark}>T</div>
        <strong style={welcomeStyles.brandText}>TabloDot</strong>
        <Link to="/modules/catering-management" style={welcomeStyles.navButton}>Giriş Yap</Link>
      </header>

      <main style={welcomeStyles.wrap}>
        <section style={welcomeStyles.hero}>
          <div style={welcomeStyles.heroCopy}>
            <div style={welcomeStyles.badge}>Üniversite Beslenme Sistemi</div>
            <h1 style={welcomeStyles.title}>Kampüs yemek operasyonlarını daha akıllı yönetin.</h1>
            <p style={welcomeStyles.text}>
              TabloDot; malzeme stoğu, AI menü planlama, öğrenci verileri ve catering
              yönetimini sade bir panelde birleştirir. Ekipleriniz daha hızlı karar alır,
              öğrencileriniz daha dengeli menülere ulaşır.
            </p>
            <div style={welcomeStyles.actions}>
              <Link to="/modules/catering-management" style={welcomeStyles.primary}>Giriş Yap / Kayıt Ol</Link>
              <Link to="/dashboard" style={welcomeStyles.secondary}>Ana Panel</Link>
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
    <div style={{ display: "flex", minHeight: "100vh", overflowX: "hidden" }}>
      <Sidebar />
      <div style={{ marginLeft: 230, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ padding: 24, flex: 1, minWidth: 0, overflowX: "hidden" }}>
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

const homeStyles = {
  page: {
    minHeight: "100vh",
    padding: 8,
    background: "#1b1f25",
    color: "#f8fafc",
  },
  showcase: {
    width: "min(1280px, 100%)",
    minHeight: "calc(100vh - 16px)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 10px minmax(340px, 0.98fr)",
    gap: 42,
    alignItems: "stretch",
  },
  darkPanel: {
    overflow: "hidden",
    border: "1px solid rgba(232, 128, 0, 0.34)",
    borderRadius: 8,
    padding: "28px 24px 32px",
    background:
      "radial-gradient(circle at 82% 26%, rgba(93, 206, 136, 0.18), transparent 32%), linear-gradient(135deg, #10131a 0%, #181d24 58%, #11151c 100%)",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.38)",
  },
  darkNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  darkLogo: {
    width: 184,
    maxWidth: "58%",
    height: "auto",
    display: "block",
  },
  darkLogin: {
    minHeight: 36,
    padding: "0 18px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.62)",
    color: "#f8fafc",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
  },
  darkGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.14fr) minmax(210px, 0.86fr)",
    gap: 28,
    alignItems: "center",
    marginTop: 64,
  },
  darkTitle: {
    margin: 0,
    maxWidth: 560,
    fontSize: "clamp(34px, 5.2vw, 56px)",
    lineHeight: 1.05,
    letterSpacing: 0,
    color: "#ffffff",
  },
  darkText: {
    maxWidth: 510,
    margin: "22px 0 0",
    color: "#cbd5e1",
    fontSize: 17,
    lineHeight: 1.65,
  },
  darkActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 34,
  },
  darkPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 214,
    padding: "0 22px",
    borderRadius: 8,
    background: "#e88000",
    color: "white",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 18px 34px rgba(238, 127, 57, 0.28)",
  },
  darkSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 214,
    padding: "0 22px",
    borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.68)",
    color: "#f8fafc",
    background: "rgba(255, 255, 255, 0.02)",
    fontWeight: 900,
    textDecoration: "none",
  },
  darkSummary: {
    minHeight: 260,
    borderRadius: 8,
    padding: 18,
    background: "rgba(20, 24, 31, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.28)",
  },
  summaryTitle: {
    display: "block",
    marginBottom: 12,
    fontSize: 13,
    color: "#ffffff",
  },
  darkMetricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  darkMetric: {
    minHeight: 70,
    padding: 10,
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.10)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#cbd5e1",
  },
  metricIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    display: "grid",
    placeItems: "center",
    background: "rgba(232, 128, 0, 0.12)",
    color: "#e88000",
    fontSize: 11,
    fontWeight: 900,
    flexShrink: 0,
  },
  darkMetricLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 800,
  },
  darkMetricValue: {
    display: "block",
    marginTop: 2,
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 1,
  },
  darkBars: {
    height: 112,
    display: "flex",
    alignItems: "end",
    gap: 12,
    marginTop: 22,
    padding: "0 6px",
  },
  barPair: {
    flex: 1,
    minWidth: 8,
    display: "flex",
    alignItems: "end",
    gap: 5,
  },
  blueBar: {
    width: "50%",
    height: "100%",
    borderRadius: "5px 5px 0 0",
    background: "#8a8f78",
  },
  orangeBar: {
    width: "50%",
    height: "72%",
    borderRadius: "5px 5px 0 0",
    background: "#e88000",
  },
  darkFeatures: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginTop: 72,
  },
  darkFeature: {
    minHeight: 150,
    borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.10)",
    padding: 18,
  },
  featurePlus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "rgba(232, 128, 0, 0.10)",
    color: "#b76500",
    fontSize: 22,
    fontWeight: 900,
    marginBottom: 22,
  },
  darkFeatureTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 1.15,
  },
  darkFeatureText: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 1.45,
  },
  divider: {
    width: 10,
    minHeight: "100%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.55) 1.8px, transparent 2px) center top / 10px 44px repeat-y",
  },
  lightPanel: {
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 16px)",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#151922",
    padding: "28px 26px 0",
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.24)",
  },
  lightNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  lightLogo: {
    width: 184,
    maxWidth: "58%",
    height: "auto",
    display: "block",
    filter: "invert(1)",
  },
  lightLogin: {
    minHeight: 42,
    padding: "0 20px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background: "#e88000",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
  },
  lightHero: {
    paddingTop: 58,
  },
  lightTitle: {
    margin: 0,
    maxWidth: 560,
    color: "#151922",
    fontSize: "clamp(28px, 4vw, 42px)",
    lineHeight: 1.08,
    letterSpacing: 0,
  },
  lightText: {
    margin: "18px 0 0",
    maxWidth: 560,
    color: "#3f4652",
    fontSize: 16,
    lineHeight: 1.5,
    fontWeight: 700,
  },
  lightActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginTop: 24,
  },
  lightPrimary: {
    minHeight: 48,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e88000",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
  },
  lightSecondary: {
    minHeight: 48,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    color: "#5b4c08",
    border: "2px solid rgba(183, 154, 18, 0.22)",
    textDecoration: "none",
    fontWeight: 900,
  },
  lightSummary: {
    marginTop: 28,
    borderRadius: 8,
    padding: 18,
    background: "#fff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.12)",
  },
  lightSummaryTitle: {
    color: "#151922",
    fontSize: 14,
  },
  lightMetricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    marginTop: 14,
  },
  lightMetric: {
    minHeight: 56,
    padding: "8px 9px",
    borderRadius: 7,
    background: "#fafafa",
    border: "1px solid #e5e7eb",
  },
  lightMetricLabel: {
    display: "block",
    color: "#697281",
    fontSize: 10,
    fontWeight: 900,
  },
  lightMetricValue: {
    display: "block",
    color: "#171b22",
    fontSize: 18,
    lineHeight: 1.1,
  },
  lightBars: {
    height: 144,
    marginTop: 22,
    display: "flex",
    alignItems: "end",
    gap: 12,
    padding: "0 4px",
  },
  lightBarGroup: {
    flex: 1,
    minWidth: 10,
    height: "100%",
    display: "flex",
    alignItems: "end",
    gap: 5,
  },
  lightOrangeBar: {
    width: "50%",
    borderRadius: "5px 5px 0 0",
    background: "#e88000",
  },
  lightGrayBar: {
    width: "50%",
    borderRadius: "5px 5px 0 0",
    background: "#d4d8df",
  },
  lightFeatures: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginTop: 24,
  },
  lightFeature: {
    minHeight: 150,
    padding: 16,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #eceff3",
    boxShadow: "0 14px 28px rgba(15, 23, 42, 0.12)",
  },
  lightFeatureIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "rgba(232, 128, 0, 0.10)",
    color: "#b76500",
    fontSize: 23,
    fontWeight: 900,
    marginBottom: 14,
  },
  lightFeatureTitle: {
    margin: 0,
    color: "#151922",
    fontSize: 15,
    lineHeight: 1.15,
  },
  lightFeatureText: {
    margin: "8px 0 0",
    color: "#48515f",
    fontSize: 12,
    lineHeight: 1.38,
    fontWeight: 700,
  },
  mobileTabs: {
    height: 74,
    margin: "auto -26px 0",
    borderTop: "1px solid #e5e7eb",
    background: "#fff",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    alignItems: "center",
  },
  mobileTab: {
    display: "grid",
    justifyItems: "center",
    gap: 5,
    color: "#8b95a4",
    fontSize: 12,
    fontWeight: 800,
    textDecoration: "none",
  },
  mobileTabIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    border: "2px solid currentColor",
  },
};

const welcomeStyles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "linear-gradient(135deg, #fafafa 0%, #f4f5f2 48%, #ffffff 100%)",
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
    background: "rgba(232, 128, 0, 0.10)",
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
    background: "linear-gradient(180deg, #fff7ec 0%, #f8f8f4 100%)",
  },
  chartBar: {
    flex: 1,
    borderRadius: "8px 8px 4px 4px",
    background: "linear-gradient(180deg, #e88000 0%, #c96f00 100%)",
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
