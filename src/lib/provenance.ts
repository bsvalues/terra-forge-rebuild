// TerraFusion OS — Runtime Provenance Envelope
// ═══════════════════════════════════════════════════════════
// Every value returned from a data hook is wrapped in an envelope that
// declares WHERE it came from, WHEN it was fetched, HOW LONG it is trusted,
// and WHAT its current trust level is (verified / unverified / quarantined).
//
// This is the runtime enforcement of DATA_CONSTITUTION.md Rule 5:
//   "Every Number on Screen Has Provenance."
//
// 🪖 The data forgot its hat. We give it a hat.
// ═══════════════════════════════════════════════════════════

/** Trust levels — drives badge color and UI affordances. */
export type TrustLevel =
  | "verified"     // passed all gates, cached fresh
  | "stale"        // past stale time, refetching
  | "unverified"   // has quarantined rows attached or skipped gates
  | "quarantined"  // entirely from quarantine table — display as warning
  | "unknown";     // pre-fetch or error state

export interface ProvenanceEnvelope {
  /** Logical source name — usually the query key. */
  source: string;
  /** ISO timestamp the data was fetched at runtime. */
  asOf: string;
  /** Human-readable cache policy, e.g. "cached 60s". */
  cachePolicy: string;
  /** Numeric stale time in ms (machine-readable companion to cachePolicy). */
  staleMs: number;
  /** Trust level — see TrustLevel. */
  trustLevel: TrustLevel;
  /** Count of rows that were quarantined while producing this value. */
  quarantineCount: number;
  /** Optional county scope. */
  countyId?: string | null;
  /** Optional notes (e.g. "3 rows skipped: null building_area"). */
  notes?: string[];
}

export interface Provenanced<T> {
  data: T;
  provenance: ProvenanceEnvelope;
}

interface WrapOpts {
  source: string;
  staleMs?: number;
  trustLevel?: TrustLevel;
  quarantineCount?: number;
  countyId?: string | null;
  notes?: string[];
}

/**
 * Attach a provenance envelope to a value at runtime.
 *
 * Use in hooks:
 *   return useQuery({
 *     queryKey: ["county-vitals"],
 *     queryFn: async () => {
 *       const raw = await fetchCountyVitals();
 *       return wrapWithProvenance(raw, { source: "county-vitals", staleMs: 60_000 });
 *     },
 *   });
 */
export function wrapWithProvenance<T>(data: T, opts: WrapOpts): Provenanced<T> {
  const staleMs = opts.staleMs ?? 60_000;
  const quarantineCount = opts.quarantineCount ?? 0;
  const trustLevel: TrustLevel =
    opts.trustLevel ??
    (quarantineCount > 0 ? "unverified" : "verified");

  return {
    data,
    provenance: {
      source: opts.source,
      asOf: new Date().toISOString(),
      cachePolicy: formatStale(staleMs),
      staleMs,
      trustLevel,
      quarantineCount,
      countyId: opts.countyId ?? null,
      notes: opts.notes,
    },
  };
}

/** Create an empty/unknown envelope for pre-fetch or error states. */
export function unknownProvenance(source: string): ProvenanceEnvelope {
  return {
    source,
    asOf: new Date().toISOString(),
    cachePolicy: "n/a",
    staleMs: 0,
    trustLevel: "unknown",
    quarantineCount: 0,
  };
}

/** Pretty-print a stale-ms number ("cached 60s", "cached 5m"). */
export function formatStale(ms: number): string {
  if (ms <= 0) return "no cache";
  const s = Math.round(ms / 1000);
  if (s < 60) return `cached ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `cached ${m}m`;
  const h = Math.round(m / 60);
  return `cached ${h}h`;
}

/**
 * Type guard: did this value come from `wrapWithProvenance`?
 * Lets components accept either Provenanced<T> or raw T during migration.
 */
export function isProvenanced<T>(v: unknown): v is Provenanced<T> {
  return (
    typeof v === "object" &&
    v !== null &&
    "data" in v &&
    "provenance" in v &&
    typeof (v as { provenance?: unknown }).provenance === "object"
  );
}

/** Extract data regardless of whether envelope is present. */
export function unwrap<T>(v: Provenanced<T> | T): T {
  return isProvenanced<T>(v) ? v.data : (v as T);
}

/** Extract envelope or synthesize an unknown one. */
export function getProvenance(v: unknown, fallbackSource = "unknown"): ProvenanceEnvelope {
  return isProvenanced(v) ? v.provenance : unknownProvenance(fallbackSource);
}
