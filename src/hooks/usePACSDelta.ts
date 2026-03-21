// TerraFusion OS — Phase 90: PACS Delta Intelligence
// Computes row-level drift between live PACS SQL Server and TF canonical tables.
// Uses the read-only connector — never writes to PACS.

import { useQuery } from "@tanstack/react-query";
import {
  checkConnectorHealth,
  executeReadOnlyQuery,
  type ConnectorHealthStatus,
} from "@/services/pacsConnector";
import { supabase } from "@/integrations/supabase/client";
import { BENTON_COUNTY } from "@/config/pacsBentonContract";

// ── Public types ──────────────────────────────────────────────────────────────

/** Sync health status of a single data product */
export type PACSSyncStatus = "in-sync" | "drifted" | "stale" | "offline" | "unknown";

/** Row-level drift metrics for one monitored product */
export interface PACSDriftProduct {
  id: string;
  label: string;
  /** PACS source table (e.g. dbo.property) */
  pacsTable: string;
  /** TerraFusion canonical table (e.g. parcels) */
  tfTable: string;
  pacsCount: number | null;
  tfCount: number | null;
  /** pacsCount − tfCount; positive means PACS has unsynced records */
  drift: number | null;
  status: PACSSyncStatus;
}

/** Full delta report across all monitored products */
export interface PACSDeltaReport {
  connectionHealth: ConnectorHealthStatus;
  products: PACSDriftProduct[];
  totalPacsRows: number;
  totalTfRows: number;
  totalDrift: number;
  lastIngestJobAt: string | null;
  reportGeneratedAt: string;
}

// ── Product definitions ───────────────────────────────────────────────────────

interface DriftProductDef {
  id: string;
  label: string;
  pacsTable: string;
  pacsSql: string;
  tfTable: string;
}

const DRIFT_PRODUCTS: DriftProductDef[] = [
  {
    id: "parcels",
    label: "Parcel Inventory",
    pacsTable: "dbo.property",
    pacsSql: "SELECT COUNT(*) AS cnt FROM dbo.property",
    tfTable: "parcels",
  },
  {
    id: "property_val",
    label: "Property Values (Current Year)",
    pacsTable: "dbo.property_val",
    pacsSql:
      "SELECT COUNT(*) AS cnt FROM dbo.property_val WHERE prop_val_yr = YEAR(GETDATE())",
    tfTable: "assessments",
  },
  {
    id: "appeals",
    label: "Appeals (Current Year)",
    pacsTable: "dbo._arb_protest",
    pacsSql:
      "SELECT COUNT(*) AS cnt FROM dbo._arb_protest WHERE prop_val_yr = YEAR(GETDATE())",
    tfTable: "appeals",
  },
  {
    id: "neighborhoods",
    label: "Neighborhoods",
    pacsTable: "dbo.neighborhood",
    pacsSql: "SELECT COUNT(*) AS cnt FROM dbo.neighborhood",
    tfTable: "neighborhoods",
  },
];

/** Records with drift above this threshold are classified "stale" */
const STALE_THRESHOLD = 500;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * usePACSDeltaReport — Phase 90 core hook.
 *
 * Runs a connectivity check against the PACS edge-function proxy, then
 * (if live) issues COUNT(*) queries to each source table and compares
 * them to the TerraFusion canonical row counts for Benton County.
 *
 * When PACS is offline (stub env or SQL Server down), the hook returns
 * gracefully with `connectionHealth.connected = false` and null PACS counts.
 */
export function usePACSDeltaReport() {
  return useQuery<PACSDeltaReport>({
    queryKey: ["pacs-delta-report"],
    queryFn: async (): Promise<PACSDeltaReport> => {
      // 1. Connectivity probe — never throws (catches internally)
      const health = await checkConnectorHealth();

      // 2. Resolve Benton County ID from FIPS
      const { data: countyRow } = await supabase
        .from("counties")
        .select("id")
        .eq("fips_code", BENTON_COUNTY.fipsCode)
        .maybeSingle();
      const countyId = countyRow?.id ?? "";

      // 3. TerraFusion canonical counts (county-scoped, parallel)
      const [parcelsR, assessmentsR, appealsR, neighborhoodsR] =
        await Promise.allSettled([
          supabase
            .from("parcels")
            .select("id", { count: "exact", head: true })
            .eq("county_id", countyId),
          supabase
            .from("assessments")
            .select("id", { count: "exact", head: true })
            .eq("county_id", countyId),
          supabase
            .from("appeals")
            .select("id", { count: "exact", head: true })
            .eq("county_id", countyId),
          supabase
            .from("neighborhoods")
            .select("id", { count: "exact", head: true })
            .eq("county_id", countyId),
        ]);

      const tfCounts: (number | null)[] = [
        parcelsR.status === "fulfilled" ? (parcelsR.value.count ?? null) : null,
        assessmentsR.status === "fulfilled"
          ? (assessmentsR.value.count ?? null)
          : null,
        appealsR.status === "fulfilled" ? (appealsR.value.count ?? null) : null,
        neighborhoodsR.status === "fulfilled"
          ? (neighborhoodsR.value.count ?? null)
          : null,
      ];

      // 4. PACS source counts (only when connection is live)
      const pacsCountMap: Record<string, number | null> = {};
      if (health.connected) {
        const pacsResults = await Promise.allSettled(
          DRIFT_PRODUCTS.map((p) =>
            executeReadOnlyQuery<{ cnt: number }>({
              sql: p.pacsSql,
              productId: `delta-monitor-${p.id}`,
            })
          )
        );
        DRIFT_PRODUCTS.forEach((p, i) => {
          const r = pacsResults[i];
          pacsCountMap[p.id] =
            r.status === "fulfilled" ? (r.value.rows?.[0]?.cnt ?? null) : null;
        });
      }

      // 5. Last recorded ingest job
      const { data: lastJob } = await supabase
        .from("ingest_jobs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 6. Build per-product drift records
      const products: PACSDriftProduct[] = DRIFT_PRODUCTS.map((p, i) => {
        const tfCount = tfCounts[i];
        const pacsCount = health.connected ? (pacsCountMap[p.id] ?? null) : null;
        const drift =
          pacsCount !== null && tfCount !== null ? pacsCount - tfCount : null;

        let status: PACSSyncStatus = "unknown";
        if (!health.connected) {
          status = "offline";
        } else if (drift === null) {
          status = "unknown";
        } else if (drift === 0) {
          status = "in-sync";
        } else if (Math.abs(drift) >= STALE_THRESHOLD) {
          status = "stale";
        } else {
          status = "drifted";
        }

        return {
          id: p.id,
          label: p.label,
          pacsTable: p.pacsTable,
          tfTable: p.tfTable,
          pacsCount,
          tfCount,
          drift,
          status,
        };
      });

      const totalPacsRows = products.reduce((s, p) => s + (p.pacsCount ?? 0), 0);
      const totalTfRows = products.reduce((s, p) => s + (p.tfCount ?? 0), 0);
      const totalDrift = products.reduce(
        (s, p) => s + Math.abs(p.drift ?? 0),
        0
      );

      return {
        connectionHealth: health,
        products,
        totalPacsRows,
        totalTfRows,
        totalDrift,
        lastIngestJobAt: lastJob?.created_at ?? null,
        reportGeneratedAt: new Date().toISOString(),
      };
    },
    refetchInterval: 5 * 60_000, // refresh every 5 minutes
    staleTime: 60_000,
    retry: 1,
  });
}
