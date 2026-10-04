/**
 * Anomaly Map presentation logic, ported from
 * `horizon-backend/dashboard/views/anomaly_map.py` and `dashboard/theme.py`.
 *
 * The colour step and the rarity phrase follow the Python exactly, so the map
 * and the warehouse agree on what counts as an anomaly. The plain-English
 * labels are new: they put words on the nine steps for a reader who does not
 * think in standard deviations.
 */

import type { Schemas } from "../api/client";

export type City = Schemas["AnomalyCity"];
export type Layer = "anomaly" | "temperature";

/**
 * Index into the nine-step diverging ramp for a signed Z-score. Strictly
 * greater at each break, because the warehouse flags `abs(z) > threshold`.
 */
export function anomalyStep(z: number, breaks: readonly number[], neutralIndex: number): number {
  const distance = breaks.filter((boundary) => Math.abs(z) > boundary).length;
  if (distance === 0) return neutralIndex;
  return neutralIndex + (z > 0 ? distance : -distance);
}

/** Words for the nine steps, cold pole first, matching the ramp's order. */
export const STEP_LABELS = [
  "Extremely cold",
  "Very cold",
  "Colder than usual",
  "A little cooler",
  "Normal",
  "A little warmer",
  "Warmer than usual",
  "Very warm",
  "Extremely warm",
] as const;

/**
 * Air-temperature ramp for the Temperature layer, in the order weather maps
 * have taught most readers: violet for deep cold through to dark red heat.
 */
export const TEMPERATURE_STOPS: readonly [number, string][] = [
  [-30, "#8e3dbd"],
  [-20, "#5a4fcf"],
  [-10, "#3a7bd5"],
  [0, "#4fb4d8"],
  [8, "#5cc49a"],
  [15, "#a6d65a"],
  [22, "#f2d64b"],
  [28, "#f59c35"],
  [34, "#e4502e"],
  [40, "#a5162a"],
];

function hex(colour: string): [number, number, number] {
  const n = parseInt(colour.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Dark or light text, whichever reads on this background. */
export function inkOn(background: string): string {
  const [r, g, b] = hex(background).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // The crossover where black and white text have equal contrast.
  return luminance > 0.179 ? "#0d0d0d" : "#ffffff";
}

/** The ramp's colour at a temperature, interpolated between its stops. */
export function temperatureColour(celsius: number): string {
  const stops = TEMPERATURE_STOPS;
  if (celsius <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i]!;
    if (celsius <= t1) {
      const [t0, c0] = stops[i - 1]!;
      const f = (celsius - t0) / (t1 - t0);
      const a = hex(c0);
      const b = hex(c1);
      const mix = a.map((v, k) => Math.round(v + (b[k]! - v) * f));
      return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return stops[stops.length - 1]![1];
}

export function signed(value: number, digits = 1): string {
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return text;
  return value > 0 ? `+${text}` : `−${text}`;
}

/** What the city's pill on the map says, on each layer. */
export function pillText(city: City, layer: Layer): string {
  if (layer === "temperature") return city.observed_c === null ? "—" : `${Math.round(city.observed_c)}°`.replace("-", "−");
  return city.departure_c === null || city.z === null ? "—" : `${signed(city.departure_c)}°`;
}

/** The pill's colour, or null for a city with nothing to colour by. */
export function pillColour(
  city: City,
  layer: Layer,
  ramp: readonly string[],
  breaks: readonly number[],
  neutralIndex: number,
): string | null {
  if (layer === "temperature") return city.observed_c === null ? null : temperatureColour(city.observed_c);
  return city.z === null ? null : (ramp[anomalyStep(city.z, breaks, neutralIndex)] ?? null);
}

/**
 * How often a day this far out happens here, in the direction a reader thinks
 * in. Below a year that is "how often", above a year "one in how many years";
 * past where the fit is pinned down it is a floor, said as one.
 */
export function rarityPhrase(years: number, reportable: boolean): string {
  if (years < 1) {
    const perYear = 1 / years;
    return perYear >= 15 ? "A day this city sees most weeks" : `A day this city sees about ${perYear.toFixed(0)} times a year`;
  }
  const figure = years < 10 ? years.toFixed(1) : years.toFixed(0);
  return `${reportable ? "About" : "At least"} a 1-in-${figure}-year day here`;
}

/** The one-line answer at the top of a city's card. */
export function headline(city: City): string {
  if (city.z === null || city.departure_c === null) {
    return city.observed ? "Measured, but not enough history yet to say what normal is" : "No measurement for this day";
  }
  const amount = Math.abs(city.departure_c).toFixed(1);
  if (Number(amount) === 0) return "Right on its usual temperature";
  return `${amount}°C ${city.departure_c > 0 ? "warmer" : "colder"} than usual`;
}

/**
 * The rarity line, or null when the fit has nothing to say: no tail fitted for
 * the city, or an ordinary day below its tail threshold. Neither is drawn as
 * "not rare", because the fit was not consulted.
 */
export function rarityLine(city: City): string | null {
  if (!city.tail_fitted || city.return_years === null) return null;
  return rarityPhrase(city.return_years, Boolean(city.return_is_reportable));
}

/** Days from first to last inclusive, as ISO dates. Both ends are ISO dates. */
export function dayOffset(first: string, day: string): number {
  return Math.round((Date.parse(day) - Date.parse(first)) / 86_400_000);
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function longDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
