import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getTheme, setTheme as persistTheme } from "../lib/storage";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  const dark = theme === "dark";
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
  if (document.body) {
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("light", !dark);
    document.body.dataset.theme = theme;
    document.body.style.colorScheme = theme;
  }
  const app = document.getElementById("root");
  if (app) {
    app.classList.toggle("dark", dark);
    app.classList.toggle("light", !dark);
    app.dataset.theme = theme;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return getTheme();
  });

  useEffect(() => {
    applyThemeClass(theme);
    persistTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    applyThemeClass(next);
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === "dark" ? "light" : "dark";
      applyThemeClass(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
