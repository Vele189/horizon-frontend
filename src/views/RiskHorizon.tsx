import { useMemo, useState } from "react";

import type { Schemas } from "../api/client";
import { useRiskHorizon, useTheme } from "../api/hooks";
import { chartOptions, num, role, str } from "../charts/options";
import { GoogleChart } from "../components/GoogleChart";
import { QueryState } from "../components/QueryState";
import { cityDays, dailyEquivalent, percent, RISK_WORDS, riskStep, scored, shortDay } from "./riskHorizon";

export const meta = {
  title: "Risk Horizon",
  nav: "Week ahead",
  path: "/risk-horizon",
  question: "Which cities might see an extreme day in the next week?",
  caption:
    "A model estimates the chance that each city has at least one extreme hot or cold day in the coming seven days. Cities past the model's alert level are flagged.",
};

const MODE = "dark";

export function RiskHorizon() {
  const risk = useRiskHorizon();
  const theme = useTheme();
  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">{meta.nav}</p>
        <h1>{meta.question}</h1>
        <p className="caption">{meta.caption}</p>
      </header>
      <QueryState queries={[risk, theme]}>
        {risk.data && theme.data && <Outlook data={risk.data} theme={theme.data} />}
      </QueryState>
      <p className="disclaimer">
        This is a demonstration model, not a weather forecast. Do not plan anything around these numbers.
      </p>
    </section>
  );
}

function Outlook({ data, theme }: { data: Schemas["RiskHorizon"]; theme: Schemas["Theme"] }) {
  const palette = theme[MODE];
  const ranked = useMemo(() => scored(data.cities), [data.cities]);
  const missing = data.cities.filter((c) => !ranked.includes(c as (typeof ranked)[number]));
  const [picked, setPicked] = useState<string | null>(null);
  const city = ranked.find((c) => c.city_id === picked) ?? ranked[0];
  const flagged = ranked.filter((c) => c.prediction_label);

  const rows = useMemo(
    () => [
      [str("City"), num("Chance this week"), role("style"), role("annotation"), role("tooltip")],
      ...ranked.map((c) => {
        const step = riskStep(c.risk_score, c.decision_threshold, theme.risk_breaks);
        return [
          c.name,
          c.risk_score * 100,
          `color: ${palette.risk[step]}; opacity: ${c.city_id === city?.city_id ? 1 : 0.7}`,
          `${percent(c.risk_score)} · ${RISK_WORDS[step]}`,
          `${c.name}: ${percent(c.risk_score)} chance of an extreme day this week (${(RISK_WORDS[step] ?? "").toLowerCase()})`,
        ];
      }),
    ],
    [ranked, palette, theme.risk_breaks, city],
  );
  const options = useMemo(
    () =>
      chartOptions(palette.chrome, {
        hAxis: { title: "Chance of at least one extreme day (%)", viewWindow: { min: 0 }, format: "#'%'" },
        vAxis: { gridlines: { color: "transparent" } },
        chartArea: { left: 110, right: 140, top: 8, bottom: 44 },
        annotations: { alwaysOutside: true },
        bar: { groupWidth: "70%" },
      }),
    [palette],
  );

  if (ranked.length === 0) {
    return <p className="notice">No forecast has been scored yet.</p>;
  }
  const start = ranked[0]!.horizon_start;
  const length = ranked[0]!.horizon_days ?? 7;

  return (
    <>
      <p className="lede">
        {flagged.length === 0
          ? "No city is past the alert level"
          : `${flagged.length} ${flagged.length === 1 ? "city is" : "cities are"} flagged`}
        {start && ` for ${shortDay(start)} – ${shortDay(start, length - 1)}`}.
        {flagged.length > 0 && <span className="muted"> {flagged.map((c) => c.name).join(", ")}.</span>}
      </p>

      <div className="grid-2 wide-left">
        <div className="card">
          <h2>Chance of an extreme day this week</h2>
          <p className="caption">
            Alert level: {percent(ranked[0]!.decision_threshold)}. Click a city to see its days.
          </p>
          <GoogleChart
            type="BarChart"
            rows={rows}
            options={options}
            height={Math.max(180, 34 * ranked.length + 60)}
            onSelect={(row) => setPicked(ranked[row]?.city_id ?? null)}
            label="Chance of an extreme day this week, by city"
          />
          <ul className="key" aria-label="Colour key">
            {palette.risk.map((colour, index) => (
              <li key={colour}>
                <span className="swatch" style={{ background: colour }} />
                {RISK_WORDS[index]}
              </li>
            ))}
          </ul>
        </div>
        {city && <CityOutlook city={city} days={cityDays(data.days, city.city_id)} theme={theme} />}
      </div>

      {missing.length > 0 && (
        <p className="caption">
          No forecast yet for {missing.map((c) => c.name).join(", ")}: the model needs more measured history for these
          cities before it can score them.
        </p>
      )}
    </>
  );
}

