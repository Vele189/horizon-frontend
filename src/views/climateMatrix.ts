/**
 * Climate Matrix presentation logic, ported from
 * `horizon-backend/dashboard/views/climate_matrix.py`.
 *
 * What stays on the server: the grid itself (every city crossed with every
 * year) and the per-city trend. What lives here: the order of the cities, one
 * city's series, and the trend line drawn through it. The tests beside this
 * file pin the same ordering cases the Python tests do.
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
 * City order, first city first. Cities with nothing to say sort to the
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

export type Point = { year: number; days: number | null };

/** One city's count per year, null where the year has not been ingested. */
export function citySeries(cells: Cell[], name: string, metric: Metric): Point[] {
  return cells
    .filter((cell) => cell.name === name)
    .sort((a, b) => a.year - b.year)
    .map((cell) => ({ year: cell.year, days: cell.scored ? value(cell, metric) : null }));
}

/**
 * The server's trend as a line over the city's years. The server fits by
 * least squares over the scored years, and a least-squares line passes through
 * the means, so the slope alone fixes it: nothing is refitted here, and the
 * line on screen is the number in the ranking.
 */
export function trendLine(series: Point[], perDecade: number): Map<number, number> {
  const scored = series.filter((p): p is { year: number; days: number } => p.days !== null);
  const line = new Map<number, number>();
  if (scored.length === 0) return line;
  const meanYear = scored.reduce((sum, p) => sum + p.year, 0) / scored.length;
  const meanDays = scored.reduce((sum, p) => sum + p.days, 0) / scored.length;
  for (const p of series) line.set(p.year, meanDays + (perDecade / 10) * (p.year - meanYear));
  return line;
}

/** The trend, said in a sentence. */
export function trendSentence(name: string, metric: "hot" | "cold", perDecade: number | null, minYears: number): string {
  const kind = metric === "hot" ? "extremely hot" : "extremely cold";
  if (perDecade === null) {
    return `${name} does not have ${minYears} measured years yet, so there is no trend to report.`;
  }
  const amount = Math.abs(perDecade);
  if (amount < 0.5) return `In ${name}, ${kind} days are holding roughly steady.`;
  const rounded = amount < 10 ? amount.toFixed(1) : amount.toFixed(0);
  return perDecade > 0
    ? `In ${name}, ${kind} days are becoming more common: about ${rounded} more a year every decade.`
    : `In ${name}, ${kind} days are becoming rarer: about ${rounded} fewer a year every decade.`;
}
