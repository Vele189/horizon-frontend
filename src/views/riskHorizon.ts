/**
 * Risk Horizon presentation logic, ported from
 * `horizon-backend/dashboard/views/risk_horizon.py` and `dashboard/theme.py`.
 *
 * Risk steps are multiples of the model's own decision threshold, at `>=` as
 * the warehouse's `prediction_label` is, so "in one of the top two steps" and
 * "the model said yes" are the same statement.
 */

import type { Schemas } from "../api/client";

export type RiskCity = Schemas["RiskCity"];
export type RiskDay = Schemas["RiskDay"];

export function riskStep(score: number, threshold: number, breaks: readonly number[]): number {
  if (threshold <= 0) throw new Error("a decision threshold of zero has no scale");
  return breaks.filter((multiple) => score >= multiple * threshold).length;
}

/** Words for the five steps. The top two are the model's alert. */
export const RISK_WORDS = ["Very low", "Low", "Raised", "Alert", "High alert"] as const;

/**
 * The per-day hazard that would compose to the weekly threshold: seven days
 * each at `h` compose to `1 - (1 - h)^7`. Day cells are judged against this,
 * because a daily hazard and a weekly probability are different quantities.
 */
export function dailyEquivalent(threshold: number, horizonDays: number): number {
  if (!(threshold >= 0 && threshold < 1)) throw new Error(`a weekly threshold outside [0, 1): ${threshold}`);
  if (horizonDays < 1) throw new Error(`a horizon of ${horizonDays} days has no daily share`);
  return 1 - (1 - threshold) ** (1 / horizonDays);
}

export function percent(p: number): string {
  const v = p * 100;
  return v < 1 ? `${v.toFixed(1)}%` : `${v.toFixed(0)}%`;
}

export function shortDay(day: string, offset = 0): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
}

/** Scored cities, highest weekly risk first. */
export function scored(cities: readonly RiskCity[]): (RiskCity & { risk_score: number; decision_threshold: number })[] {
  return cities
    .filter((c): c is RiskCity & { risk_score: number; decision_threshold: number } =>
      c.risk_score !== null && c.decision_threshold !== null && c.decision_threshold > 0,
    )
    .sort((a, b) => b.risk_score - a.risk_score);
}

/** A city's per-day hazards in horizon order, empty where none were written. */
export function cityDays(days: readonly RiskDay[], cityId: string): RiskDay[] {
  return days.filter((d) => d.city_id === cityId).sort((a, b) => a.horizon_day - b.horizon_day);
}
