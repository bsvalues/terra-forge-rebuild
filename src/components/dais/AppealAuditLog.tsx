import { useState } from "react";
import { useAppealAuditLog } from "@/hooks/useDaisQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Search,
  ArrowRight,
  Calendar,
  Filter,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  scheduled: "bg-tf-cyan/20 text-tf-cyan",
  in_hearing: "bg-purple-500/20 text-purple-400",
  resolved: "bg-tf-green/20 text-tf-green",
  denied: "bg-destructive/20 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export function AppealAuditLog() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["appeal-audit-log", statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("appeal_status_changes")
        .select(`
          *,
          appeal:appeals!appeal_status_changes_appeal_id_fkey(
            id,
            parcel:parcels!appeals_parcel_id_fkey(parcel_number, address)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("new_status", statusFilter);
      }

      if (dateRange !== "all") {
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("created_at", since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = changes.filter((c) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      c.appeal?.parcel?.parcel_number?.toLowerCase().includes(s) ||
      c.appeal?.parcel?.address?.toLowerCase().includes(s) ||
      c.new_status?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-suite-dais/20 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-suite-dais" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">
            Appeal Status Audit Log
          </h3>
          <p className="text-sm text-muted-foreground">
            All status transitions across appeals for compliance reporting
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by PIN or address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-tf-substrate border-border/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[130px] bg-tf-substrate border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-tf-substrate border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_hearing">In Hearing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Log Table */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-suite-dais" />
            Status Changes ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-suite-dais" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No status changes found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((change) => {
                  const date = new Date(change.created_at);
                  return (
                    <div
                      key={change.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center gap-1.5 shrink-0">
                          {change.previous_status && (
                            <>
                              <Badge
                                className={cn(
                                  "text-[10px]",
                                  STATUS_COLORS[change.previous_status] || ""
                                )}
                              >
                                {change.previous_status.replace(/_/g, " ")}
                              </Badge>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            </>
                          )}
                          <Badge
                            className={cn(
                              "text-[10px]",
                              STATUS_COLORS[change.new_status] || ""
                            )}
                          >
                            {change.new_status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {change.appeal?.parcel?.parcel_number || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2 truncate">
                            {change.appeal?.parcel?.address || ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                        {change.changed_by && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{change.changed_by.slice(0, 8)}</span>
                          </div>
                        )}
                        <span>
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          {date.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
