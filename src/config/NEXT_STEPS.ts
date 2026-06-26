// TerraFusion OS — Next Step Suggestions
// Maps the current viewId → a suggested next action.
// Displayed in the BreadcrumbBar as "Next: [label] →"

import type { ViewId } from "@/config/IA_MAP";

export interface NextStepEntry {
  label: string;
  /** Navigation target in "module:view" or URL path format */
  target: string;
}

/**
 * Next step suggestions by viewId.
 * Only views with a natural "next" in the workflow are included.
 * Views without an entry simply don't show a Next Step hint.
 */
export const NEXT_STEPS: Partial<Record<ViewId, NextStepEntry>> = {
  // ── Data Operations flow ──────────────────────────────────
  ids:              { label: "Check Data Quality",     target: "home:quality" },
  quality:          { label: "Review Validation Rules", target: "home:validation" },
  validation:       { label: "Run Data Doctor",        target: "home:data-doctor" },
  "data-doctor":    { label: "View Schema Diff",       target: "home:schema-diff" },
  sync:             { label: "Check Data Quality",     target: "home:quality" },

  // ── Valuation & Equity flow ───────────────────────────────
  "ratio-study":    { label: "Review Value Changes",   target: "home:value-change" },
  "value-change":   { label: "Browse Neighborhoods",   target: "home:neighborhoods" },
  neighborhoods:    { label: "View Neighborhood Rollup", target: "home:nbhd-rollup" },
  "nbhd-rollup":    { label: "Check Exemptions",      target: "home:exemption-analysis" },

  // ── Revaluation flow ──────────────────────────────────────
  "launch-reval":   { label: "Track Progress",         target: "home:reval-progress" },
  "reval-progress": { label: "View Reval Report",      target: "home:reval-report" },
  "reval-report":   { label: "Generate Notices",       target: "home:reval-notices" },

  // ── Appeals flow ──────────────────────────────────────────
  "appeal-insights": { label: "View Appeal Risk",      target: "home:appeal-risk" },
  "appeal-risk":    { label: "Review Neighborhoods",   target: "home:nbhd-review" },
  "nbhd-review":    { label: "Manage Notices",         target: "home:notices" },

  // ── Factory flow ──────────────────────────────────────────
  calibration:      { label: "Run Ratio Studies",      target: "factory:vei" },
  vei:              { label: "Spatial Analysis",        target: "factory:geoequity" },
  geoequity:        { label: "AVM Studio",             target: "factory:avm" },
  avm:              { label: "View Analytics",          target: "factory:analytics" },
  analytics:        { label: "Advanced Analytics",      target: "factory:advanced-analytics" },

  // ── Registry flow ─────────────────────────────────────────
  trust:            { label: "View Audit Timeline",    target: "registry:audit-chain" },
  "audit-chain":    { label: "Value Ledger",           target: "registry:ledger" },
  ledger:           { label: "Data Catalog",            target: "registry:catalog" },
};
