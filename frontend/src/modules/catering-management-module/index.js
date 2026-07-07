import CateringManagementApp from "./frontend/src/App.jsx";
import "./frontend/src/styles/globals.css";

export const cateringManagementModule = {
  id: "catering-management",
  label: "Catering Yönetimi",
  icon: "🏢",
  route: "/modules/catering-management",
  description: "Firma, üniversite, kullanıcı, lisans ve menü atama yönetimi",
  author: "Catering Management Module",
  component: CateringManagementApp,
};

