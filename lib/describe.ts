import { CHART_TYPE_LABELS, type ChartSpec } from "./chartSpec";

/** Plain-text description of a chart for the SVG <desc> (screen readers). */
export function describeChart(spec: ChartSpec): string {
  const unit = spec.unit ?? "";
  const kind = CHART_TYPE_LABELS[spec.type];
  const series = spec.series
    .map((s) => `${s.name}: ${s.values.map((v, i) => `${spec.categories[i]} ${v}${unit}`).join(", ")}`)
    .join(". ");
  const notes: string[] = [];
  if (spec.type === "bar" && spec.settings.axisStart !== 0) notes.push(`Axis starts at ${spec.settings.axisStart}.`);
  if (spec.type === "heatmap") {
    notes.push(spec.settings.showLegend ? "A color scale is shown." : "No color scale is shown.");
    notes.push(spec.settings.colorMapping === "reversed" ? "Lighter means more." : "Darker means more.");
  }
  if (spec.type === "multipanel") {
    const primary = spec.settings.panels.find((p) => p.primary);
    notes.push(`${spec.settings.panels.length} panels${primary ? `, ${primary.title} is primary` : ", all equal size"}.`);
  }
  return `${kind}. ${series}. ${notes.join(" ")}`.trim();
}
