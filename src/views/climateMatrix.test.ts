import { describe, expect, it } from "vitest";

import { citySeries, orderCities, trendLine, trendSentence, type Cell, type Trend } from "./climateMatrix";

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

describe("citySeries", () => {
  it("leaves an un-ingested year as a gap, not as zero", () => {
    const cells = [cell("Alpha", 2001, 0, 0, false), cell("Alpha", 2000, 4, 1), cell("Beta", 2000, 9, 9)];
    expect(citySeries(cells, "Alpha", "hot")).toEqual([
      { year: 2000, days: 4 },
      { year: 2001, days: null },
    ]);
  });
});

describe("trendLine", () => {
  it("passes through the mean of the scored years with the server's slope", () => {
    const series = [
      { year: 2000, days: 2 },
      { year: 2001, days: null },
      { year: 2002, days: 4 },
    ];
    const line = trendLine(series, 10);
    expect(line.get(2001)).toBeCloseTo(3);
    expect(line.get(2000)).toBeCloseTo(2);
    expect(line.get(2002)).toBeCloseTo(4);
  });
  it("draws nothing for a city with no scored year", () => {
    expect(trendLine([{ year: 2000, days: null }], 1).size).toBe(0);
  });
});

describe("trendSentence", () => {
  it("says which way and by how much", () => {
    expect(trendSentence("Alpha", "hot", 3.14, 10)).toContain("more common: about 3.1 more");
    expect(trendSentence("Alpha", "cold", -2, 10)).toContain("rarer: about 2.0 fewer");
  });
  it("calls a small slope steady", () => {
    expect(trendSentence("Alpha", "hot", 0.2, 10)).toContain("roughly steady");
  });
  it("says why there is no trend", () => {
    expect(trendSentence("Alpha", "hot", null, 10)).toContain("does not have 10 measured years");
  });
});
