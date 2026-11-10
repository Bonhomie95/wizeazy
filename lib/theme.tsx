"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
} | null>(null);


function currentFromDom(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(currentFromDom());
  }, []);

  const apply = useCallback((t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
  }, []);

  const toggle = useCallback(
    () => apply(currentFromDom() === "dark" ? "light" : "dark"),
    [apply],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
