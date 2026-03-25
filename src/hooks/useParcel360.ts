// TerraFusion OS — Parcel360 Composed Snapshot Hook
// Orchestrates parallel queries to build the canonical read model

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useEffect } from "react";
import type {
  Parcel360Snapshot,
  Parcel360Identity,
  Parcel360Characteristics,
  Parcel360Valuation,
  Parcel360Sales,
  Parcel360Workflows,
  Parcel360Evidence,
  AssessmentRecord,
  SaleRecord,
  AppealSummary,
  ExemptionSummary,
  PermitSummary,
  TraceEventRecord,
  DomainLoadState,
} from "@/types/parcel360";
import { useQueryClient } from "@tanstack/react-query";

// ---- Domain queries (each independent) ----

function useParcelIdentity(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-identity", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("id", parcelId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

function useParcelAssessments(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-assessments", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("tax_year", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

function useParcelSalesQuery(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-sales", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("sale_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

function useParcelAppealsQuery(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-appeals", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeals")
        .select("id, parcel_id, county_id, study_period_id, appeal_date, hearing_date, resolution_date, original_value, requested_value, final_value, tax_year, status, resolution_type, notes, created_at, updated_at")
        .eq("parcel_id", parcelId!)
        .order("appeal_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

function useParcelExemptions(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-exemptions", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exemptions")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("application_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

function useParcelPermits(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-permits", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permits")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("application_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

function useParcelTraceEvents(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-trace", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trace_events")
        .select("*")
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!parcelId,
    staleTime: 10_000,
  });
}

function useParcelModelReceipts(parcelId: string | null) {
  return useQuery({
    queryKey: ["p360-receipts", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_receipts")
        .select("id, created_at, model_type")
        .eq("parcel_id", parcelId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
    staleTime: 30_000,
  });
}

// ---- Helper to make domain load state ----
function makeDomainState(loading: boolean, error: unknown): DomainLoadState {
  return { loading, error: error ? String(error) : null };
}

// ---- Main composed hook ----

export function useParcel360(parcelId: string | null): Parcel360Snapshot | null {
  const identity = useParcelIdentity(parcelId);
  const assessments = useParcelAssessments(parcelId);
  const sales = useParcelSalesQuery(parcelId);
  const appeals = useParcelAppealsQuery(parcelId);
  const exemptions = useParcelExemptions(parcelId);
  const permits = useParcelPermits(parcelId);
  const traceEvents = useParcelTraceEvents(parcelId);
  const receipts = useParcelModelReceipts(parcelId);
  const queryClient = useQueryClient();

  // Realtime subscription for trace_events — auto-invalidate
  useEffect(() => {
    if (!parcelId) return;

    const channel = supabase
      .channel(`p360-trace-${parcelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trace_events",
          filter: `parcel_id=eq.${parcelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["p360-trace", parcelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parcelId, queryClient]);

  return useMemo(() => {
    if (!parcelId || !identity.data) return null;

    const p = identity.data;
    const now = new Date().toISOString();

    // Identity
    const pAny = p as any;
    const identitySlice: Parcel360Identity = {
      parcelNumber: p.parcel_number,
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip_code,
      countyId: p.county_id,
      propertyClass: p.property_class,
      neighborhoodCode: p.neighborhood_code,
      lrsn: pAny.lrsn != null ? Number(pAny.lrsn) : null,
    };

    // Characteristics
    const characteristics: Parcel360Characteristics = {
      yearBuilt: p.year_built,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
      buildingArea: p.building_area ? Number(p.building_area) : null,
      landArea: p.land_area ? Number(p.land_area) : null,
      lat: p.latitude,
      lng: p.longitude,
    };

    // Valuation
    const assessmentHistory: AssessmentRecord[] = (assessments.data || []).map((a) => ({
      id: a.id,
      taxYear: a.tax_year,
      landValue: Number(a.land_value),
      improvementValue: Number(a.improvement_value),
      totalValue: a.total_value ? Number(a.total_value) : null,
      certified: a.certified ?? false,
      assessmentDate: a.assessment_date,
    }));

    const valuation: Parcel360Valuation = {
      assessedValue: Number(p.assessed_value),
      landValue: p.land_value ? Number(p.land_value) : null,
      improvementValue: p.improvement_value ? Number(p.improvement_value) : null,
      latestAssessment: assessmentHistory[0] || null,
      history: assessmentHistory,
    };

    // Sales
    const recentSales: SaleRecord[] = (sales.data || []).map((s) => ({
      id: s.id,
      saleDate: s.sale_date,
      salePrice: Number(s.sale_price),
      isQualified: s.is_qualified ?? false,
      grantor: s.grantor,
      grantee: s.grantee,
      deedType: s.deed_type,
      saleType: s.sale_type,
    }));

    const salesSlice: Parcel360Sales = {
      recentSales,
      qualifiedCount: recentSales.filter((s) => s.isQualified).length,
    };

    // Workflows
    const pendingAppeals: AppealSummary[] = (appeals.data || [])
      .filter((a) => a.status !== "resolved" && a.status !== "dismissed")
      .map((a) => ({
        id: a.id,
        status: a.status,
        appealDate: a.appeal_date,
        originalValue: Number(a.original_value),
        requestedValue: a.requested_value ? Number(a.requested_value) : null,
        finalValue: a.final_value ? Number(a.final_value) : null,
      }));

    const activeExemptions: ExemptionSummary[] = (exemptions.data || [])
      .filter((e) => e.status === "approved" || e.status === "pending")
      .map((e) => ({
        id: e.id,
        status: e.status,
        exemptionType: e.exemption_type,
        taxYear: e.tax_year,
      }));

    const CLOSED_PERMIT_STATUSES = ["completed", "cancelled", "passed", "failed", "expired"];
    const openPermits: PermitSummary[] = (permits.data || [])
      .filter((p) => !CLOSED_PERMIT_STATUSES.includes(p.status))
      .map((p) => ({
        id: p.id,
        status: p.status,
        permitType: p.permit_type,
        permitNumber: p.permit_number,
      }));

    const latestAssessment = assessmentHistory[0];
    const certificationStatus = latestAssessment
      ? latestAssessment.certified
        ? "certified" as const
        : "uncertified" as const
      : "unknown" as const;

    const workflows: Parcel360Workflows = {
      pendingAppeals,
      activeExemptions,
      openPermits,
      certificationStatus,
    };

    // Evidence
    const traceRecords: TraceEventRecord[] = (traceEvents.data || []).map((e: any) => ({
      id: e.id,
      createdAt: e.created_at,
      countyId: e.county_id,
      actorId: e.actor_id,
      parcelId: e.parcel_id,
      sourceModule: e.source_module,
      eventType: e.event_type,
      eventData: e.event_data,
      correlationId: e.correlation_id,
      causationId: e.causation_id,
      artifactType: e.artifact_type,
      artifactId: e.artifact_id,
    }));

    const receiptData = receipts.data || [];
    const evidence: Parcel360Evidence = {
      modelReceiptCount: receiptData.length,
      lastModelRun: receiptData[0]?.created_at || null,
      recentTraceEvents: traceRecords,
    };

    // Freshness
    const freshness = {
      identityAsOf: p.updated_at || now,
      valuationAsOf: assessmentHistory[0]?.assessmentDate || null,
      workflowsAsOf: appeals.data?.[0]?.updated_at || permits.data?.[0]?.updated_at || null,
      evidenceAsOf: traceRecords[0]?.createdAt || null,
    };

    // Missing domains
    const missingDomains: string[] = [];
    if (assessments.error) missingDomains.push("valuation");
    if (sales.error) missingDomains.push("sales");
    if (appeals.error || exemptions.error || permits.error) missingDomains.push("workflows");
    if (traceEvents.error || receipts.error) missingDomains.push("evidence");

    const domainStates = {
      identity: makeDomainState(identity.isLoading, identity.error),
      valuation: makeDomainState(assessments.isLoading, assessments.error),
      sales: makeDomainState(sales.isLoading, sales.error),
      workflows: makeDomainState(
        appeals.isLoading || exemptions.isLoading || permits.isLoading,
        appeals.error || exemptions.error || permits.error
      ),
      evidence: makeDomainState(
        traceEvents.isLoading || receipts.isLoading,
        traceEvents.error || receipts.error
      ),
    };

    return {
      parcelId,
      identity: identitySlice,
      characteristics,
      valuation,
      sales: salesSlice,
      workflows,
      evidence,
      freshness,
      missingDomains,
      isComplete: missingDomains.length === 0,
      domainStates,
    };
  }, [
    parcelId,
    identity.data, identity.isLoading, identity.error,
    assessments.data, assessments.isLoading, assessments.error,
    sales.data, sales.isLoading, sales.error,
    appeals.data, appeals.isLoading, appeals.error,
    exemptions.data, exemptions.isLoading, exemptions.error,
    permits.data, permits.isLoading, permits.error,
    traceEvents.data, traceEvents.isLoading, traceEvents.error,
    receipts.data, receipts.isLoading, receipts.error,
  ]);
}
