import { describe, expect, it } from "vitest";
import { WEIGHTS } from "./checks";
import { DRIVERS, drop } from "./research";

describe("research data", () => {
  it("matches the study's reported accuracy drops", () => {
    expect(DRIVERS.map((d) => [d.id, d.clean, d.issue, drop(d)])).toEqual([
      ["color", 95, 50, 45],
      ["dense", 80, 62, 18],
      ["truncated", 85, 70, 15],
      ["indirect", 88, 73, 15],
    ]);
  });

  it("weights are ordered like the drops and sum to 100", () => {
    expect(DRIVERS.map((d) => WEIGHTS[d.id])).toEqual([49, 19, 16, 16]);
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});
