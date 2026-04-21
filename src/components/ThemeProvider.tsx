import React, { createContext, useContext, useEffect, useState } from "react";
import { db, UserSettings } from "@/src/lib/db";

type Theme = "olive" | "blue" | "burgundy" | "midnight" | "gold" | "rose" | "turquoise" | "purple" | "light-green" | "lemon" | "beige" | "antique-brown" | "orange" | "sky-blue" | "gray" | "rosy-pink";

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("olive");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.settings.get();
      setThemeState((settings.theme as Theme) || "olive");
      setIsDarkMode(settings.isDarkMode || false);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove old theme classes
    root.classList.remove(
      "theme-olive",
      "theme-blue",
      "theme-burgundy",
      "theme-midnight",
      "theme-gold",
      "theme-rose",
      "theme-turquoise",
      "theme-purple",
      "theme-light-green",
      "theme-lemon",
      "theme-beige",
      "theme-antique-brown",
      "theme-orange",
      "theme-sky-blue",
      "theme-gray",
      "theme-rosy-pink"
    );
    root.classList.add(`theme-${theme}`);

    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, isDarkMode]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    const settings = await db.settings.get();
    await db.settings.save({ ...settings, theme: newTheme });
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    const settings = await db.settings.get();
    await db.settings.save({ ...settings, isDarkMode: newDarkMode });
  };

  return (
    <ThemeContext.Provider
      value={{ theme, isDarkMode, setTheme, toggleDarkMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
