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

- Workbench county summaries consume the shared County Vitals read model, never independent count queries or absent comparison snapshots; this keeps county scope and caching consistent.
- Workbench opens with direct parcel controls and an optional toolbar-toggled TerraPilot inspector; this keeps deterministic work primary and prevents floating AI controls from covering the desktop dock.

- Model the OS as Home, county context, countywide suites, Property Workbench, and shared OS services; this separates operating scope from domain ownership.
- Preserve the current IA_MAP routing contract until an explicit navigation migration is implemented; the target product architecture must not silently invalidate existing routes.
- Home provides County GIS, search, recent work, contextual AI, quick actions, and launch/orientation; it establishes context rather than duplicating suite workspaces.
- Countywide TerraForge includes CostForge, CompsForge, IncomeForge, SalesForge, CUForge, calibration/regression, diagnostics, and memo/brief workflows; valuation capabilities share one domain owner.
- Countywide TerraAtlas provides GIS, spatial analysis, layers, and geographic intelligence; spatial tools retain their domain boundary at every scope.
- Countywide TerraDais provides administrative and operational work, while TerraDossier provides documents, records, and evidence; workflows and records remain independently governed domains.
- Property Workbench is the OS-owned surface for one property/parcel, with Summary, Forge, Atlas, Dais, Dossier, and AI/evidence/actions contexts; parcel work must not become separate suite-owned property screens.
- Shared OS services comprise identity, authority, search, AI, evidence/provenance, workflows, windowing, data fabric, notifications, and policy; cross-cutting capabilities must not be duplicated within each suite.
- Shared workflow infrastructure orchestrates operations through domain owners and does not acquire permission to write their data; shared services must preserve the constitutional write-lane matrix.
- The external MCP server lives in src/lib/mcp (one tool per file) behind Supabase OAuth, with tools acting as the caller through RLS; external assistants must never get broader access than the signed-in user.
- The shell renders the active route in a DesktopWindow over a wallpaper with a SpacesDock; an optional side window loads the same app in embed mode (tf_embed=1) in an iframe, so each window keeps independent routing without nested routers or IA_MAP changes.
- Workbench windows in one tab share the focused parcel via BroadcastChannel + sessionStorage (src/lib/parcelLink.ts); it shares focus only, never writes, so write lanes stay intact.
