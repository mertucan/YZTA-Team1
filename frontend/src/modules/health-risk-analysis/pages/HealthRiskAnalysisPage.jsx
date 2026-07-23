import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Download, HeartPulse, Calendar, Play, RefreshCw, GitCompare, TrendingUp, Sparkles, Sliders, Filter, FileText, Utensils, Clock, Home, BarChart2, Bell, Settings, X, Apple, Droplets, Users, CheckSquare, Target } from "../ui/icons";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ScatterChart, Scatter, ReferenceLine, LineChart, Line, Cell } from "../ui/charts";
import { getLatestStatistics, runAnalysis, getAnalysisHistory, compareAnalysisPeriods, getMenus, compareMenus, getTrendQuery, getNotifications, deleteNotification, markNotificationAsRead, clearAllNotifications } from "../api/statisticsApi";
import "./HealthRiskAnalysisPage.css";

// Helper to format numbers with local formatting
function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

// Circular Gauge Component matching the design
function CircularGauge({ value, color, label }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="gauge-svg-wrap">
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="gauge-text">
        <span className="gauge-text-value">{value}%</span>
        <span className="gauge-text-label" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

const getUnisByRegion = (region) => {
  switch (region) {
    case "Marmara":
      return ["Boğaziçi Üniversitesi", "İstanbul Teknik Üniversitesi (İTÜ)", "Marmara Üniversitesi", "Bursa Uludağ Üniversitesi"];
    case "Ege":
      return ["Ege Üniversitesi", "Dokuz Eylül Üniversitesi"];
    case "İç Anadolu":
      return ["Orta Doğu Teknik Üniversitesi (ODTÜ)", "Hacettepe Üniversitesi", "İhsan Doğramacı Bilkent Üniversitesi", "Selçuk Üniversitesi", "Abdullah Gül Üniversitesi", "Erciyes Üniversitesi"];
    case "Akdeniz":
      return ["Akdeniz Üniversitesi"];
    case "Karadeniz":
      return ["Karadeniz Teknik Üniversitesi", "Ondokuz Mayıs Üniversitesi"];
    case "Doğu Anadolu":
      return ["Atatürk Üniversitesi", "Fırat Üniversitesi"];
    case "Güneydoğu":
      return ["Gaziantep Üniversitesi", "Dicle Üniversitesi"];
    case "Tümü":
    default:
      return [
        "Boğaziçi Üniversitesi", 
        "İstanbul Teknik Üniversitesi (İTÜ)", 
        "Marmara Üniversitesi", 
        "Bursa Uludağ Üniversitesi",
        "Ege Üniversitesi", 
        "Dokuz Eylül Üniversitesi",
        "Orta Doğu Teknik Üniversitesi (ODTÜ)", 
        "Hacettepe Üniversitesi", 
        "İhsan Doğramacı Bilkent Üniversitesi", 
        "Selçuk Üniversitesi", 
        "Abdullah Gül Üniversitesi", 
        "Erciyes Üniversitesi",
        "Akdeniz Üniversitesi",
        "Karadeniz Teknik Üniversitesi", 
        "Ondokuz Mayıs Üniversitesi",
        "Atatürk Üniversitesi", 
        "Fırat Üniversitesi",
        "Gaziantep Üniversitesi", 
        "Dicle Üniversitesi"
      ];
  }
};

const getUniStudentCount = (uniName) => {
  const counts = {
    "Boğaziçi Üniversitesi": 16000,
    "İstanbul Teknik Üniversitesi (İTÜ)": 22000,
    "Marmara Üniversitesi": 28000,
    "Bursa Uludağ Üniversitesi": 24000,
    "Ege Üniversitesi": 25000,
    "Dokuz Eylül Üniversitesi": 23000,
    "Orta Doğu Teknik Üniversitesi (ODTÜ)": 20000,
    "Hacettepe Üniversitesi": 26000,
    "İhsan Doğramacı Bilkent Üniversitesi": 12000,
    "Selçuk Üniversitesi": 32000,
    "Abdullah Gül Üniversitesi": 4000,
    "Erciyes Üniversitesi": 22000,
    "Akdeniz Üniversitesi": 21000,
    "Karadeniz Teknik Üniversitesi": 18000,
    "Ondokuz Mayıs Üniversitesi": 19000,
    "Atatürk Üniversitesi": 27000,
    "Fırat Üniversitesi": 15000,
    "Gaziantep Üniversitesi": 16000,
    "Dicle Üniversitesi": 14000
  };
  return counts[uniName] || 59730;
};


export default function HealthRiskAnalysisPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Tabs: trend (Erken Eğilim Sinyalleri), compare (Genel Beslenme Eğilimleri), research (Araştırmacı Analiz Paneli)
  const [activeTab, setActiveTab] = useState("signals");

  // Notifications State
  const [notifications, setNotifications] = useState([]);

  // Settings States
  const [anemiaThreshold, setAnemiaThreshold] = useState(12.0);
  const [obesityThreshold, setObesityThreshold] = useState(25.0);
  const [dataRefreshInterval, setDataRefreshInterval] = useState("Günlük");
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Tab 2 Selected Disease state (dynamic)
  const [selectedDisease, setSelectedDisease] = useState("anemi");

  // Tab 3 Researcher manual notes state
  const [researcherNotes, setResearcherNotes] = useState(() => {
    return localStorage.getItem("researcher_notes") || "";
  });

  useEffect(() => {
    localStorage.setItem("researcher_notes", researcherNotes);
  }, [researcherNotes]);

  // -------------------------------------------------------------
  // TAB 3 RESEARCH SUB-TABS STATES
  // -------------------------------------------------------------
  const [activeSubTab, setActiveSubTab] = useState("period");

  // Global filters for period and trend sub-tabs
  const [filterRegion, setFilterRegion] = useState("Tümü");
  const [filterUniversity, setFilterUniversity] = useState("Tümü");
  const [filterGender, setFilterGender] = useState("Tümü");
  const [filterAge, setFilterAge] = useState("Tümü");

  // Sub-tab 1: Period comparison states
  const [compareType, setCompareType] = useState("Anemi Eğilim Analizi");
  const [compPeriod1Start, setCompPeriod1Start] = useState("2026-01-01");
  const [compPeriod1End, setCompPeriod1End] = useState("2026-03-31");
  const [compPeriod2Start, setCompPeriod2Start] = useState("2026-04-01");
  const [compPeriod2End, setCompPeriod2End] = useState("2026-06-30");
  const [runningComparison, setRunningComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);

  // Sub-tab 2: Menu comparison states
  const [menusList, setMenusList] = useState([]);
  const getMenuDisplayName = (m) => {
    let formattedDate = m.week_start_date;
    if (m.week_start_date) {
      const parts = m.week_start_date.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
    }
    return `${formattedDate} - ${m.name || `Menü #${m.id}`}`;
  };
  const [menu1Id, setMenu1Id] = useState(0);
  const [menu2Id, setMenu2Id] = useState(0);
  const [menuComparisonResult, setMenuComparisonResult] = useState(null);
  const [runningMenuComparison, setRunningMenuComparison] = useState(false);
  const [menuComparisonError, setMenuComparisonError] = useState(null);

  // Sub-tab 3: Trend query states
  const [trendStart, setTrendStart] = useState("2026-01-01");
  const [trendEnd, setTrendEnd] = useState("2026-06-30");
  const [trendQueryResults, setTrendQueryResults] = useState(null);
  const [runningTrendQuery, setRunningTrendQuery] = useState(false);
  const [trendQueryError, setTrendQueryError] = useState(null);

  // ─── RAPOR ÖNİZLEME STATELERİ ───
  const [reportTypeForPreview, setReportTypeForPreview] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState({
    includeFilters: true,
    includeMetrics: true,
    includeCharts: true,
    includeNotes: true,
    includeRecommendations: true,
  });

  // Load stats, menus and notifications from Supabase
  const loadInitialData = () => {
    getLatestStatistics()
      .then(setData)
      .catch((err) => {
        console.error("Backend'den veri alınamadı, yerel mock modeli kullanılıyor.", err);
        setError(err.message);
      });

    getMenus()
      .then((menus) => {
        setMenusList(menus);
        if (menus.length >= 2) {
          setMenu1Id(menus[0].id);
          setMenu2Id(menus[1].id);
        } else if (menus.length === 1) {
          setMenu1Id(menus[0].id);
          setMenu2Id(menus[0].id);
        }
      })
      .catch((err) => console.error("Menüler yüklenemedi", err));

    getNotifications()
      .then(setNotifications)
      .catch((err) => console.error("Bildirimler yüklenemedi", err));
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleDeleteNotification = (id) => {
    deleteNotification(id)
      .then(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      })
      .catch((err) => console.error("Bildirim silinemedi", err));
  };

  const handleClearAllNotifications = () => {
    clearAllNotifications()
      .then(() => {
        setNotifications([]);
      })
      .catch((err) => console.error("Bildirimler temizlenemedi", err));
  };

  // Pre-load default period comparison results
  useEffect(() => {
    setComparisonResults([
      { metric: "Prevalans Oranı", period1: "8.7%", period2: "8.1%", diff: "-0.6%", status: "safe" },
      { metric: "Ortalama Değer", period1: "11.9 g/dL", period2: "12.3 g/dL", diff: "+0.4 g/dL", status: "safe" },
      { metric: "Ortalama Protein", period1: "74.5 g", period2: "78.2 g", diff: "+3.7 g", status: "safe" },
      { metric: "Ortalama Demir", period1: "11.2 mg", period2: "12.8 mg", diff: "+1.6 mg", status: "safe" },
      { metric: "Protein Yeterlilik Oranı", period1: "92.0%", period2: "96.4%", diff: "+4.4%", status: "safe" }
    ]);
  }, []);

  // -------------------------------------------------------------
  // DYNAMIC DATA BINDINGS (Supabase Integration)
  // -------------------------------------------------------------
  const diseaseOptions = useMemo(() => {
    const list = [
      { key: "anemi", label: "Anemi (Demir Eksikliği)" },
      { key: "obezite", label: "Obezite Riski" }
    ];
    if (data?.active_health_flags) {
      Object.keys(data.active_health_flags).forEach(flag => {
        // Skip all variants of anemi and obezite (both Turkish and English)
        const lf = flag.toLowerCase();
        if (lf === "anemi" || lf === "anemia" || lf === "obezite" || lf === "obesity") return;
        const turkishLabels = {
          "diabetes": "Diyabet (Şeker Hastalığı)",
          "celiac": "Çölyak (Gluten Hassasiyeti)",
          "allergy": "Gıda Alerjisi",
          "hypertension": "Hipertansiyon",
          "asthma": "Astım",
          "other": "Diğer Bulgular"
        };
        const label = turkishLabels[lf] || (flag.charAt(0).toUpperCase() + flag.slice(1));
        list.push({ key: flag, label });
      });
    }
    return list;
  }, [data]);

  const trendData = useMemo(() => {
    if (data && data.trend && data.trend.length > 0) {
      return data.trend.map(pt => {
        const parts = pt.period.split("-");
        const monthNum = parseInt(parts[1] || "1");
        const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
        const name = months[(monthNum - 1) % 12];
        
        const ptDynamic = {
          name: name,
          period: pt.period,
          anemi: pt.anemia_risk_ratio || 0,
          obezite: pt.obesity_risk_ratio || 0,
          d_vitamini: Math.round(((pt.anemia_risk_ratio || 0) * 1.1 + (pt.obesity_risk_ratio || 0) * 0.9) / 2),
          demir: Math.round(100 - (pt.iron_rich_ratio || 0)),
        };

        // Copy dynamic disease variables returned from backend
        Object.keys(pt).forEach(key => {
          if (!(key in ptDynamic)) {
            ptDynamic[key] = pt[key];
          }
        });

        return ptDynamic;
      });
    }
    return [];
  }, [data]);

  const riskDistribution = useMemo(() => {
    if (data?.age_group_risks && data.age_group_risks.length > 0) {
      return data.age_group_risks;
    }
    return [];
  }, [data]);

  const ageGroupConditionsData = useMemo(() => {
    if (data?.age_group_conditions) {
      return data.age_group_conditions.map(item => ({
        name: item.name,
        value: item[selectedDisease] || 0
      }));
    }
    return [];
  }, [data, selectedDisease]);

  const affectedScatterData = useMemo(() => {
    if (data?.student_scatter_points) {
      return data.student_scatter_points.filter(pt => pt.flags?.includes(selectedDisease));
    }
    return [];
  }, [data, selectedDisease]);

  const unaffectedScatterData = useMemo(() => {
    if (data?.student_scatter_points) {
      return data.student_scatter_points.filter(pt => !pt.flags?.includes(selectedDisease));
    }
    return [];
  }, [data, selectedDisease]);

  const scatterData = data?.student_scatter_points || [];

  // Dynamically calculate signals
  const obesityVal = useMemo(() => {
    return data?.student_consumption_risks?.obesity_risk_ratio !== undefined
      ? Math.round(data.student_consumption_risks.obesity_risk_ratio)
      : 36;
  }, [data]);

  const anemiaVal = useMemo(() => {
    return data?.student_consumption_risks?.anemia_risk_ratio !== undefined
      ? Math.round(data.student_consumption_risks.anemia_risk_ratio)
      : 39;
  }, [data]);

  const activeMealCount = useMemo(() => {
    return data?.summary?.analyzed_meals || 9;
  }, [data]);

  const anemiaSegment = useMemo(() => {
    return data?.student_consumption_risks?.anemia_risk_ratio !== undefined
      ? Math.round(data.student_consumption_risks.anemia_risk_ratio)
      : 39;
  }, [data]);

  const obesitySegment = useMemo(() => {
    return data?.student_consumption_risks?.obesity_risk_ratio !== undefined
      ? Math.round(data.student_consumption_risks.obesity_risk_ratio)
      : 36;
  }, [data]);

  // -------------------------------------------------------------
  // HANDLERS FOR SUB-TABS
  // -------------------------------------------------------------
  const handleCompare = async (e) => {
    e.preventDefault();
    setRunningComparison(true);
    try {
      const res = await compareAnalysisPeriods({
        analysis_type: compareType,
        period1_start: compPeriod1Start,
        period1_end: compPeriod1End,
        period2_start: compPeriod2Start,
        period2_end: compPeriod2End,
        meals: ["Öğle"]
      });

      const mapped = res.map((row) => {
        const isDiffPositive = row.diff.startsWith('+');
        const isDecrease = row.diff.startsWith('-');
        let status = "neutral";
        
        if (compareType === "Obezite Eğilim Analizi" || compareType === "Anemi Eğilim Analizi") {
          if (isDiffPositive) status = "critical";
          if (isDecrease) status = "safe";
        } else {
          if (isDiffPositive) status = "safe";
          if (isDecrease) status = "critical";
        }
        return { ...row, status };
      });
      setComparisonResults(mapped);
    } catch (err) {
      console.error("Dönem karşılaştırması yapılamadı, yerel model kullanılıyor", err);
    } finally {
      setRunningComparison(false);
    }
  };

  const handleMenuCompare = async (e) => {
    e.preventDefault();
    setRunningMenuComparison(true);
    setMenuComparisonError(null);
    try {
      const res = await compareMenus(menu1Id, menu2Id);
      setMenuComparisonResult(res);
    } catch (err) {
      setMenuComparisonError(err.message || "Menüler karşılaştırılırken bir hata oluştu.");
    } finally {
      setRunningMenuComparison(false);
    }
  };

  const handleTrendQuery = async (e) => {
    e.preventDefault();
    setRunningTrendQuery(true);
    setTrendQueryError(null);
    try {
      const res = await getTrendQuery(trendStart, trendEnd, ["Öğle"]);
      const mappedTrend = res.map(pt => {
        const parts = pt.period.split("-");
        const monthNum = parseInt(parts[1] || "1");
        const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
        const name = months[(monthNum - 1) % 12];
        return {
          ...pt,
          name: name,
          anemi: pt.anemia_risk_ratio || 0,
          obezite: pt.obesity_risk_ratio || 0,
          demir: Math.round(100 - (pt.iron_rich_ratio || 0)),
        };
      });
      setTrendQueryResults(mappedTrend);
    } catch (err) {
      setTrendQueryError(err.message || "Trend verisi sorgulanırken hata oluştu.");
    } finally {
      setRunningTrendQuery(false);
    }
  };

  // CSV Exporter for main dataset
  const handleDownloadMainCSV = () => {
    const headers = ["DONEM", "ANEMI PREVALANSI (%)", "OBEZITE ORANI (%)", "D VITAMINI EKSIKLIGI (%)", "DEMIR EKSIKLIGI (%)"];
    const csvRows = [headers.join(";")];
    trendData.forEach(row => {
      csvRows.push([row.name, row.anemi, row.obezite, row.d_vitamini, row.demir].join(";"));
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFFsep=;\n" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `populasyon_beslenme_egilimleri_raporu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load html2pdf from CDN dynamically
  const loadHtml2Pdf = () => {
    return new Promise((resolve, reject) => {
      if (window.html2pdf) {
        resolve(window.html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve(window.html2pdf);
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  };

  // ─── PDF RAPOR ÜRETICI ───
  const printPdfInIframe = async (htmlContent) => {
    const h1Match = htmlContent.match(/<h1>([\s\S]*?)<\/h1>/);
    let fileName = "sağlık_risk_analiz_raporu.pdf";
    if (h1Match?.[1]) {
      const clean = h1Match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      fileName = clean
        .toLowerCase()
        .replace(/[çÇ]/g,'c').replace(/[ğĞ]/g,'g').replace(/[ıİ]/g,'i')
        .replace(/[öÖ]/g,'o').replace(/[şŞ]/g,'s').replace(/[üÜ]/g,'u')
        .replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_').slice(0, 60) + ".pdf";
    }

    // 1. Görünmez geçici bir iframe oluştur (Ekran dışında render edilmesini sağla)
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "820px";
    iframe.style.height = "4000px"; // Tarayıcının render edebilmesi için yeterli yükseklik ver
    iframe.style.border = "none";
    iframe.style.background = "#ffffff";
    document.body.appendChild(iframe);

    // 2. HTML içeriğini iframe içine yaz (böylece tüm html, head, style, body yapıları tarayıcı tarafından yerel olarak yorumlanır)
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      console.warn("Iframe dökümanına erişilemedi.");
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // 3. Iframe head'indeki tüm style etiketlerini body'ye kopyala (html2pdf'in element tabanlı çeviride stilleri görebilmesi için)
    const headStyles = iframeDoc.querySelectorAll("head style");
    headStyles.forEach(style => {
      iframeDoc.body.appendChild(style.cloneNode(true));
    });

    // 4. Iframe'in dökümanı yüklemesini ve render işlemini tamamlamasını bekle
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const html2pdfLib = await loadHtml2Pdf();
      const opt = {
        margin:      [12, 12, 12, 12],
        filename:    fileName,
        image:       { type: "jpeg", quality: 0.98 },
        pagebreak:   { mode: ['css', 'legacy'] },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          letterRendering: true,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      
      // html2pdf kütüphanesini iframe gövdesi (body) üzerinde çalıştır
      await html2pdfLib().from(iframeDoc.body).set(opt).save();
    } catch (err) {
      console.warn("PDF oluşturma başarısız, yazdırma diyaloğu açılıyor:", err);
      const newWin = window.open("", "_blank", "width=900,height=700");
      if (newWin) {
        newWin.document.write(htmlContent);
        newWin.document.close();
        newWin.focus();
        setTimeout(() => { newWin.print(); }, 600);
      }
    } finally {
      // 4. Geçici iframe'i kaldır
      document.body.removeChild(iframe);
    }
  };

  const reportBaseStyle = `
    <style>
      @page { size: A4; margin: 20mm 18mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1d1f1d; font-size: 11pt; line-height: 1.6; background: #fff; }
      tr, p, .kpi, h2, h3, .cover, .footer, .disclaimer, svg { page-break-inside: avoid; break-inside: avoid; }
      .cover { display: flex; flex-direction: column; justify-content: center; min-height: 110mm; background-color: #181818; background: linear-gradient(135deg, #181818, #e88000); color: #ffffff !important; border-radius: 10px; padding: 32px 36px; margin-bottom: 28px; }
      .cover h1, .cover div, .cover span, .cover-label { color: #ffffff !important; }
      .cover-label { font-size: 8pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 14px; }
      .cover h1 { font-size: 22pt; font-weight: 800; line-height: 1.2; margin-bottom: 12px; }
      .cover .meta { font-size: 9pt; display: flex; gap: 28px; flex-wrap: wrap; margin-top: 18px; }
      .cover .meta span::before { content: "● "; color: #2dd4bf; }
      h2 { font-size: 13pt; font-weight: 700; color: #0b4f54; margin: 26px 0 10px; border-left: 4px solid #14b8a6; padding-left: 12px; }
      h3 { font-size: 10.5pt; font-weight: 700; color: #334155; margin: 16px 0 6px; }
      p { font-size: 10pt; color: #334155; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 9.5pt; }
      thead tr { background: #0b4f54; color: #fff; }
      thead th { padding: 8px 12px; text-align: left; font-weight: 700; font-size: 8.5pt; letter-spacing: 0.04em; text-transform: uppercase; }
      tbody tr:nth-child(even) { background: #f8f5ef; }
      tbody td { padding: 7px 12px; border-bottom: 1px solid #ded8ce; }
      .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 14px 0 22px; }
      .kpi { background: #f8f5ef; border: 1px solid #ded8ce; border-radius: 8px; padding: 14px 16px; }
      .kpi-label { font-size: 8pt; font-weight: 700; color: #47666b; text-transform: uppercase; letter-spacing: 0.06em; }
      .kpi-val { font-size: 20pt; font-weight: 800; color: #0b4f54; line-height: 1.2; margin: 4px 0 2px; }
      .kpi-sub { font-size: 8.5pt; color: #64748b; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: 700; }
      .badge-green { background: #edfaf3; color: #16a05e; }
      .badge-red { background: #fee2e2; color: #ef4444; }
      .badge-amber { background: #fef9c3; color: #b45309; }
      .footer { margin-top: 30px; border-top: 1px solid #ded8ce; padding-top: 12px; font-size: 8pt; color: #858b82; display: flex; justify-content: space-between; }
      .disclaimer { background: #fff7ec; border: 1px solid rgba(232, 128, 0, 0.28); border-radius: 6px; padding: 10px 14px; font-size: 8.5pt; color: #5d625c; margin: 20px 0; }
      .section-divider { height: 2px; background: linear-gradient(90deg, #e88000, transparent); margin: 22px 0; }
    </style>
  `;

  const getVisibleSvgs = () => {
    const svgs = document.querySelectorAll(".recharts-wrapper svg");
    return Array.from(svgs).map(svg => {
      const cloned = svg.cloneNode(true);
      cloned.setAttribute("width", "650");
      cloned.setAttribute("height", "320");
      const style = document.createElement("style");
      style.textContent = `
        text { fill: #475569; font-size: 11px; font-family: monospace; }
        path.recharts-legend-icon { fill: inherit; }
        .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: #f1f5f9; stroke-width: 1px; }
      `;
      cloned.appendChild(style);
      return cloned.outerHTML;
    });
  };

  // HTML karakterlerini güvenli şekilde kaçır (bileşen düzeyinde yardımcı)
  const escapeHtml = (str) =>
    String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const handleExportPDF = () => {
    setReportTypeForPreview("custom");
    setPreviewConfig({
      includeFilters: true,
      includeMetrics: true,
      includeCharts: true,
      includeNotes: true,
      includeRecommendations: true,
    });
    setPreviewModalOpen(true);
  };

  const renderNotesAndExportSection = () => {
    const hasResults = 
      (activeSubTab === "period" && comparisonResults !== null) ||
      (activeSubTab === "menu" && menuComparisonResult !== null) ||
      (activeSubTab === "trend" && trendQueryResults !== null);

    if (!hasResults) return null;

    return (
      <div 
        className="notes-export-section" 
        style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          animation: 'fadeIn 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={18} style={{ color: 'var(--color-green-primary)' }} />
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Rapor Analiz Değerlendirmesi &amp; Araştırmacı Notları</h3>
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Aşağıdaki alana bu analiz çıktısı ile ilgili bulgularınızı, gözlemlerinizi ve notlarınızı manuel olarak ekleyebilirsiniz.
          Notlarınız PDF formatında aktarılırken rapor içeriğine dahil edilecektir.
        </p>
        <textarea
          value={researcherNotes}
          onChange={(e) => setResearcherNotes(e.target.value)}
          placeholder="Örn: Bu dönem aralığında gözlemlenen hemoglobin artış trendi, haftalık menüde yapılan baklagil takviyeleri ile doğrudan ilişkilidir..."
          style={{
            width: '100%',
            minHeight: '110px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontFamily: 'inherit',
            fontSize: '13.5px',
            lineHeight: '1.5',
            resize: 'vertical',
            backgroundColor: 'var(--bg-shell)',
            color: 'var(--text-primary)',
            marginBottom: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--color-green-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="export-button" 
            style={{ 
              padding: '10px 18px', 
              fontSize: '13.5px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: 'var(--color-green-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(13,148,136,0.2)'
            }}
            onClick={handleExportPDF}
          >
            <Download size={15} /> Grafikleri ve Raporu PDF Olarak Aktar
          </button>
          {researcherNotes && (
            <button
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13.5px' }}
              onClick={() => setResearcherNotes("")}
            >
              Notu Temizle
            </button>
          )}
        </div>
      </div>
    );
  };

  // RAPOR 1 ─ Popülasyon Sağlık Raporu
  const handleDownloadReport1PDF = () => {
    setReportTypeForPreview("report1");
    setPreviewConfig({
      includeFilters: true,
      includeMetrics: true,
      includeCharts: false,
      includeNotes: true,
      includeRecommendations: true,
    });
    setPreviewModalOpen(true);
  };

  // RAPOR 2 ─ Obezite Korelasyon Raporu
  const handleDownloadReport2PDF = () => {
    setReportTypeForPreview("report2");
    setPreviewConfig({
      includeFilters: true,
      includeMetrics: true,
      includeCharts: false,
      includeNotes: true,
      includeRecommendations: true,
    });
    setPreviewModalOpen(true);
  };

  // RAPOR 3 ─ Anemi Prevalansı ve Demir Analizi
  const handleDownloadReport3PDF = () => {
    setReportTypeForPreview("report3");
    setPreviewConfig({
      includeFilters: true,
      includeMetrics: true,
      includeCharts: false,
      includeNotes: true,
      includeRecommendations: true,
    });
    setPreviewModalOpen(true);
  };

  // ─── DINAMIK RAPOR HTML INŞA EDICI ───
  const generateReportHtml = (
    type,
    config
  ) => {
    if (!type) return "";

    const { includeFilters, includeMetrics, includeCharts, includeNotes, includeRecommendations } = config;

    if (type === "custom") {
      const svgs = getVisibleSvgs();
      const escapedNotes = escapeHtml(researcherNotes);
      const notesHtml = (researcherNotes && includeNotes)
        ? `<div style="background:#fff7ec;border-left:4px solid #e88000;padding:16px;border-radius:8px;margin:20px 0;border:1px solid rgba(232,128,0,.28);">
             <div style="font-size:11pt;font-weight:700;color:#b76500;margin-bottom:8px;">Araştırmacı Analiz Değerlendirmesi</div>
             <div style="font-size:10pt;color:#334155;white-space:pre-wrap;line-height:1.7;font-family:'Segoe UI',Arial,sans-serif;">${escapedNotes}</div>
           </div>`
        : "";

      let reportTitle = "Araştırmacı Analiz Raporu";
      let resultsTableHtml = "";
      let subTitle = "";

      if (activeSubTab === "period") {
        reportTitle = "Dönemsel Karşılaştırmalı Analiz Raporu";
        if (includeFilters) {
          subTitle = `Filtreler: Bölge: ${filterRegion} / Üniversite: ${filterUniversity} / Yaş: ${filterAge} / Cinsiyet: ${filterGender}`;
          subTitle += `<br>Dönem 1: ${compPeriod1Start} – ${compPeriod1End} &nbsp;|&nbsp; Dönem 2: ${compPeriod2Start} – ${compPeriod2End}`;
        }
        if (includeMetrics) {
          resultsTableHtml = `
            <table>
              <thead>
                <tr>
                  <th>METRİK GÖSTERGE</th>
                  <th>DÖNEM 1 DEĞERİ</th>
                  <th>DÖNEM 2 DEĞERİ</th>
                  <th>MUTLAK DEĞİŞİM (Δ)</th>
                </tr>
              </thead>
              <tbody>
                ${comparisonResults?.map(row => `
                  <tr>
                    <td>${escapeHtml(row.metric||"")}</td>
                    <td style="font-family:monospace;">${escapeHtml(row.period1?.toString()||"")}</td>
                    <td style="font-family:monospace;">${escapeHtml(row.period2?.toString()||"")}</td>
                    <td style="font-family:monospace;font-weight:bold;">${escapeHtml(row.diff?.toString()||"")}</td>
                  </tr>`).join("") || ""}
              </tbody>
            </table>`;
        }
      } else if (activeSubTab === "menu") {
        reportTitle = "Menü Besin Değerleri ve Bütçe Karşılaştırma Raporu";
        const m1 = menusList.find(m => m.id === menu1Id);
        const m2 = menusList.find(m => m.id === menu2Id);
        if (includeFilters) {
          subTitle = `Menü Karşılaştırması: ${m1 ? getMenuDisplayName(m1) : `Menü #${menu1Id}`} ve ${m2 ? getMenuDisplayName(m2) : `Menü #${menu2Id}`}`;
        }
        if (includeMetrics) {
          resultsTableHtml = `
            <div style="display:flex;gap:14px;margin-bottom:20px;">
              <div style="flex:1;background:#f8f5ef;border:1px solid #ded8ce;padding:12px;border-radius:8px;">
                <div style="font-size:8pt;color:#47666b;text-transform:uppercase;">Menü 1 Enerji</div>
                <div style="font-size:16pt;font-weight:800;color:#0b4f54;margin-top:4px;">${menuComparisonResult?.menu1.total_calories||0} kcal</div>
              </div>
              <div style="flex:1;background:#f8f5ef;border:1px solid #ded8ce;padding:12px;border-radius:8px;">
                <div style="font-size:8pt;color:#47666b;text-transform:uppercase;">Menü 2 Enerji</div>
                <div style="font-size:16pt;font-weight:800;color:#0b4f54;margin-top:4px;">${menuComparisonResult?.menu2.total_calories||0} kcal</div>
              </div>
            </div>
            <table>
              <thead><tr><th>KARŞILAŞTIRMA ÖLÇÜTÜ</th><th>MENÜ 1 DEĞERİ</th><th>MENÜ 2 DEĞERİ</th><th>DEĞİŞİM</th></tr></thead>
              <tbody>
                ${menuComparisonResult?.metrics.map(row => `
                  <tr>
                    <td>${escapeHtml(row.metric||"")}</td>
                    <td style="font-family:monospace;">${escapeHtml(row.menu1_value||"")}</td>
                    <td style="font-family:monospace;">${escapeHtml(row.menu2_value||"")}</td>
                    <td style="font-family:monospace;font-weight:bold;">${escapeHtml(row.diff||"")}</td>
                  </tr>`).join("") || ""}
              </tbody>
            </table>`;
        }
      } else if (activeSubTab === "trend") {
        reportTitle = "Özel Dönem Risk ve Kalori Dağılım Trendi";
        if (includeFilters) {
          subTitle = `Zaman Serisi Sorgusu: ${trendStart} ile ${trendEnd} arası / Filtreler: ${filterRegion} / ${filterUniversity}`;
        }
        if (includeMetrics) {
          resultsTableHtml = `
            <table>
              <thead>
                <tr><th>DÖNEM</th><th>ORT. ENERJİ (KCAL)</th><th>ANEMİ RİSKİ (%)</th><th>OBEZİTE RİSKİ (%)</th><th>SEBZE ORANI (%)</th><th>PROTEİN YETERLİLİĞİ (%)</th></tr>
              </thead>
              <tbody>
                ${trendQueryResults?.map(row => `
                  <tr>
                    <td style="font-family:monospace;">${escapeHtml(row.period||"")}</td>
                    <td style="font-family:monospace;">${Math.round(row.avg_calorie)} kcal</td>
                    <td style="font-family:monospace;font-weight:bold;color:#ef4444;">${row.anemi ?? row.anemia_risk_ratio ?? ""}%</td>
                    <td style="font-family:monospace;font-weight:bold;color:#f59e0b;">${row.obezite ?? row.obesity_risk_ratio ?? ""}%</td>
                    <td style="font-family:monospace;">${row.vegetable_ratio ?? ""}%</td>
                    <td style="font-family:monospace;">${row.protein_adequacy_ratio ?? ""}%</td>
                  </tr>`).join("") || ""}
              </tbody>
            </table>`;
        }
      }

      const rechartsHtml = (svgs.length > 0 && includeCharts)
        ? `<div style="margin:24px 0;">
             <div style="font-size:11pt;font-weight:700;color:#0b4f54;margin-bottom:12px;border-bottom:2px solid #14b8a6;padding-bottom:4px;">
               İstatistiksel Risk Grafikleri
             </div>
             ${svgs.map(s => `<div style="margin-bottom:20px;background:#fff;border:1px solid #ded8ce;padding:16px;border-radius:8px;text-align:center;">${s}</div>`).join("")}
           </div>`
        : "";

      const subTitleBlock = (includeFilters && subTitle)
        ? `<div style="font-size:9pt;color:#475569;font-family:monospace;background:#f1f5f9;padding:10px 14px;border-radius:6px;margin-bottom:20px;line-height:1.8;">
             ${subTitle}
           </div>`
        : "";

      const bulgularHeader = (includeMetrics && resultsTableHtml)
        ? `<h2 style="margin-top:24px;">1. Elde Edilen Veri Bulguları</h2>`
        : "";

      return `<!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          ${reportBaseStyle}
        </head>
        <body>
          <div class="cover" style="min-height:75mm;margin-bottom:20px;">
            <div class="cover-label">Araştırmacı Analiz ve Not Defteri Çıktısı</div>
            <h1>${reportTitle}</h1>
            <div class="meta">
              <span>Canlı Supabase Analizi</span>
              <span>Tarih: ${new Date().toLocaleDateString("tr-TR")}</span>
            </div>
          </div>

          ${subTitleBlock}
          ${notesHtml}
          ${bulgularHeader}
          ${includeMetrics ? resultsTableHtml : ""}
          ${rechartsHtml}

          <div class="footer">
            <span>Sağlık Risk Analizi Sistemi — Popülasyon Sağlığı Modülü</span>
            <span>Oluşturma: ${new Date().toLocaleDateString("tr-TR")}</span>
          </div>
        </body>
        </html>`;
    }

    if (type === "report1") {
      const aVal = data?.summary?.anemia_risk_ratio ?? 8.7;
      const oVal = data?.summary?.obesity_risk_ratio ?? 25.4;
      const meals = data?.summary?.analyzed_meals ?? 124852;

      const metaSection = includeFilters
        ? `<div class="meta">
            <span>Dönem: 01.01.2026 – 30.06.2026</span>
            <span>Yayın: 30.06.2026</span>
            <span>Toplam Kayıt: 58.420</span>
          </div>`
        : "";

      const execSummary = includeNotes
        ? `<h2>1. Yönetici Özeti</h2>
           <p>Bu Rapor, 2026 yılının ilk yarısına (Ocak–Haziran) ait anonimleştirilmiş üniversite yemekhane tüketim verileri üzerinden gerçekleştirilen popülasyon düzeyinde beslenme risk analizi bulgularını özetlemektedir. Toplam <strong>${meals.toLocaleString("tr-TR")}</strong> adet öğün kaydı incelenmiştir.</p>
           <div class="disclaimer">Dikkat: Bu Rapor bireysel teşhis niteliği taşımaz; yalnızca istatistiksel popülasyon eğilimlerini yansıtır.</div>`
        : "";

      const kpiGrid = includeMetrics
        ? `<div class="kpi-grid">
            <div class="kpi"><div class="kpi-label">Anemi Risk Oranı</div><div class="kpi-val">${aVal.toFixed(1)}%</div><div class="kpi-sub"><span class="badge badge-green">İyileşme Var</span></div></div>
            <div class="kpi"><div class="kpi-label">Obezite Eğilim Oranı</div><div class="kpi-val">${oVal.toFixed(1)}%</div><div class="kpi-sub"><span class="badge badge-amber">↔ Stabil</span></div></div>
            <div class="kpi"><div class="kpi-label">Analiz Edilen Öğün</div><div class="kpi-val">${(meals/1000).toFixed(0)}K</div><div class="kpi-sub">6 aylık veri seti</div></div>
          </div>`
        : "";

      const monthlyTable = includeMetrics
        ? `<h2>2. Aylık Anemi Prevalansı Eğilimi</h2>
           <table>
            <thead><tr><th>Dönem</th><th>Anemi Riski (%)</th><th>Obezite Riski (%)</th><th>D Vitamini (%)</th><th>Demir Eksikliği (%)</th></tr></thead>
            <tbody>
              ${trendData.map(r => `<tr><td><strong>${r.name}</strong></td><td>${r.anemi}</td><td>${r.obezite}</td><td>${r.d_vitamini}</td><td>${r.demir}</td></tr>`).join("")}
            </tbody>
           </table>`
        : "";

      const evaluationSec = includeRecommendations
        ? `<h2>3. Risk Dağılımı ve Değerlendirme</h2>
           <p>Dönem genelinde anemi prevalansı %${aVal.toFixed(1)} olarak ölçülmüş olup bu oran bir önceki döneme göre anlamlı bir düşüş eğilimi sergilemektedir. Demir açısından zengin besinlerin (baklagil, kırmızı et) yeterince tüketilmediği zaman dilimlerinde risk oranının yükseldiği görülmektedir.</p>
           <p>Obezite eğilimi %${oVal.toFixed(1)} seviyesinde seyretmekte; işlenmiş karbonhidrat ağırlıklı menülerde özellikle belirginleşmektedir. Protein yeterliliği ise dönem boyunca genel olarak ≥ %90 düzeyinde kalmıştır.</p>
           <h2>4. Öneriler</h2>
           <h3>4.1 Kısa Vadeli</h3>
           <p>Haftalık menülerde demir içeriği yüksek besin gruplarının (mercimek, ıspanak, kırmızı et) görünürlüğü artırılmalıdır. Anemi riski yüksek dönemlerde özel beslenmek bildirimleri yapılması önerilmektedir.</p>
           <h3>4.2 Orta Vadeli</h3>
           <p>Kilo indeksi ile hemoglobin seviyesi arasındaki negatif korelasyon (r = –0.34) göz önünde bulundurularak fiziksel aktivite programları ile yemekhane menüsü entegrasyonu kurumsal düzeyde değerlendirilmelidir.</p>`
        : "";

      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">${reportBaseStyle}</head><body>
        <div class="cover">
          <div class="cover-label">Popülasyon Sağlık Analiz Raporu</div>
          <h1>2026 Yılı I. Dönem<br/>Popülasyon Sağlık Raporu</h1>
          ${metaSection}
        </div>
        ${execSummary}
        ${kpiGrid}
        ${monthlyTable}
        ${evaluationSec}
        <div class="footer"><span>Sağlık Risk Analizi Sistemi — Gizli Belge</span><span>Sayfa 1 / 1 • Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}</span></div>
      </body></html>`;
    }

    if (type === "report2") {
      const oVal = data?.summary?.obesity_risk_ratio ?? 25.4;
      const aVal = data?.summary?.anemia_risk_ratio ?? 8.7;

      const metaSection = includeFilters
        ? `<div class="meta"><span>Dönem: 01.01.2026 – 15.05.2026</span><span>Yayın: 15.05.2026</span><span>Yöntem: Pearson Korelasyonu</span></div>`
        : "";

      const studyAim = includeNotes
        ? `<h2>1. Çalışma Amacı</h2>
           <p>Bu çalışma, üniversite yemekhanesinde tüketilen günlük kalori miktarı, makro besin dağılımı ve vücut kitle indeksi (BMI) göstergeleri arasındaki ilişkiyi Pearson korelasyon analizi ile incelemeyi amaçlamaktadır.</p>
           <div class="disclaimer">Dikkat: Sonuçlar popülasyon düzeyini yansıtmakta olup bireysel medikal değerlendirme niteliği taşımaz.</div>`
        : "";

      const kpiGrid = includeMetrics
        ? `<div class="kpi-grid">
            <div class="kpi"><div class="kpi-label">Obezite Eğilim Oranı</div><div class="kpi-val">${oVal.toFixed(1)}%</div><div class="kpi-sub"><span class="badge badge-amber">İzleme Gerekli</span></div></div>
            <div class="kpi"><div class="kpi-label">BMI–Kalori Korelasyonu</div><div class="kpi-val">r = 0.51</div><div class="kpi-sub">p &lt; 0.001 (anlamlı)</div></div>
            <div class="kpi"><div class="kpi-label">Ortalama Günlük Kalori</div><div class="kpi-val">1.940</div><div class="kpi-sub">kcal (öğle öğünü bazlı)</div></div>
          </div>`
        : "";

      const correlationTable = includeMetrics
        ? `<h2>2. Korelasyon Bulguları</h2>
           <table>
            <thead><tr><th>Değişken Çifti</th><th>r Katsayısı</th><th>p-Değeri</th><th>Yorum</th></tr></thead>
            <tbody>
              <tr><td>Günlük Kalori – BMI</td><td>+0.51</td><td>&lt; 0.001</td><td><span class="badge badge-red">Güçlü Pozitif</span></td></tr>
              <tr><td>Sebze Tüketimi – BMI</td><td>–0.38</td><td>&lt; 0.001</td><td><span class="badge badge-green">Orta Negatif</span></td></tr>
              <tr><td>Protein Yeterliliği – BMI</td><td>–0.22</td><td>0.004</td><td><span class="badge badge-green">Zayıf Negatif</span></td></tr>
              <tr><td>Hemoglobin – BMI</td><td>–0.34</td><td>&lt; 0.001</td><td><span class="badge badge-amber">Orta Negatif</span></td></tr>
              <tr><td>Basit Karbonhidrat – BMI</td><td>+0.44</td><td>&lt; 0.001</td><td><span class="badge badge-red">Orta Pozitif</span></td></tr>
            </tbody>
           </table>
           <h2>3. Menü Türüne Göre Obezite Riski</h2>
           <table>
            <thead><tr><th>Menü Türü</th><th>Ort. Kalori (kcal)</th><th>Obezite Riski (%)</th><th>Sebze Oranı (%)</th></tr></thead>
            <tbody>
              <tr><td>Geleneksel Ev Yemeği</td><td>2.140</td><td>${(oVal * 1.1).toFixed(1)}</td><td>22</td></tr>
              <tr><td>Akdeniz Esintisi</td><td>1.820</td><td>${(oVal * 0.82).toFixed(1)}</td><td>41</td></tr>
              <tr><td>Vejetaryen Seçenek</td><td>1.650</td><td>${(oVal * 0.71).toFixed(1)}</td><td>58</td></tr>
              <tr><td>Yüksek Proteinli</td><td>1.960</td><td>${(oVal * 0.88).toFixed(1)}</td><td>29</td></tr>
            </tbody>
           </table>`
        : "";

      const evaluationSec = includeRecommendations
        ? `<h2>4. Sonuç ve Politika Önerileri</h2>
           <p>Yüksek karbonhidrat içerikli menülerin obezite risk oranını %${(oVal * 1.1).toFixed(1)} seviyesine çıkardığı görülmüştür. Akdeniz tipi beslenme modelinin benimsenmesi durumunda obezite riskinin %${(oVal * 0.82).toFixed(1)} düzeyine gerilediği tespit edilmiştir. Menü planlamalarında sebze içeriğinin artırılması ve porsiyon denetiminin güçlendirilmesi önerilmektedir.</p>`
        : "";

      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">${reportBaseStyle}</head><body>
        <div class="cover">
          <div class="cover-label">Korelasyon Analizi Raporu</div>
          <h1>Yemekhane Tüketim &amp;<br/>Obezite Korelasyon Raporu</h1>
          ${metaSection}
        </div>
        ${studyAim}
        ${kpiGrid}
        ${correlationTable}
        ${evaluationSec}
        <div class="footer"><span>Sağlık Risk Analizi Sistemi — Gizli Belge</span><span>Sayfa 1 / 1 • Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}</span></div>
      </body></html>`;
    }

    if (type === "report3") {
      const aVal = data?.summary?.anemia_risk_ratio ?? 8.7;

      const metaSection = includeFilters
        ? `<div class="meta"><span>Dönem: 01.01.2026 – 12.04.2026</span><span>Yayın: 12.04.2026</span><span>n = 19 Üniversite</span></div>`
        : "";

      const scopeSection = includeNotes
        ? `<h2>1. Giriş ve Kapsam</h2>
           <p>Bu analiz, Türkiye'deki 19 üniversitede 58.420 student üzerinde yürütülmüş; anonimleştirilmiş hemoglobin ölçümleri ve günlük demir tüketim verileri temel alınmıştır. Dünya Sağlık Örgütü (WHO) anemi sınır değerleri (erkek: 13 g/dL, kadın: 12 g/dL) referans alınmıştır.</p>
           <div class="disclaimer">Dikkat: Bireysel hemoglobin değerlerini içermemektedir. Tüm veriler istatistiksel toplu analizden türetilmiştir.</div>`
        : "";

      const kpiGrid = includeMetrics
        ? `<div class="kpi-grid">
            <div class="kpi"><div class="kpi-label">Genel Anemi Prevalansı</div><div class="kpi-val">${aVal.toFixed(1)}%</div><div class="kpi-sub"><span class="badge badge-amber">İzleme Gerekli</span></div></div>
            <div class="kpi"><div class="kpi-label">Ort. Hemoglobin</div><div class="kpi-val">12.4 g/dL</div><div class="kpi-sub">Popülasyon ortalaması</div></div>
            <div class="kpi"><div class="kpi-label">Demir Yeterliliği</div><div class="kpi-val">%67.3</div><div class="kpi-sub">Günlük alım hedefini karşılayanlar</div></div>
          </div>`
        : "";

      const tablesSection = includeMetrics
        ? `<h2>2. Yaş Grubuna Göre Anemi Prevalansı</h2>
           <table>
            <thead><tr><th>Yaş Grubu</th><th>Anemi Prevalansı (%)</th><th>Ort. Hemoglobin (g/dL)</th><th>Demir Alımı (mg/gün)</th><th>Risk Sınıfı</th></tr></thead>
            <tbody>
              <tr><td>18–21 Yaş</td><td>${(aVal * 1.15).toFixed(1)}</td><td>12.1</td><td>9.4</td><td><span class="badge badge-red">Yüksek Risk</span></td></tr>
              <tr><td>22–25 Yaş</td><td>${(aVal * 1.05).toFixed(1)}</td><td>12.3</td><td>10.1</td><td><span class="badge badge-amber">Orta Risk</span></td></tr>
              <tr><td>26–30 Yaş</td><td>${aVal.toFixed(1)}</td><td>12.6</td><td>11.2</td><td><span class="badge badge-amber">Orta Risk</span></td></tr>
              <tr><td>31–35 Yaş</td><td>${(aVal * 0.85).toFixed(1)}</td><td>13.0</td><td>12.4</td><td><span class="badge badge-green">Düşük Risk</span></td></tr>
              <tr><td>36+ Yaş</td><td>${(aVal * 1.2).toFixed(1)}</td><td>11.8</td><td>8.9</td><td><span class="badge badge-red">Yüksek Risk</span></td></tr>
            </tbody>
           </table>
           <h2>3. Bölgesel Karşılaştırma</h2>
           <table>
            <thead><tr><th>Bölge</th><th>Anemi Riski (%)</th><th>Öğün Başı Demir (mg)</th><th>Trend</th></tr></thead>
            <tbody>
              <tr><td>Marmara</td><td>${(aVal * 0.9).toFixed(1)}</td><td>11.8</td><td><span class="badge badge-green">İyileşiyor</span></td></tr>
              <tr><td>Ege</td><td>${(aVal * 0.95).toFixed(1)}</td><td>11.2</td><td><span class="badge badge-green">İyileşiyor</span></td></tr>
              <tr><td>İç Anadolu</td><td>${(aVal * 1.05).toFixed(1)}</td><td>9.6</td><td><span class="badge badge-amber">Stabil</span></td></tr>
              <tr><td>Karadeniz</td><td>${(aVal * 1.12).toFixed(1)}</td><td>9.1</td><td><span class="badge badge-red">Kötüleşiyor</span></td></tr>
              <tr><td>Güneydoğu</td><td>${(aVal * 1.18).toFixed(1)}</td><td>8.4</td><td><span class="badge badge-red">Kötüleşiyor</span></td></tr>
            </tbody>
           </table>
           <h2>4. Demir Kaynaklarının Menü İçindeki Oranı</h2>
           <p>Haftalık menü analizinde baklagillerin %18, kırmızı etin %9, yeşil yapraklı sebzelerin ise yalnızca %11 oranında yer aldığı saptanmıştır. Demir biyoyararlanımı düşük olan bitkisel kaynakların ağırlıkta olduğu menülerde C vitamini ile birlikte sunumun artırılması önerilmektedir.</p>`
        : "";

      const recommendationsSection = includeRecommendations
        ? `<h2>5. Politika Önerileri</h2>
           <p><strong>Öncelikli Bölge:</strong> Karadeniz ve Güneydoğu bölgelerinde demir takviyeleri ve menü güçlendirme programları hayata geçirilmelidir.</p>
           <p><strong>Hedef Grup:</strong> 18–21 ve 36+ yaş grupları yüksek anemi prevalansı nedeniyle öncelikli izleme kapsamına alınmalıdır.</p>
           <p><strong>Menü Aksiyon:</strong> Haftada en az 3 gün baklagil bazlı ana yemek sunumu zorunlu hale getirilmesi önerilmektedir.</p>`
        : "";

      return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">${reportBaseStyle}</head><body>
        <div class="cover">
          <div class="cover-label">Anemi &amp; Demir Analizi Raporu</div>
          <h1>Üniversite Geneli Anemi<br/>Prevalansı ve Demir Alımı Analizi</h1>
          ${metaSection}
        </div>
        ${scopeSection}
        ${kpiGrid}
        ${tablesSection}
        ${recommendationsSection}
        <div class="footer"><span>Sağlık Risk Analizi Sistemi — Gizli Belge</span><span>Sayfa 1 / 1 • Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}</span></div>
      </body></html>`;
    }

    return "";
  };

  // CSV İNDİRMELER (Rapor başına ayrı)
  const handleDownloadReport1CSV = () => {
    const rows = ["DONEM;ANEMI_RISK;OBEZITE_RISK;D_VITAMINI;DEMIR_EKSIKLIGI"];
    trendData.forEach(r => rows.push(`${r.name};${r.anemi};${r.obezite};${r.d_vitamini};${r.demir}`));
    const uri = "data:text/csv;charset=utf-8,\uFEFFsep=;\n" + rows.join("\n");
    const a = document.createElement("a"); a.href = encodeURI(uri); a.download = "popülasyon_sağlık_raporu_I_dönem_2026.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleDownloadReport2CSV = () => {
    const oVal = data?.summary?.obesity_risk_ratio ?? 25.4;
    const rows = [
      "MENU_TURU;ORT_KALORI_KCAL;OBEZITE_RISKI_PCT;SEBZE_ORANI_PCT",
      `Geleneksel Ev Yemeği;2140;${(oVal * 1.1).toFixed(1)};22`,
      `Akdeniz Esintisi;1820;${(oVal * 0.82).toFixed(1)};41`,
      `Vejetaryen Seçenek;1650;${(oVal * 0.71).toFixed(1)};58`,
      `Yüksek Proteinli;1960;${(oVal * 0.88).toFixed(1)};29`,
    ];
    const uri = "data:text/csv;charset=utf-8,\uFEFFsep=;\n" + rows.join("\n");
    const a = document.createElement("a"); a.href = encodeURI(uri); a.download = "obezite_korelasyon_raporu_2026.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleDownloadReport3CSV = () => {
    const aVal = data?.summary?.anemia_risk_ratio ?? 8.7;
    const rows = [
      "YAS_GRUBU;ANEMI_PREVALANSI_PCT;ORT_HEMOGLOBIN_G_DL;DEMIR_ALIMI_MG_GUN",
      `18-21;${(aVal * 1.15).toFixed(1)};12.1;9.4`,
      `22-25;${(aVal * 1.05).toFixed(1)};12.3;10.1`,
      `26-30;${aVal.toFixed(1)};12.6;11.2`,
      `31-35;${(aVal * 0.85).toFixed(1)};13.0;12.4`,
      `36+;${(aVal * 1.2).toFixed(1)};11.8;8.9`,
    ];
    const uri = "data:text/csv;charset=utf-8,\uFEFFsep=;\n" + rows.join("\n");
    const a = document.createElement("a"); a.href = encodeURI(uri); a.download = "anemi_prevalansi_demir_analizi_2026.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const activeAreaColor = useMemo(() => {
    if (selectedDisease === "anemi") return { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.15)" };
    if (selectedDisease === "obezite") return { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.15)" };
    if (selectedDisease === "demir") return { stroke: "#14b8a6", fill: "rgba(20, 184, 166, 0.15)" };
    return { stroke: "#8b5cf6", fill: "rgba(139, 92, 246, 0.15)" };
  }, [selectedDisease]);

  return (
    <div className="app-shell">

      {/* ─── Left Sidebar ─── */}
      

      <div className="main-content">

        {/* ─── Header Banner ─── */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-eyebrow">
              <Activity size={10} /> ARAŞTIRMACI MODÜLÜ
            </span>
            <h1>Anonim Beslenme Eğilimleri Analizi</h1>
            <p>
              Anonimleştirilmiş yemekhane tüketim verileri üzerinden obezite ve anemi ile ilişkili
              popülasyon düzeyindeki beslenme eğilimlerinin istatistiksel takibi.
            </p>
            <div className="topbar-footer-row">
              <span className="topbar-timestamp">
                <RefreshCw size={12} />
                Son güncelleme: {new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })} • {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Decorative right panel */}
          <div className="topbar-right">
            <div className="topbar-deco">
              <div className="topbar-deco-icon"><Utensils size={22} /></div>
              <div className="topbar-deco-icon"><Droplets size={22} /></div>
              <div className="topbar-deco-icon"><HeartPulse size={22} /></div>
            </div>
            <div className="topbar-chart-deco">
              {[38, 52, 44, 61, 55, 70, 65, 80].map((h, i) => (
                <div
                  key={i}
                  className={`topbar-chart-bar ${i >= 6 ? "highlight" : ""}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </header>

        <nav className="health-module-tabs" aria-label="Sağlık risk analizi sekmeleri">
        <button className="tab-brand" type="button" onClick={() => setActiveTab("signals")} title="Erken Eğilim Sinyalleri">
          <Apple size={20} />
        </button>
        <div className="tab-group">
          <button type="button" className={`module-tab ${activeTab === "signals" ? "active" : ""}`} onClick={() => setActiveTab("signals")}>
            <Home size={18} />
            <span>Erken Sinyaller</span>
          </button>
          <button type="button" className={`module-tab ${activeTab === "general" ? "active" : ""}`} onClick={() => setActiveTab("general")}>
            <BarChart2 size={18} />
            <span>Genel Eğilimler</span>
          </button>
          <button type="button" className={`module-tab ${activeTab === "research" ? "active" : ""}`} onClick={() => setActiveTab("research")}>
            <Sparkles size={18} />
            <span>Araştırmacı</span>
          </button>
          <button type="button" className={`module-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            <Clock size={18} />
            <span>Geçmiş</span>
          </button>
          <button type="button" className={`module-tab ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            <FileText size={18} />
            <span>Raporlar</span>
          </button>
        </div>
        <div className="tab-actions">
          <button type="button" className={`module-tab icon-only ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")} style={{ position: "relative" }} title="Bildirimler">
            <Bell size={18} />
            {notifications.length > 0 && (
              <span style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                backgroundColor: "var(--color-kritik)",
                borderRadius: "50%",
                border: "2px solid var(--surface)"
              }} />
            )}
          </button>
          <button type="button" className={`module-tab icon-only ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")} title="Ayarlar">
            <Settings size={18} />
          </button>
        </div>
      </nav>

        {/* ─── 5-Card Stats Bar ─── */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-card-icon green"><Users size={18} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">Toplam Anonim Kayıt</span>
              <span className="stat-card-value">
                {data?.student_consumption_risks?.total_active_students
                  ? formatNumber(data.student_consumption_risks.total_active_students)
                  : "58.420"}
              </span>
              <span className="stat-card-sub up">%6.2 artış, son 30 güne göre</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon amber"><Utensils size={18} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">Analiz Edilen Öğün</span>
              <span className="stat-card-value">
                {data?.summary?.analyzed_meals
                  ? formatNumber(data.summary.analyzed_meals)
                  : "124.852"}
              </span>
              <span className="stat-card-sub up">%7.5 artış, son 30 güne göre</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon blue"><Calendar size={18} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">Seçili Dönem</span>
              <span className="stat-card-value" style={{ fontSize: "14px", marginTop: "4px" }}>01.01.2026 – 30.06.2026</span>
              <span className="stat-card-sub muted">181 gün</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon violet"><Target size={18} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">Aktif Analiz</span>
              <span className="stat-card-value">3</span>
              <span className="stat-card-sub muted">Devam eden analiz sayısı</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon teal"><TrendingUp size={18} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">Tamamlanan Analiz</span>
              <span className="stat-card-value">12</span>
              <span className="stat-card-sub muted">Toplam analiz sayısı</span>
            </div>
          </div>
        </div>

        {/* ─── Disclaimer Banner ─── */}
        <section className="disclaimer-banner">
          <AlertCircle size={18} />
          <div>
            <strong>Bu modül teşhis koymaz,</strong> bireysel sağlık değerlendirmesi veya tedavi önerisi üretmez;
            yalnızca anonimleştirilmiş toplu beslenme verilerinden popülasyon düzeyinde istatistiksel eğilim sinyalleri sunar.
          </div>
          <button className="disclaimer-close"><X size={15} /></button>
        </section>

        {/* ─── Menu transitions are handled via the Left Sidebar ─── */}

        {/* ─── TAB 1: ERKEN EĞİLİM SİNYALLERİ ─── */}
        {activeTab === "signals" && (
          <section style={{ animation: "fadeIn 0.3s ease" }}>

            {/* Circular Gauge Indicators */}
            <div className="gauge-grid">
              <div className="gauge-card" style={{ borderLeft: "4px solid var(--color-obesity)" }}>
                <div className="gauge-card-left">
                  <div className="gauge-header-wrapper">
                    <div className="gauge-card-icon obesity"><Utensils size={16} /></div>
                    <h3>Metabolik Yük ve Obezite Eğilimi</h3>
                    <span className="gauge-badge watch">İZLEM SİNYALİ</span>
                  </div>
                  <p className="gauge-explanation">
                    Kalori yoğunluğu, tatlı/şeker payı ve sebze lif yetersizliği göstergelerinden türetilen
                    popülasyon düzeyi obezite eğilim sinyali.
                  </p>
                </div>
                <div className="gauge-visual-container">
                  <CircularGauge value={obesityVal} color="var(--color-obesity)" label="Orta Risk" />
                </div>
              </div>

              <div className="gauge-card" style={{ borderLeft: "4px solid var(--color-anemia)" }}>
                <div className="gauge-card-left">
                  <div className="gauge-header-wrapper">
                    <div className="gauge-card-icon anemia"><Droplets size={16} /></div>
                    <h3>Nütrisyonel Anemi Eğilimi</h3>
                    <span className="gauge-badge normal">DÜŞÜK SİNYAL</span>
                  </div>
                  <p className="gauge-explanation">
                    Demir açısından zengin yemek tercihleri ve protein yeterliliği göstergelerinden türetilen
                    popülasyon düzeyi anemi eğilim sinyali.
                  </p>
                </div>
                <div className="gauge-visual-container">
                  <CircularGauge value={anemiaVal} color="var(--color-anemia)" label="Düşük Risk" />
                </div>
              </div>
            </div>

            {/* Bottom split panels */}
            <div className="comparison-grid">

              {/* Student Consumption Analysis card */}
              <div className="panel">
                <span className="panel-eyebrow">ÖĞRENCİ TÜKETİM ANALİZİ</span>
                <div className="panel-head" style={{ marginBottom: 4 }}>
                  <h2>Anonim Tüketime Dayalı Popülasyon Sinyalleri</h2>
                </div>
                <p className="panel-subtitle">
                  Anonimleştirilmiş {formatNumber(activeMealCount)} tüketim kaydı üzerinden ortalama öğün değerleri popülasyon düzeyinde incelenmiştir:
                </p>

                <div className="consumption-grid">
                  <div className="consumption-card anemia-border">
                    <span>ANEMİ GÖSTERGESİ YÜKSEK SEGMENT</span>
                    <div className="consumption-card-value-row">
                      <strong>{anemiaSegment}%</strong>
                      <small>({data?.student_consumption_risks?.anemia_risk_count !== undefined ? formatNumber(data.student_consumption_risks.anemia_risk_count) : "22.783"} Kayıt)</small>
                    </div>
                  </div>

                  <div className="consumption-card obesity-border">
                    <span>OBEZİTE GÖSTERGESİ YÜKSEK SEGMENT</span>
                    <div className="consumption-card-value-row">
                      <strong>{obesitySegment}%</strong>
                      <small>({data?.student_consumption_risks?.obesity_risk_count !== undefined ? formatNumber(data.student_consumption_risks.obesity_risk_count) : "21.031"} Kayıt)</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chronic Conditions List card */}
              <div className="panel">
                <span className="panel-eyebrow">POPÜLASYON SAĞLIK GÖSTERGELERİ</span>
                <div className="panel-head" style={{ marginBottom: 4 }}>
                  <h2>Kayıtlı Aktif Kronik Koşullar</h2>
                </div>
                <p className="panel-subtitle">
                  Sistemde anonim olarak kayıtlı, mutfak personeli veya diyetisyenlerin bildirdiği toplam anonim sağlık göstergesi flag'leri.
                </p>

                <div className="health-flags-list">
                  {Object.entries(
                    data?.active_health_flags && Object.keys(data.active_health_flags).length > 0
                      ? data.active_health_flags
                      : { "Diyabet": 4, "Alerji": 4, "Hipertansiyon": 3, "Çölyak": 1, "Obezite": 1, "Other": 1 }
                  ).map(([key, val]) => {
                    const labelMap = {
                      "Diyabet": "Diyabet (Şeker Hastalığı)",
                      "Alerji": "Gıda Alerjisi",
                      "Hipertansiyon": "Hipertansiyon",
                      "Çölyak": "Çölyak (Gluten Hassasiyeti)",
                      "Anemi": "Anemi (Demir Eksikliği)",
                      "Obezite": "Obezite Riski",
                      "Other": "Diğer Kronik Bulgular",
                      // English fallbacks from old schema
                      "diabetes": "Diyabet (Şeker Hastalığı)",
                      "allergy": "Gıda Alerjisi",
                      "hypertension": "Hipertansiyon",
                      "celiac": "Çölyak (Gluten Hassasiyeti)",
                      "anemia": "Anemi (Demir Eksikliği)",
                      "obesity": "Obezite Riski",
                      "other": "Diğer Kronik Bulgular",
                    };
                    const dotClassMap = {
                      "Diyabet": "amber",   "diabetes": "amber",
                      "Alerji": "orange",   "allergy": "orange",
                      "Hipertansiyon": "green", "hypertension": "green",
                      "Çölyak": "red",      "celiac": "red",
                      "Anemi": "red",       "anemia": "red",
                      "Obezite": "amber",   "obesity": "amber",
                      "Other": "blue",      "other": "blue",
                    };
                    const codeMap = {
                      "Diyabet": "DB", "diabetes": "DB",
                      "Alerji": "AL", "allergy": "AL",
                      "Hipertansiyon": "HT", "hypertension": "HT",
                      "Çölyak": "CL", "celiac": "CL",
                      "Anemi": "AN", "anemia": "AN",
                      "Obezite": "OB", "obesity": "OB",
                      "Other": "●", "other": "●",
                    };
                    return (
                      <div className="flag-item-row" key={key}>
                        <div className="flag-item-left">
                          <div className={`flag-dot ${dotClassMap[key] || "blue"}`}>
                            {codeMap[key] || "●"}
                          </div>
                          <span className="flag-name">{labelMap[key] || key}</span>
                        </div>
                        <span className="flag-count">{val} vaka</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>
        )}

      {/* -------------------------------------------------------------
          TAB 2: GENEL BESLENME EĞİLİMLERİ (CHARTS AND METRICS)
          ------------------------------------------------------------- */}
      {activeTab === "general" && (
        <section style={{ animation: "fadeIn 0.3s ease" }}>
          
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <span className="card-label">Toplam Katılımcı</span>
              <span className="card-value">
                {data?.student_consumption_risks?.total_registered_students
                  ? formatNumber(data.student_consumption_risks.total_registered_students)
                  : "—"}
              </span>
              <span className="card-subtext trend-neutral">Kayıtlı öğrenci</span>
            </div>
            
            <div className="summary-card">
              <span className="card-label">Anemi Prevalansı</span>
              <span className="card-value">
                {data?.student_consumption_risks?.anemia_risk_ratio !== undefined ? `${data.student_consumption_risks.anemia_risk_ratio}%` : "8.7%"}
              </span>
              <span className="card-subtext trend-down">-2.2% geçen döneme göre</span>
            </div>

            <div className="summary-card">
              <span className="card-label">Obezite Oranı</span>
              <span className="card-value">
                {data?.student_consumption_risks?.obesity_risk_ratio !== undefined ? `${data.student_consumption_risks.obesity_risk_ratio}%` : "25.4%"}
              </span>
              <span className="card-subtext trend-up">+1.2% geçen döneme göre</span>
            </div>

            <div className="summary-card">
              <span className="card-label">Kayıtlı Sağlık Durumu</span>
              <span className="card-value">
                {data?.active_health_flags
                  ? formatNumber(Object.values(data.active_health_flags).reduce((a, b) => a + b, 0))
                  : "—"}
              </span>
              <span className="card-subtext trend-neutral">Aktif kronik kayıt</span>
            </div>
          </div>

          {/* Area Chart: Monthly Trends */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3>Aylık Popülasyon Sağlık Risk Eğilimleri</h3>
                <p>Ocak - Aralık 2026 - Popülasyon düzeyinde {diseaseOptions.find(o => o.key === selectedDisease)?.label || selectedDisease} oranı (%)</p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="disease-selector" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  İzlenecek Rahatsızlık / Risk:
                </label>
                <select
                  id="disease-selector"
                  value={selectedDisease}
                  onChange={(e) => setSelectedDisease(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {diseaseOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeAreaColor.stroke} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={activeAreaColor.stroke} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} />
                  <YAxis stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#ded8ce", color: "#1d1f1d" }} />
                  <Area type="monotone" dataKey={selectedDisease} stroke={activeAreaColor.stroke} fillOpacity={1} fill="url(#areaColor)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="comparison-grid">
            {/* Clustered Bar Chart: Risk Distribution */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>Genel Risk Düzeyi Dağılımı</h3>
                  <p>Yaş gruplarına göre genel beslenme risk sınıflandırması</p>
                </div>
              </div>

              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistribution} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#475569" style={{ fontSize: "11px" }} />
                    <YAxis stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }} />
                    <Legend verticalAlign="bottom" height={36} />
                    <Bar dataKey="Düşük Risk" fill="var(--color-dusuk)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Orta Risk" fill="var(--color-orta)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Yüksek Risk" fill="var(--color-kritik)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Horizontal Bar Chart: Age comparisons */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3>Yaş Grubuna Göre Dağılım</h3>
                  <p>Seçili rahatsızlığın ({diseaseOptions.find(o => o.key === selectedDisease)?.label || selectedDisease}) yaş gruplarına göre dağılımı (%)</p>
                </div>
              </div>

              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroupConditionsData} layout="vertical" margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} unit="%" />
                    <YAxis dataKey="name" type="category" stroke="#475569" style={{ fontSize: "11px" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }} />
                    <Bar dataKey="value" name="Oran (%)" fill={activeAreaColor.stroke} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Scatter Chart: Correlation */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3>Popülasyon Kalori &amp; Demir Tüketimi Dağılımı</h3>
                <p>Öğrencilerin günlük ortalama kalori alımı ve demir alımı ilişkisi (Canlı veritabanı)</p>
              </div>
              <span className="text-mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                r = -0.34 (Demir ve Kalori İlişkisi)
              </span>
            </div>

            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="calories" name="Ortalama Kalori" unit=" kcal" domain={[400, 1200]} stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} />
                  <YAxis type="number" dataKey="iron" name="Ortalama Demir" unit=" mg" domain={[2, 20]} stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }} />
                  <ReferenceLine y={5} stroke="var(--color-kritik)" strokeDasharray="4 4" label={{ value: "Demir Yetersizlik Eşiği (5 mg)", fill: "var(--color-kritik)", position: "top", fontSize: 10, fontFamily: "var(--font-mono)" }} />
                  <Scatter name="Kayıtlar" data={scatterData} fill="#14b8a6" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------
          TAB 3: ARAŞTIRMACI ANALİZ PANELİ (WITH SUB-TABS)
          ------------------------------------------------------------- */}
      {activeTab === "research" && (
        <section style={{ animation: "fadeIn 0.3s ease" }}>
          
          {/* Sub-tab selection menu */}
          <div className="sub-tabs-container" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <button 
              className={`sub-tab-btn ${activeSubTab === "period" ? "active" : ""}`}
              onClick={() => setActiveSubTab("period")}
              style={{
                background: activeSubTab === "period" ? "var(--color-green-primary)" : "transparent",
                border: '1px solid ' + (activeSubTab === "period" ? 'var(--color-green-primary)' : 'var(--border-color)'),
                color: activeSubTab === "period" ? '#ffffff' : 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <GitCompare size={14} /> Dönem Karşılaştırması
            </button>
            <button 
              className={`sub-tab-btn ${activeSubTab === "menu" ? "active" : ""}`}
              onClick={() => setActiveSubTab("menu")}
              style={{
                background: activeSubTab === "menu" ? "var(--color-green-primary)" : "transparent",
                border: '1px solid ' + (activeSubTab === "menu" ? 'var(--color-green-primary)' : 'var(--border-color)'),
                color: activeSubTab === "menu" ? '#ffffff' : 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Utensils size={14} /> Menü Karşılaştırması
            </button>
            <button 
              className={`sub-tab-btn ${activeSubTab === "trend" ? "active" : ""}`}
              onClick={() => setActiveSubTab("trend")}
              style={{
                background: activeSubTab === "trend" ? "var(--color-green-primary)" : "transparent",
                border: '1px solid ' + (activeSubTab === "trend" ? 'var(--color-green-primary)' : 'var(--border-color)'),
                color: activeSubTab === "trend" ? '#ffffff' : 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <TrendingUp size={14} /> Trend Analizi
            </button>
          </div>

          <div className="researcher-layout">
            {/* SUB-TAB: PERIOD COMPARISON */}
            {activeSubTab === "period" && (
              <>
                <aside>
                  <form onSubmit={handleCompare} className="research-form">
                    <div className="form-title">
                      <Sliders size={16} />
                      <span>Dönem Analiz Parametreleri</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="comp-type">Analiz Türü</label>
                      <select id="comp-type" value={compareType} onChange={(e) => setCompareType(e.target.value)}>
                        <option value="Anemi Eğilim Analizi">Anemi Eğilim Analizi</option>
                        <option value="Obezite Eğilim Analizi">Obezite Eğilim Analizi</option>
                        <option value="Demir Eksikliği">Demir Eksikliği</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Dönem 1 Başlangıç</label>
                      <input type="date" value={compPeriod1Start} onChange={(e) => setCompPeriod1Start(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Dönem 1 Bitiş</label>
                      <input type="date" value={compPeriod1End} onChange={(e) => setCompPeriod1End(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Dönem 2 Başlangıç</label>
                      <input type="date" value={compPeriod2Start} onChange={(e) => setCompPeriod2Start(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Dönem 2 Bitiş</label>
                      <input type="date" value={compPeriod2End} onChange={(e) => setCompPeriod2End(e.target.value)} />
                    </div>

                    <div className="filters-header" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <h4>
                        <Filter size={13} /> Filtreler
                      </h4>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-region-p">Bölge</label>
                      <select 
                        id="filter-region-p" 
                        value={filterRegion}
                        onChange={(e) => {
                          setFilterRegion(e.target.value);
                          setFilterUniversity("Tümü");
                        }}
                      >
                        <option value="Tümü">Tümü</option>
                        <option value="Marmara">Marmara</option>
                        <option value="Ege">Ege</option>
                        <option value="İç Anadolu">İç Anadolu</option>
                        <option value="Akdeniz">Akdeniz</option>
                        <option value="Karadeniz">Karadeniz</option>
                        <option value="Doğu Anadolu">Doğu Anadolu</option>
                        <option value="Güneydoğu">Güneydoğu</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-university-p">Üniversite</label>
                      <select 
                        id="filter-university-p" 
                        value={filterUniversity}
                        onChange={(e) => setFilterUniversity(e.target.value)}
                      >
                        <option value="Tümü">Tümü (Tüm Bölge Kurumları)</option>
                        {getUnisByRegion(filterRegion).map((uni, idx) => (
                          <option key={idx} value={uni}>{uni}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-age-p">Yaş Grubu</label>
                      <select 
                        id="filter-age-p" 
                        value={filterAge}
                        onChange={(e) => setFilterAge(e.target.value)}
                      >
                        <option value="Tümü">Tümü</option>
                        <option value="18-21">18-21 (Lisans)</option>
                        <option value="22-25">22-25 (Lisansüstü)</option>
                        <option value="26-30">26-30 (Doktora)</option>
                        <option value="31-35">31-35 (Akademik)</option>
                        <option value="36+">36+ (Kıdemli)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-gender-p">Cinsiyet</label>
                      <select 
                        id="filter-gender-p" 
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                      >
                        <option value="Tümü">Tümü</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                      </select>
                    </div>

                    <button type="submit" className="btn-run" disabled={runningComparison}>
                      <Play size={16} /> {runningComparison ? "Karşılaştırılıyor..." : "Dönemleri Karşılaştır"}
                    </button>
                  </form>
                </aside>

                <main className="results-container">
                  {comparisonResults ? (
                    <div className="results-table-container">
                      <div className="panel-head" style={{ padding: "16px", marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <h2>Dönemsel Karşılaştırmalı Analiz Raporu</h2>
                        <span className="text-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          Aktif Filtre: {filterRegion} Bölgesi / {filterUniversity} / Yaş: {filterAge} / Cinsiyet: {filterGender} (Örneklem: {formatNumber(getUniStudentCount(filterUniversity))} Öğrenci)
                        </span>
                      </div>
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>METRİK GÖSTERGE</th>
                            <th>DÖNEM 1 DEĞERİ</th>
                            <th>DÖNEM 2 DEĞERİ</th>
                            <th>MUTLAK DEĞİŞİM (Δ)</th>
                            <th>DURUM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonResults.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.metric}</td>
                              <td className="text-mono">{row.period1}</td>
                              <td className="text-mono">{row.period2}</td>
                              <td className="text-mono text-bold">{row.diff}</td>
                              <td>
                                <span className={`status-badge ${row.status === "safe" ? "dusuk" : (row.status === "critical" ? "kritik" : "orta")}`}>
                                  {row.status === "safe" ? "İYİLEŞME" : (row.status === "critical" ? "RİSK ARTIŞI" : "DENGELİ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {renderNotesAndExportSection()}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <GitCompare size={48} />
                      <h3>Dönem Karşılaştırma Raporu</h3>
                      <p>Lütfen parametreleri seçip "Dönemleri Karşılaştır" butonuna basın.</p>
                    </div>
                  )}
                </main>
              </>
            )}

            {/* SUB-TAB: MENU COMPARISON */}
            {activeSubTab === "menu" && (
              <>
                <aside>
                  <form onSubmit={handleMenuCompare} className="research-form">
                    <div className="form-title">
                      <Sliders size={16} />
                      <span>Menü Seçimi</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="menu1">Menü 1</label>
                      <select id="menu1" value={menu1Id} onChange={(e) => setMenu1Id(parseInt(e.target.value))}>
                        {menusList.map(m => (
                          <option key={m.id} value={m.id}>
                            {getMenuDisplayName(m)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="menu2">Menü 2</label>
                      <select id="menu2" value={menu2Id} onChange={(e) => setMenu2Id(parseInt(e.target.value))}>
                        {menusList.map(m => (
                          <option key={m.id} value={m.id}>
                            {getMenuDisplayName(m)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="btn-run" disabled={runningMenuComparison}>
                      <Play size={16} /> {runningMenuComparison ? "Karşılaştırılıyor..." : "Menüleri Karşılaştır"}
                    </button>
                  </form>
                </aside>

                <main className="results-container">
                  {menuComparisonError && (
                    <div className="disclaimer-banner" style={{ background: '#fef2f2', borderColor: 'var(--color-kritik)' }}>
                      <AlertCircle size={20} />
                      <div>{menuComparisonError}</div>
                    </div>
                  )}

                  {menuComparisonResult ? (
                    <>
                      <div className="summary-grid">
                        <div className="summary-card">
                          <span className="card-label">Menü 1 Enerji (Kcal)</span>
                          <span className="card-value text-mono">{menuComparisonResult.menu1.total_calories || "0"} kcal</span>
                        </div>
                        <div className="summary-card">
                          <span className="card-label">Menü 2 Enerji (Kcal)</span>
                          <span className="card-value text-mono">{menuComparisonResult.menu2.total_calories || "0"} kcal</span>
                        </div>
                        <div className="summary-card">
                          <span className="card-label">Menü 1 Maliyeti</span>
                          <span className="card-value text-mono">{menuComparisonResult.menu1.total_cost ? `${menuComparisonResult.menu1.total_cost} TL` : "Belirtilmemiş"}</span>
                        </div>
                        <div className="summary-card">
                          <span className="card-label">Menü 2 Maliyeti</span>
                          <span className="card-value text-mono">{menuComparisonResult.menu2.total_cost ? `${menuComparisonResult.menu2.total_cost} TL` : "Belirtilmemiş"}</span>
                        </div>
                      </div>

                      <div className="results-table-container">
                        <div className="panel-head" style={{ padding: "16px", marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                          <h2>Menü Besin Değerleri ve Bütçe Karşılaştırma Raporu</h2>
                          <p className="panel-subtitle" style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {getMenuDisplayName(menuComparisonResult.menu1)} ile {getMenuDisplayName(menuComparisonResult.menu2)} karşılaştırması
                          </p>
                        </div>
                        <table className="results-table">
                          <thead>
                            <tr>
                              <th>KARŞILAŞTIRMA ÖLÇÜTÜ</th>
                              <th>MENÜ 1 DEĞERİ</th>
                              <th>MENÜ 2 DEĞERİ</th>
                              <th>DEĞİŞİM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {menuComparisonResult.metrics.map((row, idx) => (
                              <tr key={idx}>
                                <td>{row.metric}</td>
                                <td className="text-mono">{row.menu1_value}</td>
                                <td className="text-mono">{row.menu2_value}</td>
                                <td className="text-mono text-bold" style={{ color: row.diff.startsWith('-') ? 'var(--color-dusuk)' : (row.diff.startsWith('+') ? 'var(--color-kritik)' : 'inherit') }}>
                                  {row.diff}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {renderNotesAndExportSection()}
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <Utensils size={48} />
                      <h3>Haftalık Menü Karşılaştırma</h3>
                      <p>İki farklı haftalık menü şablonunu bütçe ve besin yeterliliği bazında analiz etmek için menüleri seçip analiz edin.</p>
                    </div>
                  )}
                </main>
              </>
            )}

            {/* SUB-TAB: TREND ANALYSIS */}
            {activeSubTab === "trend" && (
              <>
                <aside>
                  <form onSubmit={handleTrendQuery} className="research-form">
                    <div className="form-title">
                      <Sliders size={16} />
                      <span>Trend Sorgu Tarihleri</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="trend-start">Başlangıç Tarihi</label>
                      <input type="date" id="trend-start" value={trendStart} onChange={(e) => setTrendStart(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="trend-end">Bitiş Tarihi</label>
                      <input type="date" id="trend-end" value={trendEnd} onChange={(e) => setTrendEnd(e.target.value)} />
                    </div>

                    <div className="filters-header" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <h4>
                        <Filter size={13} /> Filtreler
                      </h4>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-region-t">Bölge</label>
                      <select 
                        id="filter-region-t" 
                        value={filterRegion}
                        onChange={(e) => {
                          setFilterRegion(e.target.value);
                          setFilterUniversity("Tümü");
                        }}
                      >
                        <option value="Tümü">Tümü</option>
                        <option value="Marmara">Marmara</option>
                        <option value="Ege">Ege</option>
                        <option value="İç Anadolu">İç Anadolu</option>
                        <option value="Akdeniz">Akdeniz</option>
                        <option value="Karadeniz">Karadeniz</option>
                        <option value="Doğu Anadolu">Doğu Anadolu</option>
                        <option value="Güneydoğu">Güneydoğu</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-university-t">Üniversite</label>
                      <select 
                        id="filter-university-t" 
                        value={filterUniversity}
                        onChange={(e) => setFilterUniversity(e.target.value)}
                      >
                        <option value="Tümü">Tümü (Tüm Bölge Kurumları)</option>
                        {getUnisByRegion(filterRegion).map((uni, idx) => (
                          <option key={idx} value={uni}>{uni}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-age-t">Yaş Grubu</label>
                      <select 
                        id="filter-age-t" 
                        value={filterAge}
                        onChange={(e) => setFilterAge(e.target.value)}
                      >
                        <option value="Tümü">Tümü</option>
                        <option value="18-21">18-21 (Lisans)</option>
                        <option value="22-25">22-25 (Lisansüstü)</option>
                        <option value="26-30">26-30 (Doktora)</option>
                        <option value="31-35">31-35 (Akademik)</option>
                        <option value="36+">36+ (Kıdemli)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="filter-gender-t">Cinsiyet</label>
                      <select 
                        id="filter-gender-t" 
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                      >
                        <option value="Tümü">Tümü</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                      </select>
                    </div>

                    <button type="submit" className="btn-run" disabled={runningTrendQuery}>
                      <Play size={16} /> {runningTrendQuery ? "Sorgulanıyor..." : "Trendi Analiz Et"}
                    </button>
                  </form>
                </aside>

                <main className="results-container">
                  {trendQueryError && (
                    <div className="disclaimer-banner" style={{ background: '#fef2f2', borderColor: 'var(--color-kritik)' }}>
                      <AlertCircle size={20} />
                      <div>{trendQueryError}</div>
                    </div>
                  )}

                  {trendQueryResults ? (
                    <>
                      <div className="chart-card">
                        <div className="chart-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                          <div>
                            <h3>Özel Dönem Risk ve Kalori Dağılım Trendi</h3>
                            <p>{trendStart} - {trendEnd} tarihleri arası aylık veri serisi</p>
                          </div>
                          <span className="text-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            Aktif Filtre: {filterRegion} Bölgesi / {filterUniversity} / Yaş: {filterAge} / Cinsiyet: {filterGender} (Örneklem: {formatNumber(getUniStudentCount(filterUniversity))} Öğrenci)
                          </span>
                        </div>

                        <div style={{ width: "100%", height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendQueryResults} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="name" stroke="#475569" style={{ fontSize: "11px" }} />
                              <YAxis stroke="#475569" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }} />
                              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }} />
                              <Legend />
                              <Line type="monotone" dataKey="anemi" name="Anemi Riski (%)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="obezite" name="Obezite Riski (%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="avg_calorie" name="Ort. Kalori (kcal)" stroke="#e88000" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="results-table-container">
                        <div className="panel-head" style={{ padding: "16px", marginBottom: 0 }}>
                          <h2>Trend Veri Noktaları Tablosu</h2>
                        </div>
                        <table className="results-table">
                          <thead>
                            <tr>
                              <th>DÖNEM</th>
                              <th>ORTALAMA ENERJİ (KCAL)</th>
                              <th>ANEMİ RİSKİ (%)</th>
                              <th>OBEZİTE RİSKİ (%)</th>
                              <th>SEBZE ORANI (%)</th>
                              <th>PROTEİN YETERLİLİĞİ (%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trendQueryResults.map((row, idx) => (
                              <tr key={idx}>
                                <td className="text-mono">{row.period}</td>
                                <td className="text-mono">{Math.round(row.avg_calorie)} kcal</td>
                                <td className="text-mono text-bold" style={{ color: 'var(--color-kritik)' }}>{row.anemia_risk_ratio}%</td>
                                <td className="text-mono text-bold" style={{ color: 'var(--color-yuksek)' }}>{row.obesity_risk_ratio}%</td>
                                <td className="text-mono">{row.vegetable_ratio}%</td>
                                <td className="text-mono">{row.protein_adequacy_ratio}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {renderNotesAndExportSection()}
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <TrendingUp size={48} />
                      <h3>Özel Dönem Zaman Serisi Trendi</h3>
                      <p>Belirlediğiniz tarihler arasındaki aylık beslenme risk eğilimlerini sorgulamak için tarihleri girip "Trendi Analiz Et" butonuna tıklayın.</p>
                    </div>
                  )}
                </main>
              </>
            )}
          </div>
        </section>
      )}

        {/* ─── TAB 4: GEÇMİŞ ANALİZLER ─── */}
        {activeTab === "history" && (
          <section style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="panel">
              <div className="panel-head">
                <h2>Geçmiş Analiz Sorguları</h2>
                <span className="results-meta">Toplam: 4 Sorgu</span>
              </div>
              <p className="panel-subtitle">Daha önce çalıştırdığınız özel istatistiksel analizlerin ve kohort sorgularının geçmişi.</p>
              
              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>TARİH</th>
                      <th>ANALİZ TÜRÜ</th>
                      <th>PARAMETRELER / FİLTRELER</th>
                      <th>DURUM</th>
                      <th>SONUÇ</th>
                      <th>İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-mono">14.07.2026 18:11</td>
                      <td>Dönem Karşılaştırma</td>
                      <td>Bölge: Tümü, Üniversite: İTÜ, Yaş: 18-21, Cinsiyet: Erkek</td>
                      <td><span className="status-badge dusuk">Tamamlandı</span></td>
                      <td className="text-mono">Prevalans: %8.1 (-%0.6)</td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                          onClick={() => {
                            setFilterRegion("Tümü");
                            setFilterUniversity("İstanbul Teknik Üniversitesi (İTÜ)");
                            setFilterGender("Erkek");
                            setFilterAge("18-21");
                            setActiveTab("research");
                            setActiveSubTab("period");
                          }}
                        >
                          Tekrar Çalıştır
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-mono">14.07.2026 15:45</td>
                      <td>Menü Analizi</td>
                      <td>Menü: Akdeniz Esintisi (ID: 1) vs Geleneksel Ev Yemeği (ID: 2)</td>
                      <td><span className="status-badge dusuk">Tamamlandı</span></td>
                      <td className="text-mono">Besin Değeri: +%12.4 Demir</td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                          onClick={() => {
                            setActiveTab("research");
                            setActiveSubTab("menu");
                          }}
                        >
                          Tekrar Çalıştır
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-mono">14.07.2026 12:30</td>
                      <td>Trend Sorgusu</td>
                      <td>Başlangıç: 2026-01-01, Bitiş: 2026-06-30, Öğün: Öğle</td>
                      <td><span className="status-badge dusuk">Tamamlandı</span></td>
                      <td className="text-mono">6 Aylık Veri Seti</td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                          onClick={() => {
                            setTrendStart("2026-01-01");
                            setTrendEnd("2026-06-30");
                            setActiveTab("research");
                            setActiveSubTab("trend");
                          }}
                        >
                          Tekrar Çalıştır
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-mono">13.07.2026 21:04</td>
                      <td>Dönem Karşılaştırma</td>
                      <td>Bölge: Marmara, Üniversite: Boğaziçi, Yaş: 22-25, Cinsiyet: Tümü</td>
                      <td><span className="status-badge dusuk">Tamamlandı</span></td>
                      <td className="text-mono">Prevalans: %7.4 (-%0.4)</td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                          onClick={() => {
                            setFilterRegion("Marmara");
                            setFilterUniversity("Boğaziçi Üniversitesi");
                            setFilterGender("Tümü");
                            setFilterAge("22-25");
                            setActiveTab("research");
                            setActiveSubTab("period");
                          }}
                        >
                          Tekrar Çalıştır
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 5: RAPORLAR ─── */}
        {activeTab === "reports" && (
          <section style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="panel">
              <div className="panel-head">
                <h2>Sağlık Risk Analizi Raporları</h2>
                <span className="results-meta">3 Hazır Rapor</span>
              </div>
              <p className="panel-subtitle">Popülasyon düzeyinde obezite, anemi ve diğer beslenme risk faktörlerine yönelik periyodik analiz raporları.</p>

              <div className="health-flags-list" style={{ marginTop: "20px" }}>

                {/* Rapor 1 */}
                <div className="flag-item-row" style={{ padding: "16px 20px" }}>
                  <div className="flag-item-left">
                    <div className="flag-dot green" style={{ width: "40px", height: "40px" }}>
                      <FileText size={20} style={{ color: "var(--color-green-primary)" }} />
                    </div>
                    <div>
                      <div className="flag-name" style={{ fontSize: "16px" }}>2026 Yılı I. Dönem Popülasyon Sağlık Raporu</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Tarih: 30.06.2026 • Aylık trend, KPI özeti, öneriler
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--green-bg)", color: "var(--green)", borderRadius: "4px", fontWeight: 700 }}>PDF: Kapsamlı Rapor</span>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "4px", fontWeight: 700 }}>CSV: Ham Sayısal Veri</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      className="export-button"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleDownloadReport1PDF}
                      title="Tarayıcı yazdırma diyaloğu açılır — PDF olarak kaydedin"
                    >
                      <Download size={14} /> Raporu İndir
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleDownloadReport1CSV}
                    >
                      <Download size={14} /> CSV İndir
                    </button>
                  </div>
                </div>

                {/* Rapor 2 */}
                <div className="flag-item-row" style={{ padding: "16px 20px" }}>
                  <div className="flag-item-left">
                    <div className="flag-dot green" style={{ width: "40px", height: "40px" }}>
                      <FileText size={20} style={{ color: "var(--color-green-primary)" }} />
                    </div>
                    <div>
                      <div className="flag-name" style={{ fontSize: "16px" }}>Yemekhane Tüketim & Obezite Korelasyon Raporu</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Tarih: 15.05.2026 • Pearson korelasyonu, menü karşılaştırması
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--green-bg)", color: "var(--green)", borderRadius: "4px", fontWeight: 700 }}>PDF: Kapsamlı Rapor</span>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "4px", fontWeight: 700 }}>CSV: Ham Sayısal Veri</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      className="export-button"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleDownloadReport2PDF}
                      title="Tarayıcı yazdırma diyaloğu açılır — PDF olarak kaydedin"
                    >
                      <Download size={14} /> Raporu İndir
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleDownloadReport2CSV}
                    >
                      <Download size={14} /> CSV İndir
                    </button>
                  </div>
                </div>

                {/* Rapor 3 */}
                <div className="flag-item-row" style={{ padding: "16px 20px" }}>
                  <div className="flag-item-left">
                    <div className="flag-dot green" style={{ width: "40px", height: "40px" }}>
                      <FileText size={20} style={{ color: "var(--color-green-primary)" }} />
                    </div>
                    <div>
                      <div className="flag-name" style={{ fontSize: "16px" }}>Üniversite Geneli Anemi Prevalansı ve Demir Alımı Analizi</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Tarih: 12.04.2026 • Yaş grubu & bölgesel kırılım, politika önerileri
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--green-bg)", color: "var(--green)", borderRadius: "4px", fontWeight: 700 }}>PDF: Kapsamlı Rapor</span>
                        <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "4px", fontWeight: 700 }}>CSV: Ham Sayısal Veri</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      className="export-button"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleDownloadReport3PDF}
                      title="Tarayıcı yazdırma diyaloğu açılır — PDF olarak kaydedin"
                    >
                      <Download size={14} /> Raporu İndir
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleDownloadReport3CSV}
                    >
                      <Download size={14} /> CSV İndir
                    </button>
                  </div>
                </div>

                {/* Bilgilendirme notu */}
                <div style={{
                  marginTop: "16px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "12.5px",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <FileText size={16} style={{ color: "var(--color-green-primary)", flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: "var(--text-primary)" }}>Raporu İndir</strong> butonuna bastığınızda tarayıcının yazdırma diyaloğu açılır.
                    Açılan pencerede <strong>Hedef: PDF Olarak Kaydet</strong> seçeneğini seçerek raporu PDF formatında bilgisayarınıza kaydedebilirsiniz.
                  </span>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 6: BİLDİRİMLER ─── */}
        {activeTab === "notifications" && (
          <section style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="panel">
              <div className="panel-head">
                <h2>Sistem Bildirimleri ve Uyarılar</h2>
                {notifications.length > 0 && (
                  <button 
                    className="btn-secondary"
                    onClick={handleClearAllNotifications}
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
              <p className="panel-subtitle">Popülasyon düzeyindeki beslenme risk analizi sisteminin ürettiği en son uyarı ve bilgilendirmeler.</p>
              
              <div className="health-flags-list" style={{ marginTop: "20px" }}>
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div key={notif.id} className="flag-item-row" style={{ padding: "16px 20px" }}>
                      <div className="flag-item-left">
                        <div className={`flag-dot ${notif.type === 'critical' ? 'red' : notif.type === 'success' ? 'green' : 'blue'}`} style={{ width: "40px", height: "40px" }}>
                          <Bell size={20} />
                        </div>
                        <div>
                          <div className="flag-name" style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                            {notif.title}
                            {notif.type === 'critical' && <span className="status-badge kritik" style={{ fontSize: "9px", padding: "1px 6px" }}>Kritik</span>}
                          </div>
                          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                            {notif.desc}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                            {notif.date}
                          </div>
                        </div>
                      </div>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                        onClick={() => handleDeleteNotification(notif.id)}
                      >
                        Sil
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Bell size={48} />
                    <h3>Bildirim Bulunmuyor</h3>
                    <p>Sistemde okunmamış veya bekleyen herhangi bir bildirim veya uyarı bulunmamaktadır.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 7: AYARLAR ─── */}
        {activeTab === "settings" && (
          <section style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="panel" style={{ maxWidth: "600px" }}>
              <div className="panel-head">
                <h2>Analiz Ayarları ve Eşik Değerleri</h2>
              </div>
              <p className="panel-subtitle">Risk analiz motorunun parametrelerini ve arayüz seçeneklerini yapılandırın.</p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 3000);
              }} style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
                
                <div className="form-group">
                  <label>Anemi Hemoglobin Alt Sınırı (g/dL)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={anemiaThreshold} 
                    onChange={(e) => setAnemiaThreshold(parseFloat(e.target.value))}
                  />
                  <small style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px" }}>Bu değerin altı anemi riski olarak sınıflandırılır (Erkek/Kadın popülasyon ortalaması).</small>
                </div>

                <div className="form-group">
                  <label>Obezite Vücut Kitle İndeksi (BMI) Sınırı</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    value={obesityThreshold} 
                    onChange={(e) => setObesityThreshold(parseFloat(e.target.value))}
                  />
                  <small style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px" }}>Bu değerin üzeri obezite eğilimi olarak sınıflandırılır.</small>
                </div>

                <div className="form-group">
                  <label>Veri Güncelleme Sıklığı</label>
                  <select 
                    value={dataRefreshInterval} 
                    onChange={(e) => setDataRefreshInterval(e.target.value)}
                  >
                    <option value="Günlük">Günlük (Her gece 00:00)</option>
                    <option value="Haftalık">Haftalık (Pazar günleri)</option>
                    <option value="Aylık">Aylık (Her ayın 1'i)</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "10px" }}>
                  <button type="submit" className="export-button">
                    Ayarları Kaydet
                  </button>
                  {settingsSaved && (
                    <span className="status-badge dusuk" style={{ animation: "fadeIn 0.2s ease" }}>
                      Ayarlar Başarıyla Kaydedildi!
                    </span>
                  )}
                </div>

              </form>
            </div>
          </section>
        )}
      </div>

      {/* ─── RAPOR ÖNİZLEME MODALI ─── */}
      {previewModalOpen && reportTypeForPreview && (
        <div className="preview-modal-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}>
          <div className="preview-modal-container" style={{
            backgroundColor: "var(--bg-card)",
            width: "92vw",
            maxWidth: "1200px",
            height: "85vh",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--bg-sidebar)",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={20} style={{ color: "var(--color-green-primary)" }} /> Rapor Önizleme
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  Raporunuza dahil etmek istediğiniz bölümleri seçin ve önizlemeyi kontrol edin.
                </p>
              </div>
              <button 
                onClick={() => setPreviewModalOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Settings Sidebar */}
              <div style={{
                width: "280px",
                padding: "24px",
                borderRight: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-sidebar)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                overflowY: "auto"
              }}>
                <div>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--text-primary)", fontWeight: 600 }}>Rapor İçerik Seçenekleri</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer", color: "var(--text-primary)" }}>
                      <input 
                        type="checkbox" 
                        checked={previewConfig.includeFilters} 
                        onChange={(e) => setPreviewConfig({ ...previewConfig, includeFilters: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "var(--color-green-primary)" }}
                      />
                      Filtreler ve Meta Veri
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer", color: "var(--text-primary)" }}>
                      <input 
                        type="checkbox" 
                        checked={previewConfig.includeMetrics} 
                        onChange={(e) => setPreviewConfig({ ...previewConfig, includeMetrics: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "var(--color-green-primary)" }}
                      />
                      Sayısal Bulgular & Tablolar
                    </label>

                    {reportTypeForPreview === "custom" && (
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer", color: "var(--text-primary)" }}>
                        <input 
                          type="checkbox" 
                          checked={previewConfig.includeCharts} 
                          onChange={(e) => setPreviewConfig({ ...previewConfig, includeCharts: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: "var(--color-green-primary)" }}
                        />
                        Grafikler (SVG)
                      </label>
                    )}

                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer", color: "var(--text-primary)" }}>
                      <input 
                        type="checkbox" 
                        checked={previewConfig.includeNotes} 
                        onChange={(e) => setPreviewConfig({ ...previewConfig, includeNotes: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "var(--color-green-primary)" }}
                      />
                      Özet ve Değerlendirme
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", cursor: "pointer", color: "var(--text-primary)" }}>
                      <input 
                        type="checkbox" 
                        checked={previewConfig.includeRecommendations} 
                        onChange={(e) => setPreviewConfig({ ...previewConfig, includeRecommendations: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "var(--color-green-primary)" }}
                      />
                      Politika Önerileri & Sonuç
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    <AlertCircle size={14} style={{ color: "var(--color-green-primary)", flexShrink: 0, marginTop: "2px" }} />
                    <span>Seçenekleri değiştirdiğinizde önizleme ekranı otomatik olarak güncellenir.</span>
                  </div>
                </div>
              </div>

              {/* Right Live Preview Panel */}
              <div style={{
                flex: 1,
                backgroundColor: "var(--bg-main)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  {/* Preview Titlebar */}
                  <div style={{
                    padding: "10px 16px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#64748b"
                  }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#eab308" }}></span>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }}></span>
                    </div>
                    <span style={{ margin: "0 auto 0 8px", fontStyle: "italic" }}>A4 Canlı Rapor Önizlemesi</span>
                  </div>

                  <iframe 
                    title="Live Report Preview"
                    srcDoc={generateReportHtml(reportTypeForPreview, previewConfig)}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      backgroundColor: "#fff",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              backgroundColor: "var(--bg-sidebar)"
            }}>
              <button 
                className="btn-secondary"
                onClick={() => setPreviewModalOpen(false)}
                style={{ padding: "10px 20px", fontSize: "14px" }}
              >
                Vazgeç
              </button>
              <button 
                className="export-button"
                onClick={() => {
                  const html = generateReportHtml(reportTypeForPreview, previewConfig);
                  printPdfInIframe(html);
                  setPreviewModalOpen(false);
                }}
                style={{ padding: "10px 24px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Download size={16} /> Raporu İndir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
