"use client";

import { useStore } from "@/app/providers";
import { formatLieFactor, lieFactor } from "@/lib/lieFactor";
import { takeaway } from "@/lib/takeaway";
import Chart from "./Chart";
import DataEditor from "./DataEditor";
import { IssueList, TakeawayCheck } from "./Diagnosis";
import InputPanel from "./InputPanel";
import { ScoreRing, Segmented } from "./ui";

export default function AnalyzeView() {
  const { selected, applyFix, fixAll, setView } = useStore();
  const { spec, shown, original, current, applied, view } = selected;
  const t = takeaway(shown);
  const lf = lieFactor(shown);
  const viewingFixed = view === "fixed";
  const allFixed = original.issues.length > 0 && original.issues.every((i) => applied.includes(i.id)) && viewingFixed;
  const callouts = current.issues.map((i) => i.id);

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_380px]">
      {/* Input */}
      <aside
        aria-label="Input and data"
        className="space-y-6 border-b border-line bg-surface p-5 lg:border-b-0 lg:border-r xl:max-h-[calc(100vh-72px)] xl:overflow-y-auto"
      >
        <InputPanel />
        <hr className="border-line" />
        <DataEditor />
      </aside>

      {/* Chart under review */}
      <section aria-labelledby="chart-name" className="min-w-0 px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Chart under review</p>
            <h1 id="chart-name" className="mt-2 text-2xl font-normal tracking-tight">
              {spec.name}
            </h1>
            {spec.illustrative && <p className="mt-1 text-xs text-muted">Illustrative data</p>}
          </div>
          <div className="border-line sm:border-l sm:pl-6">
            <ScoreRing score={current.score} label={current.label} />
          </div>
        </div>

        <figure className="mt-6 rounded-2xl border border-line bg-surface px-6 pb-6 pt-7 sm:px-8">
          <figcaption className="mb-4">
            <span className="block text-lg font-semibold">{shown.title}</span>
            {viewingFixed && t.match && <span className="mt-1 block text-sm text-muted">{t.dataSays}</span>}
          </figcaption>
          <Chart spec={shown} callouts={callouts} className="h-auto w-full" />
        </figure>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Chart version"
            value={view}
            onChange={(v) => setView(spec.id, v)}
            disabled={applied.length === 0 ? ["fixed"] : []}
            options={[
              { id: "original", label: "Original" },
              { id: "fixed", label: "Fixed" },
            ]}
          />
          {allFixed ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-low/80 px-6 py-3 text-[15px] font-semibold text-white">
              ✓ Fixes applied
            </span>
          ) : (
            <button
              type="button"
              onClick={() => fixAll(spec.id)}
              disabled={original.issues.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-faint"
            >
              <span aria-hidden="true">→</span> Fix all issues
            </button>
          )}
        </div>
        <p className="mt-5 text-center font-mono text-[13px] text-muted">
          Lie factor: <span className="font-semibold text-ink">{formatLieFactor(lf)}</span>
          {lf === null && <span className="ml-2 font-sans text-xs">(bar charts only)</span>}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-center text-xs leading-relaxed text-muted">
          Fixes are suggestions. A cut axis or a dense dashboard is sometimes intentional; the score flags likely
          misreadings, it does not predict them.
        </p>
      </section>

      {/* Diagnosis */}
      <aside
        aria-label="Diagnosis"
        className="space-y-6 border-t border-line bg-surface p-5 lg:col-span-2 xl:col-span-1 xl:max-h-[calc(100vh-72px)] xl:overflow-y-auto xl:border-l xl:border-t-0"
      >
        <h2 className="eyebrow">Diagnosis</h2>
        <TakeawayCheck t={t} />
        <hr className="border-line" />
        <IssueList
          key={spec.id}
          original={original}
          current={current}
          applied={applied}
          viewingFixed={viewingFixed}
          onApply={(id) => applyFix(spec.id, id)}
        />
      </aside>
    </div>
  );
}
