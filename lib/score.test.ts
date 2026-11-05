import { describe, expect, it } from "vitest";
import { WEIGHTS, checkColorScale, checkDenseLayout, checkTruncatedAxis, denseSeverity } from "./checks";
import { fixAll } from "./fixes";
import { opsDashboard, productGrowth, quarterlyRevenue, regionalSales, SAMPLES } from "./samples";
import { batchStats, riskLabel, scoreChart } from "./score";
import { cleanBar } from "./testHelpers";

describe("scoreChart", () => {
  it("Quarterly revenue scores 63 and color is not applicable", () => {
    const r = scoreChart(quarterlyRevenue);
    expect(r.score).toBe(63);
    expect(r.label).toBe("High");
    const color = r.all.find((c) => c.id === "color")!;
    expect(color.applicable).toBe(false);
    expect(color.points).toBe(0);
  });

  it("issue points add up to the score", () => {
    for (const spec of SAMPLES) {
      const r = scoreChart(spec);
      expect(r.issues.reduce((s, i) => s + i.points, 0)).toBe(r.score);
    }
  });

  it("Quarterly revenue scores 0 after Fix all", () => {
    expect(scoreChart(fixAll(quarterlyRevenue)).score).toBe(0);
  });

  it("a clean chart scores 0", () => {
    const r = scoreChart(cleanBar());
    expect(r.score).toBe(0);
    expect(r.issues).toHaveLength(0);
    expect(r.label).toBe("Low");
  });

  it("excludes checks that don't apply", () => {
    // Product growth: only dense (19) and indirect (16) apply. 16 / 35 = 46.
    const r = scoreChart(productGrowth);
    expect(r.score).toBe(46);
    expect(r.all.find((c) => c.id === "color")!.applicable).toBe(false);
    expect(r.all.find((c) => c.id === "truncated")!.applicable).toBe(false);
    // Changing an inapplicable weight must not change the score.
    expect(scoreChart(productGrowth, { ...WEIGHTS, color: 1000, truncated: 0 }).score).toBe(46);
  });

  it("ranks issues by points", () => {
    const r = scoreChart(regionalSales);
    expect(r.issues[0].id).toBe("color");
    for (let i = 1; i < r.issues.length; i++) {
      expect(r.issues[i - 1].points).toBeGreaterThanOrEqual(r.issues[i].points);
    }
  });

  it("uses the risk bands", () => {
    expect(riskLabel(34)).toBe("Low");
    expect(riskLabel(35)).toBe("Medium");
    expect(riskLabel(59)).toBe("Medium");
    expect(riskLabel(60)).toBe("High");
  });
});

describe("checks", () => {
  it("color: 1 with no scale, 0.5 with a scale but reversed mapping, 0 when conventional", () => {
    expect(checkColorScale(regionalSales).severity).toBe(1);
    const withScale = structuredClone(regionalSales);
    withScale.settings.showLegend = true;
    expect(checkColorScale(withScale).severity).toBe(0.5);
    withScale.settings.colorMapping = "conventional";
    expect(checkColorScale(withScale).severity).toBe(0);
  });

  it("color does not apply when color only separates categories", () => {
    expect(checkColorScale(productGrowth).applicable).toBe(false);
  });

  it("truncated axis: 0 at 1x, 1 at 5x or more, linear between", () => {
    expect(checkTruncatedAxis(cleanBar()).severity).toBe(0);
    expect(checkTruncatedAxis(quarterlyRevenue).severity).toBe(1);
    // values 100 and 200, axis at 50 -> lf = 100 / 50 = 2 -> severity (2 - 1) / 4 = 0.25
    const mid = cleanBar({ axisStart: 50 });
    mid.series[0].values = [100, 200];
    expect(checkTruncatedAxis(mid).severity).toBeCloseTo(0.25);
  });

  it("truncated axis only applies to bar charts", () => {
    expect(checkTruncatedAxis(regionalSales).applicable).toBe(false);
    expect(checkTruncatedAxis(opsDashboard).applicable).toBe(false);
  });

  it("dense layout applies to every chart, scales with panels, and is reduced by a primary panel", () => {
    expect(checkDenseLayout(cleanBar()).applicable).toBe(true);
    expect(checkDenseLayout(cleanBar()).severity).toBe(0);
    expect(checkDenseLayout(opsDashboard).severity).toBe(1);
    expect(denseSeverity(2, false)).toBe(0);
    expect(denseSeverity(4, false)).toBeCloseTo(0.5);
    expect(denseSeverity(6, true)).toBeCloseTo(0.5);
  });
});

describe("batchStats", () => {
  it("is computed from real scores", () => {
    const rows = SAMPLES.map((spec) => ({ spec, result: scoreChart(spec) }));
    const stats = batchStats(rows);
    const scores = rows.map((r) => r.result.score);
    expect(stats.count).toBe(4);
    expect(stats.average).toBe(Math.round(scores.reduce((a, b) => a + b, 0) / 4));
    expect(stats.high).toBe(scores.filter((s) => s >= 60).length);
    expect(stats.medium).toBe(scores.filter((s) => s >= 35 && s < 60).length);
    expect(stats.high + stats.medium + stats.low).toBe(4);
    expect(stats.samples).toBe(4);
    expect(stats.uploaded).toBe(0);
  });

  it("changes when charts are fixed", () => {
    const before = batchStats(SAMPLES.map((spec) => ({ spec, result: scoreChart(spec) })));
    const after = batchStats(SAMPLES.map((spec) => ({ spec, result: scoreChart(fixAll(spec)) })));
    expect(after.average!).toBeLessThan(before.average!);
    expect(after.high).toBe(0);
  });

  it("handles an empty batch", () => {
    expect(batchStats([]).average).toBeNull();
  });
});
