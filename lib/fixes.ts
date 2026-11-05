import type { ChartSpec } from "./chartSpec";
import { CHECK_IDS, type CheckId } from "./checks";

/**
 * Fixes are pure: each takes a ChartSpec and returns a new, corrected ChartSpec.
 * They are suggestions. A truncated axis, for example, is sometimes intentional.
 */
export type Fix = (spec: ChartSpec) => ChartSpec;

function clone(spec: ChartSpec): ChartSpec {
  return structuredClone(spec);
}

/** Start the value axis at zero. */
export const fixTruncatedAxis: Fix = (spec) => {
  const next = clone(spec);
  next.settings.axisStart = 0;
  return next;
};

/** Show a labeled scale and use the conventional mapping (darker = more). Heatmaps only. */
export const fixColorScale: Fix = (spec) => {
  if (spec.type !== "heatmap") return spec;
  const next = clone(spec);
  next.settings.showLegend = true;
  next.settings.colorMapping = "conventional";
  return next;
};

/** Label marks directly. On line charts the end labels replace the legend. */
export const fixIndirectLabels: Fix = (spec) => {
  const next = clone(spec);
  next.settings.directLabels = true;
  if (spec.type === "line") next.settings.showLegend = false;
  return next;
};

/** Relative range of a series: (max - min) / |mean|. Used to pick the panel that moves most. */
function relativeRange(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  return (Math.max(...values) - Math.min(...values)) / Math.abs(mean);
}

/**
 * Make one panel primary. Keeps an existing primary; otherwise picks the panel whose
 * metric changes the most, since that is most likely the main story.
 */
export const fixDenseLayout: Fix = (spec) => {
  if (spec.type !== "multipanel" || spec.settings.panels.length < 2) return spec;
  if (spec.settings.panels.some((p) => p.primary)) return spec;
  const next = clone(spec);
  let best = 0;
  let bestRange = -Infinity;
  next.settings.panels.forEach((p, i) => {
    const r = relativeRange(next.series[p.seriesIndex]?.values ?? []);
    if (r > bestRange) {
      bestRange = r;
      best = i;
    }
  });
  next.settings.panels = next.settings.panels.map((p, i) => ({ ...p, primary: i === best }));
  return next;
};

export const FIXES: Record<CheckId, Fix> = {
  color: fixColorScale,
  dense: fixDenseLayout,
  truncated: fixTruncatedAxis,
  indirect: fixIndirectLabels,
};

/** Apply a set of fixes in a fixed order, so the result doesn't depend on click order. */
export function applyFixes(spec: ChartSpec, ids: Iterable<CheckId>): ChartSpec {
  const wanted = new Set(ids);
  return CHECK_IDS.filter((id) => wanted.has(id)).reduce((s, id) => FIXES[id](s), spec);
}

export function fixAll(spec: ChartSpec): ChartSpec {
  return applyFixes(spec, CHECK_IDS);
}
