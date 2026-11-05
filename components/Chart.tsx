"use client";

import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ChartSpec } from "@/lib/chartSpec";
import type { CheckId } from "@/lib/checks";
import { describeChart } from "@/lib/describe";
import {
  GRID,
  INK,
  MUTED,
  PRIMARY,
  RAMP_DARK,
  RAMP_LIGHT,
  RISK,
  SECONDARY,
  seriesColor,
} from "@/lib/palette";

/**
 * Custom SVG renderer for bar, heatmap, multi-line, and multi-panel charts.
 * d3 is used for scales only; all drawing is plain SVG.
 *
 * Layout rule: callout tags and legends get their own reserved bands (above or below
 * the plot), so they never overlap titles, cells, or marks, and are never clipped.
 */

export interface ChartProps {
  spec: ChartSpec;
  /** Issues to call out on the chart with red/amber tags. */
  callouts?: CheckId[];
  /** Thumbnail mode: no text, ticks, or tags. */
  mini?: boolean;
  /** Override the viewBox size (used for the small before/after charts on Research). */
  size?: [number, number];
  className?: string;
}

const FONT_MONO = "var(--font-mono), ui-monospace, monospace";
const FONT_SANS = "var(--font-sans), system-ui, sans-serif";
const TAG_FONT = 11;
const TAG_H = 22;
const TAG_INSET = 80; // tags may use the chart width minus this

interface Ctx {
  W: number;
  H: number;
  mini: boolean;
  uid: string;
}

// ---------- shared pieces ----------

interface TagSpec {
  text: string;
  tone: "red" | "amber";
}

/** Width of a mono tag: monospace glyphs are ~0.6em wide, plus padding. */
function tagWidth(text: string): number {
  return Math.ceil(text.length * TAG_FONT * 0.62 + 16);
}

/** Lay tags left-to-right in rows no wider than `avail`; wrap instead of overlapping. */
function layoutTags(tags: TagSpec[], avail: number): { tag: TagSpec; x: number; y: number; w: number }[] {
  const out: { tag: TagSpec; x: number; y: number; w: number }[] = [];
  let cx = 0;
  let row = 0;
  for (const tag of tags) {
    const w = Math.min(tagWidth(tag.text), avail);
    if (cx > 0 && cx + w > avail) {
      row += 1;
      cx = 0;
    }
    out.push({ tag, x: cx, y: row * (TAG_H + 6), w });
    cx += w + 8;
  }
  return out;
}

/** Height reserved above the plot for the tags (0 when there are none). */
function tagBand(tags: TagSpec[], avail: number): number {
  if (tags.length === 0) return 0;
  const rows = Math.max(...layoutTags(tags, avail).map((t) => t.y)) / (TAG_H + 6) + 1;
  return rows * (TAG_H + 6) + 6;
}

/** Callout tags for the issues being highlighted. Depends only on the spec. */
function tagsFor(spec: ChartSpec, callouts: CheckId[]): TagSpec[] {
  const t: TagSpec[] = [];
  const st = spec.settings;
  const has = (id: CheckId) => callouts.includes(id);
  if (spec.type === "bar") {
    if (has("truncated") && st.axisStart !== 0) t.push({ text: `Axis starts at ${fmt(st.axisStart)}`, tone: "red" });
    if (has("indirect") && !st.directLabels) t.push({ text: "No value labels", tone: "amber" });
  } else if (spec.type === "heatmap") {
    if (has("color")) {
      if (!st.showLegend) t.push({ text: "No color scale", tone: "red" });
      if (st.colorMapping === "reversed") t.push({ text: "Lighter = more (reversed)", tone: "amber" });
    }
    if (has("indirect") && !st.directLabels) t.push({ text: "No cell values", tone: "amber" });
  } else if (spec.type === "line") {
    if (has("indirect") && !st.directLabels) {
      t.push({ text: st.showLegend ? "Legend lookup" : "Unlabeled lines", tone: "amber" });
    }
  } else {
    const primary = st.panels.some((p) => p.primary);
    if (has("dense")) {
      t.push({ text: primary ? `${st.panels.length} panels` : `${st.panels.length} equal panels`, tone: primary ? "amber" : "red" });
    }
    if (has("indirect") && !st.directLabels) t.push({ text: "No line labels", tone: "amber" });
  }
  return t;
}

