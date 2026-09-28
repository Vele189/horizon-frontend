import { useSyncExternalStore } from "react";

export type Mode = "light" | "dark";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The viewer's colour scheme, following the operating system as it changes. */
export function useMode(): Mode {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(query).matches ? "dark" : "light"),
    () => "light",
  );
}
