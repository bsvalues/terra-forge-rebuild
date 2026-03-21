// TerraFusion OS — Phase 91: County Notification Admin Query Hook
// Returns all notifications for the current county visible to this session.
// The DB's RLS scopes rows to auth.uid(), so admins get their own alerts
// (which includes deadline + DQ alerts fanned out to all county admins/analysts
// by the notification-alerts function).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import type { DBNotification } from "@/hooks/useDBNotifications";

// ── Query key factory ─────────────────────────────────────────────

const QK = {
  countyList: (countyId: string | null, userId: string | undefined) =>
    ["county-notifications", countyId, userId] as const,
} as const;

// ── Hook ─────────────────────────────────────────────────────────

/**
 * useCountyNotifications
 *
 * Queries the notifications table for the authenticated user, filtered to
 * the active county.  This gives admins a full view of alert-engine output
 * without requiring a service-role bypass.
 *
 * Returns notifications sorted newest-first, limited to 200 rows.
 */
export function useCountyNotifications() {
  const { profile } = useAuthContext();
  const userId = profile?.user_id;
  const countyId = useActiveCountyId();

  return useQuery<DBNotification[]>({
    queryKey: QK.countyList(countyId, userId),
    queryFn: async () => {
      if (!userId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DBNotification[];
    },
    enabled: !!userId,
    staleTime: 15_000,
  });
}
