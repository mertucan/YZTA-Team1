import { healthTrackerModule } from "./health-tracker";
import { studentHealthFlagsModule } from "./student-health-flags";
import { aiMenuPlannerModule } from "./ai-menu-planner";
import { cateringManagementModule } from "./catering-management-module";
import { researchExportModule } from "./research-export";
import { universityQualityIntegrationModule } from "./university-quality-integration";
import { partnerProductsModule } from "./partner-products";

// ─── Yeni modül eklemek için buraya import ekle ──────────────────────────────
// import { myModule } from "./my-module";
// ─────────────────────────────────────────────────────────────────────────────

export const modules = [
  healthTrackerModule,
  studentHealthFlagsModule,
  aiMenuPlannerModule,
  researchExportModule,
  universityQualityIntegrationModule,
  partnerProductsModule,
  cateringManagementModule,
  // myModule,
];

