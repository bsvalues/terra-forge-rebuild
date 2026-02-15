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
  FileCheck,
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
  Hammer,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { cn } from "@/lib/utils";
import { NewPermitDialog } from "./NewPermitDialog";
import { StatusTransitionDropdown, PERMIT_TRANSITIONS } from "./StatusTransitionDropdown";
import { updatePermitStatus } from "@/services/suites/daisService";
import { toast } from "@/hooks/use-toast";

interface Permit {
  id: string;
  permit_number: string;
  permit_type: string;
  description: string | null;
  estimated_value: number | null;
  status: string;
  application_date: string;
  issue_date: string | null;
  expiration_date: string | null;
  inspection_date: string | null;
  inspection_status: string | null;
  notes: string | null;
  parcel: {
    id: string;
    parcel_number: string;
    address: string;
    city: string | null;
  };
}

const STATUS_CONFIG = {
  pending: {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
    label: "Pending",
  },
  approved: {
    color: "bg-tf-green/20 text-tf-green border-tf-green/30",
    icon: CheckCircle,
    label: "Approved",
  },
  issued: {
    color: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30",
    icon: FileCheck,
    label: "Issued",
  },
  inspection_scheduled: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Calendar,
    label: "Inspection Scheduled",
  },
  passed: {
    color: "bg-tf-green/20 text-tf-green border-tf-green/30",
    icon: CheckCircle,
    label: "Passed",
  },
  failed: {
    color: "bg-destructive/20 text-destructive border-destructive/30",
    icon: XCircle,
    label: "Failed",
  },
  expired: {
    color: "bg-muted text-muted-foreground border-muted",
    icon: AlertCircle,
    label: "Expired",
  },
};

const PERMIT_TYPES = {
  building: { label: "Building", icon: Hammer },
  electrical: { label: "Electrical", icon: ClipboardList },
  plumbing: { label: "Plumbing", icon: ClipboardList },
  mechanical: { label: "Mechanical", icon: ClipboardList },
  demolition: { label: "Demolition", icon: ClipboardList },
  renovation: { label: "Renovation", icon: Hammer },
};

