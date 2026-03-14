import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "admin" | "analyst" | "viewer";

export interface ManagedUser {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  countyId: string | null;
  email: string;
  lastSignIn: string | null;
  roles: AppRole[];
  createdAt: string;
}

async function invokeAdmin(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-manage-users", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Admin action failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useUserList() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<ManagedUser[]> => {
      const data = await invokeAdmin("list_users");
      return data.users ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role }: { targetUserId: string; role: AppRole }) => {
      return invokeAdmin("assign_role", { targetUserId, role });
    },
    onSuccess: (_, vars) => {
      toast.success(`Role "${vars.role}" assigned`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to assign role", { description: err.message });
    },
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role }: { targetUserId: string; role: AppRole }) => {
      return invokeAdmin("revoke_role", { targetUserId, role });
    },
    onSuccess: (_, vars) => {
      toast.success(`Role "${vars.role}" revoked`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to revoke role", { description: err.message });
    },
  });
}

export function useUpdateUserCounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, newCountyId }: { targetUserId: string; newCountyId: string }) => {
      return invokeAdmin("update_county", { targetUserId, newCountyId });
    },
    onSuccess: () => {
      toast.success("County assignment updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to update county", { description: err.message });
    },
  });
}
