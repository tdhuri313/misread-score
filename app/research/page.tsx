import type { Metadata } from "next";
import Chart from "@/components/Chart";
import type { ChartSpec } from "@/lib/chartSpec";
import type { CheckId } from "@/lib/checks";
import { DENSITY_THRESHOLDS, LIE_FACTOR_CAP, REVERSED_WITH_SCALE_SEVERITY, WEIGHTS } from "@/lib/checks";
import { applyFixes } from "@/lib/fixes";
import { DRIVERS, STUDY, drop, type Driver } from "@/lib/research";
import { opsDashboard, productGrowth, quarterlyRevenue, regionalSales } from "@/lib/samples";
import { RISK_BANDS, scoreChart } from "@/lib/score";

export const metadata: Metadata = { title: "Research · Misread Score" };

/** The sample used to show each driver's before/after. Only that one factor changes. */
const EXAMPLES: Record<CheckId, ChartSpec> = {
  color: regionalSales,
  dense: opsDashboard,
  truncated: quarterlyRevenue,
  indirect: productGrowth,
};

function AccuracyBars({ d }: { d: Driver }) {
  const rows = [
    { label: "Clean chart", value: d.clean, cls: "bg-primary" },
    { label: d.name, value: d.issue, cls: "bg-secondary" },
  ];
  return (
    <div className="mt-4 space-y-1.5" role="img" aria-label={`Reading accuracy: ${d.clean}% on the clean chart, ${d.issue}% with ${d.name.toLowerCase()}.`}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[120px_1fr] items-center gap-3 text-xs" aria-hidden="true">
          <span className="truncate text-muted">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className={`h-2.5 rounded-sm ${r.cls}`} style={{ width: `${r.value * 0.8}%` }} />
            <span className="font-mono font-semibold">{r.value}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DriverCard({ d, n }: { d: Driver; n: number }) {
  const before = EXAMPLES[d.id];
  const after = applyFixes(before, [d.id]);
  return (
    <li className="grid gap-6 rounded-2xl border border-line bg-surface p-6 md:grid-cols-[1fr_280px] md:p-7">
      <div className="grid grid-cols-[44px_1fr] gap-x-4">
        <span className="font-mono text-xl text-primary">{String(n).padStart(2, "0")}</span>
        <div>
          <h3 className="text-[19px] font-normal leading-snug">{d.headline}</h3>
          <p className="mt-2 font-serif text-[16px] leading-relaxed text-muted">{d.body}</p>
          <AccuracyBars d={d} />
          <p className="mt-2 font-mono text-xs text-muted">
            Accuracy drop: <span className="font-semibold text-high">−{drop(d)} points</span>
          </p>
          <hr className="my-4 border-line" />
          <p className="eyebrow !text-[10px]">Recommendation</p>
          <p className="mt-1 text-[13px]">{d.recommendation}</p>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 border-line md:border-l md:pl-6">
        <div className="flex items-center gap-2">
          <figure className="flex-1 rounded-md bg-subtle p-2">
            <figcaption className="mb-1 text-[10px] text-muted">Before</figcaption>
            <Chart spec={before} mini className="h-auto w-full" />
          </figure>
          <span aria-hidden="true">→</span>
          <figure className="flex-1 rounded-md bg-subtle p-2">
            <figcaption className="mb-1 text-[10px] text-muted">After</figcaption>
            <Chart spec={after} mini className="h-auto w-full" />
          </figure>
        </div>
        <div className="flex items-end justify-between">
          <span className="eyebrow !text-[10px]">Score weight</span>
          <span className="font-mono text-3xl text-primary">{WEIGHTS[d.id]}</span>
        </div>
      </div>
    </li>
  );
}

const CANT_CATCH = [
  "Wrong, stale, or cherry-picked data. The checks read formatting, not the truth of the numbers.",
  "Misleading titles, annotations, or captions.",
  "A chosen time window or baseline year that frames the story.",
  "Formatting problems beyond the four checks, such as dual axes, 3D effects, or area-scaled icons.",
  "Whether a cut axis or dense dashboard is intentional and appropriate for its audience.",
  "What a particular viewer already knows, or how long they look.",
];

export default function ResearchPage() {
  const example = scoreChart(quarterlyRevenue);
  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-14 sm:px-6">
      <header className="text-center">
        <p className="eyebrow">Research</p>
        <h1 className="mt-4 text-4xl font-normal tracking-tight sm:text-5xl">Why charts mislead</h1>
        <p className="mx-auto mt-6 max-w-[660px] font-serif text-lg leading-relaxed text-muted">
          A chart can hold accurate data and still mislead through formatting. Misread Score&apos;s weights come
          from a study in which {STUDY.participants} students completed {STUDY.readings} chart readings, with each
          variant changing one formatting factor from a clean chart.
        </p>
      </header>

      <section aria-labelledby="drivers-h" className="mt-16">
        <div className="mb-4 flex items-center gap-4">
          <h2 id="drivers-h" className="eyebrow whitespace-nowrap">
            Four drivers of misreading
          </h2>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
        <ol className="space-y-4">
          {DRIVERS.map((d, i) => (
            <DriverCard key={d.id} d={d} n={i + 1} />
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">
          Before/after thumbnails use the illustrative sample charts. Weights are roughly proportional to the
          accuracy drops (45 : 18 : 15 : 15), rounded to sum to 100.
        </p>
      </section>

      <section aria-labelledby="method-h" className="mt-20">
        <p className="eyebrow text-center">Method</p>
        <h2 id="method-h" className="mt-3 text-center text-3xl font-normal tracking-tight">
          The study
        </h2>
        <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Participants", `${STUDY.participants} students`],
            ["Readings", `${STUDY.readings} chart readings`],
            ["Design", "One factor changed per variant"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-surface p-5">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-2 text-lg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 font-serif text-[16px] leading-relaxed text-muted">
          Each variant started from a clean chart and changed exactly one formatting factor: a color encoding with no
          legend, a dense layout, a truncated axis, or indirect labels. Accuracy on the clean chart is compared with
          accuracy on the variant, so each drop isolates one factor.
        </p>
        {/* TODO: readings per variant, confidence intervals, and question wording are not yet reported. */}
      </section>

      <section aria-labelledby="how-h" className="mt-20">
        <p className="eyebrow text-center">Scoring</p>
        <h2 id="how-h" className="mt-3 text-center text-3xl font-normal tracking-tight">
          How the score works
        </h2>
        <p className="mx-auto mt-4 max-w-[600px] text-center font-serif text-[16px] leading-relaxed text-muted">
          Four rule-based checks read the chart spec. Each one says whether it applies, and how severe the issue is
          from 0 to 1. The score weights those severities by the study results.
        </p>
        <ol className="mt-8 grid grid-cols-1 items-center gap-4 rounded-2xl border border-line bg-surface p-6 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_auto]">
          <li>
            <p className="text-[13px] font-semibold">Chart spec</p>
            <p className="mt-1 text-[11px] text-muted">Data + formatting settings</p>
          </li>
          <li aria-hidden="true" className="hidden sm:block">→</li>
          <li>
            <p className="text-[13px] font-semibold">Four checks</p>
            <p className="mt-1 text-[11px] text-muted">Applies? Severity 0–1</p>
          </li>
          <li aria-hidden="true" className="hidden sm:block">→</li>
          <li>
            <p className="text-[13px] font-semibold">Weighted issues</p>
            <p className="mt-1 text-[11px] text-muted">Weight × severity</p>
          </li>
          <li aria-hidden="true" className="hidden sm:block">→</li>
          <li className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full bg-high-tint">
            <span className="font-mono text-2xl text-high">{example.score}</span>
            <span className="text-[10px] text-muted">{quarterlyRevenue.name}</span>
          </li>
        </ol>
        <p className="mt-4 rounded-lg bg-subtle px-4 py-3 text-center font-mono text-[13px]">
          risk = Σ(weight × severity) ÷ Σ(weights of checks that apply) × 100
        </p>
        <h3 className="mt-8 text-[15px] font-semibold">Design assumptions (not study findings)</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-muted">
          <li>
            Truncated axis severity rises linearly from 0 at a 1.0x lie factor to 1 at {LIE_FACTOR_CAP}x or more.
          </li>
          <li>A visible color scale with a reversed mapping (lighter means more) has severity {REVERSED_WITH_SCALE_SEVERITY}.</li>
          <li>
            Dense layout: up to {DENSITY_THRESHOLDS.comfortablePanels} panels is 0, {DENSITY_THRESHOLDS.densePanels} or
            more is 1, linear in between; one primary panel multiplies severity by {DENSITY_THRESHOLDS.primaryPanelFactor}.
          </li>
          <li>
            Risk labels: Low under {RISK_BANDS.medium}, Medium {RISK_BANDS.medium}–{RISK_BANDS.high - 1}, High {RISK_BANDS.high}+.
          </li>
          <li>Takeaways come from fixed rules that map each issue to its likely misreading. Nothing is simulated.</li>
        </ul>
      </section>

      <section aria-labelledby="recs-h" className="mt-20">
        <h2 id="recs-h" className="text-2xl font-normal tracking-tight">
          Recommendations
        </h2>
        <ol className="mt-4 space-y-2 font-serif text-[16px] leading-relaxed">
          {DRIVERS.map((d, i) => (
            <li key={d.id} className="grid grid-cols-[28px_1fr]">
              <span className="font-mono text-sm text-primary">{i + 1}.</span>
              <span>{d.recommendation}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cant-h" className="mt-16">
        <h2 id="cant-h" className="text-2xl font-normal tracking-tight">
          What the score can&apos;t catch
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 font-serif text-[16px] leading-relaxed text-muted">
          {CANT_CATCH.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 grid grid-cols-1 gap-3 border-t border-line pt-6 sm:grid-cols-[120px_1fr]">
        <p className="eyebrow pt-1">Limitations</p>
        <div>
          <p className="font-serif text-[17px]">The score isn&apos;t validated yet.</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            The weights come from one study and have not been tested on a separate group of participants. The score
            flags likely misreadings; it does not predict them.
          </p>
        </div>
      </footer>
    </div>
  );
}
