import { useMemo, useState } from "react";

import type { Schemas } from "../api/client";
import { useClimateMatrix, useTheme } from "../api/hooks";
import { Plot } from "../components/Plot";
import { QueryState } from "../components/QueryState";
import { useMode } from "../theme/mode";
import { discreteScale, grid, METRIC_LABELS, orderCities, type Metric, type Sort } from "./climateMatrix";

export const meta = {
  title: "Climate Matrix",
  path: "/climate-matrix",
  question: "Which cities are seeing more extremes over time?",
  caption:
    "One cell per city and year, shaded by the number of days that ran more than 2.5σ from that city's own seasonal normal.",
};

const SORTS: Sort[] = ["Trend", "Total", "Name"];

export function ClimateMatrix() {
  const matrix = useClimateMatrix();
  const theme = useTheme();

  return (
    <section className="view">
      <h1>{meta.title}</h1>
      <p className="caption">{meta.caption}</p>
      <QueryState queries={[matrix, theme]}>
        {matrix.data && theme.data && <Matrix data={matrix.data} theme={theme.data} />}
      </QueryState>
    </section>
  );
}

function Matrix({ data, theme }: { data: Schemas["ClimateMatrix"]; theme: Schemas["Theme"] }) {
  const [metric, setMetric] = useState<Metric>("hot");
  const [sort, setSort] = useState<Sort>("Trend");
  const mode = useMode();
  const palette = theme[mode];

  const colours = metric === "net" ? palette.diverging : palette.sequential[metric];
  const labels = metric === "net" ? data.net_labels : data.count_labels;

  const figure = useMemo(() => {
    const order = orderCities(data.cells, data.trends, metric, sort);
    const g = grid(data.cells, metric, order, data.count_breaks, theme.neutral_index);
    return {
      data: [
        {
          type: "heatmap" as const,
          z: g.z,
          x: g.years,
          y: g.names,
          text: g.text,
          hovertemplate: "%{text}<extra></extra>",
          hoverongaps: true,
          colorscale: discreteScale(colours),
          zmin: 0,
          zmax: colours.length,
          showscale: false,
          // The gap is the surface showing through, which is also what an
          // un-ingested cell is: a hole reads as a wider gap, not a colour.
          xgap: 2,
          ygap: 2,
        },
      ],
      layout: {
        height: Math.max(320, 34 * g.names.length + 90),
        margin: { r: 8, t: 8, l: 8, b: 8 },
        paper_bgcolor: palette.chrome.surface,
        plot_bgcolor: palette.chrome.surface,
        font: { color: palette.chrome.ink_secondary },
        hoverlabel: { align: "left" as const },
        xaxis: { showgrid: false, ticks: "" as const, side: "bottom" as const, type: "category" as const, automargin: true },
        yaxis: { showgrid: false, ticks: "" as const, type: "category" as const, automargin: true },
        dragmode: false as const,
      },
    };
  }, [data, metric, sort, colours, palette, theme.neutral_index]);

  const ranking = data.trends
    .filter((t) => t[metric] !== null)
    .map((t) => ({ name: t.name, value: t[metric] as number }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="controls">
        <div role="radiogroup" aria-label="Anomalies" className="segmented">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
            <button key={m} role="radio" aria-checked={metric === m} onClick={() => setMetric(m)}>
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
        <label>
          Order cities by{" "}
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <Plot data={figure.data} layout={figure.layout} config={{ displayModeBar: false }} />

      <div className="below">
        <div>
          <p className="caption">
            {metric === "net" ? "Net anomaly days (hot − cold)" : `${METRIC_LABELS[metric]} anomaly days`} per
            city-year. A gap is a year that has not been ingested, not a year with none.
          </p>
          <ul className="key" aria-label="Colour key">
            {colours.map((colour, index) => (
              <li key={colour}>
                <span className="swatch" style={{ background: colour }} />
                {labels[index]}
              </li>
            ))}
          </ul>
        </div>
        <div>
          {ranking.length === 0 ? (
            <p className="caption">
              No city has {data.min_trend_years} scored years yet, so no trend is reported.
            </p>
          ) : (
            <table className="ranking">
              <caption>Trend, {METRIC_LABELS[metric].toLowerCase()} days per decade</caption>
              <tbody>
                {ranking.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td>{row.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
