import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import { useStatus } from "./api/hooks";
import { AnomalyMap } from "./views/AnomalyMap";
import { ClimateMatrix } from "./views/ClimateMatrix";
import { RiskHorizon } from "./views/RiskHorizon";
import { StormDynamics } from "./views/StormDynamics";
import { anomalyMap, climateMatrix, riskHorizon, stormDynamics } from "./views";

// The order the proposal lists them in.
const NAV = [anomalyMap, climateMatrix, stormDynamics, riskHorizon];

export function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <p className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Horizon
        </p>
        <nav aria-label="Views">
          {NAV.map((view) => (
            <NavLink key={view.path} to={view.path} title={view.question}>
              {view.nav}
            </NavLink>
          ))}
        </nav>
        <Freshness />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to={anomalyMap.path} replace />} />
          <Route path={anomalyMap.path} element={<AnomalyMap />} />
          <Route path={climateMatrix.path} element={<ClimateMatrix />} />
          <Route path={stormDynamics.path} element={<StormDynamics />} />
          <Route path={riskHorizon.path} element={<RiskHorizon />} />
          <Route path="*" element={<Navigate to={anomalyMap.path} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Freshness() {
  const status = useStatus();
  if (!status.data) return null;
  return (
    <p className="freshness">
      Data to <b>{status.data.latest_observation ?? "—"}</b>
    </p>
  );
}
