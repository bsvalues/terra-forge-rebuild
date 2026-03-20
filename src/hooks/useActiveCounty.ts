import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

export function useActiveCountyId() {
  const { profile } = useAuthContext();
  return profile?.county_id ?? null;
}

export function useHasActiveCounty() {
  const countyId = useActiveCountyId();
  return useMemo(() => !!countyId, [countyId]);
}
