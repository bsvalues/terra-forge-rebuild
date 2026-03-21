// TerraFusion OS — Phase 84.3: User Role Hook
// Fetches the current user's highest role for UI gating.
// Query Key: ["user-role"] • Stale: 60s

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "analyst" | "viewer";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 2,
  analyst: 1,
  viewer: 0,
};

export interface UserRoleInfo {
  roles: AppRole[];
  /** Highest role the user holds */
  primaryRole: AppRole;
  isAdmin: boolean;
  isAnalyst: boolean;
  isViewer: boolean;
}

export function useUserRole(): UserRoleInfo & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["user-role"],
    queryFn: async (): Promise<UserRoleInfo> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { roles: ["viewer"], primaryRole: "viewer", isAdmin: false, isAnalyst: false, isViewer: true };
      }

      const { data: rows, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error || !rows || rows.length === 0) {
        return { roles: ["viewer"], primaryRole: "viewer", isAdmin: false, isAnalyst: false, isViewer: true };
      }

      const roles = rows.map((r: { role: string }) => r.role as AppRole);
      const primaryRole = roles.reduce<AppRole>(
        (best, r) => (ROLE_HIERARCHY[r] > ROLE_HIERARCHY[best] ? r : best),
        "viewer"
      );

      return {
        roles,
        primaryRole,
        isAdmin: primaryRole === "admin",
        isAnalyst: primaryRole === "analyst" || primaryRole === "admin",
        isViewer: true, // all roles can view
      };
    },
    staleTime: 60_000,
  });

  return {
    roles: data?.roles ?? ["viewer"],
    primaryRole: data?.primaryRole ?? "viewer",
    isAdmin: data?.isAdmin ?? false,
    isAnalyst: data?.isAnalyst ?? false,
    isViewer: data?.isViewer ?? true,
    isLoading,
  };
}

/** Returns true if the user's role meets or exceeds minRole in the hierarchy */
export function roleAtLeast(userRole: AppRole, minRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
