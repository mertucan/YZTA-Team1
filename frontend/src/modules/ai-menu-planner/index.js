import AiMenuPlannerPage from "./pages/AiMenuPlannerPage";
import AiMenuPlannerSuggestionPage from "./pages/AiMenuPlannerSuggestionPage";

export const aiMenuPlannerModule = {
  id:          "ai-menu-planner",
  label:       "AI Destekli Menü Planlayıcı",
  icon:        "🤖",
  route:       "/modules/ai-menu-planner",
  description: "Depodaki mevcut malzemelerle, kategori kategori dolu 7 günlük menü önerisi",
  author:      "Barış Uyumaz",
  component:   AiMenuPlannerPage,
};

export const aiMenuPlannerSuggestionModule = {
  id:          "ai-menu-planner-oneri",
  label:       "AI Destekli Menü Planlayıcı Öneri",
  icon:        "🤖",
  route:       "/modules/ai-menu-planner-oneri",
  description: "Sadeleştirilmiş arayüz denemesi — mevcut planlayıcının işlevi aynı, düzeni daha anlaşılır",
  author:      "Barış Uyumaz",
  component:   AiMenuPlannerSuggestionPage,
};
