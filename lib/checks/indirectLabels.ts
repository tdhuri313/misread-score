import type { ChartSpec } from "../chartSpec";
import { WEIGHTS, type CheckResult } from "./types";

/**
 * Indirect labels. Applies to every chart. Severity is 0 or 1.
 * What "direct label" means depends on the chart:
 *  - bar: value printed on each bar
 *  - heatmap: value printed in each cell
 *  - line / multi-panel: series name printed at the end of each line
 */
export function checkIndirectLabels(spec: ChartSpec): CheckResult {
  const direct = spec.settings.directLabels;
  const isLine = spec.type === "line" || spec.type === "multipanel";

  const finding = direct
    ? "Marks are labeled directly."
    : isLine
      ? spec.settings.showLegend
        ? "Series are identified through a separate legend."
        : "Lines have no labels at all."
      : spec.type === "heatmap"
        ? "Cells show no values."
        : "Bars show no values; viewers read them off the axis.";

  return {
    id: "indirect",
    title: isLine ? "Series not labeled directly" : "Values not labeled directly",
    weight: WEIGHTS.indirect,
    applicable: true,
    issue: !direct,
    severity: direct ? 0 : 1,
    summary: direct
      ? "Labels sit on the marks they describe."
      : isLine
        ? "Viewers must match colors to a legend."
        : "Viewers must estimate values from the axis.",
    finding,
    why: isLine
      ? "Every trip from line to legend is another chance to misidentify a series."
      : "Estimating from gridlines is slower and less accurate than reading a number.",
    fix: isLine
      ? "Put each series name at the end of its line."
      : "Print the value on each mark.",
  };
}
