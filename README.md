# Misread Score

A web app that flags how formatting can make an accurate chart misleading. You give it a chart (sample, JSON spec, or CSV), and it scores the **misread risk** from 0 to 100 (higher is worse), explains each issue, says what a viewer is likely to take away compared with what the data supports, and suggests fixes.

> **The score is not validated yet.** It flags *likely* misreadings based on one study; it does not predict how any particular viewer will read a chart.

## The problem

AI tools and dashboards produce charts quickly, and the data in them is often correct. The formatting can still lead readers to the wrong conclusion: a bar axis that starts at 50, a heatmap with no legend, a legend lookup in place of direct labels, or six equal panels competing for attention. Misread Score checks for these four formatting problems before a chart reaches a viewer.

## Research basis

In the study, 50 students completed 500 chart readings. Each variant changed one formatting factor from a clean chart.

| Factor | Clean accuracy | With issue | Drop | Score weight |
|---|---|---|---|---|
| Color with no legend | 95% | 50% | −45 | 49 |
| Dense layout | 80% | 62% | −18 | 19 |
| Truncated axis | 85% | 70% | −15 | 16 |
| Indirect labels | 88% | 73% | −15 | 16 |

The weights are roughly proportional to the drops (45 : 18 : 15 : 15), rounded to sum to 100. No other study results are used. Unreported details, such as readings per variant and confidence intervals, are marked `TODO` in `lib/research.ts`.

## How the score works

Each check in `lib/checks/` is a pure function `(spec) → { applicable, issue, severity (0–1), weight, … }`.

```
risk = round( Σ(weight × severity) / Σ(weights of applicable checks) × 100 )
```

Checks that don't apply are left out of both sums. Each issue's share of the score is shown as its points. Points use largest-remainder rounding so they add up to the displayed score.

| Check | Applies to | Severity |
|---|---|---|
| Color scale | Charts where color encodes a value (heatmaps), not where it only separates categories | 1 with no scale; 0.5 with a scale but a reversed mapping (lighter = more); 0 otherwise |
| Dense layout | Every chart | From panel count and whether one panel is primary (see `DENSITY_THRESHOLDS`) |
| Truncated axis | Bar charts | 0 at a 1.0× lie factor, rising linearly to 1 at 5× or more |
| Indirect labels | Every chart | 0 or 1 |

**Lie factor** (`lib/lieFactor.ts`) = visual % difference ÷ actual % difference between the shortest and tallest bar. The visual difference uses bar lengths measured from the axis start. The Quarterly revenue sample (A 52, B 56, axis at 50) has a lie factor of 26×: 200% visual vs 7.7% actual.

**Takeaways** (`lib/takeaway.ts`) are rule-based. Each issue maps to the misreading it most likely causes; for example, a truncated axis leads to "B looks three times as big as A", and a reversed color scale with no legend makes the highest cell read as the lowest. Nothing is simulated, and no model is involved.

**Fixes** (`lib/fixes.ts`) are pure `ChartSpec → ChartSpec` functions. They are suggestions: a truncated axis or a dense dashboard is sometimes intentional.

### Design assumptions (not study findings)

These choices are ours, not results from the study. They are marked in code:

- **5× lie-factor cap** for truncated-axis severity 1 (`LIE_FACTOR_CAP`, `lib/checks/truncatedAxis.ts`).
- **Reversed mapping with a visible scale = 0.5** (`REVERSED_WITH_SCALE_SEVERITY`, `lib/checks/colorScale.ts`).
- **Density thresholds**: ≤2 panels → 0, ≥6 → 1, linear in between; a primary panel halves severity (`DENSITY_THRESHOLDS`, `lib/checks/denseLayout.ts`). As a result, the fixed six-panel Ops dashboard still scores above 0.
- **Risk labels**: Low < 35, Medium 35–59, High 60+ (`RISK_BANDS`, `lib/score.ts`).
- **Indirect labels** means value labels on bars and heatmap cells, and end-of-line series labels on line and panel charts.

## Decisions

- **One `ChartSpec`** (`lib/chartSpec.ts`) drives the checks, fixes, renderer, and editor. Pasted JSON is validated with clear errors.
- **No chart library.** `components/Chart.tsx` is a custom SVG renderer, and d3 is used for scales only. Legends and callout tags get reserved bands, so they never overlap titles or cells and are never clipped (unlike the design reference).
- **The tool follows its own rules:** direct labels on the research accuracy bars, an explicit scale on the fixed heatmap, and one main comparison per view.
- **Session-only state.** Samples plus any CSVs you upload live in React state in the root layout. There is no database or API, and nothing leaves the browser. Batch stats are computed from the live scores.
- **Sample data is illustrative**, and the UI says so.
- **Cut from the design:** Export report, browser extension, image upload, integrations, the "simulating viewer" state, and checks beyond the four above.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest: scoring engine, fixes, takeaways, CSV
npm run lint
npm run build
npm run backtest   # prints the holdout-check plan (stub, no data)
```

CSV format: a header row, categories in column 1, and one numeric column per series. One series loads as a bar chart and several load as a multi-line chart; you can change the type in the editor.

## What the score can't catch

- Wrong, stale, or cherry-picked data. It reads formatting, not the truth of the numbers.
- Misleading titles, annotations, or captions.
- A chosen time window or baseline that frames the story.
- Formatting problems beyond the four checks, such as dual axes, 3D effects, or area-scaled icons.
- Whether a cut axis or dense layout is intentional and right for its audience.
- What a particular viewer already knows, or how long they look.

## Validation status

The weights come from one study. `scripts/backtest.ts` is a stub for a holdout check that derives weights from one split of participants and tests them on the other. It contains no data and no analysis yet. Until that check runs, treat the score as a structured checklist that flags likely misreadings, not as a prediction.

## Project layout

```
lib/chartSpec.ts     ChartSpec type + validation
lib/samples.ts       4 sample charts
lib/csv.ts           CSV → ChartSpec with clear errors
lib/checks/          one pure function per check
lib/score.ts         combines checks into the score; batch stats
lib/lieFactor.ts     visual vs actual difference
lib/takeaway.ts      rule-based issue → misreading
lib/fixes.ts         pure ChartSpec → fixed ChartSpec
components/Chart.tsx SVG renderer (bar, heatmap, line, multi-panel)
scripts/backtest.ts  holdout check stub
```
