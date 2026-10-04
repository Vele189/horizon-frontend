import { useMemo, useState } from "react";

import type { Schemas } from "../api/client";
import { useStormDynamics, useTheme } from "../api/hooks";
import { chartOptions, num, role, str } from "../charts/options";
import { GoogleChart } from "../components/GoogleChart";
import { QueryState } from "../components/QueryState";
import { gustsBySwing, linkByCity, strength, swingSentence, type StormDay } from "./stormDynamics";

export const meta = {
  title: "Storm Dynamics",
  nav: "Wind & pressure",
  path: "/storm-dynamics",
  question: "When air pressure changes fast, does the wind get stronger?",
  caption:
    "A fast change in air pressure, up or down, usually means a storm system is passing. Each day is grouped by how much the pressure moved in 24 hours, and we compare the strongest gust that day.",
};

const ALL = "All cities";
const MODE = "dark";

export function StormDynamics() {
  const storms = useStormDynamics();
  const theme = useTheme();
  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">{meta.nav}</p>
        <h1>{meta.question}</h1>
        <p className="caption">{meta.caption}</p>
      </header>
      <QueryState queries={[storms, theme]}>
        {storms.data && theme.data && <Storms days={storms.data} theme={theme.data} />}
      </QueryState>
    </section>
  );
}

function Storms({ days, theme }: { days: StormDay[]; theme: Schemas["Theme"] }) {
  const [city, setCity] = useState(ALL);
  const palette = theme[MODE];
  const names = useMemo(() => [...new Set(days.map((d) => d.name))].sort(), [days]);
  const shown = useMemo(() => (city === ALL ? days : days.filter((d) => d.name === city)), [days, city]);
  const place = city === ALL ? "these cities" : city;

  const bins = useMemo(() => gustsBySwing(shown), [shown]);
  const binRows = useMemo(
    () => [
      [str("Pressure swing"), num("Typical gust"), role("tooltip"), num("Windy days (1 in 10)"), role("tooltip")],
      ...bins.map((b) => [
        b.label,
        Math.round(b.median),
        `${b.label}: typical gust ${Math.round(b.median)} km/h (${b.days.toLocaleString()} days)`,
        Math.round(b.windy),
        `${b.label}: 1 day in 10 gusts above ${Math.round(b.windy)} km/h`,
      ]),
    ],
    [bins],
  );
  const binOptions = useMemo(
    () =>
      chartOptions(palette.chrome, {
        colors: [palette.sequential.cold[2], palette.sequential.cold[4]],
        vAxis: { title: "Strongest gust (km/h)", viewWindow: { min: 0 } },
        hAxis: { title: "How much the pressure moved in 24 hours" },
        legend: { position: "top", alignment: "end" },
        chartArea: { top: 36, bottom: 56 },
        bar: { groupWidth: "70%" },
      }),
    [palette],
  );

  const links = useMemo(() => linkByCity(days), [days]);
  const linkRows = useMemo(
    () => [
      [str("City"), num("Link"), role("style"), role("annotation"), role("tooltip")],
      ...links.map((l) => [
        l.name,
        Math.max(l.rho, 0),
        `color: ${palette.emphasis}; opacity: ${city === ALL || city === l.name ? 0.9 : 0.35}`,
        strength(l.rho),
        `${l.name}: ${strength(l.rho).toLowerCase()} (ρ ${l.rho.toFixed(2)})`,
      ]),
    ],
    [links, palette, city],
  );
  const linkOptions = useMemo(
    () =>
      chartOptions(palette.chrome, {
        hAxis: { title: "How closely gusts follow pressure swings", viewWindow: { min: 0, max: 0.6 }, textPosition: "none" },
        vAxis: { gridlines: { color: "transparent" } },
        chartArea: { left: 110, right: 120, top: 8, bottom: 32 },
        annotations: { alwaysOutside: true },
        bar: { groupWidth: "70%" },
      }),
    [palette],
  );

  const scatterRows = useMemo(
    () => [
      [num("Pressure change (hPa)"), num("Strongest gust (km/h)"), role("tooltip")],
      ...shown.map((d) => [
        d.pressure_change_24h,
        d.peak_gust,
        `${d.name}, ${d.date_key}\n${d.pressure_change_24h > 0 ? "+" : ""}${d.pressure_change_24h.toFixed(1)} hPa · ${d.peak_gust.toFixed(0)} km/h`,
      ]),
    ],
    [shown],
  );
  const scatterOptions = useMemo(
    () =>
      chartOptions(palette.chrome, {
        colors: [palette.emphasis],
        pointSize: 3,
        dataOpacity: 0.45,
        hAxis: { title: "Pressure change over 24 hours (hPa): falling ← → rising" },
        vAxis: { title: "Strongest gust (km/h)", viewWindow: { min: 0 } },
        chartArea: { bottom: 56 },
        animation: { duration: 0 },
      }),
    [palette],
  );

  return (
    <>
      <div className="toolbar">
        <label className="field inline">
          <span>City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option>{ALL}</option>
            {names.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <p className="lede">{swingSentence(bins, place)}</p>
        <GoogleChart
          type="ColumnChart"
          rows={binRows}
          options={binOptions}
          height={320}
          label={`Typical gusts by size of pressure swing, ${place}`}
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Where does this matter most?</h2>
          <p className="caption">
            Cities under a storm track feel it strongly; in the tropics, wind follows other rules. Click a city to look
            closer.
          </p>
          <GoogleChart
            type="BarChart"
            rows={linkRows}
            options={linkOptions}
            height={Math.max(200, 28 * links.length + 50)}
            onSelect={(row) => setCity(links[row]?.name ?? ALL)}
            label="How closely gusts follow pressure swings, by city"
          />
        </div>

        <div className="card">
          <h2>Every day, one dot</h2>
          {city === ALL ? (
            <p className="notice">Pick a city to see each of its days.</p>
          ) : (
            <>
              <p className="caption">
                Both sides of the V are windy: the sharp fall as a storm arrives, and the sharp rise behind it.
              </p>
              <GoogleChart
                type="ScatterChart"
                rows={scatterRows}
                options={scatterOptions}
                height={360}
                label={`Each day's pressure change against its strongest gust, ${city}`}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
