// TerraFusion OS — Phase 34: Batch Notice Hook
// Constitutional owner: TerraDais (notices)
// Governed hook for batch notice job CRUD and bulk notice operations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertWriteLane } from "@/services/writeLane";
import { emitTraceEvent } from "@/services/terraTrace";
import { invokeDraftNotice } from "@/services/ingestService";
import { useActiveCountyId } from "@/hooks/useActiveCounty";

export interface BatchNoticeJob {
  id: string;
  county_id: string;
  neighborhood_code: string | null;
  property_class: string | null;
  filters: Record<string, unknown>;
  total_parcels: number;
  notices_generated: number;
  notices_failed: number;
  ai_drafted_count: number;
  status: string;
  calibration_run_id: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export function useBatchNoticeJobs(statusFilter?: string) {
  const countyId = useActiveCountyId();

  return useQuery({
    queryKey: ["batch-notice-jobs", countyId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("batch_notice_jobs")
        .select("*")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BatchNoticeJob[];
    },
    enabled: !!countyId,
  });
}

export function useBatchNoticesByJob(jobId: string | null) {
  return useQuery({
    queryKey: ["notices-by-batch", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("notices")
        .select(`
          *,
          parcel:parcels!notices_parcel_id_fkey(id, parcel_number, address)
        `)
        .eq("batch_job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });
}

interface BatchGenerateParams {
  neighborhoodCode?: string;
  propertyClass?: string;
  useAI: boolean;
  aiLimit: number;
}

export function useCreateBatchNoticeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BatchGenerateParams) => {
      assertWriteLane("notices", "dais");

      // 1. Fetch eligible parcels with assessments that have value changes
      let parcelQuery = supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, county_id, neighborhood_code, property_class")
        .limit(500);

      if (params.neighborhoodCode) {
        parcelQuery = parcelQuery.eq("neighborhood_code", params.neighborhoodCode);
      }
      if (params.propertyClass) {
        parcelQuery = parcelQuery.eq("property_class", params.propertyClass);
      }

      const { data: parcels, error: pErr } = await parcelQuery;
      if (pErr) throw pErr;
      if (!parcels || parcels.length === 0) throw new Error("No parcels match the selected filters");

      const countyId = parcels[0].county_id;

      // 2. Create batch job record
      const { data: job, error: jErr } = await supabase
        .from("batch_notice_jobs")
        .insert([{
          county_id: countyId,
          neighborhood_code: params.neighborhoodCode || null,
          property_class: params.propertyClass || null,
          filters: {
            neighborhoodCode: params.neighborhoodCode,
            propertyClass: params.propertyClass,
            useAI: params.useAI,
            aiLimit: params.aiLimit,
          } as Record<string, unknown>,
          total_parcels: parcels.length,
          status: "running",
        }])
        .select()
        .single();

      if (jErr) throw jErr;

      // 3. Generate notices for each parcel
      let generated = 0;
      let failed = 0;
      let aiDrafted = 0;
      const aiMax = params.useAI ? params.aiLimit : 0;

      for (let i = 0; i < parcels.length; i++) {
        const p = parcels[i];
        try {
          let body: string;
          const isAI = i < aiMax;

          if (isAI) {
            try {
              const aiData = await invokeDraftNotice({
                parcelNumber: p.parcel_number,
                address: p.address || "N/A",
                previousValue: p.assessed_value || 0,
                newValue: p.assessed_value || 0,
                neighborhoodCode: params.neighborhoodCode || p.neighborhood_code || "N/A",
                rSquared: "N/A",
                method: "Batch Generation",
                noticeType: "assessment_change",
              });
              body = aiData?.notice || generateTemplate(p);
              aiDrafted++;
            } catch {
              body = generateTemplate(p);
            }
          } else {
            body = generateTemplate(p);
          }

          await supabase.from("notices").insert([{
            parcel_id: p.id,
            county_id: countyId,
            notice_type: "assessment_change",
            subject: `Notice of Assessment — ${p.parcel_number}`,
            body,
            status: "draft",
            ai_drafted: isAI,
            batch_job_id: job.id,
            metadata: { batch: true } as Record<string, unknown>,
          }]);

          generated++;
        } catch {
          failed++;
        }
      }

      // 4. Update job with results
      await supabase
        .from("batch_notice_jobs")
        .update({
          notices_generated: generated,
          notices_failed: failed,
          ai_drafted_count: aiDrafted,
          status: "completed",
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", job.id);

      await emitTraceEvent({
        sourceModule: "dais",
        eventType: "batch_notices_generated",
        eventData: {
          jobId: job.id,
          total: parcels.length,
          generated,
          failed,
          aiDrafted,
          neighborhoodCode: params.neighborhoodCode,
        },
      });

      return { jobId: job.id, generated, failed, aiDrafted, total: parcels.length };
    },
    onSuccess: (_, __, ___) => {
      queryClient.invalidateQueries({ queryKey: ["batch-notice-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useBulkUpdateNoticeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, newStatus }: { jobId: string; newStatus: string }) => {
      assertWriteLane("notices", "dais");

      const { data: notices, error: fErr } = await supabase
        .from("notices")
        .select("id")
        .eq("batch_job_id", jobId)
        .eq("status", "draft");

      if (fErr) throw fErr;
      if (!notices || notices.length === 0) return { updated: 0 };

      // Update in batches of 100
      let updated = 0;
      for (let i = 0; i < notices.length; i += 100) {
        const batch = notices.slice(i, i + 100).map(n => n.id);
        const { error } = await supabase
          .from("notices")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in("id", batch);
        if (!error) updated += batch.length;
      }

      await emitTraceEvent({
        sourceModule: "dais",
        eventType: "batch_notices_status_changed",
        eventData: { jobId, newStatus, count: updated },
      });

      return { updated };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-notice-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["notices-by-batch"] });
    },
  });
}

function generateTemplate(parcel: { parcel_number: string; address: string | null; assessed_value: number | null }): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `NOTICE OF ASSESSMENT
County Assessor's Office
${date}

Property Owner
${parcel.address || "[Address]"}

RE: Assessment Notice — Parcel ${parcel.parcel_number}

Dear Property Owner,

This notice is to inform you of the current assessed value of your property located at ${parcel.address || "[Address]"} (Parcel Number: ${parcel.parcel_number}).

CURRENT ASSESSED VALUE: $${(parcel.assessed_value || 0).toLocaleString()}

RIGHT TO APPEAL:
You have the right to appeal this assessment within 30 days of the date of this notice. To file an appeal, please contact the County Assessor's Office.

Sincerely,
County Assessor's Office`;
}
