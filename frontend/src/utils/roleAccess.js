export const moduleRoles = {
  "health-tracker": ["DIETITIAN", "RESEARCHER", "UNIVERSITY_ADMIN", "CATERING_ADMIN", "SUPER_ADMIN"],
  "health-risk-analysis": ["DIETITIAN", "RESEARCHER", "UNIVERSITY_ADMIN", "CATERING_ADMIN", "SUPER_ADMIN"],
  "student-health-flags": ["DIETITIAN", "UNIVERSITY_ADMIN", "SUPER_ADMIN"],
  "ai-menu-planner": ["DIETITIAN", "CHEF"],
  "research-export": ["RESEARCHER", "UNIVERSITY_ADMIN"],
  "university-quality-integration": ["UNIVERSITY_ADMIN", "SUPER_ADMIN"],
  "partner-products": ["PARTNER_COMPANY", "DIETITIAN", "CHEF", "CATERING_ADMIN", "SUPER_ADMIN", "PURCHASING_STAFF"],
  "sustainabilityscore": ["DIETITIAN", "CHEF", "OPERATIONS_MANAGER", "FINANCE_MANAGER", "CATERING_ADMIN", "UNIVERSITY_ADMIN", "SUPER_ADMIN", "RESEARCHER"],
  "tender-invoice-management": ["FINANCE_MANAGER", "OPERATIONS_MANAGER", "CATERING_ADMIN", "UNIVERSITY_ADMIN", "SUPER_ADMIN", "DIETITIAN"],
};

export const recordRoles = {
  "/ingredients": ["CHEF", "OPERATIONS_MANAGER", "WAREHOUSE_STAFF", "PURCHASING_STAFF"],
  "/meals": ["DIETITIAN", "CHEF"],
  "/students": ["UNIVERSITY_ADMIN", "DIETITIAN", "RESEARCHER"],
  "/absences": ["UNIVERSITY_ADMIN", "OPERATIONS_MANAGER"],
  "/expenses": ["OPERATIONS_MANAGER", "FINANCE_MANAGER", "CATERING_ADMIN"],
  "/orders": ["OPERATIONS_MANAGER", "PURCHASING_STAFF", "CATERING_ADMIN"],
};

export function canAccessRecordPath(role, path) {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;
  if (role === "CATERING_ADMIN") return path !== "/students";
  return Boolean(recordRoles[path]?.includes(role));
}

export function canAccessModule(role, moduleId) {
  if (!role) return false;
  if (moduleId === "catering-management") return true;
  if (role === "SUPER_ADMIN") return true;
  return Boolean(moduleRoles[moduleId]?.includes(role));
}

export function fallbackRouteForRole(role) {
  return role ? "/modules/catering-management" : "/";
}
