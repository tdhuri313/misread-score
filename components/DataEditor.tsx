"use client";

import { useId, useState } from "react";
import { useStore } from "@/app/providers";
import { CHART_TYPES, CHART_TYPE_LABELS, type ChartSpec, type ChartType } from "@/lib/chartSpec";
import {
  addRow,
  addSeries,
  removeRow,
  removeSeries,
  renameSeries,
  setCategory,
  setPrimaryPanel,
  setType,
  setValue,
  updateSettings,
} from "@/lib/edit";

const cellInput =
  "min-w-0 rounded border border-transparent bg-transparent px-1 py-1 font-mono text-xs hover:border-line focus:border-primary focus:bg-surface";

/** Editable data table and settings. Every change re-scores and re-renders live. */
export default function DataEditor() {
  const { selected, edit } = useStore();
  const spec = selected.spec;
  const change = (next: ChartSpec) => edit(spec.id, next);
  const id = useId();

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${id}-data`}>
        <div className="mb-2 flex items-center justify-between">
          <h2 id={`${id}-data`} className="eyebrow">
            Data
          </h2>
          {spec.illustrative && (
            <span className="rounded bg-medium-tint px-1.5 py-0.5 text-[10px] font-medium text-medium-ink">Illustrative</span>
          )}
        </div>
        <DataTable spec={spec} change={change} />
        <div className="mt-2 flex gap-3 text-xs">
          <button type="button" onClick={() => change(addRow(spec))} className="font-medium text-primary hover:underline">
            {spec.type === "heatmap" ? "+ Column" : "+ Row"}
          </button>
          <button type="button" onClick={() => change(addSeries(spec))} className="font-medium text-primary hover:underline">
            {spec.type === "heatmap" ? "+ Row" : "+ Series"}
          </button>
        </div>
      </section>

      <section aria-labelledby={`${id}-settings`} className="space-y-3 text-[13px]">
        <h2 id={`${id}-settings`} className="eyebrow">
          Settings
        </h2>
        <label className="flex items-center justify-between gap-3">
          <span>Chart type</span>
          <select
            value={spec.type}
            onChange={(e) => change(setType(spec, e.target.value as ChartType))}
            className="rounded-md border border-line bg-surface px-2 py-1.5 text-[13px]"
          >
            {CHART_TYPES.map((t) => (
              <option key={t} value={t}>
                {CHART_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {(spec.type === "bar" || spec.type === "line") && (
          <label className="flex items-center justify-between gap-3">
            <span>Axis starts at</span>
            <NumberInput
              value={spec.settings.axisStart}
              onCommit={(n) => change(updateSettings(spec, { axisStart: n }))}
              className="w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-right font-mono text-xs"
            />
          </label>
        )}
        <Toggle
          label={spec.type === "heatmap" ? "Color scale (legend)" : "Legend"}
          checked={spec.settings.showLegend}
          onChange={(v) => change(updateSettings(spec, { showLegend: v }))}
        />
        <Toggle
          label={spec.type === "line" || spec.type === "multipanel" ? "Direct line labels" : "Direct value labels"}
          checked={spec.settings.directLabels}
          onChange={(v) => change(updateSettings(spec, { directLabels: v }))}
        />
        {spec.type === "heatmap" && (
          <label className="flex items-center justify-between gap-3">
            <span>Color mapping</span>
            <select
              value={spec.settings.colorMapping}
              onChange={(e) =>
                change(updateSettings(spec, { colorMapping: e.target.value as ChartSpec["settings"]["colorMapping"] }))
              }
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-[13px]"
            >
              <option value="conventional">Darker = more</option>
              <option value="reversed">Lighter = more</option>
            </select>
          </label>
        )}
        {spec.type === "multipanel" && (
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5">Primary panel</legend>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name={`${id}-primary`}
                checked={!spec.settings.panels.some((p) => p.primary)}
                onChange={() => change(setPrimaryPanel(spec, null))}
                className="accent-primary"
              />
              None (all panels equal)
            </label>
            {spec.settings.panels.map((p, i) => (
              <label key={i} className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name={`${id}-primary`}
                  checked={!!p.primary}
                  onChange={() => change(setPrimaryPanel(spec, i))}
                  className="accent-primary"
                />
                {p.title}
              </label>
            ))}
          </fieldset>
        )}
      </section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>{label}</span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/**
 * Number field that lets you type freely ("-", "", "5.") and commits only valid numbers,
 * so the chart never sees a half-typed value.
 */
function NumberInput({
  value,
  onCommit,
  className,
  label,
}: {
  value: number;
  onCommit: (n: number) => void;
  className: string;
  label?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onCommit(n);
      }}
      onBlur={() => setDraft(null)}
      aria-invalid={draft !== null && (draft.trim() === "" || !Number.isFinite(Number(draft))) ? true : undefined}
      className={className}
    />
  );
}

interface Axis {
  name: string;
  label: string;
  rename: (name: string) => void;
  remove?: () => void;
}

/**
 * Editable data grid. Bars and lines put categories in rows and series in columns;
 * heatmaps are transposed so the table reads like the chart (series as rows).
 */
function DataTable({ spec, change }: { spec: ChartSpec; change: (s: ChartSpec) => void }) {
  const cats: Axis[] = spec.categories.map((c, i) => ({
    name: c,
    label: `Category ${i + 1}`,
    rename: (n) => change(setCategory(spec, i, n)),
    remove: spec.categories.length > 1 ? () => change(removeRow(spec, i)) : undefined,
  }));
  const series: Axis[] = spec.series.map((s, i) => ({
    name: s.name,
    label: `Series ${i + 1}`,
    rename: (n) => change(renameSeries(spec, i, n)),
    remove: spec.series.length > 1 ? () => change(removeSeries(spec, i)) : undefined,
  }));
  const transposed = spec.type === "heatmap";
  const rows = transposed ? series : cats;
  const cols = transposed ? cats : series;
  const cell = (r: number, c: number) => (transposed ? { si: r, ci: c } : { si: c, ci: r });

  const removeBtn = (a: Axis) =>
    a.remove && (
      <button type="button" aria-label={`Remove ${a.name}`} onClick={a.remove} className="px-0.5 text-faint hover:text-high">
        ×
      </button>
    );

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full text-xs">
        <caption className="sr-only">Editable data for {spec.name}</caption>
        <thead>
          <tr className="border-b border-line text-muted">
            <td className="min-w-14" />
            {cols.map((a, i) => (
              <th key={i} scope="col" className="px-0.5 py-1 font-normal">
                <div className="flex min-w-11 items-center">
                  <input
                    aria-label={`${a.label} name`}
                    value={a.name}
                    onChange={(e) => a.rename(e.target.value)}
                    className={`${cellInput} w-full text-right font-sans text-muted`}
                  />
                  {removeBtn(a)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line">
              <th scope="row" className="min-w-14 py-0.5 pr-1 text-left font-normal">
                <div className="flex items-center">
                  <input
                    aria-label={`${r.label} name`}
                    value={r.name}
                    onChange={(e) => r.rename(e.target.value)}
                    className={`${cellInput} w-12 font-semibold`}
                  />
                  {removeBtn(r)}
                </div>
              </th>
              {cols.map((c, ci) => {
                const { si, ci: k } = cell(ri, ci);
                return (
                  <td key={ci} className="px-0.5 py-0.5">
                    <NumberInput
                      label={`${spec.series[si].name}, ${spec.categories[k]}`}
                      value={spec.series[si].values[k]}
                      onCommit={(n) => change(setValue(spec, si, k, n))}
                      className={`${cellInput} w-full min-w-11 text-right`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
