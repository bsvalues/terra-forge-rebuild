// TerraFusion OS — Phase 85.2: DB-Backed Notifications Hook
// Queries the notifications table + subscribes to Supabase Realtime.
// Exposes markAsRead, markAllAsRead, deleteNotification actions.
// Per DATA_CONSTITUTION: no supabase.from() in components.

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";


// ── Types ──────────────────────────────────────────────────────────

export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationType = "deadline" | "blocker" | "dq_alert" | "assignment" | "system";

export interface DBNotification {
  id: string;
  county_id: string | null;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  severity: NotificationSeverity;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

// ── Query key factory ──────────────────────────────────────────────

const QK = {
  list: (userId: string | undefined) => ["db-notifications", userId],
} as const;

// ── Hook ───────────────────────────────────────────────────────────

export function useDBNotifications() {
  const { profile } = useAuthContext();
  const userId = profile?.user_id;

  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── List query ─────────────────────────────────────────────────
  const { data: notifications = [], isLoading } = useQuery<DBNotification[]>({
    queryKey: QK.list(userId),
    queryFn: async () => {
      if (!userId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as DBNotification[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  // ── Derived state ──────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ── Real-time subscription ─────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`db-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QK.list(userId) });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QK.list(userId) });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, qc]);

  // ── Mutations ──────────────────────────────────────────────────

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.list(userId) }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId!)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.list(userId) }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.list(userId) }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.list(userId) }),
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: (id: string) => markAsRead.mutate(id),
    markAllAsRead: () => markAllAsRead.mutate(),
    deleteNotification: (id: string) => deleteNotification.mutate(id),
    clearAll: () => clearAll.mutate(),
  };
}
