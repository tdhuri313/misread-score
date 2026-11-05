import type { ChartSpec } from "./chartSpec";

/**
 * Lie factor (Tufte) = visual percent difference / actual percent difference.
 *
 * We compare the smallest and largest bar in the first series:
 *   actual % difference = (max - min) / min
 *   visual % difference = (len(max) - len(min)) / len(min), where len(v) = v - axisStart
 *     (bar length is measured from where the axis starts, which is what the eye sees)
 *
 * Returns:
 *   - a number (1.0 means the picture is faithful)
 *   - Infinity when the smallest bar is at or below the axis start (it has no visible length)
 *   - null when there is nothing to compare: not a bar chart, fewer than two bars,
 *     equal values, or non-positive values (percent difference is undefined).
 */
export function lieFactor(spec: ChartSpec): number | null {
  if (spec.type !== "bar") return null;
  const values = spec.series[0]?.values ?? [];
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min <= 0 || max === min) return null;

  const actual = (max - min) / min;

  const start = spec.settings.axisStart;
  const minLength = min - start;
  const maxLength = max - start;
  if (minLength <= 0) return Infinity;

  const visual = (maxLength - minLength) / minLength;
  return visual / actual;
}

/** "26x", "1.0x", "∞", or "n/a" for display. */
export function formatLieFactor(lf: number | null): string {
  if (lf === null) return "n/a";
  if (!Number.isFinite(lf)) return "∞";
  return lf >= 10 ? `${Math.round(lf)}x` : `${lf.toFixed(1)}x`;
}
