// TerraFusion OS — Mission Preview Hook
// Constitutional: server-side preview via get_mission_preview() RPC

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MissionPreviewRow {
  parcel_id?: string;
  apn?: string;
  situs?: string;
  neighborhood?: string;
  property_class?: string;
  why_flagged: string;
  [key: string]: any;
}

export interface MissionPreviewResult {
  mission_id: string;
  as_of: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  confidence_reason: string;
  total: number;
  scope: Record<string, any>;
  context: Record<string, any>;
  rows: MissionPreviewRow[];
}

export function useMissionPreview(missionId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["mission-preview", missionId, limit],
    queryFn: async (): Promise<MissionPreviewResult> => {
      const { data, error } = await supabase.rpc("get_mission_preview", {
        p_mission_id: missionId!,
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw error;
      return data as unknown as MissionPreviewResult;
    },
    enabled: !!missionId,
    staleTime: 60_000,
  });
}
