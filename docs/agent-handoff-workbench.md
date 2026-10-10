# Workbench refinement handoff

## Factory modes and Adjustment Ledger — 2026-10-10

- Completed: Cost and Income tools now use shared tabs and container-based layouts. Calculators have associated labels, restrained unframed results, and existing numeric inputs/formulas. Dense cost/income tables scroll inside named keyboard-focusable regions; add/delete commands use shared named buttons.
- Comp Review uses a loaded-record metric band, locally scrollable ratio grid, explicit loading/error/empty states and named parcel-open buttons. Existing destination, ratios, COD thresholds and query behavior are unchanged. Counts describe the loaded sample, not complete county coverage.
- Scenario controls stack before results in narrow windows, sliders have accessible names on their actual thumbs, Reset restores existing defaults, and Save/Apply use ordinary controls. Session-only scenarios are labeled accordingly. Removed decorative motion/cards; no formula or mutation changes.
- Ledger is an unframed section with distinct loading/error/empty states, sample-aware counts, and always-visible rollback buttons. No mutation was executed. Existing rollback implementation remains unchanged; this UI verification does not certify its production safety.
- Evidence: 419 tests across 39 files passed after slider accessibility changes; preview build OK. Browser checked Cost/Income/Comps/Scenarios in primary and real 520px embedded windows: no document overflow or page errors; Cost grid resolves to one 488px track, income input changes, land slider 0 → 0.5 → Reset 0, 186 named parcel actions. Screenshots inspected under `/tmp/browser/factory-interiors/`. Final scenario Apply treatment received an additional visual check.
- Limits: no cost/income add/delete, scenario Save/Apply or ledger rollback was executed. Ledger had zero loaded batches, so populated/error states are not verified against live records. Cost schedules had zero loaded records. Existing scope/query limits, valuation calculations and backend processing were not audited in this presentation-only slice.
- Next scoped slice: remaining batch-apply and depreciation subpanels, followed by the full-page Registry adjustment ledger; preserve county selection, domain ownership and all existing work. County Vitals audit remains deferred. No routes, database, permissions, credentials or publication changed.
- Suggested commit, not executed: `refactor(ui): align Factory work areas and accessible ledger controls. The sliders and I work alone.`

## Calibration and training interiors — 2026-10-10

- Completed: calibration now consumes the Factory-selected neighborhood instead of a separate local selector. Selection persisted across Cost Tables → Calibration in browser checks. Save stays in its toolbar even when results are loading or unavailable. Existing ratio math, thresholds and save payload are unchanged.
- Factory county summary is now a compact unframed metric band, reducing the height before working controls. Shared Factory tabs and neighborhood selector use normal theme-aware controls.
- AVM comparison uses recorded model names/statuses and unknowns for absent metrics; no glowing champion banner, invented zero scores or winner highlights. Metrics are a readable locally scrollable table with actual model labels. Configuration shows recorded inputs, not presumed IQR/Z-score stage completion.
- Removed no-run simulated epochs, random loss updates and fake active jobs. No-run panel now reports absence of run records. A recorded champion named Random Forest v3.3 remains legitimately visible; the browser script's old 'Simulated job visible' label counts that existing record, not simulated telemetry.
- Evidence: 419 tests across 39 files passed; latest preview build OK; no page errors or document overflow in primary and real 520px embedded windows. One neighborhood selector, selection 13010, tab-return continuity and visible save action checked. AVM live records and model configuration were observed. Screenshots/scripts: `/tmp/browser/calibration-training/`.
- Limits: calibration results were still loading at capture, so completed statistics/detail rendering and save execution remain unverified. No writes, training jobs, database migrations or publication were performed. Direct `/factory/calibration` currently initially renders Regression; checks selected the existing Calibration tab. Route migration remains out of scope.
- Next focused slice: remaining Factory mode interiors and Adjustment Ledger; retain controls, selected neighborhood and suite ownership. County Vitals consumer audit stays deferred. No active credential or environment changes.
- Suggested commit, not executed: `refactor(ui): unify calibration scope and evidence-based training interiors. The model and I work alone.`

## Valuation and advanced analytics interiors — 2026-10-10

- Completed: AI Valuation uses standard single-selection controls, a plain input band and unframed result sections. Existing hardcoded property is explicitly labeled as an example, not county evidence. Removed promotional quantum/sacred styling without changing request payloads or valuation math; supplemental model scores remain visible with their validation limitation.
- Advanced Analytics uses ModuleHeader and shared tab conventions. Forecast/outlier summaries are metric bands; trend and cluster grids adapt to module width. Chart legends wrap, dense result tables scroll locally and are keyboard-focusable. AVM training chart columns now follow container width too.
- Outlier threshold is a standard labeled Slider outside result content, available during loading and empty states. Existing threshold bounds and query behavior are unchanged.
- Evidence: 419 tests across 39 files passed; preview build OK. Browser exercised four analytics tabs, three valuation modes and threshold keyboard adjustment (2.5 to 3.0). True 520px embedded windows had no document overflow and no page errors; observed live outlier results, chart and table. Screenshots and acceptance checks: `/tmp/browser/interior-continuation/`.
- Limits: no AI analysis request was executed and its returned result presentation remains unverified end-to-end; no training/apply/export writes were executed. Forecast/clustering result calculations were not validated in this UI slice. No database, routes, permissions or publication changed.
- Next scoped slice: remaining AVM training subpanels and county-suite toolbars; retain ordinary controls, domain scope and existing math. County Vitals audit remains deferred. No active credential or environment changes.
- Suggested commit, not executed: `refactor(ui): align valuation and advanced analytics interiors. The slider and I work alone.`

