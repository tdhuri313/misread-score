import type { ChartSpec } from "../chartSpec";
import { formatLieFactor, lieFactor } from "../lieFactor";
import { WEIGHTS, clamp01, type CheckResult } from "./types";

/**
 * DESIGN ASSUMPTION (not a study finding): a lie factor of 5x or more counts as the
 * worst case (severity 1). Severity grows linearly from 0 at 1.0x.
 */
export const LIE_FACTOR_CAP = 5;

export function truncatedSeverity(lf: number | null): number {
  if (lf === null) return 0;
  if (!Number.isFinite(lf)) return 1;
  return clamp01((lf - 1) / (LIE_FACTOR_CAP - 1));
}

/** Truncated axis. Bar charts only: bar length is the encoding, so the baseline matters. */
export function checkTruncatedAxis(spec: ChartSpec): CheckResult {
  const base = { id: "truncated" as const, title: "Truncated y-axis", weight: WEIGHTS.truncated };

  if (spec.type !== "bar") {
    return {
      ...base,
      applicable: false,
      issue: false,
      severity: 0,
      summary: "Only checked on bar charts.",
      finding: "",
      why: "",
      fix: "",
    };
  }

  const lf = lieFactor(spec);
  const severity = truncatedSeverity(lf);
  const start = spec.settings.axisStart;
  const values = spec.series[0]?.values ?? [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const actualPct = min > 0 ? Math.round(((max - min) / min) * 100) : null;
  const visualRatio = min - start > 0 ? (max - start) / (min - start) : null;

  return {
    ...base,
    applicable: true,
    issue: severity > 0,
    severity,
    summary:
      severity > 0
        ? `The visual gap is ${formatLieFactor(lf)} larger than the real gap.`
        : "Bars start at zero, so lengths are proportional.",
    finding: start === 0 ? "The y-axis starts at zero." : `The y-axis begins at ${start} rather than zero.`,
    why:
      visualRatio !== null && actualPct !== null
        ? `The tallest bar looks ${visualRatio.toFixed(1)}× the shortest, but the real difference is ${actualPct}%.`
        : "Bars below the axis start have no visible length, so differences cannot be judged.",
    fix: "Start the y-axis at zero, or mark an explicit axis break. A cut axis is sometimes intentional; if so, label it.",
  };
}
