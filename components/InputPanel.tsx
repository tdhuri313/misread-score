"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { useStore } from "@/app/providers";
import { CHART_TYPE_LABELS, validateSpec } from "@/lib/chartSpec";
import { parseCsv } from "@/lib/csv";
import Chart from "./Chart";
import { ScorePill, Tabs } from "./ui";

type Tab = "samples" | "paste" | "csv";

export default function InputPanel() {
  const [tab, setTab] = useState<Tab>("samples");
  return (
    <div>
      <h2 className="eyebrow mb-3">Input</h2>
      <Tabs
        label="Chart input"
        idPrefix="input"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "samples", label: "Samples" },
          { id: "paste", label: "Paste spec" },
          { id: "csv", label: "Upload CSV" },
        ]}
      />
      <div role="tabpanel" id={`input-panel-${tab}`} aria-labelledby={`input-tab-${tab}`} className="mt-4">
        {tab === "samples" && <ChartList />}
        {tab === "paste" && <PasteSpec onDone={() => setTab("samples")} />}
        {tab === "csv" && <CsvUpload onDone={() => setTab("samples")} />}
      </div>
    </div>
  );
}

export function ChartList() {
  const { entries, selected, select } = useStore();
  const samples = entries.filter((e) => e.spec.source === "sample");
  const uploads = entries.filter((e) => e.spec.source !== "sample");
  const renderList = (list: typeof entries) => (
    <ul className="space-y-2.5">
      {list.map((e) => {
        const active = e.spec.id === selected.spec.id;
        return (
          <li key={e.spec.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => select(e.spec.id)}
              className={`flex w-full items-center gap-3 rounded-xl border bg-surface p-2.5 text-left transition-colors ${
                active ? "border-primary ring-1 ring-primary" : "border-line hover:border-faint"
              }`}
            >
              <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-md bg-subtle p-1">
                <Chart spec={e.shown} mini className="h-full w-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{e.spec.name}</span>
                <span className="block text-xs text-muted">{CHART_TYPE_LABELS[e.spec.type]}</span>
              </span>
              <ScorePill score={e.current.score} label={e.current.label} />
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className="space-y-4">
      {renderList(samples)}
      <p className="text-[11px] text-muted">Sample values are illustrative.</p>
      {uploads.length > 0 && (
        <div>
          <h3 className="eyebrow mb-2">Your charts</h3>
          {renderList(uploads)}
        </div>
      )}
    </div>
  );
}

function PasteSpec({ onDone }: { onDone: () => void }) {
  const { selected, add } = useStore();
  const [text, setText] = useState(() => JSON.stringify({ ...selected.spec, id: undefined, source: undefined }, null, 2));
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const submit = () => {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      setError(`Not valid JSON: ${(e as Error).message}`);
      return;
    }
    const r = validateSpec(json);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    add(r.spec);
    onDone();
  };

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-xs text-muted">
        A ChartSpec as JSON. Prefilled with the current chart.
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="h-72 w-full resize-y rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed"
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="rounded-md bg-high-tint px-3 py-2 text-xs text-high">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        Analyze spec
      </button>
    </div>
  );
}

export function CsvUpload({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const { add } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const id = useId();

  const read = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError(`"${file.name}" is not a .csv file.`);
      return;
    }
    const r = parseCsv(await file.text(), file.name);
    if (!r.ok) {
      setError(`${file.name}: ${r.error}`);
      return;
    }
    setError(null);
    add(r.spec);
    onDone?.();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void read(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors focus-within:outline-2 focus-within:outline-primary ${
          compact ? "px-4 py-3" : "h-48 px-4"
        } ${over ? "border-primary bg-primary-tint" : "border-faint bg-surface hover:border-primary"}`}
      >
        <svg viewBox="0 0 24 24" className="mb-2 h-5 w-5 text-ink" aria-hidden="true">
          <path d="M12 16V4m0 0l-5 5m5-5l5 5M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[13px] font-semibold">Choose or drop a CSV</span>
        {!compact && <span className="mt-1 text-xs text-muted">Header row, categories in column 1</span>}
        <input
          id={id}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            void read(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-high-tint px-3 py-2 text-xs text-high">
          {error}
        </p>
      )}
      {!compact && (
        <div className="text-xs text-muted">
          <p className="mb-1">Example:</p>
          <pre className="rounded-md bg-subtle p-2 font-mono text-[11px] text-ink">
            {"Product,Revenue\nA,52\nB,56"}
          </pre>
          <p className="mt-2">One series becomes a bar chart; several become a multi-line chart. You can change the type below.</p>
        </div>
      )}
    </div>
  );
}
