import { WEIGHTS, type CheckId } from "./checks";

/**
 * Study results, exactly as reported. Do not add numbers here that the study did not
 * produce; use a TODO instead.
 */
export const STUDY = {
  participants: 50,
  readings: 500,
  // TODO: number of readings per variant (not yet reported)
  // TODO: confidence intervals / significance for each drop (not yet reported)
  // TODO: participant split used for the planned holdout check (see scripts/backtest.ts)
} as const;

export interface Driver {
  id: CheckId;
  /** Accuracy on the clean chart, percent. */
  clean: number;
  /** Accuracy on the variant with this one issue, percent. */
  issue: number;
  name: string;
  headline: string;
  body: string;
  recommendation: string;
}

/** Ordered by effect size: color, dense, truncated, indirect. */
export const DRIVERS: Driver[] = [
  {
    id: "color",
    clean: 95,
    issue: 50,
    name: "No color legend",
    headline: "Color without a scale caused the largest drop",
    body: "When color carries a value but nothing says what it means, viewers supply their own meaning for each shade.",
    recommendation: "Show a labeled scale and make darker mean more.",
  },
  {
    id: "dense",
    clean: 80,
    issue: 62,
    name: "Dense layout",
    headline: "Dense layouts invite the wrong comparison",
    body: "When every panel gets equal space, viewers compare whatever sits side by side rather than what is related.",
    recommendation: "Give one comparison priority in each view.",
  },
  {
    id: "truncated",
    clean: 85,
    issue: 70,
    name: "Truncated axis",
    headline: "Truncated axes inflate small differences",
    body: "A baseline above zero turns a small gap into a large visual one, because bar length is read from the baseline.",
    recommendation: "Start bar axes at zero, or label the break explicitly.",
  },
  {
    id: "indirect",
    clean: 88,
    issue: 73,
    name: "Indirect labels",
    headline: "Legends add a lookup step",
    body: "Every trip from a mark to a legend and back is another chance to read the wrong series or value.",
    recommendation: "Put names and values directly on the marks they describe.",
  },
];

export const drop = (d: Driver) => d.clean - d.issue;
export const weightOf = (d: Driver) => WEIGHTS[d.id];
