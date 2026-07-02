import client from "./client";

export const getDashboardStats = () =>
  client.get("/dashboard/stats").then((r) => r.data);