function TagRow({ tags, x, y, avail }: { tags: TagSpec[]; x: number; y: number; avail: number }) {
  return (
    <g>
      {layoutTags(tags, avail).map(({ tag: t, x: tx, y: ty, w }) => (
        <g key={t.text} transform={`translate(${x + tx},${y + ty})`}>
          <rect width={w} height={TAG_H} rx={4} fill={t.tone === "red" ? RISK.high : "#B97A12"} />
          <text
            x={w / 2}
            y={TAG_H / 2}
            dy="0.35em"
            textAnchor="middle"
            fontFamily={FONT_MONO}
            fontSize={TAG_FONT}
            fontWeight={600}
            fill="#fff"
          >
            {t.text}
          </text>
        </g>
      ))}
    </g>
  );
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US");
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Path for a bar with 4px rounded top corners, anchored square to the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Push labels apart vertically so they never overlap (minimum gap in px). */
function spreadLabels<T extends { y: number }>(items: T[], gap: number, min: number, max: number): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y).map((d) => ({ ...d }));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < gap) sorted[i].y = sorted[i - 1].y + gap;
  }
  const overflow = sorted.length ? sorted[sorted.length - 1].y - max : 0;
  if (overflow > 0) sorted.forEach((d) => (d.y -= overflow));
  sorted.forEach((d) => (d.y = Math.max(min, d.y)));
  return sorted;
}

/** x offset of each legend item, plus the total width. */
function legendLayout(spec: ChartSpec): { offsets: number[]; width: number } {
  const offsets: number[] = [];
  let w = 0;
  for (const s of spec.series) {
    offsets.push(w);
    w += 24 + s.name.length * 7 + 14;
  }
  return { offsets, width: w };
}

function SeriesLegend({ spec, x, y }: { spec: ChartSpec; x: number; y: number }) {
  const { offsets } = legendLayout(spec);
  return (
    <g aria-hidden="true">
      {spec.series.map((s, i) => (
        <g key={s.name + i} transform={`translate(${x + offsets[i]},${y})`}>
          <rect width={14} height={4} y={-2} rx={2} fill={seriesColor(i)} />
          <text x={20} dy="0.35em" fontFamily={FONT_SANS} fontSize={12} fill={MUTED}>
            {s.name}
          </text>
        </g>
      ))}
    </g>
  );
}

// ---------- bar ----------

