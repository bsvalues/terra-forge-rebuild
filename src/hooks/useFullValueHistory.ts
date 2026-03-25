// TerraFusion OS — Full Value History Hook
// Queries vw_full_value_history — the unified Ascend (pre-2015) + PACS (2015+) timeline.
// View created in migration: 20260323160000_ascend_staging_tables.sql

import { useQuery } from "@tanstack/react-query";
import { getFullValueHistory } from "@/services/ascendConnector";
import type { FullValueHistoryRow } from "@/types/data-models";

// ValueHistoryPoint aliases FullValueHistoryRow for chart component typing.
export type ValueHistoryPoint = FullValueHistoryRow;

/**
 * Fetches the full unified value timeline for a parcel from `vw_full_value_history`.
 * Covers Ascend pre-2015 and PACS 2015+ in a single sorted series.
 */
export function useFullValueHistory(parcelId: string | null) {
  return useQuery<FullValueHistoryRow[]>({
    queryKey: ["full-value-history", parcelId],
    queryFn: async () => getFullValueHistory(parcelId!),
    enabled: !!parcelId,
    staleTime: 300_000,
  });
}
