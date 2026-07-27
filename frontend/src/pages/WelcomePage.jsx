import { Link } from "react-router-dom";
import tabloDotLogo from "../assets/tablo-dot-logo.png";

const features = [
  ["Güvenli giriş", "Rol bazlı panellerle her kullanıcı yalnızca kendi alanını görür."],
  ["Catering yönetimi", "Firma, lisans, üniversite ve menü operasyonları kontrollü ilerler."],
  ["Beslenme zekası", "Menü, sağlık ve kalite kararları yetkili ekiplerle yönetilir."],
];

const metrics = [
  ["Rol", "12"],
  ["Modül", "7"],
  ["Erişim", "Düzenli"],
  ["Durum", "Hazır"],
];

const barHeights = [48, 62, 39, 57, 72, 84, 60, 77, 92, 65];

export default function WelcomePage() {
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
            TabloDot; catering, menü, sağlık ve kalite süreçlerini rol bazlı
            panellerle yönetir. Giriş yaptıktan sonra yalnızca yetkili olduğunuz alanları görürsünüz.
          </p>
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
            {barHeights.map((height, index) => (
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
