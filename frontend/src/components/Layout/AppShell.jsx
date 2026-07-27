import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Absences from "../../pages/Absences";
import Dashboard from "../../pages/Dashboard";
import Expenses from "../../pages/Expenses";
import Ingredients from "../../pages/Ingredients";
import Meals from "../../pages/Meals";
import Orders from "../../pages/Orders";
import Students from "../../pages/Students";
import WelcomePage from "../../pages/WelcomePage";
import { modules } from "../../modules";
import { hasCateringSession, readCateringSession } from "../../utils/cateringSession";
import { canAccessModule, canAccessRecordPath, fallbackRouteForRole } from "../../utils/roleAccess";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function ProtectedRoute({ children, allow }) {
  const session = readCateringSession();
  const role = session?.user?.role_name;

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (allow && !allow(role)) {
    return <Navigate to={fallbackRouteForRole(role)} replace />;
  }

  return children;
}

export default function AppShell() {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return (
      <Routes>
        <Route path="/" element={<WelcomePage />} />
      </Routes>
    );
  }

  if (pathname.startsWith("/modules/catering-management") && !hasCateringSession()) {
    const CateringManagementComponent = modules.find((mod) => mod.id === "catering-management")?.component;
    return CateringManagementComponent ? <CateringManagementComponent /> : <Navigate to="/" replace />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", overflowX: "hidden" }}>
      <Sidebar />
      <div style={{ marginLeft: 230, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ padding: 24, flex: 1, minWidth: 0, overflowX: "hidden" }}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Navigate to="/modules/catering-management" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients"
              element={
                <ProtectedRoute allow={(role) => canAccessRecordPath(role, "/ingredients")}>
                  <Ingredients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meals"
              element={
                <ProtectedRoute allow={(role) => canAccessRecordPath(role, "/meals")}>
                  <Meals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allow={(role) => canAccessRecordPath(role, "/students")}>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="/absences"
              element={
                <ProtectedRoute allow={(role) => canAccessRecordPath(role, "/absences")}>
                  <Absences />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute allow={(role) => canAccessRecordPath(role, "/expenses")}>
                  <Expenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allow={(role) => canAccessRecordPath(role, "/orders")}>
                  <Orders />
                </ProtectedRoute>
              }
            />

            {modules.map((mod) => (
              <Route
                key={mod.id}
                path={`${mod.route}/*`}
                element={
                  <ProtectedRoute allow={(role) => canAccessModule(role, mod.id)}>
                    <mod.component />
                  </ProtectedRoute>
                }
              />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}
