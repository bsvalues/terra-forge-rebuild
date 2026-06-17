# Data Hardening Plan — Runtime Provenance + Quarantine

> Failure mode chosen: **Quarantine + continue**. Bad data is never dropped silently
> and never blocks the OS, but it is marked `unverified` and rendered with a warning
> badge so humans can adjudicate. Trust is earned per-row, not per-table.

## Phase 1 — Foundation (THIS TURN)

The runtime spine every other phase plugs into.

1. **DB: `data_quarantine` table** — holds rejected/suspect rows with source,
   reason, severity, and original payload (jsonb). RLS county-scoped, admins
   manage. Indexed on `(county_id, source, status, created_at)`.
2. **DB: `provenance_envelopes` view** — uniform `{source, as_of, cache_policy,
   trust_level, quarantine_count}` shape for any query key.
3. **`src/lib/provenance.ts`** — `wrapWithProvenance<T>()` helper that every hook
   uses to attach a runtime envelope to its return value. Replaces the ad-hoc
   `as_of` strings sprinkled around.
4. **`src/services/quarantine.ts`** — `quarantineRow({ source, reason, severity,
   payload, countyId })` writes to `data_quarantine` and emits a TerraTrace
   `data_quarantined` event. Used by sync runtime, quality gates, and write-lane
   violations.
5. **`<ProvenanceBadge>` upgrade** — read trust_level + quarantine_count and
   render an amber warning chip when unverified rows exist.
6. **Test**: `provenance.test.ts` — round-trips an envelope, quarantines a fake
   row, asserts the badge renders amber.

## Phase 2 — Write-Lane Enforcement (next turn)

- Wire `assertWriteLane` into every `forge/dais/dossier/atlas` service entry point.
- Quarantine cross-lane attempts to `data_quarantine` with severity=critical
  (instead of throwing in prod).
- Add `write_lane_violations` → quarantine bridge.

## Phase 3 — Ingest Quality Gates (later)

- `runContractSync` already runs gates; route gate failures + drift through
  `quarantineRow` instead of dropping the product.
- Per-row gates (not just product-level) so 9 good rows publish while 1 bad row
  quarantines.

## Phase 4 — DB Integrity Pass (later)

- Re-lint RLS on all 80+ tables.
- Audit triggers on `parcels`, `assessments`, `appeals`, `exemptions` →
  TerraTrace hash chain.
- Verify GRANTs match policies (anon stripped where `auth.uid()` is required).
