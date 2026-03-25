import { useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  PRIMARY_MODULE_IDS,
  type PrimaryModuleId,
  type ViewId,
  getViewGroup,
  resolveGroupSlug,
  buildUrlPath,
  resolveLegacyId,
} from "@/config/IA_MAP";

// ── Public interface ────────────────────────────────────────────────
export interface AppNavigation {
  activeModule: PrimaryModuleId;
  activeView: ViewId | null;
  activeGroup: string | null; // group slug from URL
  navigationDirection: "push" | "pop"; // for animation direction
  navigateTo: (module: PrimaryModuleId, viewId?: string) => void;
  navigateToLegacy: (target: string) => void; // handles "module:view" format
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Count non-empty segments in a pathname */
function pathDepth(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}

/** Extract the first path segment and treat it as a PrimaryModuleId */
function parseModuleFromPath(pathname: string): PrimaryModuleId {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && (PRIMARY_MODULE_IDS as readonly string[]).includes(first)) {
    return first as PrimaryModuleId;
  }
  return "home"; // default fallback
}

/**
 * Derive activeView from the URL.
 *
 * Possible shapes:
 *   /:module                         → view = null
 *   /:module/:viewId                 → view = viewId  (non-grouped)
 *   /:module/:groupSlug/:viewId      → view = viewId  (grouped)
 *
 * For the grouped case we first check whether segment[1] resolves as a group
 * slug for the active module. If it does, segment[2] is the viewId; otherwise
 * segment[1] itself is a bare viewId.
 */
function parseViewFromPath(
  pathname: string,
  moduleId: PrimaryModuleId,
): { viewId: ViewId | null; groupSlug: string | null } {
  const segments = pathname.split("/").filter(Boolean);

  // Only the module root
  if (segments.length <= 1) {
    return { viewId: null, groupSlug: null };
  }

  const seg1 = segments[1];
  const seg2 = segments[2] ?? null;

  // Check if seg1 is a group slug for this module
  const group = resolveGroupSlug(moduleId, seg1);
  if (group && seg2) {
    return { viewId: seg2, groupSlug: seg1 };
  }

  // Otherwise seg1 is the viewId directly (no group)
  // Still check if it belongs to a group so we can expose the slug
  const viewGroup = getViewGroup(moduleId, seg1);
  return {
    viewId: seg1,
    groupSlug: viewGroup?.slug ?? null,
  };
}

// ── Hook ────────────────────────────────────────────────────────────
export function useAppNavigation(): AppNavigation {
  const location = useLocation();
  const navigate = useNavigate();
  // useParams will supply route params when matched, but we also do manual
  // parsing so the hook works regardless of exact route config.
  useParams();

  const { pathname } = location;

  // Track previous depth so we can infer push vs. pop direction
  const prevDepthRef = useRef<number>(pathDepth(pathname));

  const activeModule = useMemo(() => parseModuleFromPath(pathname), [pathname]);

  const { viewId: activeView, groupSlug: activeGroup } = useMemo(
    () => parseViewFromPath(pathname, activeModule),
    [pathname, activeModule],
  );

  // Compute direction: deeper = push, shallower = pop, same = push (default)
  const navigationDirection = useMemo<"push" | "pop">(() => {
    const currentDepth = pathDepth(pathname);
    const direction = currentDepth < prevDepthRef.current ? "pop" : "push";
    prevDepthRef.current = currentDepth;
    return direction;
  }, [pathname]);

  // ── navigateTo ──────────────────────────────────────────────────
  const navigateTo = useCallback(
    (module: PrimaryModuleId, viewId?: string) => {
      const path = buildUrlPath(module, viewId);
      navigate(path);
    },
    [navigate],
  );

  // ── navigateToLegacy ────────────────────────────────────────────
  // Accepts strings like "factory:vei", "home:ids", "workbench:field:photos",
  // or bare legacy IDs like "vei", "ids".
  const navigateToLegacy = useCallback(
    (target: string) => {
      const parts = target.split(":");
      const primaryPart = parts[0];
      const viewPart = parts[1]; // may be undefined

      // Case 1: "module:view" or "module:view:subTab" where module is a primary ID
      if ((PRIMARY_MODULE_IDS as readonly string[]).includes(primaryPart)) {
        navigateTo(primaryPart as PrimaryModuleId, viewPart);
        return;
      }

      // Case 2: bare legacy ID (e.g. "vei", "ids", "field")
      const resolved = resolveLegacyId(primaryPart);
      if (resolved) {
        // If the legacy target also carried a sub-view override, prefer that;
        // otherwise fall back to the mapped view from LEGACY_REDIRECTS.
        navigateTo(resolved.module, viewPart ?? resolved.view);
        return;
      }

      // Fallback: treat the whole string as a view within the current module
      navigateTo(activeModule, primaryPart);
    },
    [navigateTo, activeModule],
  );

  return {
    activeModule,
    activeView,
    activeGroup,
    navigationDirection,
    navigateTo,
    navigateToLegacy,
  };
}
