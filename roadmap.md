# Roadmap

## Complete application audit and redesign (current priority)
- [ ] Audit signed-in navigation and representative workspaces; record concrete usability failures.
- [ ] Replace hidden module switching with persistent, suite-grounded navigation and searchable access to every registered tool.
- [ ] Replace the overloaded Home briefing with a direct work directory and genuine recent parcel work.
- [ ] Establish visible workspace orientation and related-tool access in primary and embedded windows.
- [ ] Redesign ingestion entry and remove misleading promises; preserve import behavior.
- [ ] Verify navigation, search, ingestion entry, and narrow-window access with tests and signed-in browser checks.
- [ ] Complete remaining legacy interiors and validate their real task flows; do not claim the overall redesign finished prematurely.

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
