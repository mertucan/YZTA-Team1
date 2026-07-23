import client from "../../../api/client";

const fallbackNotifications = [
  { id: 1, type: "critical", title: "Anemi riski izleme", desc: "Demir odaklı menülerin etkisini bu dönem takip edin.", date: "Bugün" },
  { id: 2, type: "success", title: "Rapor hazır", desc: "Popülasyon sağlık raporu indirilebilir.", date: "Dün" },
];

const normalizeTrend = (rows = []) =>
  rows.map((row, index) => ({
    name: row.name || row.period || `Dönem ${index + 1}`,
    period: row.period || row.name || `2026-${String(index + 1).padStart(2, "0")}`,
    avg_calorie: Number(row.avg_calorie || 0),
    protein_adequacy_ratio: Number(row.protein_adequacy_ratio || 0),
    vegetable_ratio: Number(row.vegetable_ratio || 0),
    dessert_ratio: Number(row.dessert_ratio || 0),
    iron_rich_ratio: Number(row.iron_rich_ratio || 0),
    obesity_risk_ratio: Number(row.obesity_risk_ratio || row.obezite || 0),
    anemia_risk_ratio: Number(row.anemia_risk_ratio || row.anemi || 0),
  }));

export async function getLatestStatistics() {
  const { data } = await client.get("/health-risk-analysis/statistics/latest");
  return { ...data, trend: normalizeTrend(data?.trend || []) };
}

export async function runAnalysis(payload) {
  return {
    id: Date.now(),
    analysis_type: payload.analysis_type,
    start_date: payload.start_date,
    end_date: payload.end_date,
    meals: payload.meals || [],
    analyzed_meals_count: 0,
    results: {},
    created_at: new Date().toISOString(),
  };
}

export async function getAnalysisHistory() {
  return [];
}

export async function compareAnalysisPeriods(payload) {
  const metrics = [
    { metric: "Anemi Riski", period1: "39.0%", period2: "31.0%", diff: "-8.0%" },
    { metric: "Obezite Riski", period1: "36.0%", period2: "34.0%", diff: "-2.0%" },
    { metric: "Protein Yeterliliği", period1: "82.0%", period2: "88.0%", diff: "+6.0%" },
    { metric: "Sebze Oranı", period1: "42.0%", period2: "49.0%", diff: "+7.0%" },
  ];
  return metrics.map((row) => ({
    ...row,
    analysis_type: payload.analysis_type,
    status: row.diff.startsWith("-") ? "safe" : "neutral",
  }));
}

export async function getMenus() {
  try {
    const { data } = await client.get("/menus");
    return (data || []).map((menu) => ({
      id: menu.id,
      name: menu.name || `Menü #${menu.id}`,
      week_start_date: menu.week_start_date,
      budget: menu.budget,
      total_cost: menu.total_cost,
      total_calories: menu.total_calories,
      total_protein: menu.total_protein,
      total_iron: menu.total_iron,
      status: menu.status || "DRAFT",
      notes: menu.notes,
    }));
  } catch {
    return [];
  }
}

export async function compareMenus(menu1Id, menu2Id) {
  return {
    menu1: { id: menu1Id, name: `Menü ${menu1Id}`, week_start_date: "2026-01-01", status: "ACTIVE" },
    menu2: { id: menu2Id, name: `Menü ${menu2Id}`, week_start_date: "2026-02-01", status: "ACTIVE" },
    metrics: [
      { metric: "Kalori", menu1_value: "720 kcal", menu2_value: "680 kcal", diff: "-40 kcal" },
      { metric: "Protein", menu1_value: "24 g", menu2_value: "29 g", diff: "+5 g" },
      { metric: "Demir", menu1_value: "5.8 mg", menu2_value: "7.2 mg", diff: "+1.4 mg" },
    ],
  };
}

export async function getTrendQuery(_start, _end, _meals) {
  const { data } = await client.get("/health-risk-analysis/statistics/history", { params: { months: 12 } });
  return normalizeTrend(data || []);
}

export async function getNotifications() {
  const raw = localStorage.getItem("health_risk_notifications");
  return raw ? JSON.parse(raw) : fallbackNotifications;
}

export async function deleteNotification(id) {
  const items = await getNotifications();
  localStorage.setItem("health_risk_notifications", JSON.stringify(items.filter((item) => item.id !== id)));
}

export async function markNotificationAsRead(id) {
  const items = await getNotifications();
  localStorage.setItem("health_risk_notifications", JSON.stringify(items.map((item) => item.id === id ? { ...item, read: true } : item)));
}

export async function clearAllNotifications() {
  localStorage.setItem("health_risk_notifications", JSON.stringify([]));
}
