// TerraFusion OS — Constitution Guards (Compile-time + Runtime)
// These are the enforcement utilities for all 5 constitutional rules.
// Import this in dev tooling, health panels, and any component that needs to
// validate navigation at runtime before calling handleNavigate().

import { isLegalNavigation, resolveLegacyId } from "@/config/IA_MAP";

// ── Rule 1: Navigation validation ────────────────────────────────────
// Call before any programmatic navigation. Returns { ok, reason }.
export function validateNavTarget(target: string): { ok: boolean; reason?: string } {
  if (!target || target.trim() === "") {
    return { ok: false, reason: "Empty navigation target" };
  }

  if (target.includes(":")) {
    const parts = target.split(":");
    const moduleId = parts[0];
    const viewId = parts[1];

    // Resolve legacy first
    if (resolveLegacyId(moduleId)) return { ok: true };

    if (!isLegalNavigation(moduleId, viewId || undefined)) {
      return {
        ok: false,
        reason: `"${target}" is not a legal navigation target. Module "${moduleId}" or view "${viewId}" not found in IA_MAP.`,
      };
    }
    return { ok: true };
  }

  // Simple module ID — allow primary module IDs or resolvable legacy IDs
  if (resolveLegacyId(target)) return { ok: true };
  if (isLegalNavigation(target)) return { ok: true };

  return {
    ok: false,
    reason: `"${target}" is not a declared module in IA_MAP. Declare it or use a compound target like "module:view".`,
  };
}

// ── Rule 2: Stale ID detection ────────────────────────────────────────
// Known legacy IDs that must never appear as standalone navigation targets
const STALE_MODULE_IDS = [
  "analytics",
  "vei",
  "geoequity",
  "field",
  "trust",
  "ids",
  "quality",
  "readiness",
  "sync",
  "dashboard",
] as const;

export type StaleModuleId = (typeof STALE_MODULE_IDS)[number];

export function isStaleModuleId(id: string): id is StaleModuleId {
  return STALE_MODULE_IDS.includes(id as StaleModuleId);
}

// ── Rule 3: Navigation attempt logger (dev-only) ──────────────────────
// Stores the last N navigation attempts for the Health Panel.
const MAX_NAV_LOG = 100;

export interface NavAttempt {
  id: string;
  target: string;
  timestamp: string;
  valid: boolean;
  blocked: boolean;
  reason?: string;
}

const navAttemptLog: NavAttempt[] = [];
let navAttemptCounter = 0;

export function logNavAttempt(target: string): NavAttempt {
  const validation = validateNavTarget(target);
  const attempt: NavAttempt = {
    id: `nav-${++navAttemptCounter}`,
    target,
    timestamp: new Date().toISOString(),
    valid: validation.ok,
    blocked: !validation.ok,
    reason: validation.reason,
  };
  navAttemptLog.unshift(attempt);
  if (navAttemptLog.length > MAX_NAV_LOG) navAttemptLog.pop();

  if (!validation.ok && process.env.NODE_ENV !== "production") {
    console.warn(`[TerraFusion Constitution Gate #3] Illegal navigation attempt: ${validation.reason}`);
  }

  return attempt;
}

export function getNavAttempts(): NavAttempt[] {
  return [...navAttemptLog];
}

export function getBlockedNavCount(): number {
  return navAttemptLog.filter((a) => a.blocked).length;
}

// ── Rule 4: Constitutional health snapshot ────────────────────────────
// Gathers the current state of all constitution signals for the Health Panel.
export interface ConstitutionSnapshot {
  totalNavAttempts: number;
  blockedNavAttempts: number;
  blockRate: number; // 0–1
  recentAttempts: NavAttempt[];
}

export function getConstitutionSnapshot(): ConstitutionSnapshot {
  const total = navAttemptLog.length;
  const blocked = navAttemptLog.filter((a) => a.blocked).length;
  return {
    totalNavAttempts: total,
    blockedNavAttempts: blocked,
    blockRate: total > 0 ? blocked / total : 0,
    recentAttempts: navAttemptLog.slice(0, 20),
  };
}

// ── Rule 5: Query key registry (for cache health) ─────────────────────
// The canonical set of query keys as defined in DATA_CONSTITUTION.md
export const CANONICAL_QUERY_KEYS = [
  "county-vitals",
  "p360-identity",
  "p360-valuation",
  "p360-workflows",
  "p360-trace",
  "p360-permits",
  "p360-appeals",
  "p360-exemptions",
  "parcel-details",
  "parcel-search",
  "hub-parcel-search",
  "factory",
  "calibration-history",
  "vei",
  "system-health",
  "trust-events",
  "trust-runs",
  "trust-models",
  "appeals-workflow",
  "permits-workflow",
  "permits-stats",
  "exemptions-workflow",
  "exemptions-stats",
  "certification-pipeline",
  "certification-stats",
  "roll-readiness",
  "assessments",
  "dossier-documents",
  "dossier-narratives",
  "dossier-packets",
  "system-bar-county",
  "county-meta",
  "smart-actions",
  "parcel-lookup",
] as const;

export type CanonicalQueryKey = (typeof CANONICAL_QUERY_KEYS)[number];
