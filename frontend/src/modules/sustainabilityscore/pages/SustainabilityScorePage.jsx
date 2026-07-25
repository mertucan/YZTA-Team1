import React, { useEffect, useState } from "react";

import {
  fetchCarbonFactors,
  fetchSustainabilitySummary,
  fetchSustainabilityAnalysis,
  upsertCarbonFactor,
} from "../api/sustainability";

import CarbonScoreCards from "../components/CarbonScoreCards";
import CarbonAnalysisCharts from "../components/CarbonAnalysisCharts";
import IngredientCarbonTable from "../components/IngredientCarbonTable";
import MenuEcoCalculator from "../components/MenuEcoCalculator";

import "./SustainabilityScorePage.css";

export default function SustainabilityScorePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, anaData, facData] = await Promise.all([
        fetchSustainabilitySummary(),
        fetchSustainabilityAnalysis(),
        fetchCarbonFactors(),
      ]);
      setSummary(sumData);
      setAnalysis(anaData);
      setFactors(facData);
    } catch (err) {
      console.error("Sustainability load error:", err);
      setError("Veriler yüklenirken bir hata oluştu. Lütfen backend bağlantısını kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveFactor = async (payload) => {
    try {
      await upsertCarbonFactor(payload);
      await loadData();
    } catch (err) {
      alert("Karbon faktörü kaydedilirken hata oluştu: " + err.message);
    }
  };

  return (
    <div className="sustainability-page">
      {/* Top Header */}
      <header className="sus-header">
        <div className="sus-header-title">
          <div className="sus-header-icon">🌱</div>
          <div className="sus-header-text">
            <h1>Sürdürülebilirlik & Karbon Skoru</h1>
            <p>Malzeme ve menü bazlı karbon ayak izi analizi, eko-skor notu ve yeşil ikame yönetimi</p>
          </div>
        </div>

        <div className="sus-header-actions">
          <button onClick={loadData} className="sus-btn sus-btn-secondary" title="Verileri Yenile">
            🔄 Yenile
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sus-tabs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`sus-tab-btn ${activeTab === "overview" ? "active" : ""}`}
        >
          📊 Genel Özet & Skor
        </button>

        <button
          onClick={() => setActiveTab("analysis")}
          className={`sus-tab-btn ${activeTab === "analysis" ? "active" : ""}`}
        >
          📈 Kategori & Emisyon Analizi
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`sus-tab-btn ${activeTab === "database" ? "active" : ""}`}
        >
          📦 Malzeme Karbon Faktörleri ({factors.length})
        </button>

        <button
          onClick={() => setActiveTab("calculator")}
          className={`sus-tab-btn ${activeTab === "calculator" ? "active" : ""}`}
        >
          🧮 Canlı Eko-Hesaplayıcı
        </button>
      </nav>

      {/* Loading & Error states */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          <div>Sürdürülebilirlik verileri ve gıda emisyon katsayıları yükleniyor...</div>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", border: "1px solid var(--red-border)", padding: "16px", borderRadius: "8px", fontSize: "14px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab Contents */}
      {!loading && !error && (
        <>
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <CarbonScoreCards summary={summary} />
              <CarbonAnalysisCharts analysis={analysis} />
            </div>
          )}

          {activeTab === "analysis" && (
            <CarbonAnalysisCharts analysis={analysis} />
          )}

          {activeTab === "database" && (
            <IngredientCarbonTable
              factors={factors}
              onSaveFactor={handleSaveFactor}
            />
          )}

          {activeTab === "calculator" && (
            <MenuEcoCalculator factors={factors} />
          )}
        </>
      )}
    </div>
  );
}
