import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  Search,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  FileText,
  MapPin,
  User,
  ChevronRight,
  Loader2,
  Plus,
  Mail,
  History,
} from "lucide-react";
import { AppealTimeline } from "./AppealTimeline";
import { StatusTransitionDropdown, APPEAL_TRANSITIONS } from "./StatusTransitionDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { cn } from "@/lib/utils";
import { updateAppealStatus } from "@/services/suites/daisService";
import { invalidateWorkflows } from "@/lib/queryInvalidation";
import { toast } from "@/hooks/use-toast";
import { showChangeReceipt } from "@/lib/changeReceipt";

interface Appeal {
  id: string;
  appeal_date: string;
  original_value: number;
  requested_value: number | null;
  final_value: number | null;
  status: string;
  hearing_date: string | null;
  resolution_date: string | null;
  resolution_type: string | null;
  notes: string | null;
  owner_email: string | null;
  parcel: {
    id: string;
    parcel_number: string;
    address: string;
    city: string | null;
  };
  study_period: {
    id: string;
    name: string;
  } | null;
}

const STATUS_CONFIG = {
  pending: {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
    label: "Pending Review",
  },
  scheduled: {
    color: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30",
    icon: Calendar,
    label: "Hearing Scheduled",
  },
  in_hearing: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Scale,
    label: "In Hearing",
  },
  resolved: {
    color: "bg-tf-green/20 text-tf-green border-tf-green/30",
    icon: CheckCircle,
    label: "Resolved",
  },
  denied: {
    color: "bg-destructive/20 text-destructive border-destructive/30",
    icon: XCircle,
    label: "Denied",
  },
  withdrawn: {
    color: "bg-muted text-muted-foreground border-muted",
    icon: FileText,
    label: "Withdrawn",
  },
};

