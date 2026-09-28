import { config } from "../config";

export type ViewMeta = { title: string; path: string; question: string; caption: string };

/** A view not yet ported from the Streamlit dashboard. */
export function Pending({ view }: { view: ViewMeta }) {
  return (
    <section className="view">
      <h1>{view.title}</h1>
      <p className="caption">{view.question}</p>
      <p className="notice">
        This view has not been ported yet.
        {config.dashboardUrl && (
          <>
            {" "}
            It is live on the <a href={`${config.dashboardUrl}/${view.path.replace(/^\//, "")}`}>dashboard</a>.
          </>
        )}
      </p>
    </section>
  );
}
