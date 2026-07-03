import { healthTrackerModule } from "./health-tracker";
import { studentHealthFlagsModule } from "./student-health-flags";

// ─── Yeni modül eklemek için buraya import ekle ──────────────────────────────
// import { myModule } from "./my-module";
// ─────────────────────────────────────────────────────────────────────────────

export const modules = [
  healthTrackerModule,
  studentHealthFlagsModule,
  // myModule,
];
