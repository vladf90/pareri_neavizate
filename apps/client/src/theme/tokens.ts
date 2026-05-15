export interface ThemeTokens {
  id: string;
  name: string;
  colors: {
    bg0: string;
    bg1: string;
    panel: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    danger: string;
    success: string;
    warning: string;
    stroke: string;
  };
  typography: {
    displayFamily: string;
    bodyFamily: string;
    weightDisplay: number;
    weightBody: number;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    soft: string;
    hard: string;
    glowAccent: string;
  };
  glass: {
    bg: string;
    blur: string;
    border: string;
  };
  motion: {
    durationFast: string;
    durationBase: string;
    durationSlow: string;
    easingEnter: string;
    easingExit: string;
  };
}

export const UCL_THEME: ThemeTokens = {
  id: "UCL",
  name: "Champions League",
  colors: {
    bg0: "#0a0a1a",
    bg1: "#121228",
    panel: "rgba(20, 20, 50, 0.85)",
    text: "#ffffff",
    muted: "#a0a0b0",
    accent: "#1e90ff",
    accent2: "#00d4ff",
    danger: "#ff4444",
    success: "#00cc66",
    warning: "#ffaa00",
    stroke: "rgba(255, 255, 255, 0.1)",
  },
  typography: {
    displayFamily: "'Inter', system-ui, sans-serif",
    bodyFamily: "'Inter', system-ui, sans-serif",
    weightDisplay: 700,
    weightBody: 400,
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  shadows: {
    soft: "0 4px 16px rgba(0, 0, 0, 0.3)",
    hard: "0 2px 8px rgba(0, 0, 0, 0.5)",
    glowAccent: "0 0 20px rgba(30, 144, 255, 0.4)",
  },
  glass: {
    bg: "rgba(20, 20, 50, 0.7)",
    blur: "12px",
    border: "rgba(255, 255, 255, 0.1)",
  },
  motion: {
    durationFast: "150ms",
    durationBase: "250ms",
    durationSlow: "400ms",
    easingEnter: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    easingExit: "cubic-bezier(0.4, 0.0, 1, 1)",
  },
};

export const PL_THEME: ThemeTokens = {
  id: "PL",
  name: "Premier League",
  colors: {
    bg0: "#1a0030",
    bg1: "#280040",
    panel: "rgba(40, 0, 70, 0.9)",
    text: "#ffffff",
    muted: "#b0a0c0",
    accent: "#ff2882",
    accent2: "#00ff85",
    danger: "#ff4444",
    success: "#00ff85",
    warning: "#ffcc00",
    stroke: "rgba(255, 255, 255, 0.15)",
  },
  typography: {
    displayFamily: "'Inter', system-ui, sans-serif",
    bodyFamily: "'Inter', system-ui, sans-serif",
    weightDisplay: 700,
    weightBody: 400,
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  shadows: {
    soft: "0 4px 16px rgba(0, 0, 0, 0.4)",
    hard: "0 2px 8px rgba(0, 0, 0, 0.6)",
    glowAccent: "0 0 24px rgba(255, 40, 130, 0.5)",
  },
  glass: {
    bg: "rgba(40, 0, 70, 0.75)",
    blur: "12px",
    border: "rgba(255, 255, 255, 0.15)",
  },
  motion: {
    durationFast: "150ms",
    durationBase: "250ms",
    durationSlow: "400ms",
    easingEnter: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    easingExit: "cubic-bezier(0.4, 0.0, 1, 1)",
  },
};

export const THEMES: Record<string, ThemeTokens> = {
  UCL: UCL_THEME,
  PL: PL_THEME,
};

export function getTheme(themeId: string): ThemeTokens {
  return THEMES[themeId] || UCL_THEME;
}
