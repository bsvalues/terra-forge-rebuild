// TerraFusion OS — Recent Parcels Hook
// Constitutional: tracks recently viewed parcels for quick re-access

import { useState, useEffect, useCallback } from "react";

export interface RecentParcel {
  id: string;
  parcelNumber: string;
  address: string;
  assessedValue: number;
  viewedAt: number;
}

const STORAGE_KEY = "terrafusion_recent_parcels";
const MAX_RECENT = 20;

function load(): RecentParcel[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function save(items: RecentParcel[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT))); }
  catch { /* quota exceeded */ }
}

// Global shared state
let globalRecents: RecentParcel[] = load();
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

export function useRecentParcels() {
  const [recents, setRecents] = useState<RecentParcel[]>(globalRecents);

  useEffect(() => {
    const listener = () => setRecents([...globalRecents]);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const addRecent = useCallback((parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => {
    // Remove existing entry for this parcel (dedup), then prepend
    globalRecents = [
      { ...parcel, viewedAt: Date.now() },
      ...globalRecents.filter((r) => r.id !== parcel.id),
    ].slice(0, MAX_RECENT);
    save(globalRecents);
    notify();
  }, []);

  const removeRecent = useCallback((id: string) => {
    globalRecents = globalRecents.filter((r) => r.id !== id);
    save(globalRecents);
    notify();
  }, []);

  const clearRecents = useCallback(() => {
    globalRecents = [];
    save(globalRecents);
    notify();
  }, []);

  return { recents, addRecent, removeRecent, clearRecents };
}
