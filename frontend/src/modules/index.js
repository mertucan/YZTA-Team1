import { healthTrackerModule } from "./health-tracker";
import { studentHealthFlagsModule } from "./student-health-flags";
import { aiMenuPlannerModule, aiMenuPlannerSuggestionModule } from "./ai-menu-planner";
import { cateringManagementModule } from "./catering-management-module";

// ─── Yeni modül eklemek için buraya import ekle ──────────────────────────────
// import { myModule } from "./my-module";
// ─────────────────────────────────────────────────────────────────────────────

export const modules = [
  healthTrackerModule,
  studentHealthFlagsModule,
  aiMenuPlannerModule,
  aiMenuPlannerSuggestionModule,
  cateringManagementModule,
  // myModule,
];

