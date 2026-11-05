import type { ChartSpec } from "./chartSpec";
import { ALL_CHECKS, CHECK_IDS, WEIGHTS, type CheckId, type CheckResult } from "./checks";

/** DESIGN ASSUMPTION: risk bands are our choice, not derived from the study. */
export const RISK_BANDS = { medium: 35, high: 60 } as const;

export type RiskLabel = "Low" | "Medium" | "High";

export function riskLabel(score: number): RiskLabel {
  if (score >= RISK_BANDS.high) return "High";
  if (score >= RISK_BANDS.medium) return "Medium";
  return "Low";
}

export interface ScoredCheck extends CheckResult {
  /** Integer share of the score this issue contributes. Points of all issues sum to the score. */
  points: number;
}

export interface ScoreResult {
  score: number;
  label: RiskLabel;
  /** Applicable checks with an issue, highest points first. */
  issues: ScoredCheck[];
  /** Every check, including ones that don't apply (points 0). */
  all: ScoredCheck[];
}

/**
 * Risk = sum(weight × severity) / sum(applicable weights) × 100, rounded.
 * Checks that don't apply are left out of both sums.
 *
 * Each issue's points are its exact share (weight × severity / applicable × 100), rounded
 * with the largest-remainder method so the shown points add up to the shown score.
 */
export function scoreChart(spec: ChartSpec, weights: Record<CheckId, number> = WEIGHTS): ScoreResult {
  const results = CHECK_IDS.map((id) => {
    const r = ALL_CHECKS[id](spec);
    return { ...r, weight: weights[id] };
  });

  const applicableWeight = results.filter((r) => r.applicable).reduce((sum, r) => sum + r.weight, 0);
  const exact = results.map((r) =>
    r.applicable && applicableWeight > 0 ? ((r.weight * r.severity) / applicableWeight) * 100 : 0,
  );
  const score = Math.round(exact.reduce((a, b) => a + b, 0));

  // Largest remainder: floor everything, then hand out the leftover points.
  const points = exact.map(Math.floor);
  let leftover = score - points.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x) }))
    .filter(({ i }) => exact[i] > 0)
    .sort((a, b) => b.rem - a.rem);
  for (const { i } of order) {
    if (leftover <= 0) break;
    points[i] += 1;
    leftover -= 1;
  }

  const all: ScoredCheck[] = results.map((r, i) => ({ ...r, points: points[i] }));
  const issues = all
    .filter((r) => r.applicable && r.issue)
    .sort((a, b) => b.points - a.points || b.weight - a.weight);

  return { score, label: riskLabel(score), issues, all };
}

export interface BatchRow {
  spec: ChartSpec;
  result: ScoreResult;
}

export interface BatchStats {
  count: number;
  high: number;
  medium: number;
  low: number;
  /** Rounded mean score, or null for an empty batch. */
  average: number | null;
  samples: number;
  uploaded: number;
}

/** All batch stats are computed from real scores; nothing is hard-coded. */
export function batchStats(rows: BatchRow[]): BatchStats {
  const count = rows.length;
  const byLabel = (l: RiskLabel) => rows.filter((r) => r.result.label === l).length;
  const total = rows.reduce((s, r) => s + r.result.score, 0);
  return {
    count,
    high: byLabel("High"),
    medium: byLabel("Medium"),
    low: byLabel("Low"),
    average: count ? Math.round(total / count) : null,
    samples: rows.filter((r) => r.spec.source === "sample").length,
    uploaded: rows.filter((r) => r.spec.source !== "sample").length,
  };
}
