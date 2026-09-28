import createClient from "openapi-fetch";

import { config } from "../config";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];

export const client = createClient<paths>({ baseUrl: config.apiUrl });

/** An API failure, carrying the status so views can tell "asleep" from "broken". */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data;
  const detail =
    typeof result.error === "object" && result.error !== null && "detail" in result.error
      ? String((result.error as { detail: unknown }).detail)
      : result.response.statusText;
  throw new ApiError(result.response.status, detail);
}
