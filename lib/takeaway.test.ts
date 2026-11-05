import { describe, expect, it } from "vitest";
import { applyFixes, fixAll } from "./fixes";
import { opsDashboard, productGrowth, quarterlyRevenue, regionalSales } from "./samples";
import { dataSays, takeaway } from "./takeaway";

describe("takeaway", () => {
  it("Quarterly revenue: truncated axis makes B look three times A (mismatch)", () => {
    const t = takeaway(quarterlyRevenue);
    expect(t.dataSays).toBe("B is about 8% higher than A.");
    expect(t.viewerSees).toBe("B looks three times as big as A.");
    expect(t.match).toBe(false);
  });

  it("Quarterly revenue matches once the axis starts at zero", () => {
    const t = takeaway(applyFixes(quarterlyRevenue, ["truncated"]));
    expect(t.match).toBe(true);
    expect(t.viewerSees).toBe("B is higher than A.");
    expect(takeaway(fixAll(quarterlyRevenue)).viewerSees).toBe(t.dataSays);
  });

  it("Heatmap: reversed color with no scale reads the best cell as the worst", () => {
    const t = takeaway(regionalSales);
    expect(t.dataSays).toBe("NE in Q4 is the highest value (890).");
    expect(t.viewerSees).toBe("NE in Q4 looks like the lowest value.");
    expect(t.match).toBe(false);
    expect(takeaway(fixAll(regionalSales)).match).toBe(true);
  });

  it("Multi-line with a legend: series may be swapped", () => {
    const t = takeaway(productGrowth);
    expect(t.dataSays).toMatch(/^Atlas ends highest/);
    expect(t.viewerSees).toBe("Beacon ends highest.");
    expect(t.match).toBe(false);
    expect(takeaway(fixAll(productGrowth)).match).toBe(true);
  });

  it("Dashboard: equal panels pull attention to the first two", () => {
    const t = takeaway(opsDashboard);
    expect(t.match).toBe(false);
    expect(t.viewerSees).toContain("Traffic (k req)");
    expect(takeaway(fixAll(opsDashboard)).match).toBe(true);
  });

  it("is deterministic", () => {
    expect(takeaway(regionalSales)).toEqual(takeaway(regionalSales));
    expect(dataSays(opsDashboard)).toBe("Queue depth moves the most, peaking at 15:00.");
  });
});
