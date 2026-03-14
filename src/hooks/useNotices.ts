// TerraFusion OS — Phase 29: Notices Hook
// Data Constitution: centralized queries/mutations for notices table

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent } from "@/services/terraTrace";

export interface Notice {
  id: string;
  parcel_id: string;
  county_id: string;
  notice_type: string;
  recipient_name: string | null;
  recipient_address: string | null;
  subject: string;
  body: string;
  status: string;
  ai_drafted: boolean;
  calibration_run_id: string | null;
  metadata: Record<string, unknown> | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  parcel?: {
    id: string;
    parcel_number: string;
    address: string;
  };
}

export function useNotices(parcelId?: string | null, statusFilter?: string) {
  return useQuery({
    queryKey: ["notices", parcelId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("notices")
        .select(`
          *,
          parcel:parcels!notices_parcel_id_fkey(id, parcel_number, address)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (parcelId) {
        query = query.eq("parcel_id", parcelId);
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notice[];
    },
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      parcel_id: string;
      county_id: string;
      notice_type: string;
      recipient_name?: string;
      recipient_address?: string;
      subject: string;
      body: string;
      ai_drafted?: boolean;
      calibration_run_id?: string;
      metadata?: Record<string, unknown>;
    }) => {
      assertWriteLane("notices", "dais");

      const { data, error } = await supabase
        .from("notices")
        .insert({
          parcel_id: params.parcel_id,
          county_id: params.county_id,
          notice_type: params.notice_type,
          recipient_name: params.recipient_name || null,
          recipient_address: params.recipient_address || null,
          subject: params.subject,
          body: params.body,
          status: "draft",
          ai_drafted: params.ai_drafted || false,
          calibration_run_id: params.calibration_run_id || null,
          metadata: params.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      await emitTraceEvent({
        parcelId: params.parcel_id,
        sourceModule: "dais",
        eventType: "notice_created",
        eventData: {
          noticeType: params.notice_type,
          aiDrafted: params.ai_drafted,
          recipient: params.recipient_name,
        },
        artifactType: "notice",
        artifactId: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useUpdateNoticeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noticeId, status }: { noticeId: string; status: string }) => {
      assertWriteLane("notices", "dais");

      const { data, error } = await supabase
        .from("notices")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", noticeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}
