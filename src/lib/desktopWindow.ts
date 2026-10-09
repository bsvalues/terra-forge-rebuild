// TerraFusion OS — Desktop window helpers (titles + persisted window prefs).
import { IA_MODULES, type PrimaryModuleId } from "@/config/IA_MAP";

export interface WindowTitle {
  title: string;
  subtitle?: string;
}

function humanize(id: string): string {
  return id.replace(/[-_:]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Window title from the IA map labels; falls back to a readable version of the id. */
export function windowTitleFor(moduleId: PrimaryModuleId, viewId?: string | null): WindowTitle {
  const mod = IA_MODULES.find((m) => m.id === moduleId);
  const title = mod?.label ?? humanize(moduleId);
  if (!viewId) return { title };
  const view = mod?.views.find((v) => v.id === viewId);
  return { title, subtitle: view?.label ?? humanize(viewId) };
}

export const WINDOW_PREFS_KEY = "tf:desktop-window:v1";

export interface WindowPrefs {
  maximized: boolean;
}

export function parseWindowPrefs(raw: string | null): WindowPrefs {
  try {
    const d = raw ? JSON.parse(raw) : null;
    return { maximized: d?.maximized === true };
  } catch {
    return { maximized: false };
  }
}

export function loadWindowPrefs(): WindowPrefs {
  if (typeof window === "undefined") return { maximized: false };
  return parseWindowPrefs(window.localStorage.getItem(WINDOW_PREFS_KEY));
}

export function saveWindowPrefs(prefs: WindowPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WINDOW_PREFS_KEY, JSON.stringify(prefs));
}
