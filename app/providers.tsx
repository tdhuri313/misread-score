"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChartSpec } from "@/lib/chartSpec";
import type { CheckId } from "@/lib/checks";
import { applyFixes } from "@/lib/fixes";
import { SAMPLES } from "@/lib/samples";
import { scoreChart, type ScoreResult } from "@/lib/score";

/**
 * Session state shared by Analyze and Batch. Lives in the root layout, so it survives
 * navigation between routes. Nothing is persisted or sent anywhere.
 */

export type View = "original" | "fixed";

export interface Entry {
  /** The chart as the user loaded/edited it. Fixes never overwrite this. */
  spec: ChartSpec;
  /** Fixes the user accepted. */
  applied: CheckId[];
  view: View;
}

export interface EntryState extends Entry {
  /** What is on screen: the original, or the original with accepted fixes. */
  shown: ChartSpec;
  original: ScoreResult;
  current: ScoreResult;
}

interface Store {
  entries: EntryState[];
  selected: EntryState;
  select: (id: string) => void;
  /** Replace the original spec (live edits). Switches the view to Original. */
  edit: (id: string, spec: ChartSpec) => void;
  applyFix: (id: string, check: CheckId) => void;
  fixAll: (id: string) => void;
  fixAllHighRisk: () => number;
  setView: (id: string, view: View) => void;
  add: (spec: ChartSpec) => void;
}

const Ctx = createContext<Store | null>(null);

function derive(e: Entry): EntryState {
  const shown = e.view === "fixed" ? applyFixes(e.spec, e.applied) : e.spec;
  return { ...e, shown, original: scoreChart(e.spec), current: scoreChart(shown) };
}

export function Providers({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    SAMPLES.map((spec) => ({ spec, applied: [], view: "original" as View })),
  );
  const [selectedId, setSelectedId] = useState(SAMPLES[0].id);

  const update = useCallback((id: string, fn: (e: Entry) => Entry) => {
    setEntries((list) => list.map((e) => (e.spec.id === id ? fn(e) : e)));
  }, []);

  const store = useMemo<Store>(() => {
    const derived = entries.map(derive);
    const selected = derived.find((e) => e.spec.id === selectedId) ?? derived[0];
    return {
      entries: derived,
      selected,
      select: setSelectedId,
      edit: (id, spec) => update(id, (e) => ({ ...e, spec, view: "original" })),
      applyFix: (id, check) =>
        update(id, (e) => ({
          ...e,
          applied: e.applied.includes(check) ? e.applied : [...e.applied, check],
          view: "fixed",
        })),
      fixAll: (id) =>
        update(id, (e) => ({
          ...e,
          applied: scoreChart(e.spec).issues.map((i) => i.id),
          view: "fixed",
        })),
      fixAllHighRisk: () => {
        const ids = derived.filter((e) => e.original.label === "High").map((e) => e.spec.id);
        setEntries((list) =>
          list.map((e) =>
            ids.includes(e.spec.id)
              ? { ...e, applied: scoreChart(e.spec).issues.map((i) => i.id), view: "fixed" }
              : e,
          ),
        );
        return ids.length;
      },
      setView: (id, view) => update(id, (e) => ({ ...e, view })),
      add: (spec) => {
        setEntries((list) => [...list.filter((e) => e.spec.id !== spec.id), { spec, applied: [], view: "original" }]);
        setSelectedId(spec.id);
      },
    };
  }, [entries, selectedId, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <Providers>");
  return s;
}
