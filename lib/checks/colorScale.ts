import { colorEncodesValue, type ChartSpec } from "../chartSpec";
import { WEIGHTS, type CheckResult } from "./types";

/**
 * DESIGN ASSUMPTION (not a study finding): a visible scale with a reversed mapping
 * (lighter means more) is scored as half as risky as having no scale at all.
 */
export const REVERSED_WITH_SCALE_SEVERITY = 0.5;

/**
 * Missing color scale. Applies only when color encodes a value (heatmaps), not when
 * color just tells categories apart (line/bar series).
 *   no scale                     -> severity 1
 *   scale, but lighter = more    -> severity 0.5
 *   scale, darker = more         -> severity 0
 */
export function checkColorScale(spec: ChartSpec): CheckResult {
  const base = {
    id: "color" as const,
    title: "Color scale missing",
    weight: WEIGHTS.color,
  };

  if (!colorEncodesValue(spec)) {
    return {
      ...base,
      applicable: false,
      issue: false,
      severity: 0,
      summary: "Color only separates categories here, so no scale is needed.",
      finding: "Color does not encode a value on this chart type.",
      why: "",
      fix: "",
    };
  }

  const { showLegend, colorMapping } = spec.settings;
  const reversed = colorMapping === "reversed";

  let severity = 0;
  let title = base.title;
  let summary = "Labeled scale with darker meaning more.";
  let finding = "The color scale is visible and darker cells mean higher values.";
  let why = "";
  if (!showLegend) {
    severity = 1;
    summary = "Color has no visible numerical meaning.";
    finding = reversed
      ? "There is no color legend, and lighter cells mean higher values."
      : "There is no color legend.";
    why = reversed
      ? "Viewers assume darker means more, so they read the best cells as the worst."
      : "Viewers cannot tell which shades are high or how far apart they are.";
  } else if (reversed) {
    severity = REVERSED_WITH_SCALE_SEVERITY;
    title = "Counterintuitive color mapping";
    summary = "Lighter cells represent higher values.";
    finding = "A legend is shown, but lighter cells mean higher values.";
    why = "Viewers who skip the legend default to darker means more and invert the ranking.";
  }

  return {
    ...base,
    title,
    applicable: true,
    issue: severity > 0,
    severity,
    summary,
    finding,
    why,
    fix: "Add a labeled gradient legend (Low → High) and make darker mean more.",
  };
}