export function AppealsWorkflow() {
  const { setParcel, setActiveTab } = useWorkbench();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  const changeStatus = useMutation({
    mutationFn: async ({ appeal, newStatus, reason }: { appeal: Appeal; newStatus: string; reason?: string }) => {
      return updateAppealStatus(appeal.id, appeal.parcel?.id, newStatus, appeal.status, reason);
    },
    onSuccess: (_, { appeal, newStatus, reason }) => {
      invalidateWorkflows(queryClient);
      showChangeReceipt({
        entity: `Appeal ${appeal.id.slice(0, 8)}`,
        action: "Appeal status updated",
        impact: "parcel",
        changes: [{ field: "status", before: appeal.status, after: newStatus }],
        reason,
      });
      setSelectedAppeal(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Fetch appeals with parcel info
  const { data: appeals = [], isLoading } = useQuery({
    queryKey: ["appeals-workflow", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("appeals")
        .select(`
          *,
          parcel:parcels!appeals_parcel_id_fkey(id, parcel_number, address, city),
          study_period:study_periods!appeals_study_period_id_fkey(id, name)
        `)
        .order("appeal_date", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appeal[];
    },
  });

  const filteredAppeals = appeals.filter((appeal) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      appeal.parcel?.parcel_number?.toLowerCase().includes(search) ||
      appeal.parcel?.address?.toLowerCase().includes(search)
    );
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateReduction = (original: number, requested: number | null) => {
    if (!requested) return null;
    const reduction = ((original - requested) / original) * 100;
    return reduction.toFixed(1);
  };

  const handleNavigateToParcel = (appeal: Appeal) => {
    if (appeal.parcel) {
      setParcel({
        id: appeal.parcel.id,
        parcelNumber: appeal.parcel.parcel_number,
        address: appeal.parcel.address,
        city: appeal.parcel.city,
      });
      setActiveTab("summary");
    }
  };

  const statusCounts = {
    all: appeals.length,
    pending: appeals.filter((a) => a.status === "pending").length,
    scheduled: appeals.filter((a) => a.status === "scheduled").length,
    resolved: appeals.filter((a) => a.status === "resolved" || a.status === "denied").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-suite-dais/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-suite-dais" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Appeals Workflow</h3>
            <p className="text-sm text-muted-foreground">
              Manage property value appeals and hearings
            </p>
          </div>
        </div>
        <Button className="gap-2 bg-suite-dais hover:bg-suite-dais/90">
          <Plus className="w-4 h-4" />
          New Appeal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by PIN or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-tf-substrate border-border/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-tf-substrate border-border/50">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Appeals ({statusCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
              <SelectItem value="scheduled">Scheduled ({statusCounts.scheduled})</SelectItem>
              <SelectItem value="resolved">Resolved ({statusCounts.resolved})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { status: "pending", label: "Pending Review", count: statusCounts.pending, color: "text-amber-400" },
          { status: "scheduled", label: "Hearings Scheduled", count: statusCounts.scheduled, color: "text-tf-cyan" },
          { status: "resolved", label: "Resolved", count: statusCounts.resolved, color: "text-tf-green" },
          { status: "total", label: "Total Value at Stake", count: formatCurrency(appeals.filter(a => a.status === "pending" || a.status === "scheduled").reduce((sum, a) => sum + (a.original_value - (a.requested_value || a.original_value)), 0)), color: "text-tf-gold", isValue: true },
        ].map((item) => (
          <Card key={item.status} className="material-bento border-border/50">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className={cn("text-2xl font-light", item.color)}>
                {item.isValue ? item.count : item.count}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Appeals List */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-suite-dais" />
            Active Appeals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-suite-dais" />
              </div>
            ) : filteredAppeals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No appeals found</p>
                <p className="text-sm">
                  {searchQuery ? "Try a different search term" : "No appeals have been filed yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredAppeals.map((appeal, index) => {
                    const statusConfig = STATUS_CONFIG[appeal.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const reduction = calculateReduction(appeal.original_value, appeal.requested_value);

                    return (
                      <motion.div
                        key={appeal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="group flex items-center justify-between p-4 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-all cursor-pointer"
                        onClick={() => setSelectedAppeal(appeal)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", statusConfig.color)}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {appeal.parcel?.parcel_number || "Unknown"}
                              </span>
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[250px]">
                                {appeal.parcel?.address || "Unknown address"}
                              </span>
                              {appeal.parcel?.city && (
                                <>
                                  <span>•</span>
                                  <span>{appeal.parcel.city}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                              {formatCurrency(appeal.original_value)}
                            </div>
                            <div className="text-xs text-muted-foreground">Original Value</div>
                          </div>
                          {appeal.requested_value && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-destructive">
                                {formatCurrency(appeal.requested_value)}
                                {reduction && (
                                  <span className="ml-1 text-xs">(-{reduction}%)</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">Requested</div>
                            </div>
                          )}
                          <div className="text-right min-w-[80px]">
                            <div className="text-sm font-medium text-foreground">
                              {formatDate(appeal.appeal_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">Filed</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Appeal Detail Dialog */}
      <Dialog open={!!selectedAppeal} onOpenChange={() => setSelectedAppeal(null)}>
        <DialogContent className="material-bento border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-suite-dais" />
              Appeal Details
            </DialogTitle>
            <DialogDescription>
              {selectedAppeal?.parcel?.parcel_number} - {selectedAppeal?.parcel?.address}
            </DialogDescription>
          </DialogHeader>

          {selectedAppeal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge className={STATUS_CONFIG[selectedAppeal.status as keyof typeof STATUS_CONFIG]?.color}>
                    {STATUS_CONFIG[selectedAppeal.status as keyof typeof STATUS_CONFIG]?.label || selectedAppeal.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Study Period</div>
                  <div className="text-sm font-medium">{selectedAppeal.study_period?.name || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Original Value</div>
                  <div className="text-sm font-medium text-foreground">
                    {formatCurrency(selectedAppeal.original_value)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Requested Value</div>
                  <div className="text-sm font-medium text-destructive">
                    {formatCurrency(selectedAppeal.requested_value)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Appeal Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedAppeal.appeal_date)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Hearing Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedAppeal.hearing_date)}</div>
                </div>
              </div>

              {selectedAppeal.notes && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Notes</div>
                  <div className="text-sm bg-tf-substrate rounded-lg p-3">{selectedAppeal.notes}</div>
                </div>
              )}

              {selectedAppeal.owner_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Owner:</span>
                  <span className="text-foreground">{selectedAppeal.owner_email}</span>
                </div>
              )}

              {selectedAppeal.final_value && (
                <div className="p-3 rounded-lg bg-tf-green/10 border border-tf-green/30">
                  <div className="text-xs text-muted-foreground mb-1">Final Resolved Value</div>
                  <div className="text-lg font-medium text-tf-green">
                    {formatCurrency(selectedAppeal.final_value)}
                  </div>
                  {selectedAppeal.resolution_type && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Resolution: {selectedAppeal.resolution_type}
                    </div>
                  )}
                </div>
              )}

              {/* Status Change Timeline */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History className="w-3 h-3" />
                  STATUS HISTORY
                </div>
                <AppealTimeline appealId={selectedAppeal.id} />
              </div>
            </div>
          )}

          {selectedAppeal && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedAppeal(null)}>
                Close
              </Button>
              <StatusTransitionDropdown
                currentStatus={selectedAppeal.status}
                transitions={APPEAL_TRANSITIONS}
                onTransition={(newStatus, reason) =>
                  changeStatus.mutate({ appeal: selectedAppeal, newStatus, reason })
                }
                isPending={changeStatus.isPending}
                accentClass="bg-suite-dais hover:bg-suite-dais/90"
              />
              <Button
                onClick={() => {
                  handleNavigateToParcel(selectedAppeal);
                  setSelectedAppeal(null);
                }}
                variant="outline"
              >
                <MapPin className="w-4 h-4 mr-2" />
                View Parcel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
