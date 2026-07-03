import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ToastContext = createContext(null);
const ThemeContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside AppProviders");
  return context;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside AppProviders");
  return context;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  };

  useEffect(() => {
    const handleButtonClick = (event) => {
      const button = event.target.closest("button");
      if (!button || button.dataset.toast === "off") return;

      const message = button.dataset.toast || `${button.textContent.trim() || "Buton"} işlemi çalıştırıldı`;
      showToast(message);
    };

    document.addEventListener("click", handleButtonClick);
    return () => document.removeEventListener("click", handleButtonClick);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={toastWrap}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...toastBox, ...toastType[toast.type] }}>
            <span style={toastDot} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isDark: theme === "dark",
    toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

const toastWrap = {
  position: "fixed",
  top: 68,
  right: 20,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  zIndex: 1000,
  pointerEvents: "none",
};

const toastBox = {
  minWidth: 230,
  maxWidth: 360,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-md)",
  color: "var(--text)",
  fontSize: 12,
  fontWeight: 600,
};

const toastType = {
  info: { borderColor: "var(--accent)", background: "var(--surface)" },
  success: { borderColor: "var(--green-border)", background: "var(--green-bg)" },
  error: { borderColor: "var(--red-border)", background: "var(--red-bg)" },
};

const toastDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--accent)",
  flexShrink: 0,
};
