import { useQuery } from "@tanstack/react-query";

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
