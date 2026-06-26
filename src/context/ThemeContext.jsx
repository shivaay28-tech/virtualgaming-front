import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext(null);
const THEMES = ["classic", "royal", "dubai", "cyber"];
const LABELS = {
  classic: "Classic Casino",
  royal: "Royal Indian",
  dubai: "Dubai VIP",
  cyber: "Cyber Casino",
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("tp_theme") || "classic");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tp_theme", theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, themes: THEMES, labels: LABELS }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
