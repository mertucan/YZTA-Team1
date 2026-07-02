import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import Topbar from "./components/Layout/Topbar";
import Dashboard from "./pages/Dashboard";
import Ingredients from "./pages/Ingredients";
import Meals from "./pages/Meals";
import Students from "./pages/Students";
import Absences from "./pages/Absences";
import { modules } from "./modules";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ marginLeft: 230, flex: 1, display: "flex", flexDirection: "column" }}>
          <Topbar />
          <main style={{ padding: 24, flex: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/ingredients" element={<Ingredients />} />
              <Route path="/meals"       element={<Meals />} />
              <Route path="/students"    element={<Students />} />
              <Route path="/absences"    element={<Absences />} />

              {/* Modüller — otomatik kayıt */}
              {modules.map((mod) => (
                <Route key={mod.id} path={mod.route} element={<mod.component />} />
              ))}
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
