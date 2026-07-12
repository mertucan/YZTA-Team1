import { healthTrackerModule } from "./health-tracker";
import { studentHealthFlagsModule } from "./student-health-flags";
import { aiMenuPlannerModule } from "./ai-menu-planner";
import { cateringManagementModule } from "./catering-management-module";
import { researchExportModule } from "./research-export";

// ─── Yeni modül eklemek için buraya import ekle ──────────────────────────────
// import { myModule } from "./my-module";
// ─────────────────────────────────────────────────────────────────────────────

export const modules = [
  healthTrackerModule,
  studentHealthFlagsModule,
  aiMenuPlannerModule,
  researchExportModule,
  cateringManagementModule,
  // myModule,
];

