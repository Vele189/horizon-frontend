import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import { useStatus } from "./api/hooks";
import { ClimateMatrix } from "./views/ClimateMatrix";
import { Pending } from "./views/Pending";
import { anomalyMap, climateMatrix, riskHorizon, stormDynamics } from "./views";

const NAV = [anomalyMap, climateMatrix, stormDynamics, riskHorizon];

export function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="brand">Horizon</p>
        <nav aria-label="Views">
          {NAV.map((view) => (
            <NavLink key={view.path} to={view.path}>
              {view.title}
            </NavLink>
          ))}
        </nav>
        <Freshness />
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to={climateMatrix.path} replace />} />
          <Route path={climateMatrix.path} element={<ClimateMatrix />} />
          <Route path={anomalyMap.path} element={<Pending view={anomalyMap} />} />
          <Route path={stormDynamics.path} element={<Pending view={stormDynamics} />} />
          <Route path={riskHorizon.path} element={<Pending view={riskHorizon} />} />
          <Route path="*" element={<Navigate to={climateMatrix.path} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Freshness() {
  const status = useStatus();
  if (!status.data) return null;
  return (
    <dl className="freshness">
      <dt>Observations to</dt>
      <dd>{status.data.latest_observation ?? "none"}</dd>
      <dt>Latest forecast</dt>
      <dd>{status.data.latest_forecast ?? "none"}</dd>
    </dl>
  );
}
