// TerraFusion OS — PACS Connection Status Badge
// Shows live/staged/offline status of the PACS connector edge function.

import { useQuery } from "@tanstack/react-query";
import { checkConnectorHealth } from "@/services/pacsConnector";
import { cn } from "@/lib/utils";

export function PACSConnectionBadge() {
  const { data, isLoading } = useQuery({
    queryKey: ["pacs-health"],
    queryFn: checkConnectorHealth,
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) return null;

  const connected = data?.connected ?? false;
  const isEdgeFnDown =
    !connected &&
    (data?.error?.includes("Edge function") || data?.error?.includes("fetch"));

  if (isEdgeFnDown) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        PACS Staged
      </span>
    );
  }

  if (!connected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
        PACS Offline
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      PACS Live
    </span>
  );
}
