import { describe, expect, it } from "vitest";
import { checkColorScale } from "./checks";
import { applyFixes, fixAll, fixDenseLayout, fixIndirectLabels, fixTruncatedAxis } from "./fixes";
import { opsDashboard, productGrowth, quarterlyRevenue, regionalSales, SAMPLES } from "./samples";
import { scoreChart } from "./score";

describe("fixes", () => {
  it("Fix all on the heatmap adds the scale and conventional mapping; color severity becomes 0", () => {
    const fixed = fixAll(regionalSales);
    expect(fixed.settings.showLegend).toBe(true);
    expect(fixed.settings.colorMapping).toBe("conventional");
    expect(checkColorScale(fixed).severity).toBe(0);
    expect(scoreChart(fixed).score).toBe(0);
  });

  it("are pure: the input spec is not mutated", () => {
    for (const spec of SAMPLES) {
      const before = JSON.stringify(spec);
      fixAll(spec);
      expect(JSON.stringify(spec)).toBe(before);
    }
  });

  it("truncated-axis fix starts the axis at zero", () => {
    expect(fixTruncatedAxis(quarterlyRevenue).settings.axisStart).toBe(0);
  });

  it("indirect-label fix replaces the legend with direct labels on line charts", () => {
    const fixed = fixIndirectLabels(productGrowth);
    expect(fixed.settings.directLabels).toBe(true);
    expect(fixed.settings.showLegend).toBe(false);
  });

  it("dense fix makes exactly one panel primary, picking the one that moves most", () => {
    const fixed = fixDenseLayout(opsDashboard);
    const primaries = fixed.settings.panels.filter((p) => p.primary);
    expect(primaries).toHaveLength(1);
    // Queue depth (8 -> 34) has the largest range relative to its mean.
    expect(primaries[0].title).toBe("Queue depth");
    expect(scoreChart(fixed).score).toBeLessThan(scoreChart(opsDashboard).score);
  });

  it("applyFixes applies only the requested fixes", () => {
    const onlyAxis = applyFixes(quarterlyRevenue, ["truncated"]);
    expect(onlyAxis.settings.axisStart).toBe(0);
    expect(onlyAxis.settings.directLabels).toBe(false);
    expect(scoreChart(onlyAxis).score).toBe(31);
  });

  it("fixes that don't apply return the spec unchanged", () => {
    expect(fixDenseLayout(quarterlyRevenue)).toBe(quarterlyRevenue);
  });
});
