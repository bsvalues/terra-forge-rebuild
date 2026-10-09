// TerraFusion OS — Parcel link between windows.
// When a parcel is opened in one Property Workbench window, other Workbench windows
// in the same browser tab (main + side window) follow it. Same-origin only, read-only:
// this shares *which* parcel is in focus, never parcel data writes.

import type { ParcelContext } from "@/components/workbench/types";

export const PARCEL_LINK_CHANNEL = "tf:parcel-link:v1";
export const PARCEL_LINK_STORAGE_KEY = "tf:parcel-link:last:v1";

export interface ParcelLinkMessage {
  /** Window that sent it, so a window ignores its own echo. */
  source: string;
  parcel: ParcelContext;
}

const STRING_KEYS = ["id", "parcelNumber", "address", "city", "propertyClass", "neighborhoodCode"] as const;
const NUMBER_KEYS = ["assessedValue", "latitude", "longitude"] as const;

/** Validate untrusted input into a ParcelContext with a non-empty id, or null. */
export function sanitizeParcel(input: unknown): ParcelContext | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  if (typeof d.id !== "string" || d.id.trim() === "" || d.id.length > 128) return null;
  const out = {} as ParcelContext;
  for (const k of STRING_KEYS) {
    const v = d[k];
    (out as unknown as Record<string, unknown>)[k] = typeof v === "string" ? v.slice(0, 512) : null;
  }
  for (const k of NUMBER_KEYS) {
    const v = d[k];
    (out as unknown as Record<string, unknown>)[k] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

export function parseParcelLinkMessage(data: unknown): ParcelLinkMessage | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.source !== "string" || d.source === "") return null;
  const parcel = sanitizeParcel(d.parcel);
  return parcel ? { source: d.source, parcel } : null;
}

export function createWindowId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `w-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Last linked parcel for this browser tab (sessionStorage is shared with same-origin side windows). */
export function loadLastLinkedParcel(): ParcelContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PARCEL_LINK_STORAGE_KEY);
    return raw ? sanitizeParcel(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function publishParcel(source: string, parcel: ParcelContext): void {
  const clean = sanitizeParcel(parcel);
  if (!clean || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PARCEL_LINK_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* storage full or blocked: live link still works */
  }
  if (typeof BroadcastChannel === "undefined") return;
  const ch = new BroadcastChannel(PARCEL_LINK_CHANNEL);
  ch.postMessage({ source, parcel: clean } satisfies ParcelLinkMessage);
  ch.close();
}

/** Listen for parcels opened in other windows. Returns an unsubscribe function. */
export function subscribeParcelLink(selfId: string, onParcel: (p: ParcelContext) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel(PARCEL_LINK_CHANNEL);
  ch.onmessage = (e: MessageEvent) => {
    const msg = parseParcelLinkMessage(e.data);
    if (msg && msg.source !== selfId) onParcel(msg.parcel);
  };
  return () => ch.close();
}
