# Roadmap

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
- [ ] Align calibration selectors, result sections and model-training panels; remove simulated operational UI.
- [ ] Verify shared neighborhood continuity, narrow windows and existing regressions; record handoff.
