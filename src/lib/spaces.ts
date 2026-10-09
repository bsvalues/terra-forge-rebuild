// TerraFusion OS — Spaces
// A Space is a saved place in the OS (a route) the user can jump back to from the dock.
// Pure functions so the rules are testable; persistence is a thin localStorage wrapper.

export interface Space {
  id: string;
  name: string;
  path: string;
}

export const MAX_SPACES = 8;
export const SPACES_STORAGE_KEY = "tf:spaces:v1";

/** Only same-app absolute paths are allowed — never external URLs. */
export function isSafeSpacePath(path: string): boolean {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/** Add a space. Same path replaces nothing and returns the list unchanged; cap at MAX_SPACES. */
export function addSpace(spaces: Space[], name: string, path: string, id: string): Space[] {
  const trimmed = name.trim();
  if (!trimmed || !isSafeSpacePath(path)) return spaces;
  if (spaces.some((s) => s.path === path)) return spaces;
  if (spaces.length >= MAX_SPACES) return spaces;
  return [...spaces, { id, name: trimmed.slice(0, 40), path }];
}

export function removeSpace(spaces: Space[], id: string): Space[] {
  return spaces.filter((s) => s.id !== id);
}

/** Parse stored JSON defensively — corrupt or hostile values yield an empty list. */
export function parseSpaces(raw: string | null): Space[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (s): s is Space =>
          s && typeof s.id === "string" && typeof s.name === "string" && isSafeSpacePath(s.path),
      )
      .slice(0, MAX_SPACES);
  } catch {
    return [];
  }
}

export function loadSpaces(): Space[] {
  if (typeof window === "undefined") return [];
  return parseSpaces(window.localStorage.getItem(SPACES_STORAGE_KEY));
}

export function saveSpaces(spaces: Space[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
}

/** Rename a space; blank names are rejected and the list is returned unchanged. */
export function renameSpace(spaces: Space[], id: string, name: string): Space[] {
  const trimmed = name.trim();
  if (!trimmed) return spaces;
  return spaces.map((s) => (s.id === id ? { ...s, name: trimmed.slice(0, 40) } : s));
}

/**
 * Keyboard jump to a space: Ctrl/Cmd + Alt + 1..8 → zero-based index, else null.
 * Uses `code` so Alt-modified characters on macOS still resolve to the digit.
 */
export function spaceIndexFromKey(e: { key: string; code?: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }): number | null {
  if (!(e.metaKey || e.ctrlKey) || !e.altKey || e.shiftKey) return null;
  const digit = e.code?.startsWith("Digit") ? e.code.slice(5) : e.key;
  const n = Number(digit);
  return Number.isInteger(n) && n >= 1 && n <= MAX_SPACES ? n - 1 : null;
}
