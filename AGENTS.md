# TerraFusion OS Architecture

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
