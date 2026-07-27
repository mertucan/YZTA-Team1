import { BrowserRouter } from "react-router-dom";
import AppShell from "./components/Layout/AppShell";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
