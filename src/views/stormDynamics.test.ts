import { describe, expect, it } from "vitest";

import { gustsBySwing, linkByCity, quantile, ranks, spearman, type StormDay } from "./stormDynamics";

function day(name: string, change: number, gust: number): StormDay {
  return { city_id: name, name, date_key: "2024-01-01", hours: 24, peak_gust: gust, pressure_change_24h: change, sharpest_fall: Math.min(change, 0), sharpest_rise: Math.max(change, 0) };
}

describe("ranks", () => {
  it("shares tied ranks", () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });
});

describe("spearman", () => {
  it("is 1 for any increasing relation and -1 for a decreasing one", () => {
    expect(spearman([1, 2, 3, 4], [1, 4, 9, 16])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
  });
  it("has nothing to say when one side is constant", () => {
    expect(spearman([1, 2, 3], [5, 5, 5])).toBeNull();
  });
});

describe("gustsBySwing", () => {
  it("bins by the size of the swing, so a fall and a rise land together", () => {
    const bins = gustsBySwing([day("A", -12, 60), day("A", 12, 80), day("A", 1, 20)]);
    expect(bins.map((b) => b.label)).toEqual(["Under 5 hPa", "10–15 hPa"]);
    expect(bins[1]!.median).toBe(70);
  });
});

describe("linkByCity", () => {
  it("sees the V that a signed correlation misses", () => {
    const v = [day("A", -10, 70), day("A", -5, 40), day("A", 0, 10), day("A", 5, 45), day("A", 10, 75)];
    expect(spearman(v.map((d) => d.pressure_change_24h), v.map((d) => d.peak_gust))).toBeCloseTo(0.3);
    expect(linkByCity(v)[0]!.rho).toBeGreaterThan(0.9);
  });
});

describe("quantile", () => {
  it("interpolates", () => {
    expect(quantile([0, 10], 0.9)).toBeCloseTo(9);
  });
});
