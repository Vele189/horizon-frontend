import type { Schemas } from "../api/client";

type Options = Record<string, unknown>;

const NESTED = ["hAxis", "vAxis", "legend", "chartArea", "tooltip", "annotations"] as const;

/**
 * Google chart options in the app's dark chrome. Axis, legend and area
 * settings passed in `extra` are merged one level deep, so a view can set an
 * axis title without restating the axis colours.
 */
export function chartOptions(chrome: Schemas["Chrome"], extra: Options = {}): Options {
  const text = { color: chrome.ink_secondary, fontSize: 12 };
  const axis = {
    textStyle: text,
    titleTextStyle: { color: chrome.ink_muted, fontSize: 12, italic: false },
    gridlines: { color: chrome.gridline },
    minorGridlines: { count: 0 },
    baselineColor: chrome.axis,
  };
  const base: Options = {
    backgroundColor: "transparent",
    fontName: "Inter, system-ui, sans-serif",
    fontSize: 12,
    legend: { position: "none", textStyle: text },
    hAxis: axis,
    vAxis: axis,
    chartArea: { left: 56, right: 16, top: 16, bottom: 40, width: "100%", height: "100%" },
    tooltip: { textStyle: { color: "#111", fontSize: 13 } },
    annotations: { textStyle: { color: chrome.ink, fontSize: 11 }, stem: { length: 4 } },
    animation: { duration: 300, easing: "out", startup: true },
  };
  const merged: Options = { ...base, ...extra };
  for (const key of NESTED) {
    if (extra[key] && typeof extra[key] === "object") {
      merged[key] = { ...(base[key] as Options), ...(extra[key] as Options) };
    }
  }
  return merged;
}

/*
 * Typed column headers. Google infers a column's type from its values, and a
 * column with no value at all (a city with no trend yet) cannot be inferred,
 * so every chart states its types.
 */
export const str = (label: string) => ({ label, type: "string" });
export const num = (label: string) => ({ label, type: "number" });
export const role = (name: "style" | "annotation" | "tooltip") => ({ role: name, type: "string" });
