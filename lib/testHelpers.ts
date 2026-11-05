import type { ChartSpec } from "./chartSpec";

/** A bar chart with no formatting issues: zero baseline, direct labels, single panel. */
export function cleanBar(overrides: Partial<ChartSpec["settings"]> = {}): ChartSpec {
  return {
    id: "clean",
    name: "Clean",
    title: "Clean bar",
    type: "bar",
    categories: ["A", "B"],
    series: [{ name: "Revenue", values: [52, 56] }],
    settings: {
      axisStart: 0,
      showLegend: false,
      directLabels: true,
      colorMapping: "conventional",
      panels: [],
      ...overrides,
    },
    illustrative: false,
    source: "sample",
  };
}
