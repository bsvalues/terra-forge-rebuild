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
  ClipboardCheck,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  MapPin,
  ChevronRight,
  Loader2,
  Plus,
  Home,
  Heart,
  Shield,
  Users,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useExemptionsWorkflow, type Exemption } from "@/hooks/useDaisQueries";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { cn } from "@/lib/utils";
import { NewExemptionDialog } from "./NewExemptionDialog";
import { StatusTransitionDropdown, EXEMPTION_TRANSITIONS } from "./StatusTransitionDropdown";
import { decideExemption, updateExemptionStatus } from "@/services/suites/daisService";
import { invalidateWorkflows } from "@/lib/queryInvalidation";
import { toast } from "@/hooks/use-toast";
import { showChangeReceipt } from "@/lib/changeReceipt";

// Exemption type imported from useDaisQueries

const STATUS_CONFIG = {
  pending: {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
    label: "Pending Review",
  },
  approved: {
    color: "bg-tf-green/20 text-tf-green border-tf-green/30",
    icon: CheckCircle,
    label: "Approved",
  },
  denied: {
    color: "bg-destructive/20 text-destructive border-destructive/30",
    icon: XCircle,
    label: "Denied",
  },
  expired: {
    color: "bg-muted text-muted-foreground border-muted",
    icon: AlertCircle,
    label: "Expired",
  },
  renewal_required: {
    color: "bg-tf-gold/20 text-tf-gold border-tf-gold/30",
    icon: Calendar,
    label: "Renewal Required",
  },
};

const EXEMPTION_TYPES = {
  homestead: { label: "Homestead", icon: Home, color: "text-tf-green" },
  senior: { label: "Senior Citizen", icon: Users, color: "text-tf-cyan" },
  disability: { label: "Disability", icon: Heart, color: "text-purple-400" },
  veteran: { label: "Veteran", icon: Shield, color: "text-tf-gold" },
  agricultural: { label: "Agricultural", icon: Home, color: "text-amber-400" },
  nonprofit: { label: "Non-Profit", icon: Heart, color: "text-pink-400" },
};

