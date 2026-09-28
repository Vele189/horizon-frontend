import { describe, expect, it } from "vitest";

import { countBucket, discreteScale, grid, netBucket, orderCities, type Cell, type Trend } from "./climateMatrix";

const BREAKS = [0, 2, 5, 10];
const NEUTRAL = 4;

function cell(name: string, year: number, hot: number, cold: number, scored = true): Cell {
  return {
    city_id: name.toLowerCase(),
    name,
    year,
    hot_days: hot,
    cold_days: cold,
    net_days: hot - cold,
    scored_days: scored ? 365 : 0,
    scored,
  };
}

describe("countBucket", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 2],
    [6, 3],
    [10, 3],
    [11, 4],
  ])("puts %i in step %i", (count, step) => {
    expect(countBucket(count, BREAKS)).toBe(step);
  });
});

describe("netBucket", () => {
  it("puts zero on the neutral step", () => {
    expect(netBucket(0, BREAKS, NEUTRAL)).toBe(NEUTRAL);
  });
  it("mirrors the count buckets either side", () => {
    expect(netBucket(1, BREAKS, NEUTRAL)).toBe(5);
    expect(netBucket(-1, BREAKS, NEUTRAL)).toBe(3);
    expect(netBucket(11, BREAKS, NEUTRAL)).toBe(8);
    expect(netBucket(-11, BREAKS, NEUTRAL)).toBe(0);
  });
});

describe("orderCities", () => {
  const cells = [
    cell("Alpha", 2000, 1, 0),
    cell("Beta", 2000, 9, 0),
    cell("Gamma", 2000, 5, 0),
    cell("Empty", 2000, 0, 0, false),
  ];
  const trends: Trend[] = [
    { city_id: "alpha", name: "Alpha", hot: 3, cold: null, net: 3 },
    { city_id: "beta", name: "Beta", hot: null, cold: null, net: null },
    { city_id: "gamma", name: "Gamma", hot: 1, cold: null, net: 1 },
    { city_id: "empty", name: "Empty", hot: null, cold: null, net: null },
  ];

  it("ranks by trend, cities without one after, unscored last", () => {
    expect(orderCities(cells, trends, "hot", "Trend")).toEqual(["Alpha", "Gamma", "Beta", "Empty"]);
  });
  it("ranks by total", () => {
    expect(orderCities(cells, trends, "hot", "Total")).toEqual(["Beta", "Gamma", "Alpha", "Empty"]);
  });
  it("sorts by name with unscored cities still last", () => {
    expect(orderCities(cells, trends, "hot", "Name")).toEqual(["Alpha", "Beta", "Gamma", "Empty"]);
  });
});

describe("grid", () => {
  it("leaves an un-ingested city-year as a hole, not as zero", () => {
    const cells = [cell("Alpha", 2000, 0, 0), cell("Alpha", 2001, 0, 0, false)];
    const g = grid(cells, "hot", ["Alpha"], BREAKS, NEUTRAL);
    expect(g.z).toEqual([[0.5, null]]);
  });
  it("hands rows to Plotly bottom-up", () => {
    const cells = [cell("Alpha", 2000, 0, 0), cell("Beta", 2000, 0, 0)];
    expect(grid(cells, "hot", ["Alpha", "Beta"], BREAKS, NEUTRAL).names).toEqual(["Beta", "Alpha"]);
  });
});

describe("discreteScale", () => {
  it("makes each colour a flat block", () => {
    expect(discreteScale(["#a", "#b"])).toEqual([
      [0, "#a"],
      [0.5, "#a"],
      [0.5, "#b"],
      [1, "#b"],
    ]);
  });
});
