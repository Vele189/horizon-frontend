import { useEffect, useRef, useState } from "react";

import { loadGoogleCharts } from "../charts/google";

export type ChartType = "ColumnChart" | "BarChart" | "LineChart" | "ScatterChart" | "ComboChart" | "Gauge";

type Props = {
  type: ChartType;
  /** The first row is the header: labels, or column descriptions with roles. */
  rows: unknown[][];
  options: Record<string, unknown>;
  /** Fired with the data row index when the reader clicks a bar or point. */
  onSelect?: (row: number) => void;
  height: number;
  label: string;
};

type Drawable = {
  draw: (data: google.visualization.DataTable, options: unknown) => void;
  getSelection: () => { row?: number | null }[];
  clearChart: () => void;
};

/**
 * One Google chart. Redraws when its data or options change and when its box
 * is resized, since Google charts have a fixed pixel size once drawn.
 */
export function GoogleChart({ type, rows, options, onSelect, height, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let chart: Drawable | undefined;
    let cancelled = false;
    let draw = () => {};

    loadGoogleCharts().then(
      (viz) => {
        if (cancelled) return;
        const data = viz.arrayToDataTable(rows as never[]);
        chart = new viz[type](node) as unknown as Drawable;
        viz.events.addListener(chart, "select", () => {
          const picked = chart?.getSelection()[0];
          if (picked && typeof picked.row === "number") select.current?.(picked.row);
        });
        draw = () => chart?.draw(data, { height, ...options });
        draw();
      },
      () => !cancelled && setFailed(true),
    );

    const observer = new ResizeObserver(() => draw());
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      chart?.clearChart();
    };
  }, [type, rows, options, height]);

  if (failed) {
    return <p className="notice">The chart library could not be reached. Check your connection and reload.</p>;
  }
  return <div ref={ref} className="chart" style={{ minHeight: height }} role="img" aria-label={label} />;
}