function BarChart({ spec, callouts, ctx }: { spec: ChartSpec; callouts: CheckId[]; ctx: Ctx }) {
  const { W, H, mini } = ctx;
  const start = spec.settings.axisStart;
  const multi = spec.series.length > 1;
  const showTags = !mini && callouts.length > 0;
  const tags = tagsFor(spec, callouts);
  const band = showTags ? tagBand(tags, W - TAG_INSET) : 0;
  const legend = !mini && multi && spec.settings.showLegend;
  const m = mini
    ? { top: 12, right: 8, bottom: 6, left: 8 }
    : { top: band + 24, right: 24, bottom: legend ? 64 : 40, left: 52 };

  const all = spec.series.flatMap((s) => s.values);
  const max = Math.max(...all, start + 1);
  const y = scaleLinear().domain([start, max]).nice();
  y.domain([start, y.domain()[1]]).range([H - m.bottom, m.top]);
  const x0 = scaleBand<string>()
    .domain(spec.categories.map((c, i) => `${i}`))
    .range([m.left, W - m.right])
    .paddingInner(0.3)
    .paddingOuter(0.3);
  const groupW = Math.min(x0.bandwidth(), multi ? 220 : 140);
  const x1 = scaleBand<number>()
    .domain(spec.series.map((_, i) => i))
    .range([0, groupW])
    .paddingInner(multi ? 0.08 : 0);
  const maxSingle = Math.max(...(spec.series[0]?.values ?? [0]));

  const truncated = callouts.includes("truncated") && start !== 0;
  const unlabeled = callouts.includes("indirect") && !spec.settings.directLabels;
  const plotTop = m.top;
  const base = y(start);

  return (
    <g>
      {!mini &&
        y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={m.left - 8} y={y(t)} dy="0.35em" textAnchor="end" fontFamily={FONT_MONO} fontSize={11} fill={MUTED}>
              {fmt(t)}
            </text>
          </g>
        ))}
      {spec.categories.map((c, ci) => {
        const gx = (x0(`${ci}`) ?? 0) + (x0.bandwidth() - groupW) / 2;
        return (
          <g key={ci}>
            {spec.series.map((s, si) => {
              const v = s.values[ci];
              const top = y(Math.max(v, start));
              const h = base - top;
              const bx = gx + (x1(si) ?? 0);
              const bw = x1.bandwidth();
              const color = multi ? seriesColor(si) : v === maxSingle ? PRIMARY : SECONDARY;
              return (
                <g key={si}>
                  <path d={barPath(bx, top, bw, h)} fill={color}>
                    <title>{`${c}${multi ? ` · ${s.name}` : ""}: ${fmt(v)}${spec.unit ?? ""}`}</title>
                  </path>
                  {mini && spec.settings.directLabels && (
                    <rect x={bx + bw / 2 - 7} y={top - 6} width={14} height={3} rx={1.5} fill={MUTED} />
                  )}
                  {!mini && spec.settings.directLabels && (
                    <text
                      x={bx + bw / 2}
                      y={top - 8}
                      textAnchor="middle"
                      fontFamily={FONT_MONO}
                      fontSize={12}
                      fontWeight={600}
                      fill={INK}
                    >
                      {fmt(v)}
                      {spec.unit ?? ""}
                    </text>
                  )}
                </g>
              );
            })}
            {!mini && (
              <text
                x={gx + groupW / 2}
                y={H - m.bottom + 22}
                textAnchor="middle"
                fontFamily={FONT_SANS}
                fontSize={13}
                fontWeight={600}
                fill={INK}
              >
                {c}
              </text>
            )}
          </g>
        );
      })}
      <line x1={m.left} x2={W - m.right} y1={base} y2={base} stroke={mini ? GRID : "#9C9BA5"} />
      {truncated && (
        <g aria-hidden="true">
          <line x1={m.left - 1} x2={m.left - 1} y1={plotTop} y2={base} stroke={RISK.high} strokeWidth={2} />
          <line x1={m.left - 6} x2={m.left + 4} y1={base} y2={base} stroke={RISK.high} strokeWidth={2} />
        </g>
      )}
      {unlabeled && (
        <rect
          aria-hidden="true"
          x={m.left + 6}
          y={plotTop - 6}
          width={W - m.right - m.left - 12}
          height={base - plotTop}
          fill="none"
          stroke="#B97A12"
          strokeDasharray="4 4"
          rx={4}
        />
      )}
      {showTags && <TagRow tags={tags} x={m.left} y={6} avail={W - TAG_INSET} />}
      {legend && <SeriesLegend spec={spec} x={m.left} y={H - 18} />}
    </g>
  );
}

// ---------- heatmap ----------

