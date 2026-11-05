"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, type EntryState } from "@/app/providers";
import { batchStats } from "@/lib/score";
import Chart from "./Chart";
import { CsvUpload } from "./InputPanel";
import { ScorePill } from "./ui";

type Sort = "none" | "desc" | "asc";

function status(e: EntryState): { text: string; dot: string } {
  if (e.view === "fixed" && e.applied.length > 0) return { text: "Fixed", dot: "bg-low" };
  if (e.current.label === "Low") return { text: "Passed", dot: "bg-low" };
  return { text: "Needs fix", dot: "bg-medium" };
}

export default function BatchView() {
  const { entries, select, fixAllHighRisk } = useStore();
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("none");
  const [message, setMessage] = useState("");

  const stats = batchStats(entries.map((e) => ({ spec: e.spec, result: e.current })));
  const rows =
    sort === "none"
      ? entries
      : [...entries].sort((a, b) =>
          sort === "desc" ? b.current.score - a.current.score : a.current.score - b.current.score,
        );
  const highRemaining = entries.filter((e) => e.original.label === "High" && !(e.view === "fixed" && e.applied.length));

  const cards = [
    {
      label: "Charts scanned",
      value: stats.count,
      note: `${stats.samples} sample${stats.samples === 1 ? "" : "s"} · ${stats.uploaded} uploaded`,
      cls: "text-ink",
    },
    { label: "High risk", value: stats.high, note: "Score 60 or more", cls: "text-high" },
    { label: "Medium", value: stats.medium, note: "Score 35–59", cls: "text-medium-ink" },
    { label: "Avg score", value: stats.average ?? "—", note: "Mean of current scores", cls: "text-ink" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1316px] px-4 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Batch review</p>
          <h1 className="mt-4 text-4xl font-normal tracking-tight sm:text-[42px]">Batch analysis</h1>
          <p className="mt-4 text-[15px] text-muted">
            Every chart in this session, scored with the same four checks. Sample values are illustrative.
          </p>
        </div>
        <button
          type="button"
          disabled={highRemaining.length === 0}
          onClick={() => {
            const n = fixAllHighRisk();
            setMessage(`Applied suggested fixes to ${n} high-risk chart${n === 1 ? "" : "s"}.`);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-faint"
        >
          <span aria-hidden="true">→</span> Fix all high-risk
        </button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-right text-xs text-low-ink">
        {message}
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Batch summary">
        {cards.map((c) => (
          <li key={c.label} className="rounded-xl border border-line bg-surface px-5 py-5">
            <p className="text-[13px] font-medium text-muted">{c.label}</p>
            <p className={`mt-3 text-3xl font-normal tabular-nums ${c.cls}`}>{c.value}</p>
            <p className="mt-3 text-[11px] text-muted">{c.note}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="run-h" className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 id="run-h" className="text-[15px] font-medium">
              Charts in this session
            </h2>
            <p className="mt-1 text-[11px] text-muted">Scored live in your browser</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-56">
              <CsvUpload compact />
            </div>
            <button
              type="button"
              onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
              className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[15px] text-muted hover:text-ink"
            >
              <span aria-hidden="true">↕</span>
              Sort by score
              <span className="sr-only">
                {sort === "desc" ? ", currently highest first" : sort === "asc" ? ", currently lowest first" : ""}
              </span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead className="border-y border-line bg-bg/60">
              <tr className="text-left">
                {["Thumbnail", "Chart name", "Source", "Score", "Top issue", "Status"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    aria-sort={h === "Score" && sort !== "none" ? (sort === "desc" ? "descending" : "ascending") : undefined}
                    className="eyebrow px-4 py-3 !text-[10px] font-semibold"
                  >
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const st = status(e);
                const top = e.current.issues[0];
                const changed = e.current.score !== e.original.score;
                return (
                  <tr key={e.spec.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex h-10 w-14 items-center justify-center rounded-md bg-subtle p-1">
                        <Chart spec={e.shown} mini className="h-full w-full" />
                      </span>
                    </td>
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      {e.spec.name}
                    </th>
                    <td className="px-4 py-3 text-muted">
                      {e.spec.source === "sample" ? "Sample · illustrative" : e.spec.source === "csv" ? "CSV upload" : "Pasted spec"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {changed && (
                          <>
                            <span className="font-mono text-xs text-faint line-through">{e.original.score}</span>
                            <span aria-hidden="true" className="text-faint">→</span>
                          </>
                        )}
                        <ScorePill score={e.current.score} label={e.current.label} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{top ? top.title : "None detected"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-muted">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${st.dot}`} />
                        {st.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          select(e.spec.id);
                          router.push("/");
                        }}
                        className="rounded-lg border border-line px-4 py-2 font-semibold hover:border-faint"
                      >
                        Review<span className="sr-only"> {e.spec.name}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