export function ExemptionsWorkflow() {
  const { setParcel, setActiveTab } = useWorkbench();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedExemption, setSelectedExemption] = useState<Exemption | null>(null);
  const [showNewExemptionDialog, setShowNewExemptionDialog] = useState(false);

  const changeExemptionStatus = useMutation({
    mutationFn: async ({ exemption, newStatus, reason }: { exemption: Exemption; newStatus: string; reason?: string }) => {
      if (newStatus === "approved" || newStatus === "denied") {
        return decideExemption(exemption.id, exemption.parcel?.id, newStatus, reason);
      }
      return updateExemptionStatus(exemption.id, exemption.parcel?.id, newStatus, exemption.status, reason);
    },
    onSuccess: (_, { exemption, newStatus, reason }) => {
      invalidateWorkflows(queryClient);
      showChangeReceipt({
        entity: `Exemption ${exemption.exemption_type}`,
        action: "Exemption status updated",
        impact: "parcel",
        changes: [{ field: "status", before: exemption.status, after: newStatus }],
        reason,
      });
      setSelectedExemption(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { data: exemptions = [], isLoading } = useExemptionsWorkflow(statusFilter);

  const filteredExemptions = exemptions.filter((exemption) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      exemption.applicant_name?.toLowerCase().includes(search) ||
      exemption.parcel?.parcel_number?.toLowerCase().includes(search) ||
      exemption.parcel?.address?.toLowerCase().includes(search)
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

  const handleNavigateToParcel = (exemption: Exemption) => {
    if (exemption.parcel) {
      setParcel({
        id: exemption.parcel.id,
        parcelNumber: exemption.parcel.parcel_number,
        address: exemption.parcel.address,
        city: exemption.parcel.city,
      });
      setActiveTab("summary");
    }
  };

  const statusCounts = {
    all: exemptions.length,
    pending: exemptions.filter((e) => e.status === "pending").length,
    approved: exemptions.filter((e) => e.status === "approved").length,
    renewal: exemptions.filter((e) => e.status === "renewal_required").length,
  };

  const totalExemptionValue = exemptions
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + (e.exemption_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tf-gold/20 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-tf-gold" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Exemptions Workflow</h3>
            <p className="text-sm text-muted-foreground">
              Manage homestead, senior, and disability exemptions
            </p>
          </div>
        </div>
        <Button 
          className="gap-2 bg-tf-gold hover:bg-tf-gold/90 text-black"
          onClick={() => setShowNewExemptionDialog(true)}
        >
          <Plus className="w-4 h-4" />
          New Exemption
        </Button>
      </div>

      <NewExemptionDialog open={showNewExemptionDialog} onOpenChange={setShowNewExemptionDialog} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by applicant or address..."
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
              <SelectItem value="all">All Exemptions ({statusCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
              <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
              <SelectItem value="renewal_required">Renewal Required ({statusCounts.renewal})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { status: "pending", label: "Pending Review", count: statusCounts.pending, color: "text-amber-400" },
          { status: "approved", label: "Active Exemptions", count: statusCounts.approved, color: "text-tf-green" },
          { status: "renewal", label: "Renewal Required", count: statusCounts.renewal, color: "text-tf-gold" },
          { 
            status: "total", 
            label: "Total Exemption Value", 
            count: formatCurrency(totalExemptionValue), 
            color: "text-tf-cyan", 
            isValue: true 
          },
        ].map((item) => (
          <Card key={item.status} className="material-bento border-tf-border">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className={cn("text-2xl font-light", item.color)}>
                {item.isValue ? item.count : item.count}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exemptions List */}
      <Card className="material-bento border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-tf-gold" />
            Active Exemptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-tf-gold" />
              </div>
            ) : filteredExemptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No exemptions found</p>
                <p className="text-sm">
                  {searchQuery ? "Try a different search term" : "No exemptions have been filed yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredExemptions.map((exemption, index) => {
                    const statusConfig = STATUS_CONFIG[exemption.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const exemptionType = EXEMPTION_TYPES[exemption.exemption_type as keyof typeof EXEMPTION_TYPES] || { 
                      label: exemption.exemption_type, 
                      icon: ClipboardCheck, 
                      color: "text-muted-foreground" 
                    };
                    const TypeIcon = exemptionType.icon;

                    return (
                      <motion.div
                        key={exemption.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="group flex items-center justify-between p-4 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-all cursor-pointer"
                        onClick={() => setSelectedExemption(exemption)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", statusConfig.color)}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={cn("w-4 h-4", exemptionType.color)} />
                              <span className="font-medium text-foreground">
                                {exemptionType.label}
                              </span>
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">
                                {exemption.parcel?.address || "Unknown address"}
                              </span>
                              {exemption.applicant_name && (
                                <>
                                  <span>•</span>
                                  <span>{exemption.applicant_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm font-medium text-tf-green">
                              {exemption.exemption_amount 
                                ? formatCurrency(exemption.exemption_amount)
                                : exemption.exemption_percentage 
                                  ? `${exemption.exemption_percentage}%`
                                  : "—"
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">Exemption</div>
                          </div>
                          <div className="text-right min-w-[60px]">
                            <div className="text-sm font-medium text-foreground">
                              {exemption.tax_year}
                            </div>
                            <div className="text-xs text-muted-foreground">Tax Year</div>
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

      {/* Exemption Detail Dialog */}
      <Dialog open={!!selectedExemption} onOpenChange={() => setSelectedExemption(null)}>
        <DialogContent className="material-bento border-tf-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-tf-gold" />
              Exemption Details
            </DialogTitle>
            <DialogDescription>
              {selectedExemption?.parcel?.parcel_number} - {selectedExemption?.parcel?.address}
            </DialogDescription>
          </DialogHeader>

          {selectedExemption && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge className={STATUS_CONFIG[selectedExemption.status as keyof typeof STATUS_CONFIG]?.color}>
                    {STATUS_CONFIG[selectedExemption.status as keyof typeof STATUS_CONFIG]?.label || selectedExemption.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Exemption Type</div>
                  <div className="text-sm font-medium capitalize">{selectedExemption.exemption_type}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Exemption Amount</div>
                  <div className="text-sm font-medium text-tf-green">
                    {selectedExemption.exemption_amount 
                      ? formatCurrency(selectedExemption.exemption_amount)
                      : selectedExemption.exemption_percentage 
                        ? `${selectedExemption.exemption_percentage}%`
                        : "—"
                    }
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Tax Year</div>
                  <div className="text-sm font-medium">{selectedExemption.tax_year}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Application Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedExemption.application_date)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Approval Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedExemption.approval_date)}</div>
                </div>
              </div>

              {selectedExemption.applicant_name && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Applicant</div>
                  <div className="text-sm font-medium">{selectedExemption.applicant_name}</div>
                </div>
              )}

              {selectedExemption.notes && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Notes</div>
                  <div className="text-sm bg-tf-substrate rounded-lg p-3">{selectedExemption.notes}</div>
                </div>
              )}

              {selectedExemption.parcel?.assessed_value && (
                <div className="p-3 rounded-lg bg-tf-cyan/10 border border-tf-cyan/30">
                  <div className="text-xs text-muted-foreground mb-1">Property Assessed Value</div>
                  <div className="text-lg font-medium text-tf-cyan">
                    {formatCurrency(selectedExemption.parcel.assessed_value)}
                  </div>
                  {selectedExemption.exemption_amount && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Net Taxable: {formatCurrency(selectedExemption.parcel.assessed_value - selectedExemption.exemption_amount)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedExemption && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedExemption(null)}>
                Close
              </Button>
              <StatusTransitionDropdown
                currentStatus={selectedExemption.status}
                transitions={EXEMPTION_TRANSITIONS}
                onTransition={(newStatus, reason) =>
                  changeExemptionStatus.mutate({ exemption: selectedExemption, newStatus, reason })
                }
                isPending={changeExemptionStatus.isPending}
                accentClass="bg-tf-gold hover:bg-tf-gold/90 text-black"
              />
              <Button
                variant="outline"
                onClick={() => {
                  handleNavigateToParcel(selectedExemption);
                  setSelectedExemption(null);
                }}
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
