// TerraFusion OS — Phase 53: County Configuration Hook
// Constitutional: All DB access routed through governed hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEventAsync } from "@/services/terraTrace";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

// ── Typed County Config Schema ────────────────────────────────────
export interface CountyConfig {
  // Tax & Assessment
  current_tax_year: number;
  assessment_cycle: "annual" | "biennial" | "triennial";
  assessment_date: string | null; // ISO date
  levy_date: string | null;

  // Valuation defaults
  default_land_rate_per_acre: number | null;
  default_improvement_depreciation_pct: number | null;
  cost_index_year: number | null;

  // Module toggles
  modules_enabled: {
    forge: boolean;
    atlas: boolean;
    dais: boolean;
    dossier: boolean;
    income_approach: boolean;
    cost_approach: boolean;
    avm: boolean;
  };

  // Notification & workflow
  auto_notice_on_value_change: boolean;
  appeal_window_days: number;
  require_supervisor_approval: boolean;

  // Display
  currency_symbol: string;
  area_unit: "sqft" | "acres" | "sqm";
  coordinate_display: "decimal" | "dms";
}

const DEFAULT_CONFIG: CountyConfig = {
  current_tax_year: new Date().getFullYear(),
  assessment_cycle: "annual",
  assessment_date: null,
  levy_date: null,
  default_land_rate_per_acre: null,
  default_improvement_depreciation_pct: null,
  cost_index_year: null,
  modules_enabled: {
    forge: true,
    atlas: true,
    dais: true,
    dossier: true,
    income_approach: true,
    cost_approach: true,
    avm: true,
  },
  auto_notice_on_value_change: false,
  appeal_window_days: 30,
  require_supervisor_approval: false,
  currency_symbol: "$",
  area_unit: "sqft",
  coordinate_display: "decimal",
};

export interface CountyRecord {
  id: string;
  name: string;
  state: string;
  fips_code: string;
  config: CountyConfig;
  created_at: string;
  updated_at: string;
}

// ── Read Hook ─────────────────────────────────────────────────────
export function useCountyConfig() {
  const countyId = useActiveCountyId();

  return useQuery<CountyRecord | null>({
    queryKey: ["county-config", countyId],
    queryFn: async () => {
      if (!countyId) return null;

      const { data, error } = await supabase
        .from("counties")
        .select("id, name, state, fips_code, config, created_at, updated_at")
        .eq("id", countyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const storedConfig = (data.config as Partial<CountyConfig>) ?? {};
      return {
        ...data,
        config: { ...DEFAULT_CONFIG, ...storedConfig },
      } as CountyRecord;
    },
    enabled: !!countyId,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Update County Metadata ────────────────────────────────────────
export function useUpdateCountyMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name: string; state: string; fips_code: string }) => {
      const { error } = await supabase
        .from("counties")
        .update({ name: params.name, state: params.state, fips_code: params.fips_code })
        .eq("id", params.id);
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "county_config_updated",
        eventData: { section: "metadata", name: params.name, state: params.state },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["county-config"] });
      qc.invalidateQueries({ queryKey: ["county-meta"] });
    },
  });
}

// ── Update County Config JSONB ────────────────────────────────────
export function useUpdateCountyConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; config: Partial<CountyConfig>; section: string }) => {
      // Read current config, merge, write back
      const { data: current } = await supabase
        .from("counties")
        .select("config")
        .eq("id", params.id)
        .single();

      const merged = { ...(current?.config as object ?? {}), ...params.config };

      const { error } = await supabase
        .from("counties")
        .update({ config: merged })
        .eq("id", params.id);
      if (error) throw error;

      emitTraceEventAsync({
        sourceModule: "os",
        eventType: "county_config_updated",
        eventData: { section: params.section, changes: params.config },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["county-config"] });
    },
  });
}
