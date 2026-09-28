import type { ViewMeta } from "./Pending";

export { meta as climateMatrix } from "./ClimateMatrix";

// The order the proposal lists them in, as in the dashboard's sidebar.
export const anomalyMap: ViewMeta = {
  title: "Anomaly Map",
  path: "/anomaly-map",
  question: "Where is it abnormally hot or cold right now?",
  caption: "",
};

export const stormDynamics: ViewMeta = {
  title: "Storm Dynamics",
  path: "/storm-dynamics",
  question: "Do pressure crashes track with wind extremes?",
  caption: "",
};

export const riskHorizon: ViewMeta = {
  title: "Risk Horizon",
  path: "/risk-horizon",
  question: "Which cities are flagged for the coming week?",
  caption: "",
};
