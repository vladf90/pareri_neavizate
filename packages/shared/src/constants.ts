export const CANVAS = {
  "16x9": { width: 1920, height: 1080, safePad: 60 },
  "9x16": { width: 1080, height: 1920, safePad: 48 },
} as const;

export type CanvasFormat = keyof typeof CANVAS;

export const DEFAULT_THEME_ID = "UCL";
