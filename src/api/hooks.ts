import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { client, unwrap } from "./client";

// The marts change once a day, when the pipeline promotes. The API caches for
// six hours; the browser need not ask more than every half hour.
const FRESH = 30 * 60 * 1000;

export const useTheme = () =>
  useQuery({
    queryKey: ["theme"],
    queryFn: async () => unwrap(await client.GET("/v1/theme")),
    staleTime: Infinity,
  });

export const useStatus = () =>
  useQuery({
    queryKey: ["status"],
    queryFn: async () => unwrap(await client.GET("/v1/status")),
    staleTime: FRESH,
  });

export const useClimateMatrix = () =>
  useQuery({
    queryKey: ["climate-matrix"],
    queryFn: async () => unwrap(await client.GET("/v1/climate-matrix")),
    staleTime: FRESH,
  });

/** One day of the map. Without a day, the API answers with the last scored one. */
export const useAnomalies = (day: string | undefined) =>
  useQuery({
    queryKey: ["anomalies", day ?? "latest"],
    queryFn: async () => unwrap(await client.GET("/v1/anomalies", { params: { query: day ? { day } : {} } })),
    staleTime: FRESH,
    // Keep the last day on screen while the next one loads, so scrubbing the
    // timeline does not flash an empty map between days.
    placeholderData: keepPreviousData,
  });

export const useEvents = () =>
  useQuery({
    queryKey: ["events"],
    queryFn: async () => unwrap(await client.GET("/v1/events")),
    staleTime: Infinity,
  });

export const useStormDynamics = () =>
  useQuery({
    queryKey: ["storm-dynamics"],
    queryFn: async () => unwrap(await client.GET("/v1/storm-dynamics")),
    staleTime: FRESH,
  });

export const useRiskHorizon = () =>
  useQuery({
    queryKey: ["risk-horizon"],
    queryFn: async () => unwrap(await client.GET("/v1/risk-horizon")),
    staleTime: FRESH,
  });
