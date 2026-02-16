// TerraFusion OS — Field-Updated Cohort Hook
// Tracks parcels with recent field observations for recalibration filtering

import { useState, useEffect, useCallback } from "react";
import { getAssignments, type FieldAssignment } from "@/services/fieldStore";

export interface FieldCohortParcel {
  parcelId: string;
  parcelNumber: string;
  address: string;
  inspectedAt: string;
}

/**
 * Returns parcels that have been recently field-inspected.
 * Useful for Factory/VEI cohort filtering: "Recently Inspected" strata.
 */
export function useFieldCohort() {
  const [cohort, setCohort] = useState<FieldCohortParcel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const completed = await getAssignments("completed");
      const synced = await getAssignments("synced");
      const all: FieldAssignment[] = [...completed, ...synced];

      const mapped: FieldCohortParcel[] = all
        .filter((a) => a.inspectedAt)
        .sort((a, b) => new Date(b.inspectedAt!).getTime() - new Date(a.inspectedAt!).getTime())
        .map((a) => ({
          parcelId: a.parcelId,
          parcelNumber: a.parcelNumber,
          address: a.address,
          inspectedAt: a.inspectedAt!,
        }));

      setCohort(mapped);
    } catch {
      setCohort([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cohort, loading, refresh, count: cohort.length };
}
