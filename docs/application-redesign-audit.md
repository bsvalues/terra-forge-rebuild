# Application redesign audit — 13 October 2026

## Observed signed-in failures

- Home buried work beneath competing recommendations, readiness narratives and duplicate county summaries. One page showed both missing-coordinate warnings and “All Clear.”
- Module switching was in the sidebar footer. Home contained most county tools, so suite ownership and navigation did not agree.
- Global search only included the active module's tools; ordinary cross-suite discovery failed.
- Unknown view IDs silently loaded a module default. Several old Home links used nonexistent Workbench view IDs.
- Property deep links redirected through an orphaned Index flow and lost the selected parcel.
- Ingestion opened an inventory report rather than an import. That report invented a health grade, spatial and sales coverage denominators, building coverage, and freshness without source evidence.
- Workbench and global palettes competed for the same shortcuts. Ingestion and several workspace modes lack durable in-progress task state.
- Shared interior CSS did not remove the underlying duplicate hierarchy: Workbench still contains multiple tab levels, dense parcel context, nested record surfaces and a separate admin takeover.

## Implemented and checked

- A route-preserving workspace directory drives persistent suite navigation, Home and application-wide tool search. Every registered view appears exactly once; ownership and existing routes remain unchanged.
- Home provides direct property access and real recent-property navigation, not operational prescriptions.
- Every non-Home window has scope-oriented breadcrumbs and a related-tools menu, including embedded windows.
- Ingestion opens import selection with accessible controls, conventional field names and URL-preserved panel selection.
- Inventory consumes the shared County Vitals source. Unsupported freshness/building-coverage values are unknown; fabricated grades and coverage were removed.
- Parcel selection and property deep links pass the parcel directly into the live Workbench route.
- Invalid view IDs fail visibly. Search uses an explicit open event rather than a synthetic keyboard event.

## Remaining redesign work — not complete

1. Property Workbench: consolidate competing context/mode/tab layers, simplify Summary, preserve parcel context during administrative work, and validate the real valuation/evidence flows.
2. Import continuity: preserve or explicitly guard an unfinished import across tab/workspace navigation; verify upload → mapping → validation → preview with a real county file before any authorized publish.
3. Factory and Registry: preserve mode/filter state across refresh and open-beside; finish individual legacy interiors rather than relying on outer CSS.
4. Remaining county screens: apply the common title/configuration/evidence hierarchy and audit real actions and all empty/error states.
5. Retire orphaned shell code only after confirming no supported entry point depends on it.

## Verification scope

Signed-in browser checks exercised workspace navigation, sales-import upload entry, inventory and refresh persistence, Factory-to-ingestion global search, a real Washington-address parcel selection, and a 520px embedded ingestion window with related-tool access. No ingestion publish, valuation mutation, database migration or production deployment was performed.

## Suggested commit

`feat: establish discoverable workspaces and truthful ingestion entry; the sidebar stopped hiding in my lunchbox`

## Next session

### Current execution handoff

- Parcel-first Workbench with grouped assessment, admin and evidence tools; review queue optional and no AdminDashboard takeover. Parcel/work URLs restore context after refresh and cost-tool Back.
- Ingestion now uses the real wizard instead of simulated steps. Real Benton CSV: 22,309 rows uploaded → mapping → sampled validation → preview; data-section changes preserve preview. Refresh warns; workspace exit still discards it. No publish.
- Broken comparables fixed: canonical address/building_area/is_qualified fields, explicit county/class/exclusion filters, 15 records and 15-second timeout. Real Prosser results render; duplicate source sales remain untouched.
- Factory mode/neighborhood and Registry tools persist. No new credential, database migration, valuation save, evidence upload or deployment.
- Map check found projected values 320600.2768 / 1827644.577 in geographic fields. County-scoped in-range query found no parcel; invalid coordinates now show unavailable, not blank map tiles. Geographic rendering is not verified.
- Browser verified real reads, refresh and cost-tool handoff with no page errors or 720px overflow. Scripts/screenshots: `/tmp/browser/redesign/`. Regression suite: 439 tests across 45 files after geographic guards.
- Active URL keys: parcel, work, propertyTool, assessmentTool, panel, mode, neighborhood, recordTool.
- Next: canonical spatial-coordinate repair and duplicate-sales provenance, durable import recovery, authorized write checks, then remaining individual county interiors. Broader redesign is not complete.
- Suggested commit (not executed): `refactor: simplify parcel work and verify import preview; the navigation tree ate my lunchbox`.