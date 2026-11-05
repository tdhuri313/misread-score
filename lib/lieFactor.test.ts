import { describe, expect, it } from "vitest";
import { formatLieFactor, lieFactor } from "./lieFactor";
import { productGrowth, quarterlyRevenue } from "./samples";
import { cleanBar } from "./testHelpers";
import { fixTruncatedAxis } from "./fixes";

describe("lieFactor", () => {
  it("Quarterly revenue has a lie factor of about 26x", () => {
    // visual: (6 - 2) / 2 = 200%; actual: 4 / 52 ≈ 7.7%; 200 / 7.7 = 26
    expect(lieFactor(quarterlyRevenue)).toBeCloseTo(26, 5);
    expect(formatLieFactor(lieFactor(quarterlyRevenue))).toBe("26x");
  });

  it("starting the axis at 0 gives 1.0x", () => {
    const lf = lieFactor(fixTruncatedAxis(quarterlyRevenue));
    expect(lf).toBeCloseTo(1, 10);
    expect(formatLieFactor(lf)).toBe("1.0x");
  });

  it("is undefined for non-bar charts and equal values", () => {
    expect(lieFactor(productGrowth)).toBeNull();
    const equal = cleanBar();
    equal.series[0].values = [5, 5];
    expect(lieFactor(equal)).toBeNull();
  });

  it("is infinite when the shortest bar is hidden below the axis start", () => {
    expect(lieFactor(cleanBar({ axisStart: 52 }))).toBe(Infinity);
  });
});