function Heatmap({ spec, callouts, ctx }: { spec: ChartSpec; callouts: CheckId[]; ctx: Ctx }) {
  const { W, H, mini, uid } = ctx;
  const showTags = !mini && callouts.length > 0;
  const tags = tagsFor(spec, callouts);
  const band = showTags ? tagBand(tags, W - TAG_INSET) : 0;
  const legend = spec.settings.showLegend && !mini;
  const m = mini
    ? { top: 6, right: 6, bottom: spec.settings.showLegend ? 20 : 6, left: 6 }
    : { top: band + 26, right: 12, bottom: legend ? 56 : 12, left: 64 };

  const all = spec.series.flatMap((s) => s.values);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const reversed = spec.settings.colorMapping === "reversed";
  const color = scaleLinear<string>()
    .domain([min, max === min ? min + 1 : max])
    .range(reversed ? [RAMP_DARK, RAMP_LIGHT] : [RAMP_LIGHT, RAMP_DARK]);

  const cols = spec.categories.length;
  const rows = spec.series.length;
  const cw = (W - m.left - m.right) / cols;
  const ch = (H - m.top - m.bottom) / rows;

  const gradId = `${uid}-grad`;
  const legendW = Math.min(240, W - m.left - m.right);

  return (
    <g>
      {spec.series.map((s, r) => (
        <g key={r}>
          {!mini && (
            <text
              x={m.left - 10}
              y={m.top + r * ch + ch / 2}
              dy="0.35em"
              textAnchor="end"
              fontFamily={FONT_MONO}
              fontSize={12}
              fill={INK}
            >
              {s.name}
            </text>
          )}
          {s.values.map((v, c) => {
            const t = max === min ? 0 : (v - min) / (max - min);
            const dark = reversed ? t < 0.5 : t > 0.5;
            return (
              <g key={c}>
                <rect
                  x={m.left + c * cw + 1}
                  y={m.top + r * ch + 1}
                  width={Math.max(0, cw - 2)}
                  height={Math.max(0, ch - 2)}
                  rx={mini ? 1 : 3}
                  fill={color(v)}
                >
                  <title>{`${s.name}, ${spec.categories[c]}: ${fmt(v)}${spec.unit ?? ""}`}</title>
                </rect>
                {mini && spec.settings.directLabels && (
                  <rect
                    x={m.left + c * cw + cw / 2 - 6}
                    y={m.top + r * ch + ch / 2 - 1.5}
                    width={12}
                    height={3}
                    rx={1.5}
                    fill={dark ? "#fff" : INK}
                    opacity={0.7}
                  />
                )}
                {!mini && spec.settings.directLabels && (
                  <text
                    x={m.left + c * cw + cw / 2}
                    y={m.top + r * ch + ch / 2}
                    dy="0.35em"
                    textAnchor="middle"
                    fontFamily={FONT_MONO}
                    fontSize={13}
                    fontWeight={600}
                    fill={dark ? "#fff" : INK}
                    pointerEvents="none"
                  >
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
      {!mini &&
        spec.categories.map((c, i) => (
          <text
            key={i}
            x={m.left + i * cw + cw / 2}
            y={m.top - 10}
            textAnchor="middle"
            fontFamily={FONT_MONO}
            fontSize={12}
            fill={MUTED}
          >
            {c}
          </text>
        ))}
      {callouts.includes("color") && !mini && (
        <rect
          aria-hidden="true"
          x={m.left - 3}
          y={m.top - 3}
          width={W - m.left - m.right + 6}
          height={H - m.top - m.bottom + 6}
          rx={5}
          fill="none"
          stroke={spec.settings.showLegend ? "#B97A12" : RISK.high}
          strokeWidth={1.5}
        />
      )}
      {mini && spec.settings.showLegend && (
        <g>
          <defs>
            <linearGradient id={gradId}>
              <stop offset="0%" stopColor={color(min)} />
              <stop offset="100%" stopColor={color(max)} />
            </linearGradient>
          </defs>
          <rect x={m.left} y={H - 12} width={W - m.left - m.right} height={6} rx={3} fill={`url(#${gradId})`} />
        </g>
      )}
      {legend && (
        <g aria-hidden="true" transform={`translate(${m.left},${H - 40})`}>
          <defs>
            <linearGradient id={gradId}>
              <stop offset="0%" stopColor={color(min)} />
              <stop offset="100%" stopColor={color(max)} />
            </linearGradient>
          </defs>
          <text y={0} fontFamily={FONT_SANS} fontSize={11} fill={MUTED}>
            {reversed ? "Lighter = more" : "Darker = more"}
            {spec.unit ? ` (${spec.unit})` : ""}
          </text>
          <rect y={10} width={legendW} height={10} rx={5} fill={`url(#${gradId})`} />
          <text y={34} fontFamily={FONT_MONO} fontSize={11} fill={INK}>
            {`Low ${fmt(min)}`}
          </text>
          <text x={legendW} y={34} textAnchor="end" fontFamily={FONT_MONO} fontSize={11} fill={INK}>
            {`High ${fmt(max)}`}
          </text>
        </g>
      )}
      {showTags && <TagRow tags={tags} x={m.left} y={4} avail={W - TAG_INSET} />}
    </g>
  );
}

// ---------- line ----------

function linePath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
}

function LineChart({ spec, callouts, ctx }: { spec: ChartSpec; callouts: CheckId[]; ctx: Ctx }) {
  const { W, H, mini } = ctx;
  const showTags = !mini && callouts.length > 0;
  const tags = tagsFor(spec, callouts);
  const band = showTags ? tagBand(tags, W - TAG_INSET) : 0;
  const legend = !mini && spec.settings.showLegend && spec.series.length > 1;
  const direct = !mini && spec.settings.directLabels;
  const longest = Math.max(...spec.series.map((s) => s.name.length));
  const m = mini
    ? {
        top: spec.settings.showLegend && spec.series.length > 1 ? 22 : 10,
        right: spec.settings.directLabels ? 30 : 8,
        bottom: 10,
        left: 8,
      }
    : {
        top: band + (legend ? 28 : 0) + 16,
        right: direct ? Math.min(200, W * 0.32, 28 + longest * 7.5 + 40) : 24,
        bottom: 36,
        left: 48,
      };

  const all = spec.series.flatMap((s) => s.values);
  const y = scaleLinear()
    .domain([Math.min(spec.settings.axisStart, ...all), Math.max(...all)])
    .nice()
    .range([H - m.bottom, m.top]);
  const x = scalePoint<string>()
    .domain(spec.categories.map((_, i) => `${i}`))
    .range([m.left, W - m.right]);

  const ends = spec.series.map((s, i) => {
    const last = s.values[s.values.length - 1];
    return { i, name: s.name, value: last, y: y(last) };
  });
  const labels = spreadLabels(ends, 16, m.top, H - m.bottom);

  return (
    <g>
      {!mini &&
        y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={m.left - 8} y={y(t)} dy="0.35em" textAnchor="end" fontFamily={FONT_MONO} fontSize={11} fill={MUTED}>
              {fmt(t)}
            </text>
          </g>
        ))}
      {!mini &&
        spec.categories.map((c, i) => (
          <text key={i} x={x(`${i}`)} y={H - m.bottom + 22} textAnchor="middle" fontFamily={FONT_SANS} fontSize={12} fill={MUTED}>
            {c}
          </text>
        ))}
      {spec.series.map((s, si) => {
        const pts = s.values.map((v, i) => [x(`${i}`) ?? 0, y(v)] as [number, number]);
        const end = pts[pts.length - 1];
        return (
          <g key={si}>
            <path d={linePath(pts)} fill="none" stroke={seriesColor(si)} strokeWidth={mini ? 1.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
            {!mini && (
              <circle cx={end[0]} cy={end[1]} r={4} fill={seriesColor(si)} stroke="#fff" strokeWidth={2}>
                <title>{`${s.name}: ${fmt(s.values[s.values.length - 1])}${spec.unit ?? ""}`}</title>
              </circle>
            )}
            {!mini &&
              s.values.map((v, i) => (
                <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r={9} fill="transparent">
                  <title>{`${s.name}, ${spec.categories[i]}: ${fmt(v)}${spec.unit ?? ""}`}</title>
                </circle>
              ))}
          </g>
        );
      })}
      {mini &&
        spec.settings.directLabels &&
        spreadLabels(ends, 8, m.top, H - m.bottom).map((l) => (
          <g key={l.i}>
            <rect x={W - m.right + 5} y={l.y - 1.5} width={6} height={3} rx={1.5} fill={seriesColor(l.i)} />
            <rect x={W - m.right + 13} y={l.y - 1.5} width={12} height={3} rx={1.5} fill={MUTED} />
          </g>
        ))}
      {mini &&
        spec.settings.showLegend &&
        spec.series.length > 1 &&
        spec.series.map((_, i) => (
          <g key={i}>
            <rect x={m.left + i * 30} y={6} width={8} height={4} rx={2} fill={seriesColor(i)} />
            <rect x={m.left + i * 30 + 11} y={6} width={14} height={4} rx={2} fill={GRID} />
          </g>
        ))}
      {direct &&
        labels.map((l) => (
          <text key={l.i} x={W - m.right + 10} y={l.y} dy="0.35em" fontFamily={FONT_SANS} fontSize={12} fontWeight={600} fill={INK}>
            <tspan fill={seriesColor(l.i)}>●</tspan> {l.name}{" "}
            <tspan fontFamily={FONT_MONO} fontWeight={400} fill={MUTED}>
              {fmt(l.value)}
              {spec.unit ?? ""}
            </tspan>
          </text>
        ))}
      {legend && (
        <>
          <SeriesLegend spec={spec} x={m.left} y={band + 12} />
          {tags.length > 0 && (
            <rect
              aria-hidden="true"
              x={m.left - 6}
              y={band}
              width={legendLayout(spec).width + 4}
              height={24}
              rx={4}
              fill="none"
              stroke="#B97A12"
              strokeDasharray="4 4"
            />
          )}
        </>
      )}
      {showTags && <TagRow tags={tags} x={m.left} y={4} avail={W - TAG_INSET} />}
    </g>
  );
}

// ---------- multi-panel ----------

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function gridRects(area: Rect, n: number, cols: number, gap: number): Rect[] {
  const rows = Math.ceil(n / cols);
  const w = (area.w - gap * (cols - 1)) / cols;
  const h = (area.h - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => ({
    x: area.x + (i % cols) * (w + gap),
    y: area.y + Math.floor(i / cols) * (h + gap),
    w,
    h,
  }));
}

function MultiPanel({ spec, callouts, ctx }: { spec: ChartSpec; callouts: CheckId[]; ctx: Ctx }) {
  const { W, H, mini } = ctx;
  const panels = spec.settings.panels;
  const showTags = !mini && callouts.length > 0;
  const tags = tagsFor(spec, callouts);
  const band = showTags ? tagBand(tags, W - TAG_INSET) : 0;
  const gap = mini ? 4 : 12;
  const area: Rect = mini
    ? { x: 4, y: 4, w: W - 8, h: H - 8 }
    : { x: 2, y: band + 2, w: W - 4, h: H - band - 4 };
  const primaryIndex = panels.findIndex((p) => p.primary);

  let rects: Rect[];
  if (primaryIndex === -1) {
    const n = panels.length;
    const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
    rects = gridRects(area, n, Math.max(1, cols), gap);
  } else {
    const others = panels.length - 1;
    const pw = others === 0 ? area.w : area.w * 0.6;
    const main: Rect = { x: area.x, y: area.y, w: pw, h: area.h };
    const side: Rect = { x: area.x + pw + gap, y: area.y, w: area.w - pw - gap, h: area.h };
    const sideRects = others ? gridRects(side, others, others > 3 ? 2 : 1, gap) : [];
    rects = [];
    let k = 0;
    panels.forEach((_, i) => {
      rects[i] = i === primaryIndex ? main : sideRects[k++];
    });
  }

  return (
    <g>
      {panels.map((p, i) => {
        const r = rects[i];
        const s = spec.series[p.seriesIndex];
        if (!r || !s) return null;
        const isPrimary = i === primaryIndex;
        const showText = !mini && r.h >= 48;
        const pad = mini ? 3 : 10;
        const labelW = showText && spec.settings.directLabels ? 44 : 0;
        const inner: Rect = {
          x: r.x + pad,
          y: r.y + (showText ? 28 : pad),
          w: r.w - pad * 2 - labelW,
          h: r.h - (showText ? 28 : pad) - pad - (showText && isPrimary ? 18 : 0),
        };
        const ys = scaleLinear()
          .domain([Math.min(...s.values), Math.max(...s.values)])
          .nice()
          .range([inner.y + inner.h, inner.y]);
        const xs = scalePoint<string>()
          .domain(spec.categories.map((_, k) => `${k}`))
          .range([inner.x, inner.x + inner.w]);
        const pts = s.values.map((v, k) => [xs(`${k}`) ?? 0, ys(v)] as [number, number]);
        const last = pts[pts.length - 1];
        const maxChars = Math.max(4, Math.floor((r.w - 20) / (isPrimary ? 7.5 : 6.6)));
        const title = p.title.length > maxChars ? `${p.title.slice(0, maxChars - 1)}…` : p.title;
        return (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={mini ? 2 : 6} fill="#fff" stroke={isPrimary ? PRIMARY : GRID} strokeWidth={isPrimary ? 1.5 : 1}>
              <title>{`${p.title}: ${s.values.map((v, k) => `${spec.categories[k]} ${fmt(v)}`).join(", ")}`}</title>
            </rect>
            {showText && (
              <text x={r.x + 10} y={r.y + 18} fontFamily={FONT_SANS} fontSize={isPrimary ? 13 : 12} fontWeight={600} fill={INK}>
                {title}
              </text>
            )}
            <path d={linePath(pts)} fill="none" stroke={PRIMARY} strokeWidth={mini ? 1.2 : isPrimary ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
            {showText && spec.settings.directLabels && (
              <text x={last[0] + 6} y={last[1]} dy="0.35em" fontFamily={FONT_MONO} fontSize={11} fill={MUTED}>
                {fmt(s.values[s.values.length - 1])}
              </text>
            )}
            {showText && isPrimary && (
              <>
                <text x={inner.x} y={inner.y + inner.h + 14} fontFamily={FONT_MONO} fontSize={10} fill={MUTED}>
                  {spec.categories[0]}
                </text>
                <text x={inner.x + inner.w} y={inner.y + inner.h + 14} textAnchor="end" fontFamily={FONT_MONO} fontSize={10} fill={MUTED}>
                  {spec.categories[spec.categories.length - 1]}
                </text>
              </>
            )}
          </g>
        );
      })}
      {showTags && <TagRow tags={tags} x={4} y={4} avail={W - TAG_INSET} />}
    </g>
  );
}

// ---------- entry ----------

const SIZES: Record<ChartSpec["type"], [number, number]> = {
  bar: [720, 400],
  heatmap: [720, 400],
  line: [720, 380],
  multipanel: [720, 420],
};

/**
 * Measure the rendered width so the chart re-lays out at its real size: text stays
 * legible on phones instead of shrinking with the whole SVG.
 */
function useWidth(enabled: boolean) {
  const [width, setWidth] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);
  return { ref, width };
}

export default function Chart({ spec, callouts = [], mini = false, size, className }: ChartProps) {
  const uid = useId().replace(/:/g, "");
  const { ref, width } = useWidth(!mini && !size);
  let [W, H] = mini ? [160, 96] : (size ?? SIZES[spec.type]);
  if (!mini && !size && width && width < W) {
    // Narrow container: use the real width and a shorter height.
    H = Math.round(Math.max(260, Math.min(H, width * 0.85)));
    W = Math.max(280, width);
  }
  const ctx: Ctx = { W, H, mini, uid };
  const empty = spec.series.length === 0 || spec.categories.length === 0;

  let body: ReactNode = null;
  if (!empty) {
    if (spec.type === "bar") body = <BarChart spec={spec} callouts={callouts} ctx={ctx} />;
    else if (spec.type === "heatmap") body = <Heatmap spec={spec} callouts={callouts} ctx={ctx} />;
    else if (spec.type === "line") body = <LineChart spec={spec} callouts={callouts} ctx={ctx} />;
    else body = <MultiPanel spec={spec} callouts={callouts} ctx={ctx} />;
  }

  if (mini) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" focusable="false">
        {body}
      </svg>
    );
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-labelledby={`${uid}-t ${uid}-d`}
    >
      <title id={`${uid}-t`}>{spec.title}</title>
      <desc id={`${uid}-d`}>{describeChart(spec)}</desc>
      {body}
    </svg>
  );
}
