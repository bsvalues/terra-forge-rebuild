# Roadmap

## Complete application audit and redesign (current priority)
- [x] Simplify parcel-first Workbench and assessment/admin/evidence tools; verify real reads and import preview, not untested writes.
- [x] Audit signed-in navigation and representative workspaces; findings and next-session handoff in docs/application-redesign-audit.md.
- [x] Replace hidden module switching with persistent, suite-grounded navigation and searchable access to every registered tool.
- [x] Replace the overloaded Home briefing with a direct work directory and access to recent properties.
- [x] Establish visible workspace orientation and related-tool access in primary and embedded windows.
- [x] Redesign ingestion entry and remove misleading promises; preserve import behavior.
- [x] Verify navigation, search, ingestion entry, and narrow-window access: signed-in real parcel selection, no browser errors/overflow, 432 tests passed; preview build OK.
- [x] Workbench search, completed comparables, permits/evidence reads, admin continuity, refresh and cost-tool Back checked signed-in.
- [x] Real Benton CSV: 22,309 rows mapped, sampled validation and preview; retained across data sections. Refresh warning added; no publish.
- [x] Factory mode/neighborhood and Registry tool persistence; direct cost/model tool links. Final regression verification recorded in audit handoff.
- [x] Benton maps: 19,678 State Plane points converted to stored WGS84 (traced); Parcel360 reads them; map verified at a Kennewick parcel. ~90k Benton parcels have no source point at all.
- [x] Unsaved property-detail edits survive reload on this device; save → reload → reopen verified with a reverted real edit.
- [x] Durable import recovery: leaving, refreshing and returning resumes the unpublished import (verified signed-in; discard clears it).
- [x] Signed-in sweep of all 60 workspace screens; notifications, ratio study, value change and exemption reports installed and scoped to the active county; missing data shows "not loaded"/"not measured" instead of failures.
- [x] Remaining screens: readiness calc repaired (county-guarded), GeoEquity uses converted map points + latest sale, webhooks service installed, ingest audit log installed, county benchmarks use real county ratio stats; reconciliation, legacy analytics and neighborhood rollup show "Legacy system data not loaded". 60/60 screens load without errors (only expected missing-legacy probes).
- [x] IAAO Compliance: county-scoped single-pass stats per neighborhood (fixed price/ratio pairing, true median, IAAO PRB); "Not measured" when nothing gradable. Exemption Analysis scoped to active county with empty message.
- [ ] End-to-end county writes (publish, appeals, exemptions, notices): blocked on founder naming a test parcel/account/county.
- [ ] Duplicate sales: Benton has 21,711 sales recorded 2-4 times by repeated imports (65,137 extra rows, same instrument number). Blocked: founder approval to remove the extra copies, then a uniqueness rule to stop re-imports duplicating.

## Tasks
- [x] Add Google sign-in button to the app (Auth.tsx + provider enabled)
- [x] Add Microsoft sign-in button to the app (Auth.tsx + provider enabled)
- [x] Verify sign-in buttons render and OAuth flow starts in preview
- [x] Windowed desktop shell: wallpaper, glass panels, window chrome, Spaces dock
- [x] Desktop polish: page-name titles, remembered full-screen, rename spaces, Ctrl+Alt+1–8 jumps, status + Focus
- [x] Side-by-side windows: Open beside menu, resize handle, Swap, remembered layout
- [x] Linked parcel: side window opens on and follows the parcel in focus
- [x] Google sign-in verified end-to-end on live preview (confirmed by founder)
- [x] Fix OAuth return trip: /auth/callback page stores the session after provider redirect (was landing signed out)
- [x] Publish requested (OAuth callback fix) — verify Google + Microsoft sign-in on the live site once deploy lands
- [x] Link on/off toggle in window title bar (compare two parcels side by side)

