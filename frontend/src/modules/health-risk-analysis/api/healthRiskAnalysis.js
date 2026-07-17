import client from "../../../api/client";

export const getLatestHealthRiskStatistics = () =>
  client.get("/health-risk-analysis/statistics/latest").then((r) => r.data);

export const getHealthRiskHistory = (months = 6) =>
  client.get("/health-risk-analysis/statistics/history", { params: { months } }).then((r) => r.data);

export const getMonthlyHealthRiskStatistics = (year, month) =>
  client.get(`/health-risk-analysis/statistics/monthly/${year}/${month}`).then((r) => r.data);