function CityOutlook({
  city,
  days,
  theme,
}: {
  city: ReturnType<typeof scored>[number];
  days: Schemas["RiskDay"][];
  theme: Schemas["Theme"];
}) {
  const palette = theme[MODE];
  const threshold = city.decision_threshold;
  const top = Math.ceil(Math.max(threshold * 2.5, city.risk_score * 1.2) * 10) * 10;
  const gaugeRows = useMemo(() => [[str("Label"), num("Value")], ["This week", Math.round(city.risk_score * 1000) / 10]], [city]);
  const gaugeOptions = useMemo(
    () => ({
      max: top,
      min: 0,
      yellowFrom: threshold * 100,
      yellowTo: Math.min(threshold * 200, top),
      redFrom: Math.min(threshold * 200, top),
      redTo: top,
      yellowColor: palette.risk[3],
      redColor: palette.risk[4],
      minorTicks: 5,
      majorTicks: ["0%", "", "", "", `${top}%`],
      animation: { duration: 500, easing: "out" },
    }),
    [top, threshold, palette],
  );

  const daily = city.horizon_days ? dailyEquivalent(threshold, city.horizon_days) : null;
  const dayRows = useMemo(
    () => [
      [str("Day"), num("Chance that day"), role("style"), role("tooltip")],
      ...days.map((d) => {
        const step = daily ? riskStep(d.risk_score, daily, theme.risk_breaks) : 0;
        const label = shortDay(d.horizon_start, d.horizon_day - 1);
        return [
          label,
          d.risk_score * 100,
          `color: ${palette.risk[step]}`,
          `${label}: ${percent(d.risk_score)} chance, if the days before stay calm`,
        ];
      }),
    ],
    [days, daily, palette, theme.risk_breaks],
  );
  const dayOptions = useMemo(
    () =>
      chartOptions(palette.chrome, {
        vAxis: { title: "Chance that day (%)", viewWindow: { min: 0 }, format: "#.#'%'" },
        chartArea: { left: 56, bottom: 32 },
        bar: { groupWidth: "65%" },
      }),
    [palette],
  );

  return (
    <div className="card">
      <h2>{city.name}</h2>
      <p className="caption">{city.country}</p>
      <div className="gauge">
        <GoogleChart
          type="Gauge"
          rows={gaugeRows}
          options={gaugeOptions}
          height={200}
          label={`${city.name}: ${percent(city.risk_score)} chance this week`}
        />
      </div>
      <p className="lede center">
        {percent(city.risk_score)} chance this week
        {city.prediction_label ? <span className="tag tag-alert">Flagged</span> : null}
      </p>
      {days.length > 0 ? (
        <>
          <h3>Day by day</h3>
          <GoogleChart
            type="ColumnChart"
            rows={dayRows}
            options={dayOptions}
            height={200}
            label={`${city.name}: chance of an extreme day on each day`}
          />
          <p className="caption small">
            Each day is the chance of the week's first extreme day landing then. It comes from a separate day-by-day
            model, so the days do not add up to the weekly number.
          </p>
        </>
      ) : (
        <p className="caption small">This city has one number for the whole week; no day-by-day model covers it.</p>
      )}
    </div>
  );
}
