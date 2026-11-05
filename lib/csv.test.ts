import { describe, expect, it } from "vitest";
import { validateSpec } from "./chartSpec";
import { parseCsv } from "./csv";
import { quarterlyRevenue } from "./samples";

describe("parseCsv", () => {
  it("parses one series into a bar chart", () => {
    const r = parseCsv("Product,Revenue\nA,52\nB,56\n", "revenue.csv");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.type).toBe("bar");
    expect(r.spec.name).toBe("revenue");
    expect(r.spec.categories).toEqual(["A", "B"]);
    expect(r.spec.series).toEqual([{ name: "Revenue", values: [52, 56] }]);
    expect(r.spec.source).toBe("csv");
    expect(r.spec.illustrative).toBe(false);
  });

  it("parses several series into a line chart, with CRLF, BOM and quotes", () => {
    const r = parseCsv('﻿Month,"North, East",South\r\nJan,"1,200",3\r\nFeb,4,5\r\n');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.type).toBe("line");
    expect(r.spec.series[0]).toEqual({ name: "North, East", values: [1200, 4] });
  });

  it.each([
    ["", "The file is empty."],
    ["Product,Revenue\n", "The file has a header but no data rows."],
    ["Product\nA\n", "Need at least two columns"],
    ["Product,Revenue\nA,52,9\n", "Row 2 has 3 cells, but the header has 2."],
    ["Product,Revenue\nA,abc\n", 'Row 2, column "Revenue" has "abc", which is not a number.'],
    ["Product,Revenue\nA,\n", 'Row 2, column "Revenue" has an empty cell'],
    ['Product,Revenue\n"A,52\n', "Unclosed quote"],
  ])("rejects %j with a clear error", (input, message) => {
    const r = parseCsv(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain(message);
  });
});

describe("validateSpec", () => {
  it("round-trips a sample", () => {
    const r = validateSpec(JSON.parse(JSON.stringify(quarterlyRevenue)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.settings).toEqual(quarterlyRevenue.settings);
  });

  it("explains what is wrong", () => {
    const bad = validateSpec({ type: "pie", categories: ["A"], series: [] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('"type"');
    const mismatch = validateSpec({ type: "bar", categories: ["A", "B"], series: [{ name: "x", values: [1] }] });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.error).toContain("has 1 values but there are 2 categories");
  });
});
