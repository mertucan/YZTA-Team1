import AiMenuPlannerPage from "./pages/AiMenuPlannerPage";

export const aiMenuPlannerModule = {
  id:          "ai-menu-planner",
  label:       "AI Destekli Menü Planlayıcı",
  icon:        "🤖",
  route:       "/modules/ai-menu-planner",
  description: "Depodaki mevcut malzemelerle, kategori kategori dolu 7 günlük menü önerisi",
  author:      "Barış Uyumaz",
  component:   AiMenuPlannerPage,
};
