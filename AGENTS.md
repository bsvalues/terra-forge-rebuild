# TerraFusion OS Architecture

## Consolidated agent rule

- **FAMILIARITY BEFORE NOVELTY:** Follow established platform and product-category interaction conventions unless a capability materially requires departure. Do not invent navigation, gestures, controls, AI affordances or visual metaphors for ordinary actions.
- **SEMANTICS BEFORE STYLE:** Every surface, visual treatment, animation, color, elevation, badge, panel and interaction must communicate a concrete product-relevant distinction; remove it otherwise.
- **PRODUCT IDENTITY BEFORE TREND:** Derive TerraFusion visually and structurally from government, geospatial work and evidence, and Introspect from learning, thought, sources and evidence; never generic AI/SaaS aesthetics.
- **REALITY BEFORE THEATER:** Never fabricate operational metrics, statuses, records, evidence, users, activity or system health to fill a UI.
- **DIRECT ACTION BEFORE CHAT:** Use normal controls for deterministic actions. Use AI only where language, ambiguity, synthesis, reasoning, contextual interpretation or generation materially improves the interaction.

## Architecture rules

- Registered views share the scoped `module-interior` contract in primary and embedded windows; common tabs and surfaces stay consistent without changing routes or suite data ownership.
- Module titles and actions use `ModuleHeader`; scope templates retain controls and rails when their window narrows, so window resizing never removes available work.
- Analysis result grids respond to module container width and dense fixed-column rows scroll locally; split-window content must not depend on the browser viewport width.
- Analysis controls remain outside result sections and visible during loading or empty states; shared unframed sections and metric bands separate configuration from evidence.
- Factory calibration consumes the parent neighborhood selection so scope survives tab changes without contradictory local selectors.
- Factory Cost, Income, Comps and Scenario interiors share container-based work grids, named locally scrolling record regions and always-visible ledger actions; narrowing a window must not remove work or imply full-dataset coverage.
- AVM interiors render run-record statuses and configured inputs only; absent telemetry never becomes simulated progress or inferred preprocessing completion.

- Workbench county summaries consume the shared County Vitals read model, never independent count queries or absent comparison snapshots; this keeps county scope and caching consistent.
- Workbench opens with direct parcel controls and an optional toolbar-toggled TerraPilot inspector; this keeps deterministic work primary and prevents floating AI controls from covering the desktop dock.
- Interiors use primary tools and grouped menus; URL parameters retain parcel/work/scope per window and hydrate through Parcel360, including linked focus, to prevent context loss.
- Parcel maps accept only in-range geographic degrees from Parcel360; projected/missing coordinates are unavailable, never fake geography.
- The ingestion wizard stays mounted across data-section changes, preserving unpublished previews in memory; refresh warns about unsaved previews and must not imply durable draft recovery.

- Model the OS as Home/county context, countywide Forge/Atlas/Dais/Dossier, OS-owned Property Workbench, and shared services; each domain retains its constitutional write owner.
- Home is a direct work directory; contextual intelligence and evidence belong in their workspaces, not competing dashboard prescriptions.
- Preserve IA_MAP routes; the workspace presentation index covers every registered view exactly once and drives sidebar, Home and global search without altering write ownership.
- Reject nonempty unregistered view IDs visibly; default fallback hides broken task handoffs.
- Shared workflows orchestrate through domain owners without acquiring permission to write their data.
- The external MCP server lives in src/lib/mcp (one tool per file) behind Supabase OAuth, with tools acting as the caller through RLS; external assistants must never get broader access than the signed-in user.
- The shell renders the active route in a DesktopWindow over a wallpaper with a SpacesDock; an optional side window loads the same app in embed mode (tf_embed=1) in an iframe, so each window keeps independent routing without nested routers or IA_MAP changes.
- Workbench windows in one tab share the focused parcel via BroadcastChannel + sessionStorage (src/lib/parcelLink.ts); it shares focus only, never writes, so write lanes stay intact.
- PACS neighborhoods are valuation-year records (parcel_neighborhood_year, keyed by county-scoped prop_id, certified-active = sup_num 0 and no inactive date, exact code match) with run lineage in neighborhood_reconciliation_runs/items; parcels.neighborhood_code is only a derived current-year display, so a sync can never erase historical labels.

- Parcel360 map coordinates read the derived latitude_wgs84/longitude_wgs84 columns (filled by backfill_parcel_wgs84_from_raw), falling back to raw only in degree range; raw PACS fields may be projected.
- Unsaved record edits recover via src/lib/workDraft (device-local, cleared on save/cancel); drafts never write county data.
