import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useAppStore } from "@/store";
import { getTheme, type ThemeTokens } from "./tokens";

const ThemeContext = createContext<ThemeTokens | null>(null);

export function useTheme(): ThemeTokens {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  themeOverride?: string; // For testing/preview
}

export function ThemeProvider({ children, themeOverride }: ThemeProviderProps) {
  const themeId = useAppStore((s) => s.appState?.selection.themeId) || "UCL";
  const activeThemeId = themeOverride || themeId;
  const theme = useMemo(() => getTheme(activeThemeId), [activeThemeId]);

  // Apply CSS variables to root
  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute for CSS targeting
    root.setAttribute("data-theme", theme.id);

    // Set CSS variables
    root.style.setProperty("--color-bg0", theme.colors.bg0);
    root.style.setProperty("--color-bg1", theme.colors.bg1);
    root.style.setProperty("--color-panel", theme.colors.panel);
    root.style.setProperty("--color-text", theme.colors.text);
    root.style.setProperty("--color-muted", theme.colors.muted);
    root.style.setProperty("--color-accent", theme.colors.accent);
    root.style.setProperty("--color-accent2", theme.colors.accent2);
    root.style.setProperty("--color-danger", theme.colors.danger);
    root.style.setProperty("--color-success", theme.colors.success);
    root.style.setProperty("--color-warning", theme.colors.warning);
    root.style.setProperty("--color-stroke", theme.colors.stroke);

    root.style.setProperty("--font-display", theme.typography.displayFamily);
    root.style.setProperty("--font-body", theme.typography.bodyFamily);
    root.style.setProperty("--font-weight-display", String(theme.typography.weightDisplay));
    root.style.setProperty("--font-weight-body", String(theme.typography.weightBody));

    root.style.setProperty("--radius-sm", theme.radii.sm);
    root.style.setProperty("--radius-md", theme.radii.md);
    root.style.setProperty("--radius-lg", theme.radii.lg);
    root.style.setProperty("--radius-xl", theme.radii.xl);

    root.style.setProperty("--shadow-soft", theme.shadows.soft);
    root.style.setProperty("--shadow-hard", theme.shadows.hard);
    root.style.setProperty("--glow-accent", theme.shadows.glowAccent);

    root.style.setProperty("--glass-bg", theme.glass.bg);
    root.style.setProperty("--glass-blur", theme.glass.blur);
    root.style.setProperty("--glass-border", theme.glass.border);

    root.style.setProperty("--duration-fast", theme.motion.durationFast);
    root.style.setProperty("--duration-base", theme.motion.durationBase);
    root.style.setProperty("--duration-slow", theme.motion.durationSlow);
    root.style.setProperty("--easing-enter", theme.motion.easingEnter);
    root.style.setProperty("--easing-exit", theme.motion.easingExit);
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
