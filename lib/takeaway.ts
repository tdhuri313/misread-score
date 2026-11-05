import type { ChartSpec } from "./chartSpec";
import type { CheckId } from "./checks";
import { scoreChart } from "./score";

/**
 * Rule-based takeaways. No model or simulation: every sentence comes from a fixed rule
 * that maps an issue to the misreading it most likely causes.
 */

export interface Takeaway {
  /** What the data actually supports. */
  dataSays: string;
  /** The likely first reading, given the chart's top issue. */
  viewerSees: string;
  /** Do the two agree? */
  match: boolean;
  /** Which rule produced `viewerSees`, in plain words. */
  basis: string;
}

interface Misreading {
  viewerSees: string;
  changesTakeaway: boolean;
  basis: string;
}

const fmt = (v: number, unit = "") => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;

function ratioWords(r: number): string {
  if (!Number.isFinite(r)) return "many times";
  const rounded = Math.round(r * 2) / 2; // nearest half
  const words: Record<number, string> = { 2: "twice", 3: "three times", 4: "four times", 5: "five times" };
  return words[rounded] ?? `about ${rounded}×`;
}

// ---------- What the data says ----------

function barExtremes(spec: ChartSpec) {
  const values = spec.series[0]?.values ?? [];
  let maxI = 0;
  let minI = 0;
  values.forEach((v, i) => {
    if (v > values[maxI]) maxI = i;
    if (v < values[minI]) minI = i;
  });
  return { values, maxI, minI, max: values[maxI], min: values[minI] };
}

function heatmapExtremes(spec: ChartSpec) {
  let max = { row: 0, col: 0, v: -Infinity };
  let min = { row: 0, col: 0, v: Infinity };
  spec.series.forEach((s, row) =>
    s.values.forEach((v, col) => {
      if (v > max.v) max = { row, col, v };
      if (v < min.v) min = { row, col, v };
    }),
  );
  return { max, min };
}

function lineRanking(spec: ChartSpec) {
  return spec.series
    .map((s) => ({ name: s.name, last: s.values[s.values.length - 1] ?? 0 }))
    .sort((a, b) => b.last - a.last);
}

/** Panel whose metric moves the most relative to its mean. */
function biggestMover(spec: ChartSpec) {
  let best = { index: 0, range: -Infinity };
  spec.settings.panels.forEach((p, i) => {
    const vals = spec.series[p.seriesIndex]?.values ?? [];
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const range = mean ? (Math.max(...vals) - Math.min(...vals)) / Math.abs(mean) : 0;
    if (range > best.range) best = { index: i, range };
  });
  return best.index;
}

export function dataSays(spec: ChartSpec): string {
  const unit = spec.unit ?? "";
  switch (spec.type) {
    case "bar": {
      const { values, maxI, minI, max, min } = barExtremes(spec);
      if (values.length < 2) return "There is only one value to read.";
      if (max === min) return "All bars have the same value.";
      if (min <= 0) return `${spec.categories[maxI]} is the highest value (${fmt(max, unit)}).`;
      const pct = Math.round(((max - min) / min) * 100);
      return `${spec.categories[maxI]} is about ${pct}% higher than ${spec.categories[minI]}.`;
    }
    case "heatmap": {
      const { max } = heatmapExtremes(spec);
      return `${spec.series[max.row]?.name} in ${spec.categories[max.col]} is the highest value (${fmt(max.v, unit)}).`;
    }
    case "line": {
      const ranked = lineRanking(spec);
      if (ranked.length === 1) {
        const s = spec.series[0];
        return `${s.name} goes from ${fmt(s.values[0], unit)} to ${fmt(s.values[s.values.length - 1], unit)}.`;
      }
      return `${ranked[0].name} ends highest (${fmt(ranked[0].last, unit)}), ahead of ${ranked[1].name} (${fmt(ranked[1].last, unit)}).`;
    }
    case "multipanel": {
      const panels = spec.settings.panels;
      if (panels.length === 0) return "There are no panels to read.";
      const p = panels[biggestMover(spec)];
      const vals = spec.series[p.seriesIndex]?.values ?? [];
      const peak = vals.indexOf(Math.max(...vals));
      return `${p.title} moves the most, peaking at ${spec.categories[peak]}.`;
    }
  }
}

