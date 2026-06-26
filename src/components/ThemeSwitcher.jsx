import React from "react";
import { useTheme } from "../context/ThemeContext";

export function ThemeSwitcher() {
  const { theme, setTheme, themes, labels } = useTheme();
  return (
    <div className="flex items-center gap-2" data-testid="theme-switcher">
      {themes.map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          data-testid={`theme-${t}`}
          className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] rounded-sm border transition-colors ${
            theme === t
              ? "border-[color:var(--theme-primary)] text-[color:var(--theme-primary)] bg-white/[0.04]"
              : "border-white/10 text-white/60 hover:text-white"
          }`}
        >
          {labels[t]}
        </button>
      ))}
    </div>
  );
}
