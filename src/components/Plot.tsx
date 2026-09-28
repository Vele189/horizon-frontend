import { useEffect, useRef } from "react";

import type { Config, Data, Layout } from "plotly.js-dist-min";

type Props = {
  data: Data[];
  layout: Partial<Layout>;
  config?: Partial<Config>;
  className?: string;
};

/**
 * A thin wrapper over Plotly.react. Plotly is loaded on first use, so the
 * shell and navigation paint before the three-megabyte chart library arrives.
 */
export function Plot({ data, layout, config, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const node = ref.current;
    import("plotly.js-dist-min").then(({ default: Plotly }) => {
      if (cancelled || !node) return;
      void Plotly.react(node, data, layout, { responsive: true, ...config });
    });
    return () => {
      cancelled = true;
    };
  }, [data, layout, config]);

  useEffect(() => {
    const node = ref.current;
    return () => {
      if (node) void import("plotly.js-dist-min").then(({ default: Plotly }) => Plotly.purge(node));
    };
  }, []);

  return <div ref={ref} className={className} />;
}
