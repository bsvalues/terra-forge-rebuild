# Data Hardening Plan — Runtime Provenance + Quarantine

> Failure mode: **Quarantine + continue**. Bad data is never dropped silently
> and never blocks the OS, but it is marked `unverified` and rendered with a
> warning badge so humans can adjudicate. Trust is earned per-row, not per-table.

## ✅ Phase 1 — Foundation
- `data_quarantine` table (RLS county-scoped, admin-managed, service-role insert).
- `src/lib/provenance.ts` — `wrapWithProvenance<T>()`, `TrustLevel`, envelope helpers.
- `src/services/quarantine.ts` — `quarantineRow` / `quarantineBatch` + dedup via payload hash.
- `<ProvenanceBadge>` renders amber for `unverified`, red for `quarantined`.

## ✅ Phase 2 — Write-Lane Enforcement (THIS TURN)
- `assertWriteLane` now bridges every violation into `data_quarantine` with
  `severity=critical`, `source="writeLane"`, `reason_code` ∈
  {`cross_lane`, `field_guardrail`} — in addition to the audit row in
  `write_lane_violations`.
- Best-effort county resolution from the active profile, cached per page.
- Behavior unchanged in DEV (still throws); in PROD: logs + audits +
  quarantines and returns — never blocks the caller.

## ✅ Phase 3 — Ingest Quality Gates (THIS TURN)
- `runContractSync` now accepts `options.countyId` and routes:
  - **schema_drift** → quarantine rows with `severity=critical`
  - **gate_failed** → quarantine rows with `severity=warning` (failed gate
    IDs in `reason_detail`)
- Capped at 500 rows per product per run to protect the DB.
- Product status (`schema_drift` / `gate_failed`) is unchanged so the
  pipeline UI still reflects the failure; the rows just no longer vanish.

## ✅ Phase 4 — DB Integrity + Review UI (THIS TURN)
- Realtime broadcast lockdown: RLS on `realtime.messages` blocks anon, scopes
  authenticated subs to `user:<uid>` topics, admin role can subscribe to any
  topic. (Closes Wiz/Supabase `realtime_no_channel_auth` finding.)
- `useQuarantine` hook: list/counts/mutation, county-scoped, admin-managed.
- `QuarantineReviewPanel` mounted on Admin → Quarantine tab. Inspect payload,
  Restore (queue for re-ingest) or Discard (mark intentionally dropped).
- Pre-existing 80+ table RLS lint findings carried over from earlier phases —
  not regressed by this slice; tracked separately.
