import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "smarttodo:theme";
const FONT_SCALE_KEY = "smarttodo:font-scale";

// Base root font size in px. The slider scales this between MIN and MAX.
const BASE_FONT_PX = 16;
export const MIN_FONT_SCALE = 0.8125; // ~13px
export const MAX_FONT_SCALE = 1.375; // 22px
const DEFAULT_FONT_SCALE = 1;

function clampFontScale(value: number) {
  if (Number.isNaN(value)) return DEFAULT_FONT_SCALE;
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  fontScale: number;
  setFontScale: (scale: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === "dark" || stored === "light" ? stored : defaultTheme;
    }
    return defaultTheme;
  });

  const [fontScale, setFontScaleState] = useState<number>(() => {
    const stored = localStorage.getItem(FONT_SCALE_KEY);
    return stored ? clampFontScale(Number(stored)) : DEFAULT_FONT_SCALE;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme, switchable]);

  useEffect(() => {
    // Scale the root font size; all rem-based sizing follows.
    document.documentElement.style.fontSize = `${BASE_FONT_PX * fontScale}px`;
    localStorage.setItem(FONT_SCALE_KEY, String(fontScale));
  }, [fontScale]);

  const setFontScale = useCallback((scale: number) => {
    setFontScaleState(clampFontScale(scale));
  }, []);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable, fontScale, setFontScale }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
