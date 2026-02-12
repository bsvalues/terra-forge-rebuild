import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ArrowRight, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppealTimelineProps {
  appealId: string;
}

interface StatusChange {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  scheduled: "text-tf-cyan",
  in_hearing: "text-purple-400",
  resolved: "text-tf-green",
  denied: "text-destructive",
  withdrawn: "text-muted-foreground",
};

export function AppealTimeline({ appealId }: AppealTimelineProps) {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["appeal-timeline", appealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appeal_status_changes")
        .select("*")
        .eq("appeal_id", appealId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StatusChange[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-suite-dais" />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No status changes recorded yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[250px]">
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

        {changes.map((change, i) => {
          const date = new Date(change.created_at);
          return (
            <div key={change.id} className="relative">
              {/* Dot */}
              <div
                className={cn(
                  "absolute -left-6 top-1 w-[10px] h-[10px] rounded-full border-2 border-background",
                  i === changes.length - 1
                    ? "bg-suite-dais"
                    : "bg-muted-foreground/50"
                )}
              />
              <div className="text-sm">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {change.previous_status && (
                    <>
                      <span
                        className={cn(
                          "font-medium capitalize",
                          STATUS_COLORS[change.previous_status] || "text-muted-foreground"
                        )}
                      >
                        {change.previous_status.replace(/_/g, " ")}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </>
                  )}
                  <span
                    className={cn(
                      "font-medium capitalize",
                      STATUS_COLORS[change.new_status] || "text-muted-foreground"
                    )}
                  >
                    {change.new_status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at{" "}
                    {date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {change.changed_by && (
                    <>
                      <span>•</span>
                      <User className="w-3 h-3" />
                      <span>{change.changed_by.slice(0, 8)}…</span>
                    </>
                  )}
                </div>
                {change.change_reason && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    "{change.change_reason}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
