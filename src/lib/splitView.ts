// TerraFusion OS — Side-by-side windows
// The side window is the same app loaded in "embed" mode (content only, no shell) inside an iframe.
// This keeps each window's navigation independent without nesting routers.

import { isSafeSpacePath } from "@/lib/spaces";

export const EMBED_PARAM = "tf_embed";
export const SPLIT_STORAGE_KEY = "tf:split-view:v1";
export const MIN_SPLIT = 0.25;
export const MAX_SPLIT = 0.75;
export const DEFAULT_SPLIT = 0.55;

export interface SplitState {
  /** Route shown in the side window, or null when closed. */
  path: string | null;
  /** Share of width given to the main window (0..1). */
  ratio: number;
}

export function clampSplit(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_SPLIT;
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio));
}

/** True when this page is running inside a side window. */
export function isEmbedMode(search: string): boolean {
  return new URLSearchParams(search).get(EMBED_PARAM) === "1";
}

/** Add the embed flag to an in-app path, keeping its own query and hash. */
export function buildEmbedUrl(path: string): string | null {
  if (!isSafeSpacePath(path)) return null;
  const url = new URL(path, "http://tf.local");
  url.searchParams.set(EMBED_PARAM, "1");
  return url.pathname + url.search + url.hash;
}

/** Remove the embed flag so a side-window page can be opened as the main window. */
export function stripEmbedParam(pathWithSearch: string): string {
  const url = new URL(pathWithSearch, "http://tf.local");
  url.searchParams.delete(EMBED_PARAM);
  return url.pathname + url.search + url.hash;
}

export function parseSplitState(raw: string | null): SplitState {
  try {
    const d = raw ? JSON.parse(raw) : null;
    const path = typeof d?.path === "string" && isSafeSpacePath(d.path) ? d.path : null;
    return { path, ratio: clampSplit(typeof d?.ratio === "number" ? d.ratio : DEFAULT_SPLIT) };
  } catch {
    return { path: null, ratio: DEFAULT_SPLIT };
  }
}

export function loadSplitState(): SplitState {
  if (typeof window === "undefined") return { path: null, ratio: DEFAULT_SPLIT };
  return parseSplitState(window.localStorage.getItem(SPLIT_STORAGE_KEY));
}

export function saveSplitState(state: SplitState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(state));
}
