"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { RiskLabel } from "@/lib/score";

/** Small shared UI pieces. */

export const RISK_STYLES: Record<RiskLabel, { text: string; bg: string; stroke: string }> = {
  High: { text: "text-high", bg: "bg-high-tint", stroke: "#C42B3B" },
  Medium: { text: "text-medium-ink", bg: "bg-medium-tint", stroke: "#D4952A" },
  Low: { text: "text-low-ink", bg: "bg-low-tint", stroke: "#2E9E5B" },
};

export function ScorePill({ score, label }: { score: number; label: RiskLabel }) {
  const s = RISK_STYLES[label];
  return (
    <span className={`inline-flex min-w-9 justify-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className="sr-only">Score </span>
      {score}
      <span className="sr-only">, {label} risk</span>
    </span>
  );
}

export function ScoreRing({ score, label }: { score: number; label: RiskLabel }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const s = RISK_STYLES[label];
  return (
    <div className="flex items-center gap-3" role="group" aria-label={`Misread risk score ${score} out of 100, ${label}`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ECEBE6" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={s.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(score, 1) / 100) * c} ${c}`}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dasharray 300ms ease" }}
        />
        <text x="32" y="32" dy="0.35em" textAnchor="middle" fontFamily="var(--font-mono)" fill={s.stroke}>
          <tspan fontSize="20" fontWeight="600">{score}</tspan>
          <tspan fontSize="8" dx="1">/100</tspan>
        </text>
      </svg>
      <p className="text-[13px] leading-tight text-muted">
        Misread
        <br />
        risk: <span className={`font-semibold ${s.text}`}>{label}</span>
      </p>
    </div>
  );
}

/** Accessible tabs: roving focus with arrow keys, Home/End. */
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
}: {
  label: string;
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(tabs[next].id);
      refs.current[next]?.focus();
    }
  };
  return (
    <div role="tablist" aria-label={label} className="flex rounded-lg bg-subtle p-1">
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex-1 whitespace-nowrap rounded-md px-2 py-2 text-[13px] transition-colors ${
              active ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Two-option segmented control (radio group semantics). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = [],
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  disabled?: T[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-subtle p-1">
      {options.map((o) => {
        const active = o.id === value;
        const off = disabled.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={off}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const others = options.filter((x) => x.id !== o.id && !disabled.includes(x.id));
                if (others[0]) onChange(others[0].id);
              }
            }}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${
              active ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"
            } disabled:cursor-not-allowed disabled:text-faint`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "amber" }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${
        tone === "amber" ? "bg-medium-tint text-medium-ink" : "bg-subtle text-muted"
      }`}
    >
      {children}
    </span>
  );
}
