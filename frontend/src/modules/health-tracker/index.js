import HealthDashboard from "./pages/HealthDashboard";

export const healthTrackerModule = {
  id:          "health-tracker",
  label:       "Sağlık Takibi",
  icon:        "health",
  route:       "/modules/health-tracker",
  description: "Öğrenci bazında kalori takibi ve beslenme analizi",
  author:      "Takım üyesi 1",
  component:   HealthDashboard,
};