// ---------- Rules: issue -> likely misreading ----------

function misread(id: CheckId, spec: ChartSpec): Misreading | null {
  const { settings } = spec;
  switch (id) {
    case "truncated": {
      if (spec.type !== "bar") return null;
      const { maxI, minI, max, min } = barExtremes(spec);
      const start = settings.axisStart;
      const ratio = min - start > 0 ? (max - start) / (min - start) : Infinity;
      return {
        viewerSees: `${spec.categories[maxI]} looks ${ratioWords(ratio)} as big as ${spec.categories[minI]}.`,
        changesTakeaway: true,
        basis: "Truncated axis: viewers compare bar lengths, which are measured from the cut baseline.",
      };
    }
    case "color": {
      if (spec.type !== "heatmap") return null;
      const { max } = heatmapExtremes(spec);
      const cell = `${spec.series[max.row]?.name} in ${spec.categories[max.col]}`;
      if (settings.colorMapping === "reversed") {
        return {
          viewerSees: settings.showLegend
            ? `${cell} may look like the lowest value.`
            : `${cell} looks like the lowest value.`,
          changesTakeaway: true,
          basis: "Reversed color: viewers assume darker means more, so the lightest (highest) cell reads as the worst.",
        };
      }
      return {
        viewerSees: `${cell} looks highest, but its value can't be read.`,
        changesTakeaway: false,
        basis: "No color scale: the ranking survives, but the size of differences is a guess.",
      };
    }
    case "indirect": {
      if (spec.type === "line" && spec.series.length >= 2) {
        const ranked = lineRanking(spec);
        if (!settings.showLegend) {
          return {
            viewerSees: "The lines can't be told apart.",
            changesTakeaway: true,
            basis: "No legend or labels: nothing ties each line to a series.",
          };
        }
        return {
          viewerSees: `${ranked[1].name} ends highest.`,
          changesTakeaway: true,
          basis: "Legend lookup: matching colors through a legend is where series get swapped.",
        };
      }
      return {
        viewerSees: dataSays(spec).replace(/ \(.*?\)/, "").replace(/about \d+% higher/, "higher"),
        changesTakeaway: false,
        basis: "Unlabeled values: the direction reads correctly, but exact values are estimated.",
      };
    }
    case "dense": {
      if (spec.type !== "multipanel" || spec.settings.panels.length < 2) return null;
      if (spec.settings.panels.some((p) => p.primary)) {
        return {
          viewerSees: dataSays(spec),
          changesTakeaway: false,
          basis: "Dense layout with a primary panel: the main comparison leads, though other panels still compete.",
        };
      }
      const [a, b] = spec.settings.panels;
      return {
        viewerSees: `${a.title} and ${b.title} look like the main comparison.`,
        changesTakeaway: true,
        basis: "Equal panels: viewers compare whichever panels sit side by side.",
      };
    }
  }
}

export function takeaway(spec: ChartSpec): Takeaway {
  const truth = dataSays(spec);
  const { issues } = scoreChart(spec);
  const readings = issues
    .map((i) => misread(i.id, spec))
    .filter((m): m is Misreading => m !== null);

  const decisive = readings.find((m) => m.changesTakeaway);
  if (decisive) {
    return { dataSays: truth, viewerSees: decisive.viewerSees, match: false, basis: decisive.basis };
  }
  if (readings.length > 0) {
    return { dataSays: truth, viewerSees: readings[0].viewerSees, match: true, basis: readings[0].basis };
  }
  return {
    dataSays: truth,
    viewerSees: truth,
    match: true,
    basis: "No issues found: the chart supports its intended reading.",
  };
}
