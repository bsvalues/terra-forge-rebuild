import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkConnectorHealth, type ConnectorHealthStatus } from "@/services/pacsConnector";

export interface SyncSourceStatus {
  sourceName: string;
  status: "live" | "staged" | "partial" | "manual" | "offline";
  lastSync: string | null;     // ISO timestamp
  recordCount: number | null;
  statusLabel: string;
}

export interface SyncStatusSummary {
  pacsHealth: ConnectorHealthStatus | null;
  sources: SyncSourceStatus[];
  checkedAt: string;
}

export function useSyncStatus(countyId: string | null) {
  return useQuery<SyncStatusSummary>({
    queryKey: ["sync-status", countyId],
    enabled: !!countyId,
    staleTime: 60_000,
    queryFn: async () => {
      const sources: SyncSourceStatus[] = [];

      // 1. PACS health check
      let pacsHealth: ConnectorHealthStatus | null = null;
      try {
        pacsHealth = await checkConnectorHealth();
      } catch {
        // Health check failed — leave null
      }

      // PACS SQL Server source
      sources.push({
        sourceName: "PACS SQL Server",
        status: pacsHealth?.connected ? "live" : pacsHealth?.error?.includes("Edge") ? "staged" : "offline",
        lastSync: null, // populated from sync_watermarks below
        recordCount: null,
        statusLabel: pacsHealth?.connected ? "Live" : pacsHealth?.error?.includes("Edge") ? "Staged" : "Offline",
      });

      // 2. Sync watermarks — latest timestamps per product
      if (countyId) {
        const { data: watermarks } = await supabase
          .from("sync_watermarks")
          .select("*")
          .eq("county_id", countyId)
          .order("last_success_at", { ascending: false });

        // Update PACS source with latest watermark containing "pacs"
        const pacsWatermark = (watermarks ?? []).find((w) =>
          w.product_id?.toLowerCase().includes("pacs")
        );
        if (pacsWatermark) {
          sources[0].lastSync = pacsWatermark.last_success_at ?? null;
          sources[0].recordCount = pacsWatermark.last_row_count ?? null;
        }
      }

      // 3. Ascend — check if data exists (always "staged" since it's pre-loaded)
      if (countyId) {
        const { count: ascendCount } = await (supabase.from as any)("ascend_values")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId);

        sources.push({
          sourceName: "Ascend/Proval",
          status: (ascendCount ?? 0) > 0 ? "staged" : "offline",
          lastSync: null,
          recordCount: ascendCount ?? 0,
          statusLabel: (ascendCount ?? 0) > 0 ? "Staged (Pre-2015)" : "Not loaded",
        });
      }

      // 4. Latest ingest jobs
      if (countyId) {
        const { data: jobs } = await supabase
          .from("ingest_jobs")
          .select("id, file_name, target_table, status, rows_imported, updated_at")
          .eq("county_id", countyId)
          .order("updated_at", { ascending: false })
          .limit(10);

        // ArcGIS source — match by target_table or file_name
        const arcgisJob = (jobs ?? []).find((j) =>
          j.target_table?.toLowerCase().includes("gis") ||
          j.target_table?.toLowerCase().includes("parcel") ||
          j.file_name?.toLowerCase().includes("arcgis")
        );
        sources.push({
          sourceName: "ArcGIS Parcels",
          status: arcgisJob ? "partial" : "manual",
          lastSync: arcgisJob?.updated_at ?? null,
          recordCount: arcgisJob?.rows_imported ?? null,
          statusLabel: arcgisJob ? `Last: ${arcgisJob.status}` : "Never synced",
        });

        // Assessor scrape source
        const scrapeJob = (jobs ?? []).find((j) =>
          j.target_table?.toLowerCase().includes("scrape") ||
          j.target_table?.toLowerCase().includes("assessor") ||
          j.file_name?.toLowerCase().includes("scrape")
        );
        sources.push({
          sourceName: "Assessor Scrape",
          status: scrapeJob ? "partial" : "manual",
          lastSync: scrapeJob?.updated_at ?? null,
          recordCount: scrapeJob?.rows_imported ?? null,
          statusLabel: scrapeJob ? `Last: ${scrapeJob.status}` : "Never run",
        });
      }

      // 5. CostForge schedules (always static reference data)
      sources.push({
        sourceName: "CostForge Schedules",
        status: "staged",
        lastSync: null,
        recordCount: null,
        statusLabel: "Static reference data",
      });

      // 6. Get parcel count for context
      if (countyId) {
        const { count } = await supabase
          .from("parcels")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId);

        const pacsSource = sources.find((s) => s.sourceName === "PACS SQL Server");
        if (pacsSource && pacsSource.recordCount == null) {
          pacsSource.recordCount = count ?? null;
        }
      }

      return {
        pacsHealth,
        sources,
        checkedAt: new Date().toISOString(),
      };
    },
  });
}
