"use client";

import { useId, useState } from "react";
import type { ScoredCheck, ScoreResult } from "@/lib/score";
import type { Takeaway } from "@/lib/takeaway";
import type { CheckId } from "@/lib/checks";

const CHECK_NAMES: Record<CheckId, string> = {
  color: "color scale check",
  dense: "dense layout check",
  truncated: "truncated axis check",
  indirect: "direct labels check",
};

/** Severity pill wording. Display only: the score itself uses the 0-1 severity. */
function severityWord(sev: number): { word: string; cls: string } {
  if (sev >= 0.75) return { word: "High", cls: "bg-high-tint text-high" };
  if (sev >= 0.4) return { word: "Medium", cls: "bg-medium-tint text-medium-ink" };
  return { word: "Low", cls: "bg-subtle text-muted" };
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function TakeawayCheck({ t }: { t: Takeaway }) {
  return (
    <section aria-labelledby="takeaway-h">
      <h2 id="takeaway-h" className="mb-3 text-[15px] font-medium">
        Takeaway check
      </h2>
      <div
        className={`rounded-lg border border-line border-l-[3px] bg-surface px-4 py-3 ${t.match ? "border-l-low" : "border-l-high"}`}
      >
        <p className="eyebrow !text-[10px]">What a viewer sees</p>
        <p className="mt-1 text-[13px] font-semibold">{t.viewerSees}</p>
      </div>
      <div className="my-2 flex justify-center">
        <span
          role="status"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            t.match ? "bg-low-tint text-low-ink" : "bg-high-tint text-high"
          }`}
        >
          {t.match ? <Check /> : <Cross />}
          {t.match ? "Takeaways match" : "Mismatch detected"}
        </span>
      </div>
      <div className="rounded-lg border border-line border-l-[3px] border-l-low bg-surface px-4 py-3">
        <p className="eyebrow !text-[10px]">What the data says</p>
        <p className="mt-1 text-[13px] font-semibold">{t.dataSays}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        <span className="font-medium text-ink">Rule:</span> {t.basis}
      </p>
    </section>
  );
}

export function IssueCard({
  issue,
  fixed,
  remaining,
  total,
  defaultOpen,
  onApply,
}: {
  issue: ScoredCheck;
  /** The user accepted this fix and is viewing the fixed chart. */
  fixed: boolean;
  /** Points this issue still contributes in the fixed chart. */
  remaining: number;
  total: number;
  defaultOpen: boolean;
  onApply: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [help, setHelp] = useState(false);
  const id = useId();
  const sev = severityWord(issue.severity);

  return (
    <li className={`rounded-lg border bg-surface ${fixed ? "border-low/40" : "border-line"}`}>
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          {fixed ? (
            <span className="inline-flex items-center gap-1 rounded bg-low-tint px-2 py-0.5 font-mono text-xs font-semibold text-low-ink">
              <Check /> Fixed
            </span>
          ) : (
            <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${sev.cls}`}>{sev.word}</span>
          )}
          <span className="relative">
            <button
              type="button"
              aria-label={`How ${issue.title} is scored`}
              aria-expanded={help}
              aria-controls={`${id}-help`}
              onClick={() => setHelp((h) => !h)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-[11px] text-muted hover:text-ink"
            >
              ?
            </button>
            {help && (
              <span
                id={`${id}-help`}
                role="note"
                className="absolute left-0 top-7 z-20 w-64 rounded-md border border-line bg-surface p-3 text-xs leading-relaxed text-ink shadow-lg"
              >
                Weight {issue.weight} × severity {issue.severity.toFixed(2)}, divided by the weights of the checks
                that apply = <b>{issue.points}</b> of {total} points.
              </span>
            )}
          </span>
          <span className="ml-auto font-mono text-xs text-muted">
            {fixed && remaining > 0 ? `${remaining} pts left` : `−${issue.points} pts`}
          </span>
        </div>
        <h3 className="mt-2 text-[13px] font-semibold">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-body`}
            onClick={() => setOpen((o) => !o)}
            className="text-left hover:text-primary"
          >
            {issue.title}
          </button>
        </h3>
        <p className="mb-3 mt-1 text-xs text-muted">{fixed ? "Suggested fix applied to the chart." : issue.summary}</p>
      </div>
      {open && (
        <div id={`${id}-body`} className="border-t border-line bg-bg/60 px-4 py-3">
          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-xs">
            <dt className="pt-px font-mono text-[9px] font-medium uppercase tracking-wider text-muted">Finding</dt>
            <dd>{issue.finding}</dd>
            <dt className="pt-px font-mono text-[9px] font-medium uppercase tracking-wider text-muted">Why it misleads</dt>
            <dd>{issue.why}</dd>
            <dt className="pt-px font-mono text-[9px] font-medium uppercase tracking-wider text-muted">Suggested fix</dt>
            <dd>{issue.fix}</dd>
          </dl>
          <div className="mt-3 pl-[100px]">
            {fixed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-low-ink">
                <Check /> Applied
              </span>
            ) : (
              <button type="button" onClick={onApply} className="text-xs font-semibold text-primary hover:underline">
                Apply fix →
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function IssueList({
  original,
  current,
  applied,
  viewingFixed,
  onApply,
}: {
  original: ScoreResult;
  current: ScoreResult;
  applied: CheckId[];
  viewingFixed: boolean;
  onApply: (id: CheckId) => void;
}) {
  const notApplicable = original.all.filter((c) => !c.applicable);
  return (
    <section aria-labelledby="issues-h">
      <h2 id="issues-h" className="mb-3 flex items-center gap-2 text-[15px] font-medium">
        Issues
        <span className="rounded-full bg-subtle px-2 py-0.5 font-mono text-[11px] text-muted">{original.issues.length}</span>
      </h2>
      {original.issues.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          No issues found by the four checks.
        </p>
      ) : (
        <ul className="space-y-3">
          {original.issues.map((issue, i) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              total={original.score}
              fixed={viewingFixed && applied.includes(issue.id)}
              remaining={current.all.find((c) => c.id === issue.id)?.points ?? 0}
              defaultOpen={i === 0}
              onApply={() => onApply(issue.id)}
            />
          ))}
        </ul>
      )}
      {notApplicable.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <span className="font-medium text-ink">Not applicable here:</span>{" "}
          {notApplicable.map((c) => CHECK_NAMES[c.id]).join(", ")}. These are
          left out of the score.
        </p>
      )}
    </section>
  );
}
