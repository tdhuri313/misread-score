import { checkColorScale } from "./colorScale";
import { checkDenseLayout } from "./denseLayout";
import { checkIndirectLabels } from "./indirectLabels";
import { checkTruncatedAxis } from "./truncatedAxis";
import type { Check, CheckId } from "./types";

export * from "./types";
export { checkColorScale, REVERSED_WITH_SCALE_SEVERITY } from "./colorScale";
export { checkDenseLayout, DENSITY_THRESHOLDS, denseSeverity } from "./denseLayout";
export { checkTruncatedAxis, LIE_FACTOR_CAP, truncatedSeverity } from "./truncatedAxis";
export { checkIndirectLabels } from "./indirectLabels";

/** Ordered by base weight: color, dense, truncated, indirect. */
export const ALL_CHECKS: Record<CheckId, Check> = {
  color: checkColorScale,
  dense: checkDenseLayout,
  truncated: checkTruncatedAxis,
  indirect: checkIndirectLabels,
};

export const CHECK_IDS: CheckId[] = ["color", "dense", "truncated", "indirect"];