## Analysis interiors continuation — 2026-10-10

- Analytics, AVM and Ratio Studies now share ModuleHeader. Analytics readiness modes and ratio-study exclusion modes use the existing accessible single-selection ToggleGroup with guarded selection. Removed duplicate readiness controls, AVM action-button scaling and promotional header treatments.
- Analytics summary and two-column result layouts respond to module width; neighborhood rows scroll locally instead of squeezing fixed columns. AVM action toolbar wraps. Ratio Studies loading/empty states retain a literal module title; removed decorative empty-state icon stacks and emoji requirements tiles.
- Evidence: 419 tests across 39 files passed; latest preview build OK. Browser confirmed readiness mode change, Analytics Map Readiness tab, AVM AI Valuation tab, and narrow embedded layouts with no page errors. Ratio Studies was observed in loading state, not a completed live result; do not claim its drilldowns or exclusion-mode execution were tested.
- No database, routing, write permissions, publication or valuation-math changes. Existing AVM Export action and AI valuation content were not implemented/reworked in this slice.
- Next: continue individual-module toolbar/result treatment, starting with AVM AIValuationPanel and remaining advanced analytics interiors. Do not silently expand into data hardening or replace county scope.
- Suggested commit, not executed: `refactor(ui): align analysis-window headers and mode controls. The toolbar and I work alone.`

## Module interiors — 2026-10-10

- Completed: all registered views now receive the scoped module-interior contract, including embedded windows. Shared tabs use underline selection and horizontal scrolling; working surfaces are opaque and quiet, with no decorative glass elevation inside the window.
- Shared ModuleHeader adopted by GeoEquity, Factory, Trust Registry, Regression Studio and CostForge. Duplicate route insets removed at the common boundary. GeoEquity metric band and bounded map stage replace floating summary tiles/fixed inline heights. Trust Registry county label uses the existing county metadata hook.
- Scope templates stack their rails instead of hiding controls when windows narrow. No routing, database, write-lane or publication changes.
- Regression defense: 419 tests passed across 39 files; preview build OK. Browser checked Factory, GeoEquity, Registry and a constrained embedded Parcel Search, with no main overflow. A Leaflet teardown error found during map-to-tab navigation was removed by disabling queued zoom animation and stopping the map before removal; repeated browser check returned no page errors.
- Limitation: individual legacy custom controls and content have not all been redesigned. Map tile availability is not established by these UI checks. The common contract covers registered views, not unrelated public/auth screens.
- Next session: apply ModuleHeader and familiar toolbar patterns to remaining individual module interiors, retaining their actual content, scope and actions. County Vitals audit remains deferred by founder.
- Suggested commit (not executed): `refactor(ui): unify module-window interiors and safe map transitions. The tabs and I work alone.`

## 2026-10-10

- Completed: mineral theme retained; empty Summary now has a literal Property Workbench heading, county records band, watchlist, and trace feed. Removed promotional empty-state copy.
- County counts now use `useCountyVitals`, not duplicate count queries or comparison snapshot defaults. `metricAvailability` preserves whether each source field exists; unavailable assessment counts render an em dash, not zero. Sales are labeled records, not qualified sales.
- TerraPilot is closed initially and toggled from the suite toolbar. Expand, collapse and close buttons have accessible names. Removed the floating sparkle control.
- No route, database, write-lane or publication changes. Certification copy reports only blockers identified in loaded records, never certification readiness.
- Evidence: 409 tests passed in 39 files. Preview build OK. Browser verified Summary, parcel-search dialog, Pilot open/close, and a second embedded Workbench with no main horizontal overflow or page errors. Screenshots/scripts are under `/tmp/browser/workbench_refinement/`.
- Active behavior: county scope comes from the existing active county hook; real zero counts remain zero. Legacy County Vitals consumers retain their existing numeric fields while this summary uses availability metadata.
- Next session: audit remaining legacy missing-data defaults in County Vitals consumers and context-dependent Pilot suggestions as a separate scoped slice. Do not claim county assessment data is absent merely because the current RPC omits assessment fields. Do not replace existing window routing or suite ownership.
- Suggested commit message (not executed): `refactor(workbench): clarify county records and optional Pilot inspector. The dock and I work alone.`