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
import { hasCateringSession } from "../../utils/cateringSession";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/students" element={<Students />} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/orders" element={<Orders />} />

            {modules.map((mod) => (
              <Route key={mod.id} path={`${mod.route}/*`} element={<mod.component />} />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}
