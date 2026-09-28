/**
 * Runtime configuration. Read from `window.__HORIZON__`, which `/config.js`
 * sets: a static file in development, written from environment variables by
 * the container at start-up. Nothing environment-specific is baked into the
 * build, so the same image runs in staging and production.
 */

declare global {
  interface Window {
    __HORIZON__?: { apiUrl?: string; dashboardUrl?: string };
  }
}

const runtime = typeof window === "undefined" ? undefined : window.__HORIZON__;

export const config = {
  apiUrl: (runtime?.apiUrl || "http://localhost:8000").replace(/\/+$/, ""),
  /** The Streamlit dashboard, linked from views not yet ported. Empty hides the link. */
  dashboardUrl: (runtime?.dashboardUrl || "").replace(/\/+$/, ""),
};
