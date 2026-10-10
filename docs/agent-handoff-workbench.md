# Workbench refinement handoff

## 2026-10-10

- Completed: mineral theme retained; empty Summary now has a literal Property Workbench heading, county records band, watchlist, and trace feed. Removed promotional empty-state copy.
- County counts now use `useCountyVitals`, not duplicate count queries or comparison snapshot defaults. `metricAvailability` preserves whether each source field exists; unavailable assessment counts render an em dash, not zero. Sales are labeled records, not qualified sales.
- TerraPilot is closed initially and toggled from the suite toolbar. Expand, collapse and close buttons have accessible names. Removed the floating sparkle control.
- No route, database, write-lane or publication changes. Certification copy reports only blockers identified in loaded records, never certification readiness.
- Evidence: 409 tests passed in 39 files. Preview build OK. Browser verified Summary, parcel-search dialog, Pilot open/close, and a second embedded Workbench with no main horizontal overflow or page errors. Screenshots/scripts are under `/tmp/browser/workbench_refinement/`.
- Active behavior: county scope comes from the existing active county hook; real zero counts remain zero. Legacy County Vitals consumers retain their existing numeric fields while this summary uses availability metadata.
- Next session: audit remaining legacy missing-data defaults in County Vitals consumers and context-dependent Pilot suggestions as a separate scoped slice. Do not claim county assessment data is absent merely because the current RPC omits assessment fields. Do not replace existing window routing or suite ownership.
- Suggested commit message (not executed): `refactor(workbench): clarify county records and optional Pilot inspector. The dock and I work alone.`