## Current design slice
- [x] Apply mineral palette and meaningful shell treatments without changing routes.
- [x] Record consolidated agent principles near the top of coding instructions.
- [x] Verify shell rendering and existing window interactions (29 tests passed; Workbench and Focus checked; no browser errors).

## Workbench refinement
- [x] Distinguish missing county metrics from genuine zero values with regression tests.
- [x] Refine parcel-empty hierarchy and place Pilot controls in the existing toolbar.
- [x] Verify desktop, narrow-window, and existing window interactions; record handoff (409 tests passed; preview build OK).
- [x] County Vitals truth audit: availability flags extended (quality/workflows); SuiteHub, DailyBriefing, NextBestAction, DataStatusRibbon, FactoryDashboardHeader render unknowns as "—"/"Not measured" instead of fabricated zeroes; 413 tests green.
- [x] Audited CommandBriefing, GeoEquityDashboard, DefensibilityScoreCard (Not measured state); TopSystemBar already tolerates undefined.
- Deferred by founder: remaining County Vitals consumer audit; focus on module-interior UI/UX instead.

## Module-interior doctrine
- [x] Continue into Analytics, AVM and Ratio Studies; standardize titles, mode controls and narrow-window layouts (419 tests passed; browser mode/tab checks clean; preview build OK).
- [x] Apply shared window-interior surfaces, tab navigation and typography across registered views.
- [x] Unify GeoEquity, Factory, Registry and valuation headers; preserve actions and scope.
- [x] Keep template controls accessible in narrow side windows; verify interactions and regressions (419 tests passed; preview build OK).

## Current interior continuation
- [x] Align AI Valuation content and advanced analytics panels with shared headers, controls and unframed result sections.
- [x] Verify tab/mode continuity, loading controls and narrow embedded layouts; run existing regressions and record evidence (419 tests; preview build OK; true 520px iframe checks passed).

## Calibration and training interiors
- [x] Align calibration selectors, result sections and model-training panels; remove simulated operational UI.
- [x] Verify shared neighborhood continuity, narrow windows and existing regressions; record handoff (419 tests; preview build OK; 520px embedded checks passed).

## Factory mode interiors and ledger
- [x] Align Cost, Income, Comp Review and Scenario work areas with shared module-window doctrine; retain math, routes and actions.
- [x] Make Adjustment Ledger states and actions accessible; verify real narrow windows and regressions, then record handoff (419 tests; preview build OK; no browser errors/overflow).

## TerraFusion Sync 2.0 (foundation slice, plan pending approval)
- [x] Additive Sync schema: sources, runs, evidence, mapping versions, entity links, assertions, reconciliation, publications
- [x] Read-only Benton source/canonical inventory check (110,029 parcels; 87,443 sales; 21,788 assessments)
- [x] Move Benton PACS archives + sales CSV out of public/uploads into private storage
- [ ] Run engine with checkpoints, replay keys, manifest hash + TerraTrace receipts
- [x] Repair county-file sample import to read from private storage (signed-in, county-scoped download)
- [ ] Ratio codes: preserve sl_ratio_type_cd / sl_county_ratio_cd on sales (blocked: columns absent; needs sale export with both codes)
- [ ] Resolve 4,454 active roll accounts missing from app (blocked: needs property export for those prop_ids)

## Benton 2026 neighborhood correction
- [x] Stage 2026 certified neighborhoods as year records with lineage; classify every account
- [x] Fix sync mapping (hood_cd from property_val, certified-active rule, documented living-area rule) + tests
- [x] Fill account 318135 characteristics
- [x] Promote 2026 label to parcels (approved; 84,870 certified-active parcels updated; prior labels retained for rollback)
- [x] Guard re-import: county file import no longer lets a stale valuation row erase the promoted 2026 label (with regression test)
- [ ] App walkthrough after promotion (search, Workbench, neighborhoods, Value Change, AVM)
- [ ] Sync rerun against live PACS (blocked: no PACS server access from this environment)
