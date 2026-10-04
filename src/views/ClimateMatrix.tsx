import { useMemo, useState } from "react";

import type { Schemas } from "../api/client";
import { useClimateMatrix, useTheme } from "../api/hooks";
import { chartOptions, num, role, str } from "../charts/options";
import { GoogleChart } from "../components/GoogleChart";
import { QueryState } from "../components/QueryState";
import { citySeries, orderCities, trendLine, trendSentence } from "./climateMatrix";

export const meta = {
  title: "Climate Matrix",
  nav: "Extremes over time",
  path: "/climate-matrix",
  question: "Are extreme hot and cold days becoming more common?",
  caption:
    "An extreme day is one far outside a city's normal range for that time of year. Each bar counts them in one year; the dashed line shows the long-run direction.",
};

type Kind = "hot" | "cold";

const MODE = "dark";

export function ClimateMatrix() {
  const matrix = useClimateMatrix();
  const theme = useTheme();

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">{meta.nav}</p>
        <h1>{meta.question}</h1>
        <p className="caption">{meta.caption}</p>
      </header>
      <QueryState queries={[matrix, theme]}>
        {matrix.data && theme.data && <Trends data={matrix.data} theme={theme.data} />}
      </QueryState>
    </section>
  );
}

function Trends({ data, theme }: { data: Schemas["ClimateMatrix"]; theme: Schemas["Theme"] }) {
  const [kind, setKind] = useState<Kind>("hot");
  const order = useMemo(() => orderCities(data.cells, data.trends, kind, "Trend"), [data, kind]);
  const [picked, setPicked] = useState<string | null>(null);
  const city = picked ?? order[0] ?? "";

  const palette = theme[MODE];
  const colour = palette.sequential[kind][palette.sequential[kind].length - 2]!;
  const opposite = palette.sequential[kind === "hot" ? "cold" : "hot"][3]!;
  const slope = data.trends.find((t) => t.name === city)?.[kind] ?? null;

  const yearly = useMemo(() => {
    const series = citySeries(data.cells, city, kind);
    const line = slope === null ? new Map<number, number>() : trendLine(series, slope);
    const noun = kind === "hot" ? "extreme hot days" : "extreme cold days";
    return [
      [
        str("Year"),
        num(kind === "hot" ? "Extreme hot days" : "Extreme cold days"),
        role("tooltip"),
        num("Long-run direction"),
        role("tooltip"),
      ],
      ...series.map((p) => [
        String(p.year),
        p.days,
        p.days === null ? `${p.year}: not measured yet` : `${p.year}: ${p.days} ${noun}`,
        line.has(p.year) ? Math.max(line.get(p.year)!, 0) : null,
        "Long-run direction",
      ]),
    ];
  }, [data.cells, city, kind, slope]);

  const yearlyOptions = useMemo(
    () =>
      chartOptions(palette.chrome, {
        seriesType: "bars",
        series: { 0: { color: colour }, 1: { type: "line", color: palette.chrome.ink, lineDashStyle: [6, 4], lineWidth: 2 } },
        bar: { groupWidth: "72%" },
        vAxis: { title: "Days in the year", viewWindow: { min: 0 }, format: "0" },
        hAxis: { showTextEvery: 4 },
        legend: { position: "top", alignment: "end" },
        chartArea: { top: 36 },
      }),
    [palette, colour],
  );

  const ranked = useMemo(
    () =>
      data.trends
        .filter((t) => t[kind] !== null)
        .map((t) => ({ name: t.name, value: t[kind] as number }))
        .sort((a, b) => b.value - a.value),
    [data.trends, kind],
  );

  const ranking = useMemo(
    () => [
      [str("City"), num("Change per decade"), role("style"), role("annotation"), role("tooltip")],
      ...ranked.map((r) => [
        r.name,
        r.value,
        `color: ${r.value >= 0 ? colour : opposite}; opacity: ${r.name === city ? 1 : 0.55}`,
        `${r.value > 0 ? "+" : ""}${r.value.toFixed(1)}`,
        `${r.name}: ${r.value > 0 ? "+" : ""}${r.value.toFixed(1)} ${kind} days a year, per decade`,
      ]),
    ],
    [ranked, colour, opposite, city, kind],
  );

  const rankingOptions = useMemo(
    () =>
      chartOptions(palette.chrome, {
        hAxis: { title: "Change in extreme days a year, per decade", format: "+#;−#;0" },
        vAxis: { gridlines: { color: "transparent" } },
        chartArea: { left: 110, right: 32, top: 8, bottom: 44 },
        bar: { groupWidth: "70%" },
      }),
    [palette],
  );

  return (
    <>
      <div className="toolbar">
        <div role="radiogroup" aria-label="Kind of extreme" className="segmented">
          <button role="radio" aria-checked={kind === "hot"} onClick={() => setKind("hot")}>
            Hot days
          </button>
          <button role="radio" aria-checked={kind === "cold"} onClick={() => setKind("cold")}>
            Cold days
          </button>
        </div>
        <label className="field inline">
          <span>City</span>
          <select value={city} onChange={(e) => setPicked(e.target.value)}>
            {order.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <p className="lede">{trendSentence(city, kind, slope, data.min_trend_years)}</p>
        <GoogleChart
          type="ComboChart"
          rows={yearly}
          options={yearlyOptions}
          height={340}
          label={`${kind === "hot" ? "Extreme hot" : "Extreme cold"} days per year in ${city}`}
        />
        <p className="caption small">A missing bar is a year not yet in the warehouse, not a year with none.</p>
      </div>

      <div className="card">
        <h2>Which cities are changing fastest?</h2>
        <p className="caption">
          Bars to the right mean more extreme {kind} days than there used to be. Click a city to see its years.
        </p>
        {ranked.length === 0 ? (
          <p className="notice">No city has {data.min_trend_years} measured years yet, so no trend is reported.</p>
        ) : (
          <GoogleChart
            type="BarChart"
            rows={ranking}
            options={rankingOptions}
            height={Math.max(200, 30 * ranked.length + 60)}
            onSelect={(row) => setPicked(ranked[row]?.name ?? null)}
            label={`Change in extreme ${kind} days per decade, by city`}
          />
        )}
      </div>
    </>
  );
}
