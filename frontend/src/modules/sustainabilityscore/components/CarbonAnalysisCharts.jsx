import React from "react";

export default function CarbonAnalysisCharts({ analysis }) {
  if (!analysis) return null;

  const { category_breakdown = [], top_emitters = [], eco_swaps = [], monthly_trend = [] } = analysis;

  const maxCategoryCO2 = Math.max(...category_breakdown.map((c) => c.total_co2), 1);
  const maxEmitterCO2 = Math.max(...top_emitters.map((e) => e.co2_per_unit), 1);

  const getCategoryColor = (index) => {
    const colors = ["#e88000", "#16a05e", "#b79a12", "#3b82f6", "#8b5cf6", "#ec4899"];
    return colors[index % colors.length];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Kategori Dağılımı ve En Yüksek Emisyonlu Malzemeler */}
      <div className="sus-grid-2">
        {/* Kategori Bazlı Karbon Dağılımı */}
        <div className="sus-section-card">
          <div className="sus-section-title">
            <span>Kategori Bazlı Karbon Dağılımı</span>
            <span style={{ fontSize: "12px", color: "var(--text3)", fontWeight: 600 }}>% Pay Oranı</span>
          </div>

          <div className="sus-cat-list">
            {category_breakdown.map((cat, idx) => (
              <div key={cat.category} className="sus-cat-item">
                <div className="sus-cat-info">
                  <span className="sus-cat-name">{cat.category} ({cat.count} çeşit)</span>
                  <span className="sus-cat-val">
                    {cat.total_co2} kg CO₂e <strong>(%{cat.share_percentage})</strong>
                  </span>
                </div>
                <div className="sus-bar-track">
                  <div
                    className="sus-bar-fill"
                    style={{
                      width: `${(cat.total_co2 / maxCategoryCO2) * 100}%`,
                      background: getCategoryColor(idx),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* En Yüksek Emisyon Yoğunluğu Olan Malzemeler */}
        <div className="sus-section-card">
          <div className="sus-section-title">
            <span>Kritik Karbon Yoğunluğuna Sahip Malzemeler</span>
            <span style={{ fontSize: "12px", color: "var(--red)", fontWeight: 700 }}>kg CO₂e / birim</span>
          </div>

          <div className="top-emitters-list">
            {top_emitters.map((item) => (
              <div key={item.name} className="top-emitter-row">
                <div>
                  <div className="emitter-name">{item.name}</div>
                  <div className="emitter-cat">{item.category} • {item.unit}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, color: item.co2_per_unit >= 10 ? "var(--red)" : "var(--amber)", fontSize: "15px" }}>
                    {item.co2_per_unit} kg CO₂e
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                    {item.is_local ? "Yerli Üretim" : "İthal / Ulusal"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eko İkame ve Yeşil Dönüşüm Önerileri */}
      <div className="sus-section-card">
        <div className="sus-section-title">
          <span>Akıllı Eko-İkame ve Karbon Tasarruf Önerileri</span>
          <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 800 }}>Düşük Emisyonlu İkame</span>
        </div>

        <div className="eco-swaps-grid">
          {eco_swaps.map((swap, index) => (
            <div key={index} className="eco-swap-card">
              <div className="eco-swap-header">
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text2)" }}>Öneri #{index + 1}</span>
                <span className="eco-swap-saving">-%{swap.savings_percent} CO₂ Tasarrufu</span>
              </div>
              <div className="eco-swap-comparison">
                <span className="eco-orig">{swap.original} ({swap.original_co2} kg)</span>
                <span className="eco-arrow">➔</span>
                <span className="eco-alt">{swap.alternative} ({swap.alternative_co2} kg)</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text2)", marginTop: "4px" }}>
                <strong>Avantaj:</strong> {swap.benefit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aylık Karbon İyileşme Trendi */}
      <div className="sus-section-card">
        <div className="sus-section-title">
          <span>Aylık Karbon Emisyon Eğilimi (Ton CO₂e)</span>
          <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 800 }}>Sürekli İyileşme</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "180px", paddingTop: "20px", borderBottom: "1px solid var(--border)" }}>
          {monthly_trend.map((m) => {
            const maxVal = Math.max(...monthly_trend.map((t) => t.total_co2_ton), 1);
            const heightPct = (m.total_co2_ton / maxVal) * 100;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--accent)" }}>{m.total_co2_ton} Ton</span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "48px",
                    height: `${heightPct}%`,
                    background: "linear-gradient(180deg, var(--accent) 0%, rgba(232, 128, 0, 0.4) 100%)",
                    borderRadius: "6px 6px 0 0",
                    transition: "height 0.5s ease",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text2)" }}>{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
