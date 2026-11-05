import { defaultPanels, type ChartSpec, type ChartType, type Panel } from "./chartSpec";

/**
 * Pure helpers for the data/settings editor. Each returns a new spec and keeps
 * categories, series values, and panels consistent with each other.
 */

const clone = (s: ChartSpec) => structuredClone(s);

/** Keep panels in sync with series: drop panels for missing series, add for new ones. */
function syncPanels(spec: ChartSpec): Panel[] {
  const kept = spec.settings.panels.filter((p) => p.seriesIndex < spec.series.length);
  const covered = new Set(kept.map((p) => p.seriesIndex));
  const added = defaultPanels(spec.series).filter((p) => !covered.has(p.seriesIndex));
  return [...kept, ...added];
}

export function setType(spec: ChartSpec, type: ChartType): ChartSpec {
  const next = clone(spec);
  next.type = type;
  if (type === "multipanel") next.settings.panels = syncPanels(next);
  return next;
}

export function setCategory(spec: ChartSpec, row: number, name: string): ChartSpec {
  const next = clone(spec);
  next.categories[row] = name;
  return next;
}

export function setValue(spec: ChartSpec, seriesIndex: number, row: number, value: number): ChartSpec {
  const next = clone(spec);
  next.series[seriesIndex].values[row] = value;
  return next;
}

export function addRow(spec: ChartSpec): ChartSpec {
  const next = clone(spec);
  next.categories.push(`Row ${next.categories.length + 1}`);
  next.series.forEach((s) => s.values.push(s.values[s.values.length - 1] ?? 0));
  return next;
}

export function removeRow(spec: ChartSpec, row: number): ChartSpec {
  if (spec.categories.length <= 1) return spec;
  const next = clone(spec);
  next.categories.splice(row, 1);
  next.series.forEach((s) => s.values.splice(row, 1));
  return next;
}

export function renameSeries(spec: ChartSpec, index: number, name: string): ChartSpec {
  const next = clone(spec);
  const old = next.series[index].name;
  next.series[index].name = name;
  next.settings.panels = next.settings.panels.map((p) =>
    p.seriesIndex === index && p.title === old ? { ...p, title: name } : p,
  );
  return next;
}

export function addSeries(spec: ChartSpec): ChartSpec {
  const next = clone(spec);
  next.series.push({ name: `Series ${next.series.length + 1}`, values: next.categories.map(() => 0) });
  if (next.type === "multipanel") next.settings.panels = syncPanels(next);
  return next;
}

export function removeSeries(spec: ChartSpec, index: number): ChartSpec {
  if (spec.series.length <= 1) return spec;
  const next = clone(spec);
  next.series.splice(index, 1);
  next.settings.panels = next.settings.panels
    .filter((p) => p.seriesIndex !== index)
    .map((p) => (p.seriesIndex > index ? { ...p, seriesIndex: p.seriesIndex - 1 } : p));
  if (next.type === "multipanel") next.settings.panels = syncPanels(next);
  return next;
}

export function updateSettings(spec: ChartSpec, patch: Partial<ChartSpec["settings"]>): ChartSpec {
  const next = clone(spec);
  next.settings = { ...next.settings, ...patch };
  return next;
}

/** Make panel `index` primary, or clear the primary when index is null. */
export function setPrimaryPanel(spec: ChartSpec, index: number | null): ChartSpec {
  const next = clone(spec);
  next.settings.panels = next.settings.panels.map((p, i) => ({ ...p, primary: i === index }));
  return next;
}
