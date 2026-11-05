import { panelCount, type ChartSpec } from "../chartSpec";
import { WEIGHTS, clamp01, type CheckResult } from "./types";

/**
 * DESIGN ASSUMPTIONS (not study findings). The study compared one dense layout against
 * a clean one; these thresholds for "how dense is dense" are our own choice.
 *  - up to `comfortablePanels` panels: severity 0
 *  - `densePanels` or more: severity 1
 *  - linear in between
 *  - having one clearly primary panel multiplies severity by `primaryPanelFactor`
 */
export const DENSITY_THRESHOLDS = {
  comfortablePanels: 2,
  densePanels: 6,
  primaryPanelFactor: 0.5,
} as const;

export function denseSeverity(panels: number, hasPrimary: boolean): number {
  const { comfortablePanels, densePanels, primaryPanelFactor } = DENSITY_THRESHOLDS;
  const raw = clamp01((panels - comfortablePanels) / (densePanels - comfortablePanels));
  return hasPrimary ? raw * primaryPanelFactor : raw;
}

/** Dense layout. Applies to every chart; a single-panel chart simply scores 0. */
export function checkDenseLayout(spec: ChartSpec): CheckResult {
  const panels = panelCount(spec);
  const hasPrimary = spec.type === "multipanel" && spec.settings.panels.some((p) => p.primary);
  const severity = denseSeverity(panels, hasPrimary);

  let summary = "One view, one main comparison.";
  let finding = panels === 1 ? "Single panel." : `${panels} panels with one primary panel.`;
  if (severity > 0 && !hasPrimary) {
    summary = `${panels} panels compete for attention.`;
    finding = `The grid gives all ${panels} panels equal visual priority.`;
  } else if (severity > 0) {
    summary = `${panels} panels; one leads, but the rest still compete.`;
  }

  return {
    id: "dense",
    title: "Dense layout",
    weight: WEIGHTS.dense,
    applicable: true,
    issue: severity > 0,
    severity,
    summary,
    finding,
    why: "Viewers compare whichever panels sit next to each other instead of the related metrics.",
    fix: "Make one panel primary so the view leads with one main comparison.",
  };
}
