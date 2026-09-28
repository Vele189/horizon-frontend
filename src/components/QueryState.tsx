import type { ReactNode } from "react";

import { ApiError } from "../api/client";

type Query = { isPending: boolean; error: Error | null };

/** Loading and failure, said the same way on every view. */
export function QueryState({ queries, children }: { queries: Query[]; children: ReactNode }) {
  const error = queries.find((q) => q.error)?.error;
  if (error) {
    const asleep = error instanceof ApiError && error.status === 503;
    return (
      <p role="alert" className="notice">
        {asleep
          ? "The warehouse did not answer. It may be waking from idle; try again in a few seconds."
          : `Could not load this view: ${error.message}`}
      </p>
    );
  }
  if (queries.some((q) => q.isPending)) {
    return <p className="notice">Reading the warehouse…</p>;
  }
  return <>{children}</>;
}