export function PermitsWorkflow() {
  const { setParcel, setActiveTab } = useWorkbench();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [showNewPermitDialog, setShowNewPermitDialog] = useState(false);

  const changePermitStatus = useMutation({
    mutationFn: async ({ permit, newStatus, reason }: { permit: Permit; newStatus: string; reason?: string }) => {
      return updatePermitStatus(permit.id, permit.parcel?.id, newStatus, permit.status, reason);
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["permits-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["permits-stats"] });
      toast({ title: "Permit Updated", description: `Status changed to ${newStatus}` });
      setSelectedPermit(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ["permits-workflow", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("permits")
        .select(`
          *,
          parcel:parcels!permits_parcel_id_fkey(id, parcel_number, address, city)
        `)
        .order("application_date", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Permit[];
    },
  });

  const filteredPermits = permits.filter((permit) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      permit.permit_number?.toLowerCase().includes(search) ||
      permit.parcel?.parcel_number?.toLowerCase().includes(search) ||
      permit.parcel?.address?.toLowerCase().includes(search)
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

  const handleNavigateToParcel = (permit: Permit) => {
    if (permit.parcel) {
      setParcel({
        id: permit.parcel.id,
        parcelNumber: permit.parcel.parcel_number,
        address: permit.parcel.address,
        city: permit.parcel.city,
      });
      setActiveTab("summary");
    }
  };

  const statusCounts = {
    all: permits.length,
    pending: permits.filter((p) => p.status === "pending").length,
    issued: permits.filter((p) => p.status === "issued" || p.status === "approved").length,
    inspection: permits.filter((p) => p.status === "inspection_scheduled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tf-green/20 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-tf-green" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Permits Workflow</h3>
            <p className="text-sm text-muted-foreground">
              Track building permits, inspections, and approvals
            </p>
          </div>
        </div>
        <Button 
          className="gap-2 bg-tf-green hover:bg-tf-green/90"
          onClick={() => setShowNewPermitDialog(true)}
        >
          <Plus className="w-4 h-4" />
          New Permit
        </Button>
      </div>

      <NewPermitDialog open={showNewPermitDialog} onOpenChange={setShowNewPermitDialog} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by permit # or address..."
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
              <SelectItem value="all">All Permits ({statusCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
              <SelectItem value="issued">Issued ({statusCounts.issued})</SelectItem>
              <SelectItem value="inspection_scheduled">Inspections ({statusCounts.inspection})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { status: "pending", label: "Pending Review", count: statusCounts.pending, color: "text-amber-400" },
          { status: "issued", label: "Active Permits", count: statusCounts.issued, color: "text-tf-green" },
          { status: "inspection", label: "Awaiting Inspection", count: statusCounts.inspection, color: "text-purple-400" },
          { 
            status: "total", 
            label: "Total Est. Value", 
            count: formatCurrency(permits.reduce((sum, p) => sum + (p.estimated_value || 0), 0)), 
            color: "text-tf-gold", 
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

      {/* Permits List */}
      <Card className="material-bento border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-tf-green" />
            Active Permits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-tf-green" />
              </div>
            ) : filteredPermits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No permits found</p>
                <p className="text-sm">
                  {searchQuery ? "Try a different search term" : "No permits have been filed yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredPermits.map((permit, index) => {
                    const statusConfig = STATUS_CONFIG[permit.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const permitType = PERMIT_TYPES[permit.permit_type as keyof typeof PERMIT_TYPES] || { label: permit.permit_type, icon: ClipboardList };

                    return (
                      <motion.div
                        key={permit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="group flex items-center justify-between p-4 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-all cursor-pointer"
                        onClick={() => setSelectedPermit(permit)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", statusConfig.color)}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {permit.permit_number}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {permitType.label}
                              </Badge>
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[250px]">
                                {permit.parcel?.address || "Unknown address"}
                              </span>
                              {permit.parcel?.city && (
                                <>
                                  <span>•</span>
                                  <span>{permit.parcel.city}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {permit.estimated_value && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-foreground">
                                {formatCurrency(permit.estimated_value)}
                              </div>
                              <div className="text-xs text-muted-foreground">Est. Value</div>
                            </div>
                          )}
                          <div className="text-right min-w-[80px]">
                            <div className="text-sm font-medium text-foreground">
                              {formatDate(permit.application_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">Applied</div>
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

      {/* Permit Detail Dialog */}
      <Dialog open={!!selectedPermit} onOpenChange={() => setSelectedPermit(null)}>
        <DialogContent className="material-bento border-tf-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-tf-green" />
              Permit Details
            </DialogTitle>
            <DialogDescription>
              {selectedPermit?.permit_number} - {selectedPermit?.parcel?.address}
            </DialogDescription>
          </DialogHeader>

          {selectedPermit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge className={STATUS_CONFIG[selectedPermit.status as keyof typeof STATUS_CONFIG]?.color}>
                    {STATUS_CONFIG[selectedPermit.status as keyof typeof STATUS_CONFIG]?.label || selectedPermit.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Permit Type</div>
                  <div className="text-sm font-medium capitalize">{selectedPermit.permit_type}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Estimated Value</div>
                  <div className="text-sm font-medium text-foreground">
                    {formatCurrency(selectedPermit.estimated_value)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Application Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedPermit.application_date)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Issue Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedPermit.issue_date)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Expiration Date</div>
                  <div className="text-sm font-medium">{formatDate(selectedPermit.expiration_date)}</div>
                </div>
              </div>

              {selectedPermit.description && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="text-sm bg-tf-substrate rounded-lg p-3">{selectedPermit.description}</div>
                </div>
              )}

              {selectedPermit.inspection_date && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="text-xs text-muted-foreground mb-1">Inspection Scheduled</div>
                  <div className="text-lg font-medium text-purple-400">
                    {formatDate(selectedPermit.inspection_date)}
                  </div>
                  {selectedPermit.inspection_status && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {selectedPermit.inspection_status}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedPermit && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedPermit(null)}>
                Close
              </Button>
              <StatusTransitionDropdown
                currentStatus={selectedPermit.status}
                transitions={PERMIT_TRANSITIONS}
                onTransition={(newStatus, reason) =>
                  changePermitStatus.mutate({ permit: selectedPermit, newStatus, reason })
                }
                isPending={changePermitStatus.isPending}
                accentClass="bg-tf-green hover:bg-tf-green/90"
              />
              <Button
                variant="outline"
                onClick={() => {
                  handleNavigateToParcel(selectedPermit);
                  setSelectedPermit(null);
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
