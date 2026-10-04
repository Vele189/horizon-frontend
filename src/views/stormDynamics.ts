/**
 * Storm Dynamics presentation logic, after
 * `horizon-backend/dashboard/views/storm_dynamics.py`.
 *
 * The relationship between pressure and wind is V-shaped: a deep low passing
 * gives a sharp fall and then a sharp rise, and both limbs are windy. So the
 * question is asked of the *size* of the swing, whichever way it went, and the
 * correlation is Spearman's, as in the Python.
 */

import type { Schemas } from "../api/client";

export type StormDay = Schemas["StormDay"];

/** Swing bins, in hPa over 24 hours. Fixed, so cities compare like for like. */
export const SWING_BINS = [
  { from: 0, to: 5, label: "Under 5 hPa" },
  { from: 5, to: 10, label: "5–10 hPa" },
  { from: 10, to: 15, label: "10–15 hPa" },
  { from: 15, to: 20, label: "15–20 hPa" },
  { from: 20, to: Infinity, label: "20+ hPa" },
] as const;

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

export type Bin = { label: string; days: number; median: number; windy: number };

/** Typical and one-in-ten-days gusts for each size of pressure swing. */
export function gustsBySwing(days: readonly StormDay[]): Bin[] {
  return SWING_BINS.map((bin) => {
    const gusts = days
      .filter((d) => {
        const swing = Math.abs(d.pressure_change_24h);
        return swing >= bin.from && swing < bin.to;
      })
      .map((d) => d.peak_gust)
      .sort((a, b) => a - b);
    return { label: bin.label, days: gusts.length, median: quantile(gusts, 0.5), windy: quantile(gusts, 0.9) };
  }).filter((bin) => bin.days > 0);
}

/** Average ranks, ties sharing the mean of the ranks they span. */
export function ranks(values: readonly number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k]![1]] = rank;
    i = j + 1;
  }
  return out;
}

/** Spearman's rank correlation; null when either side does not vary. */
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const rx = ranks(x);
  const ry = ranks(y);
  const mean = (x.length + 1) / 2;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    const a = rx[i]! - mean;
    const b = ry[i]! - mean;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}

export type CityLink = { name: string; rho: number };

/** Per city, how closely gusts follow the size of the pressure swing. */
export function linkByCity(days: readonly StormDay[]): CityLink[] {
  const groups = new Map<string, StormDay[]>();
  for (const d of days) {
    const group = groups.get(d.name);
    if (group) group.push(d);
    else groups.set(d.name, [d]);
  }
  const out: CityLink[] = [];
  for (const [name, group] of groups) {
    const rho = spearman(
      group.map((d) => Math.abs(d.pressure_change_24h)),
      group.map((d) => d.peak_gust),
    );
    if (rho !== null) out.push({ name, rho });
  }
  return out.sort((a, b) => b.rho - a.rho);
}

/** A correlation in words. Thresholds are presentation, not statistics. */
export function strength(rho: number): string {
  if (rho >= 0.4) return "Strong link";
  if (rho >= 0.25) return "Clear link";
  if (rho >= 0.1) return "Weak link";
  return "Little or no link";
}

/** The headline for the bins: how much windier the big swings are. */
export function swingSentence(bins: readonly Bin[], place: string): string {
  const calm = bins[0];
  const big = bins[bins.length - 1];
  if (!calm || !big || calm === big) return `There is not enough data for ${place} to compare.`;
  const ratio = big.median / calm.median;
  if (ratio < 1.1) return `In ${place}, big pressure swings do not bring noticeably stronger gusts.`;
  return (
    `In ${place}, days with a big pressure swing (${big.label}) have typical gusts of ` +
    `${Math.round(big.median)} km/h, against ${Math.round(calm.median)} km/h on steady days.`
  );
}
