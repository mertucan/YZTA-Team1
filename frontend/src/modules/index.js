import { healthTrackerModule } from "./health-tracker";
import { healthRiskAnalysisModule } from "./health-risk-analysis";
import { studentHealthFlagsModule } from "./student-health-flags";
import { aiMenuPlannerModule, aiMenuPlannerSuggestionModule } from "./ai-menu-planner";
import { cateringManagementModule } from "./catering-management-module";
import { researchExportModule } from "./research-export";
import { universityQualityIntegrationModule } from "./university-quality-integration";
import { partnerProductsModule } from "./partner-products";

// ─── Yeni modül eklemek için buraya import ekle ──────────────────────────────
// import { myModule } from "./my-module";
// ─────────────────────────────────────────────────────────────────────────────

export const modules = [
  healthTrackerModule,
  healthRiskAnalysisModule,
  studentHealthFlagsModule,
  aiMenuPlannerModule,
  aiMenuPlannerSuggestionModule,
  researchExportModule,
  universityQualityIntegrationModule,
  partnerProductsModule,
  cateringManagementModule,
  // myModule,
];

