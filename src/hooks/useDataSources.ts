// TerraFusion OS — Data Sources Hook (Constitutional: DB access only in hooks)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDataSourcesList(countyId: string | undefined | null) {
  return useQuery({
    queryKey: ["data-sources", countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .eq("county_id", countyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!countyId,
  });
}

export function useAddDataSource(countyId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (source: { name: string; source_type: string; description?: string; connection_url?: string }) => {
      const { error } = await supabase.from("data_sources").insert({
        name: source.name,
        source_type: source.source_type,
        description: source.description || null,
        connection_config: source.connection_url ? { url: source.connection_url } : null,
        county_id: countyId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteDataSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}
