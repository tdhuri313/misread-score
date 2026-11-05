/**
 * Holdout backtest: STUB ONLY.
 *
 * Goal: check whether the score's weights generalise. Derive weights from one split of
 * participants, then test whether those weights rank misreadings in the other split.
 *
 * This file intentionally contains no data and no analysis. Nothing here should be
 * filled in with made-up numbers.
 *
 * Run: npm run backtest   (prints the plan and exits)
 */

import type { CheckId } from "../lib/checks";

/** One chart reading by one participant. */
export interface Reading {
  participantId: string;
  /** Which formatting factor this variant changed, or "clean" for the control. */
  variant: CheckId | "clean";
  correct: boolean;
}

export interface Split {
  train: Reading[];
  test: Reading[];
}

/**
 * TODO: load the study's 500 readings from a local file that is not committed
 * (participant-level data). Format to be decided.
 */
export function loadReadings(): Reading[] {
  throw new Error("TODO: no study data is bundled with this repo.");
}

/**
 * TODO: split by participant (never by reading), so no participant appears in both halves.
 * The split rule and seed are not decided yet.
 */
export function splitByParticipant(readings: Reading[]): Split {
  void readings;
  throw new Error("TODO: participant split not implemented.");
}

/**
 * TODO: derive weights from the training split the same way the shipped weights were
 * derived: accuracy drop per variant (clean minus variant), normalised to sum to 100.
 */
export function deriveWeights(train: Reading[]): Record<CheckId, number> {
  void train;
  throw new Error("TODO: weight derivation not implemented.");
}

/**
 * TODO: evaluate on the test split. Candidate measures (not chosen yet): rank agreement
 * between derived weights and test-split accuracy drops; absolute error per factor.
 */
export function evaluate(weights: Record<CheckId, number>, test: Reading[]): Record<string, number> {
  void weights;
  void test;
  throw new Error("TODO: evaluation not implemented.");
}

const isMain = typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/backtest.ts");
if (isMain) {
  console.log(
    [
      "Misread Score holdout backtest (stub)",
      "1. loadReadings()        TODO: no study data bundled",
      "2. splitByParticipant()  TODO",
      "3. deriveWeights(train)  TODO",
      "4. evaluate(w, test)     TODO",
      "Not implemented. The score is not validated yet.",
    ].join("\n"),
  );
}
