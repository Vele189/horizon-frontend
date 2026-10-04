/**
 * Google Charts, loaded once on first use.
 *
 * The library is only distributed from gstatic (there is no npm build), so the
 * loader script is injected at runtime rather than bundled. Views paint their
 * headings and controls first; the charts arrive a moment later.
 */

const LOADER = "https://www.gstatic.com/charts/loader.js";
const PACKAGES = ["corechart", "gauge"];

let ready: Promise<typeof google.visualization> | undefined;

function injectLoader(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== "undefined" && window.google.charts) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = LOADER;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Charts."));
    document.head.appendChild(script);
  });
}

export function loadGoogleCharts(): Promise<typeof google.visualization> {
  ready ??= injectLoader()
    .then(() => google.charts.load("current", { packages: PACKAGES }))
    .then(() => google.visualization)
    .catch((error: unknown) => {
      // Let a later view try again, rather than caching the failure forever.
      ready = undefined;
      throw error;
    });
  return ready;
}
