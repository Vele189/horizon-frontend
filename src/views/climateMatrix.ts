/**
 * Climate Matrix presentation logic, ported from
 * `horizon-backend/dashboard/views/climate_matrix.py`.
 *
 * What stays on the server: the grid itself (every city crossed with every
 * year) and the per-city trend. What lives here: how a count becomes a colour
 * step, and the order of the rows. The tests beside this file pin the same
 * cases the Python tests do, so the two implementations agree while both exist.
 */

import type { Schemas } from "../api/client";

export type Metric = "hot" | "cold" | "net";
export type Sort = "Trend" | "Total" | "Name";

export type Cell = Schemas["MatrixCell"];
export type Trend = Schemas["CityTrend"];

export const METRIC_LABELS: Record<Metric, string> = { hot: "Hot", cold: "Cold", net: "Net" };

export function value(cell: Cell, metric: Metric): number {
  return metric === "hot" ? cell.hot_days : metric === "cold" ? cell.cold_days : cell.net_days;
}

/** Which of the five sequential steps a count falls in. */
export function countBucket(count: number, breaks: readonly number[]): number {
  return breaks.filter((boundary) => count > boundary).length;
}

/** Which of the nine diverging steps a signed difference falls in. */
export function netBucket(net: number, breaks: readonly number[], neutralIndex: number): number {
  const distance = breaks.filter((boundary) => Math.abs(net) > boundary).length;
  if (distance === 0) return neutralIndex;
  return neutralIndex + (net > 0 ? distance : -distance);
}

/** Python's tuple ordering, for the sort keys below. */
function compareTuples(a: readonly (boolean | number | string)[], b: readonly (boolean | number | string)[]) {
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * Row order, top of the chart first. Cities with nothing to say sort to the
 * bottom whatever the sort, so empty rows never sit between the ones that
 * answer the question.
 */
export function orderCities(cells: Cell[], trends: Trend[], metric: Metric, sort: Sort): string[] {
  const names = [...new Set(cells.map((cell) => cell.name))].sort();
  const totals = new Map<string, number>();
  for (const cell of cells) {
    if (!cell.scored) continue;
    totals.set(cell.name, (totals.get(cell.name) ?? 0) + value(cell, metric));
  }
  const trend = new Map(trends.map((t) => [t.name, t[metric]]));

  const key = (name: string): (boolean | number | string)[] => {
    const hasData = totals.has(name);
    if (sort === "Trend") {
      const slope = trend.get(name);
      const missing = slope === null || slope === undefined;
      return [!hasData, missing, -(missing ? 0 : slope), name];
    }
    if (sort === "Total") return [!hasData, false, -(totals.get(name) ?? 0), name];
    return [!hasData, false, 0, name];
  };

  const keyed = new Map(names.map((name) => [name, key(name)]));
  return names.sort((a, b) => compareTuples(keyed.get(a)!, keyed.get(b)!));
}

export function cellText(cell: Cell): string {
  const head = `<b>${cell.name}</b>, ${cell.year}`;
  if (!cell.scored) return `${head}<br><i>not ingested</i>`;
  const net = cell.net_days > 0 ? `+${cell.net_days}` : `${cell.net_days}`;
  return (
    `${head}` +
    `<br><b>${cell.hot_days}</b> hot days` +
    `<br><b>${cell.cold_days}</b> cold days` +
    `<br><b>${net}</b> net` +
    `<br><span style='font-size:0.85em'>${cell.scored_days} days scored</span>`
  );
}

/** Plotly wants a continuous scale; this makes it render as blocks. */
export function discreteScale(colours: readonly string[]): [number, string][] {
  const steps = colours.length;
  return colours.flatMap((colour, index): [number, string][] => [
    [index / steps, colour],
    [(index + 1) / steps, colour],
  ]);
}

export type Grid = {
  years: string[];
  names: string[];
  z: (number | null)[][];
  text: string[][];
};

/** The heatmap's matrices, rows in `order`. Null where nothing was ingested. */
export function grid(
  cells: Cell[],
  metric: Metric,
  order: string[],
  breaks: readonly number[],
  neutralIndex: number,
): Grid {
  const years = [...new Set(cells.map((cell) => cell.year))].sort((a, b) => a - b);
  const byKey = new Map(cells.map((cell) => [`${cell.name}|${cell.year}`, cell]));
  // Plotly's y axis counts upward, so the first city in reading order is the
  // last row handed over.
  const names = [...order].reverse();

  const z = names.map((name) =>
    years.map((year) => {
      const cell = byKey.get(`${name}|${year}`);
      if (!cell || !cell.scored) return null;
      const v = value(cell, metric);
      const bucket = metric === "net" ? netBucket(v, breaks, neutralIndex) : countBucket(v, breaks);
      return bucket + 0.5;
    }),
  );
  const text = names.map((name) =>
    years.map((year) => {
      const cell = byKey.get(`${name}|${year}`);
      return cell ? cellText(cell) : "";
    }),
  );
  return { years: years.map(String), names, z, text };
}
