import AiMenuPlannerPage from "./pages/AiMenuPlannerPage";

export const aiMenuPlannerModule = {
  id:          "ai-menu-planner",
  label:       "AI Menü Planlayıcı",
  icon:        "🤖",
  route:       "/modules/ai-menu-planner",
  description: "Gemini + RAG ile bütçeye göre kalori/protein/demir dengeli haftalık menü üretimi",
  author:      "Barış Uyumaz",
  component:   AiMenuPlannerPage,
};
