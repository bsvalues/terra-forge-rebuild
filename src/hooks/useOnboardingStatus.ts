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
      // Query counties table directly — RLS allows SELECT for everyone
      const { data, error } = await supabase
        .from("counties")
        .select("id, name, fips_code, state")
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateCounty() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: async (params: { name: string; fipsCode: string; state: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if county with same FIPS already exists
      const { data: existing } = await supabase
        .from("counties")
        .select("id")
        .eq("fips_code", params.fipsCode)
        .maybeSingle();

      let countyId: string;
      let isNewCounty = false;

      if (existing) {
        countyId = existing.id;
      } else {
        const { data: newCounty, error: createErr } = await supabase
          .from("counties")
          .insert({ name: params.name, fips_code: params.fipsCode, state: params.state })
          .select("id")
          .single();
        if (createErr) throw new Error(createErr.message);
        countyId = newCounty.id;
        isNewCounty = true;
      }

      // Assign user to county via RPC (SECURITY DEFINER bypasses county_id lock)
      const { error: profileErr } = await (supabase as any)
        .rpc("assign_user_county", { target_county_id: countyId });
      if (profileErr) throw new Error(profileErr.message);

      return { success: true, countyId, isNewCounty };
    },
    onSuccess: (data) => {
      toast.success(data.isNewCounty ? "County created!" : "Joined existing county");
      qc.invalidateQueries({ queryKey: ["onboarding-status"] });
      window.location.reload();
    },
    onError: (err: Error) => {
      toast.error("Failed to set up county", { description: err.message });
    },
  });
}

export function useJoinCounty() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  return useMutation({
    mutationFn: async (countyId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Verify county exists
      const { data: county, error: fetchErr } = await supabase
        .from("counties")
        .select("id, name")
        .eq("id", countyId)
        .single();
      if (fetchErr || !county) throw new Error("County not found");

      // Assign user to county via RPC (SECURITY DEFINER bypasses county_id lock)
      const { error: profileErr } = await supabase
        .rpc("assign_user_county", { target_county_id: countyId });
      if (profileErr) throw new Error(profileErr.message);

      return { success: true, countyId, countyName: county.name };
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
