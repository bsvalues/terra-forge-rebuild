// TerraFusion OS — useFieldSync Hook
// Background auto-sync with progress tracking and connectivity awareness
// Agent Factory: "The sync interval is my heartbeat. I'm alive!" 💓📎

import { useState, useEffect, useCallback, useRef } from "react";
import { getQueueStats } from "@/services/fieldStore";
import { fullSyncCycle, type SyncProgress, type SyncResult } from "@/services/fieldSync";

const AUTO_SYNC_INTERVAL_MS = 30_000; // 30 seconds

export interface FieldSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  lastSyncAt: string | null;
  progress: SyncProgress | null;
  queueStats: { pending: number; synced: number; error: number; total: number };
  syncNow: () => Promise<SyncResult>;
  refresh: () => Promise<void>;
}

export function useFieldSync(): FieldSyncState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [queueStats, setQueueStats] = useState({ pending: 0, synced: 0, error: 0, total: 0 });
  const syncLock = useRef(false);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh queue stats
  const refresh = useCallback(async () => {
    const stats = await getQueueStats();
    setQueueStats(stats);
  }, []);

  // Sync function with lock to prevent concurrent syncs
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (syncLock.current || !navigator.onLine) {
      return { synced: 0, errors: 0, conflicts: 0, retried: 0 };
    }

    syncLock.current = true;
    setIsSyncing(true);
    setProgress(null);

    try {
      const result = await fullSyncCycle((p) => setProgress({ ...p }));
      setLastSyncResult(result);
      setLastSyncAt(new Date().toISOString());
      await refresh();
      return result;
    } finally {
      setIsSyncing(false);
      setProgress(null);
      syncLock.current = false;
    }
  }, [refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-sync interval when online and has pending items
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      const stats = await getQueueStats();
      setQueueStats(stats);

      // Auto-sync if there are pending or retryable items
      if (stats.pending > 0 || stats.error > 0) {
        await syncNow();
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline, syncNow]);

  // Trigger immediate sync when coming back online
  useEffect(() => {
    if (isOnline && queueStats.pending > 0) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    lastSyncResult,
    lastSyncAt,
    progress,
    queueStats,
    syncNow,
    refresh,
  };
}
