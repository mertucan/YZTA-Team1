import AiMenuPlannerSuggestionPage from "./pages/AiMenuPlannerSuggestionPage";

export const aiMenuPlannerModule = {
  id:          "ai-menu-planner",
  label:       "AI Destekli Menü Planlayıcı",
  icon:        "menu-plan",
  route:       "/modules/ai-menu-planner",
  description: "Stok, bütçe ve porsiyon bilgilerine göre haftalık menü planı oluşturur.",
  author:      "Barış Uyumaz",
  component:   AiMenuPlannerSuggestionPage,
};
