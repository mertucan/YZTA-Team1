import React from "react";

export default function CarbonScoreCards({ summary }) {
  if (!summary) return null;

  const {
    total_carbon_footprint = 0,
    average_co2_per_kg = 0,
    local_ingredient_ratio = 0,
    eco_score = 100,
    eco_grade = "A+",
    high_emission_count = 0,
    total_ingredients_cataloged = 0,
  } = summary;

  return (
    <div className="sus-cards-grid">
      {/* 1. Toplam Karbon Ayak İzi */}
      <div className="sus-card green-accent">
        <div className="sus-card-head">
          <span className="sus-card-label">Toplam Karbon Ayak İzi</span>
          <span className="sus-card-badge badge-green">Aylık Tahmin</span>
        </div>
        <div className="sus-card-body">
          <span className="sus-card-value">{total_carbon_footprint.toLocaleString()}</span>
          <span className="sus-card-unit">kg CO₂e</span>
        </div>
        <div className="sus-card-sub">
          Tüm malzemeler için ortalama <strong>{average_co2_per_kg} kg CO₂e/kg</strong> emisyon
        </div>
      </div>

      {/* 2. Eko-Skor Notu */}
      <div className="sus-card green-accent">
        <div className="sus-card-head">
          <span className="sus-card-label">Sürdürülebilirlik İndeksi</span>
          <span className="sus-card-badge badge-green">Eko Notu: {eco_grade}</span>
        </div>
        <div className="sus-card-body">
          <span className="sus-card-value">{eco_score}</span>
          <span className="sus-card-unit">/ 100</span>
        </div>
        <div className="sus-card-sub">
          Düşük karbonlu ve yerel içerikli menü başarım notu
        </div>
      </div>

      {/* 3. Yerel Malzeme Oranı */}
      <div className="sus-card amber-accent">
        <div className="sus-card-head">
          <span className="sus-card-label">Yerel Üretim Oranı</span>
          <span className="sus-card-badge badge-amber">Yerli Ürün</span>
        </div>
        <div className="sus-card-body">
          <span className="sus-card-value">%{local_ingredient_ratio}</span>
        </div>
        <div className="sus-card-sub">
          Katalogdaki {total_ingredients_cataloged} malzemenin yerel bölge tedarik oranı
        </div>
      </div>

      {/* 4. Yüksek Emisyon Uyarıları */}
      <div className="sus-card red-accent">
        <div className="sus-card-head">
          <span className="sus-card-label">Yüksek CO₂ Malzeme</span>
          <span className="sus-card-badge badge-red">&gt; 10.0 kg CO₂e</span>
        </div>
        <div className="sus-card-body">
          <span className="sus-card-value">{high_emission_count}</span>
          <span className="sus-card-unit">Kritik Kalem</span>
        </div>
        <div className="sus-card-sub">
          Menülerde ikame edilmesi önerilen yüksek karbonlu malzemeler
        </div>
      </div>
    </div>
  );
}