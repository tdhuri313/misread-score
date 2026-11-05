"use client";

import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { useId, type ReactNode } from "react";
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
  className?: string;
}

const FONT_MONO = "var(--font-mono), ui-monospace, monospace";
const FONT_SANS = "var(--font-sans), system-ui, sans-serif";
const TAG_FONT = 11;
const TAG_H = 22;
const TAG_ROW = 34; // band reserved for callout tags

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

/** Lay tags left-to-right from x, shifting the last ones left so none passes maxX. */
function layoutTags(tags: TagSpec[], x: number, maxX: number): { tag: TagSpec; x: number; w: number }[] {
  const out: { tag: TagSpec; x: number; w: number }[] = [];
  let cx = x;
  for (const tag of tags) {
    const w = Math.min(tagWidth(tag.text), maxX - x);
    const tx = cx + w > maxX ? Math.max(x, maxX - w) : cx;
    out.push({ tag, x: tx, w });
    cx = tx + w + 8;
  }
  return out;
}

function TagRow({ tags, x, y, maxX }: { tags: TagSpec[]; x: number; y: number; maxX: number }) {
  return (
    <g>
      {layoutTags(tags, x, maxX).map(({ tag: t, x: tx, w }) => (
        <g key={t.text} transform={`translate(${tx},${y})`}>
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
  const legend = !mini && multi && spec.settings.showLegend;
  const m = mini
    ? { top: 8, right: 8, bottom: 6, left: 8 }
    : { top: (showTags ? TAG_ROW : 0) + 24, right: 24, bottom: legend ? 64 : 40, left: 52 };

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
  const tags: TagSpec[] = [];
  if (truncated) tags.push({ text: `Axis starts at ${fmt(start)}`, tone: "red" });
  if (unlabeled) tags.push({ text: "No value labels", tone: "amber" });

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
      {showTags && <TagRow tags={tags} x={m.left} y={6} maxX={W - m.right} />}
      {legend && <SeriesLegend spec={spec} x={m.left} y={H - 18} />}
    </g>
  );
}

// ---------- heatmap ----------

function Heatmap({ spec, callouts, ctx }: { spec: ChartSpec; callouts: CheckId[]; ctx: Ctx }) {
  const { W, H, mini, uid } = ctx;
  const showTags = !mini && callouts.length > 0;
  const legend = spec.settings.showLegend && !mini;
  const m = mini
    ? { top: 6, right: 6, bottom: 6, left: 6 }
    : { top: (showTags ? TAG_ROW : 0) + 26, right: 12, bottom: legend ? 56 : 12, left: 64 };

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

  const tags: TagSpec[] = [];
  if (callouts.includes("color")) {
    if (!spec.settings.showLegend) tags.push({ text: "No color scale", tone: "red" });
    if (reversed) tags.push({ text: "Lighter = more (reversed)", tone: "amber" });
  }
  if (callouts.includes("indirect") && !spec.settings.directLabels) tags.push({ text: "No cell values", tone: "amber" });

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
      {showTags && <TagRow tags={tags} x={m.left} y={4} maxX={W - m.right} />}
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
  const legend = !mini && spec.settings.showLegend && spec.series.length > 1;
  const direct = !mini && spec.settings.directLabels;
  const longest = Math.max(...spec.series.map((s) => s.name.length));
  const m = mini
    ? { top: 10, right: 8, bottom: 10, left: 8 }
    : {
        top: (showTags ? TAG_ROW : 0) + (legend ? 28 : 0) + 16,
        right: direct ? Math.min(200, 28 + longest * 7.5 + 40) : 24,
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

  const tags: TagSpec[] = [];
  if (callouts.includes("indirect") && !spec.settings.directLabels) {
    tags.push({ text: spec.settings.showLegend ? "Legend lookup" : "Unlabeled lines", tone: "amber" });
  }

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
          <SeriesLegend spec={spec} x={m.left} y={(showTags ? TAG_ROW : 0) + 12} />
          {tags.length > 0 && (
            <rect
              aria-hidden="true"
              x={m.left - 6}
              y={(showTags ? TAG_ROW : 0)}
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
      {showTags && <TagRow tags={tags} x={m.left} y={4} maxX={W - 8} />}
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
  const gap = mini ? 4 : 12;
  const area: Rect = mini
    ? { x: 4, y: 4, w: W - 8, h: H - 8 }
    : { x: 2, y: (showTags ? TAG_ROW : 0) + 2, w: W - 4, h: H - (showTags ? TAG_ROW : 0) - 4 };
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

  const tags: TagSpec[] = [];
  if (callouts.includes("dense")) {
    tags.push({
      text: primaryIndex === -1 ? `${panels.length} equal panels` : `${panels.length} panels`,
      tone: primaryIndex === -1 ? "red" : "amber",
    });
  }
  if (callouts.includes("indirect") && !spec.settings.directLabels) tags.push({ text: "No line labels", tone: "amber" });

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
          h: r.h - (showText ? 28 : pad) - pad,
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
                <text x={inner.x} y={inner.y + inner.h + 2} dy="-0.3em" fontFamily={FONT_MONO} fontSize={10} fill={MUTED}>
                  {spec.categories[0]}
                </text>
                <text x={inner.x + inner.w} y={inner.y + inner.h + 2} dy="-0.3em" textAnchor="end" fontFamily={FONT_MONO} fontSize={10} fill={MUTED}>
                  {spec.categories[spec.categories.length - 1]}
                </text>
              </>
            )}
          </g>
        );
      })}
      {showTags && <TagRow tags={tags} x={4} y={4} maxX={W - 4} />}
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

export default function Chart({ spec, callouts = [], mini = false, className }: ChartProps) {
  const uid = useId().replace(/:/g, "");
  const [W, H] = mini ? [160, 96] : SIZES[spec.type];
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
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-labelledby={`${uid}-t ${uid}-d`}
      style={{ overflow: "visible" }}
    >
      <title id={`${uid}-t`}>{spec.title}</title>
      <desc id={`${uid}-d`}>{describeChart(spec)}</desc>
      {body}
    </svg>
  );
}
