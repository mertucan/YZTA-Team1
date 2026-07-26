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
import LoadingSpinner from "../../../components/LoadingSpinner";

import "./SustainabilityScorePage.css";

function SustainabilityIcon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const icons = {
    leaf: (
      <svg {...common}>
        <path d="M11 20A7 7 0 0 1 4 13c0-5 4-8 12-9 1 8-2 12-7 12" />
        <path d="M5 19c4-6 8-8 13-10" />
      </svg>
    ),
    refresh: (
      <svg {...common}>
        <path d="M21 12a9 9 0 0 1-15.5 6.2" />
        <path d="M3 12A9 9 0 0 1 18.5 5.8" />
        <path d="M18 2v4h4" />
        <path d="M6 22v-4H2" />
      </svg>
    ),
    chart: (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </svg>
    ),
    trend: (
      <svg {...common}>
        <path d="m3 17 6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
    box: (
      <svg {...common}>
        <path d="M21 8.5 12 3 3 8.5l9 5.5 9-5.5Z" />
        <path d="M3 8.5V16l9 5 9-5V8.5" />
        <path d="M12 14v7" />
      </svg>
    ),
    calculator: (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 11h.01" />
        <path d="M12 11h.01" />
        <path d="M16 11h.01" />
        <path d="M8 15h.01" />
        <path d="M12 15h.01" />
        <path d="M16 15h.01" />
      </svg>
    ),
  };
  return icons[name] || icons.leaf;
}

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
          <div className="sus-header-icon"><SustainabilityIcon name="leaf" size={24} /></div>
          <div className="sus-header-text">
            <h1>Sürdürülebilirlik & Karbon Skoru</h1>
            <p>Malzeme ve menü bazlı karbon ayak izi analizi, eko-skor notu ve yeşil ikame yönetimi</p>
          </div>
        </div>

        <div className="sus-header-actions">
          <button onClick={loadData} className="sus-btn sus-btn-secondary" title="Verileri Yenile">
            <SustainabilityIcon name="refresh" /> Yenile
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sus-tabs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`sus-tab-btn ${activeTab === "overview" ? "active" : ""}`}
        >
          <SustainabilityIcon name="chart" /> Genel Özet & Skor
        </button>

        <button
          onClick={() => setActiveTab("analysis")}
          className={`sus-tab-btn ${activeTab === "analysis" ? "active" : ""}`}
        >
          <SustainabilityIcon name="trend" /> Kategori & Emisyon Analizi
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`sus-tab-btn ${activeTab === "database" ? "active" : ""}`}
        >
          <SustainabilityIcon name="box" /> Malzeme Karbon Faktörleri ({factors.length})
        </button>

        <button
          onClick={() => setActiveTab("calculator")}
          className={`sus-tab-btn ${activeTab === "calculator" ? "active" : ""}`}
        >
          <SustainabilityIcon name="calculator" /> Canlı Eko-Hesaplayıcı
        </button>
      </nav>

      {/* Loading & Error states */}
      {loading && (
        <LoadingSpinner label="Sürdürülebilirlik verileri yükleniyor" minHeight={260} size={42} />
      )}

      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", border: "1px solid var(--red-border)", padding: "16px", borderRadius: "8px", fontSize: "14px" }}>
          {error}
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
