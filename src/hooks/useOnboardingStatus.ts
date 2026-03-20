// TerraFusion OS — Onboarding Status Hook
// Detects whether user needs onboarding (no county, no data, no study period).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OnboardingStatus {
  hasCounty: boolean;
  hasData: boolean;
  hasStudyPeriod: boolean;
  countyName: string | null;
  parcelCount: number;
  isComplete: boolean;
}

export interface AvailableCounty {
  id: string;
  name: string;
  fips_code: string;
  state: string;
}

export function useOnboardingStatus() {
  const { profile, user } = useAuthContext();

  return useQuery({
    queryKey: ["onboarding-status", profile?.county_id],
    queryFn: async (): Promise<OnboardingStatus> => {
      if (!profile?.county_id) {
        return {
          hasCounty: false,
          hasData: false,
          hasStudyPeriod: false,
          countyName: null,
          parcelCount: 0,
          isComplete: false,
        };
      }

      // Check county name, parcel count, and study periods in parallel
      const [countyRes, parcelRes, studyRes] = await Promise.all([
        supabase.from("counties").select("name").eq("id", profile.county_id).single(),
        supabase.from("parcels").select("id", { count: "exact", head: true }).eq("county_id", profile.county_id),
        supabase.from("study_periods").select("id", { count: "exact", head: true }).eq("county_id", profile.county_id),
      ]);

      const parcelCount = parcelRes.count ?? 0;
      const studyCount = studyRes.count ?? 0;

      return {
        hasCounty: true,
        hasData: parcelCount > 0,
        hasStudyPeriod: studyCount > 0,
        countyName: countyRes.data?.name ?? null,
        parcelCount,
        isComplete: parcelCount > 0,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

async function invokeSetup(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("county-setup", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Setup failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useListCounties() {
  return useQuery({
    queryKey: ["available-counties"],
    queryFn: async (): Promise<AvailableCounty[]> => {
      const data = await invokeSetup("list_counties");
      return data.counties ?? [];
    },
  });
}

export function useCreateCounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; fipsCode: string; state: string }) => {
      return invokeSetup("create_county", params);
    },
    onSuccess: (data) => {
      toast.success(data.isNewCounty ? "County created!" : "Joined existing county");
      qc.invalidateQueries({ queryKey: ["onboarding-status"] });
      // Force profile refresh by reloading
      window.location.reload();
    },
    onError: (err: Error) => {
      toast.error("Failed to set up county", { description: err.message });
    },
  });
}

export function useJoinCounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (countyId: string) => {
      return invokeSetup("join_county", { countyId });
    },
    onSuccess: (data) => {
      toast.success(`Joined ${data.countyName}`);
      qc.invalidateQueries({ queryKey: ["onboarding-status"] });
      window.location.reload();
    },
    onError: (err: Error) => {
      toast.error("Failed to join county", { description: err.message });
    },
  });
}
