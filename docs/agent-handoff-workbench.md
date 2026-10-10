# Workbench refinement handoff

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