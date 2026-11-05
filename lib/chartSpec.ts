/**
 * ChartSpec: the single typed description of a chart's data and formatting.
 * Every check, fix, and the renderer read from this one shape.
 */

export type ChartType = "bar" | "heatmap" | "line" | "multipanel";

export const CHART_TYPES: ChartType[] = ["bar", "heatmap", "line", "multipanel"];

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar chart",
  heatmap: "Heatmap",
  line: "Multi-line",
  multipanel: "Multi-panel",
};

export interface Series {
  name: string;
  values: number[];
}

export interface Panel {
  title: string;
  /** Index into `series` that this panel plots. */
  seriesIndex: number;
  /** A primary panel is drawn larger so one comparison leads the view. */
  primary?: boolean;
}

/**
 * How a heatmap maps values to lightness.
 * - conventional: darker means more
 * - reversed: lighter means more
 */
export type ColorMapping = "conventional" | "reversed";

export interface ChartSettings {
  /** Where the value axis starts. 0 means a zero baseline. */
  axisStart: number;
  /** Bars/lines: a series legend. Heatmaps: the color scale. */
  showLegend: boolean;
  /** Values (bars, heatmap cells) or series names (lines) printed on the marks. */
  directLabels: boolean;
  /** Heatmap only. */
  colorMapping: ColorMapping;
  /** Multi-panel only. */
  panels: Panel[];
}

export type SpecSource = "sample" | "csv" | "pasted";

export interface ChartSpec {
  id: string;
  /** Short name shown in lists. */
  name: string;
  /** Title drawn on the chart itself. */
  title: string;
  subtitle?: string;
  type: ChartType;
  /** x categories (bars, line points, heatmap columns). */
  categories: string[];
  /** One entry per bar series, line, heatmap row, or panel metric. */
  series: Series[];
  unit?: string;
  settings: ChartSettings;
  /** True for made-up demonstration data; the UI says so. */
  illustrative: boolean;
  source: SpecSource;
}

/** Color encodes a value only on heatmaps; on lines/bars it just tells series apart. */
export function colorEncodesValue(spec: ChartSpec): boolean {
  return spec.type === "heatmap";
}

/** Number of separate panels a viewer has to scan. */
export function panelCount(spec: ChartSpec): number {
  return spec.type === "multipanel" ? Math.max(1, spec.settings.panels.length) : 1;
}

/** Default panels: one per series. */
export function defaultPanels(series: Series[]): Panel[] {
  return series.map((s, i) => ({ title: s.name, seriesIndex: i }));
}

export const DEFAULT_SETTINGS: ChartSettings = {
  axisStart: 0,
  showLegend: false,
  directLabels: true,
  colorMapping: "conventional",
  panels: [],
};

export type ValidationResult =
  | { ok: true; spec: ChartSpec }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate untrusted JSON (the Paste spec tab) into a ChartSpec.
 * Missing settings fall back to DEFAULT_SETTINGS; anything structurally wrong is an error.
 */
export function validateSpec(input: unknown): ValidationResult {
  if (!isObject(input)) return { ok: false, error: "Spec must be a JSON object." };

  const type = input.type;
  if (typeof type !== "string" || !CHART_TYPES.includes(type as ChartType)) {
    return { ok: false, error: `"type" must be one of: ${CHART_TYPES.join(", ")}.` };
  }

  const categories = input.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    return { ok: false, error: '"categories" must be a non-empty array of strings.' };
  }
  if (!categories.every((c) => typeof c === "string")) {
    return { ok: false, error: '"categories" must contain only strings.' };
  }

  const series = input.series;
  if (!Array.isArray(series) || series.length === 0) {
    return { ok: false, error: '"series" must be a non-empty array.' };
  }
  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    if (!isObject(s) || typeof s.name !== "string") {
      return { ok: false, error: `series[${i}] needs a "name" string.` };
    }
    if (!Array.isArray(s.values) || !s.values.every((v) => typeof v === "number" && Number.isFinite(v))) {
      return { ok: false, error: `series[${i}].values must be an array of finite numbers.` };
    }
    if (s.values.length !== categories.length) {
      return {
        ok: false,
        error: `series[${i}] ("${s.name}") has ${s.values.length} values but there are ${categories.length} categories.`,
      };
    }
  }

  const rawSettings = input.settings === undefined ? {} : input.settings;
  if (!isObject(rawSettings)) return { ok: false, error: '"settings" must be an object.' };

  const settings: ChartSettings = { ...DEFAULT_SETTINGS, panels: [] };
  if (rawSettings.axisStart !== undefined) {
    if (typeof rawSettings.axisStart !== "number" || !Number.isFinite(rawSettings.axisStart)) {
      return { ok: false, error: '"settings.axisStart" must be a number.' };
    }
    settings.axisStart = rawSettings.axisStart;
  }
  for (const key of ["showLegend", "directLabels"] as const) {
    if (rawSettings[key] !== undefined) {
      if (typeof rawSettings[key] !== "boolean") {
        return { ok: false, error: `"settings.${key}" must be true or false.` };
      }
      settings[key] = rawSettings[key] as boolean;
    }
  }
  if (rawSettings.colorMapping !== undefined) {
    if (rawSettings.colorMapping !== "conventional" && rawSettings.colorMapping !== "reversed") {
      return { ok: false, error: '"settings.colorMapping" must be "conventional" or "reversed".' };
    }
    settings.colorMapping = rawSettings.colorMapping;
  }
  if (rawSettings.panels !== undefined) {
    if (!Array.isArray(rawSettings.panels)) {
      return { ok: false, error: '"settings.panels" must be an array.' };
    }
    for (let i = 0; i < rawSettings.panels.length; i++) {
      const p = rawSettings.panels[i];
      if (
        !isObject(p) ||
        typeof p.title !== "string" ||
        typeof p.seriesIndex !== "number" ||
        !Number.isInteger(p.seriesIndex) ||
        p.seriesIndex < 0 ||
        p.seriesIndex >= series.length
      ) {
        return {
          ok: false,
          error: `settings.panels[${i}] needs a "title" and a "seriesIndex" between 0 and ${series.length - 1}.`,
        };
      }
      settings.panels.push({ title: p.title, seriesIndex: p.seriesIndex, primary: p.primary === true });
    }
  }

  const typedSeries = (series as { name: string; values: number[] }[]).map((s) => ({
    name: s.name,
    values: [...s.values],
  }));
  if (type === "multipanel" && settings.panels.length === 0) {
    settings.panels = defaultPanels(typedSeries);
  }

  const title = typeof input.title === "string" && input.title.trim() ? input.title : "Untitled chart";
  return {
    ok: true,
    spec: {
      id: typeof input.id === "string" && input.id ? input.id : `pasted-${Date.now()}`,
      name: typeof input.name === "string" && input.name ? input.name : title,
      title,
      subtitle: typeof input.subtitle === "string" ? input.subtitle : undefined,
      type: type as ChartType,
      categories: [...(categories as string[])],
      series: typedSeries,
      unit: typeof input.unit === "string" ? input.unit : undefined,
      settings,
      illustrative: input.illustrative === true,
      source: "pasted",
    },
  };
}
