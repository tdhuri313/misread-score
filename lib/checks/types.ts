import type { ChartSpec } from "../chartSpec";

export type CheckId = "color" | "dense" | "truncated" | "indirect";

/**
 * Base weights, roughly proportional to the study's accuracy drops (clean vs issue):
 * color -45, dense -18, truncated -15, indirect -15 (45:18:15:15), rounded to sum to 100.
 */
export const WEIGHTS: Record<CheckId, number> = {
  color: 49,
  dense: 19,
  truncated: 16,
  indirect: 16,
};

export interface CheckResult {
  id: CheckId;
  /** Short name for the issue, e.g. "Truncated y-axis". */
  title: string;
  /** Does this check apply to this kind of chart at all? */
  applicable: boolean;
  /** Is there a problem (severity > 0)? */
  issue: boolean;
  /** 0 (fine) to 1 (worst case). */
  severity: number;
  /** Base weight for this check. */
  weight: number;
  /** One-line summary for the card header. */
  summary: string;
  finding: string;
  why: string;
  fix: string;
}

export type Check = (spec: ChartSpec) => CheckResult;

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
