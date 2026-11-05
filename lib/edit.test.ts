import { describe, expect, it } from "vitest";
import { addRow, addSeries, removeRow, removeSeries, setType } from "./edit";
import { opsDashboard, quarterlyRevenue } from "./samples";

describe("edit helpers", () => {
  it("keep series values aligned with categories", () => {
    const added = addRow(quarterlyRevenue);
    expect(added.categories).toHaveLength(3);
    expect(added.series[0].values).toHaveLength(3);
    expect(removeRow(added, 0).categories).toEqual(["B", "Row 3"]);
    expect(quarterlyRevenue.categories).toEqual(["A", "B"]); // pure
  });

  it("switching to multi-panel creates one panel per series", () => {
    const multi = setType(addSeries(quarterlyRevenue), "multipanel");
    expect(multi.settings.panels.map((p) => p.seriesIndex)).toEqual([0, 1]);
  });

  it("removing a series re-indexes panels", () => {
    const next = removeSeries(opsDashboard, 0);
    expect(next.series).toHaveLength(5);
    expect(next.settings.panels).toHaveLength(5);
    expect(next.settings.panels[0]).toMatchObject({ title: "Latency (ms)", seriesIndex: 0 });
  });
});
