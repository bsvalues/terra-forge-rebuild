# TerraForge — Next Moves
> **Created**: 2026-03-22 | **After**: PACS Connector v2 commit `2762ea0`

---

## Current State: What We Have

### Hosted Supabase (1.97M rows)
| Table | Rows | Source |
|---|---|---|
| gis_features | 438,753 | GIS ingest |
| pacs_improvement_details | 411,492 | **NEW** — E:\ CSV |
| pacs_sales | 363,537 | **NEW** — E:\ CSV |
| assessments | 247,020 | Prior seed |
| sales | 205,864 | Prior seed |
| parcels | 84,905 | Prior seed |
| pacs_improvements | 82,970 | **NEW** — E:\ CSV |
| pacs_owners | 50,000 | **NEW** — Docker PACS |
| pacs_assessment_roll | 44,458 | **NEW** — Docker PACS |
| pacs_land_details | 36,475 | **NEW** — Docker PACS |
| + 10 operational tables | 1–8,500 | Prior phases |

### Config Layer (Complete)
- 12 sync products in `pacsBentonContract.ts`
- SQL templates in `pacsFieldMappings.ts` (fixed for Docker PACS schema)
- Quality gates in `pacsQualityGates.ts`
- Upsert functions in `ingestService.ts`
- Runtime resolver in `runtime.ts`

### What's Missing
- **No UI hooks** query the 6 new `pacs_*` tables
- **No React components** display the new domain data
- **Edge function secrets** not set (PACS_SERVER, PACS_USER, PACS_PASSWORD)
- **Docker PACS has empty tables**: imprv, imprv_detail, sale, chg_of_owner_prop_assoc (seeded from CSV instead)
- **Git push** — commit `2762ea0` is local only

---

## Priority Tracks

### Track 1: Wire the Data to the UI (Highest Impact)

**Goal**: Surface the 988K+ new PACS records in the frontend.

| Task | Files | Effort |
|---|---|---|
| 1a. `useOwnerLookup` hook — query `pacs_owners` by prop_id | `src/hooks/` | Small |
| 1b. `useSalesHistory` hook — query `pacs_sales` by prop_id with date sort | `src/hooks/` | Small |
| 1c. `useLandDetails` hook — query `pacs_land_details` by prop_id | `src/hooks/` | Small |
| 1d. `useImprovements` hook — query `pacs_improvements` + `pacs_improvement_details` joined | `src/hooks/` | Small |
| 1e. `useAssessmentRoll` hook — query `pacs_assessment_roll` with year filter | `src/hooks/` | Small |
| 1f. **Property Detail Panel** — unified component showing owner, improvements, land, sales, assessment for a selected parcel | `src/components/` | Medium |
| 1g. **ParcelDossier integration** — embed the new data panels into the existing parcel dossier workflow | `src/components/` | Medium |

### Track 2: PACS Live Sync (Edge Function Activation)

**Goal**: Enable real-time drift detection between PACS SQL Server and Supabase.

| Task | Action |
|---|---|
| 2a. Set edge function secrets | `supabase secrets set PACS_SERVER=... PACS_USER=... PACS_PASSWORD=...` |
| 2b. Test pacs-query endpoint | POST to `/functions/v1/pacs-query` with admin JWT + SELECT query |
| 2c. PACSLiveMonitor verification | Open admin dashboard → PACS tab → verify connection status shows green |
| 2d. Schedule sync cron | Use `sync_watermarks` table + scheduled task for periodic diff checking |

**Blocker**: Docker PACS is local-only. For cloud deployment, need either:
- VPN/tunnel from Supabase edge function → PACS SQL Server
- Or: shift to periodic CSV-based sync (already proven with the seed script)

### Track 3: Data Quality Dashboard

**Goal**: Run quality gates against the seeded data and surface pass/fail status.

| Task | Files |
|---|---|
| 3a. Quality gate runner service | `src/services/qualityGateRunner.ts` |
| 3b. DQ dashboard component | Shows gate pass/fail per product, drill into failures |
| 3c. Wire into admin panel | Add DQ tab next to PACS monitor |

### Track 4: Enrichment & Cross-Linking

**Goal**: Connect the new PACS domain data to existing tables.

| Task | Description |
|---|---|
| 4a. Link `pacs_owners` → `parcels` via prop_id/geo_id | Create view or add FK |
| 4b. Link `pacs_sales` → `sales` table reconciliation | Dedup/merge overlapping data |
| 4c. Link `pacs_assessment_roll` → `assessments` | Reconcile with existing 247K assessments |
| 4d. Add neighborhood rollup views | Aggregate land_details + improvements by neighborhood |

### Track 5: DevOps & Deployment

| Task | Action |
|---|---|
| 5a. Push to remote | `git push origin main` |
| 5b. CI/CD pipeline | Ensure Supabase migrations run on deploy |
| 5c. Environment config | Add PACS connection secrets to deployment environment |
| 5d. Cleanup | Delete `scripts/_check_cols.py` (diagnostic temp file) |

---

## Recommended Execution Order

```
Phase 1: git push + secrets setup              (Track 5a, 2a)
Phase 2: UI hooks for all 6 tables              (Track 1a–1e)
Phase 3: Property Detail Panel                  (Track 1f)
Phase 4: Quality gate runner                    (Track 3a–3c)
Phase 5: Cross-linking and reconciliation       (Track 4a–4d)
Phase 6: Live sync activation                   (Track 2b–2d)
```

---

## Known Technical Debt

1. **Improvement dedup**: CSV has multi-year rows per (prop_id, imprv_id). Current seed picks latest. If year-over-year comparison is needed, schema needs `prop_val_yr` in the unique constraint (already present but seeder hardcodes 2026).

2. **Assessment roll scope**: Currently TOP 50000 from Docker PACS (one year). Full history requires either larger queries or CSV-based backfill for historical years.

3. **Docker PACS empty tables**: 4 critical tables (imprv, imprv_detail, sale, chg_of_owner_prop_assoc) are empty in the Docker instance. The .NET `PacsDataSeeder.cs` in `terrafusion_os_1.0/backend/` could populate them, but that workspace is READ-ONLY for this agent. User may need to run the seeder manually.

4. **SyntaxWarnings**: `seed_pacs_domain_tables.py` has 4 Python SyntaxWarnings for unescaped `\ ` in docstrings. Cosmetic — doesn't affect execution.
