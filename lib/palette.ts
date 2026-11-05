/**
 * Chart colors. The series palette was checked with the dataviz palette validator
 * (lightness band, chroma, CVD separation, contrast) against a light surface.
 * Slots are assigned in fixed order and never cycled; color follows the series.
 */
export const PRIMARY = "#3B2FC8";
export const SECONDARY = "#857EE2";
export const SERIES_COLORS = ["#3B2FC8", "#0E8F7E", "#B5179E", "#8A6A00", "#0B74B8"];

/** Sequential heatmap ramp: one hue, light -> dark. */
export const RAMP_LIGHT = "#EEECFB";
export const RAMP_DARK = "#3B2FC8";

export const INK = "#16151A";
export const MUTED = "#6B6A75";
export const GRID = "#E7E6E1";
export const RISK = { high: "#C42B3B", medium: "#D4952A", low: "#2E9E5B" } as const;

/** Series beyond the palette share a neutral color (and are always directly labeled). */
export function seriesColor(i: number): string {
  return SERIES_COLORS[i] ?? "#8A8995";
}
