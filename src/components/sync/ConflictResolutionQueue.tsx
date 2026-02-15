import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  GitCompare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SyncConflict {
  id: string;
  parcelNumber: string;
  address: string;
  field: string;
  localValue: string;
  remoteValue: string;
  source: string;
  detectedAt: string;
  severity: "low" | "medium" | "high";
}

// Simulated conflicts for demonstration until real sync diff engine produces them
const DEMO_CONFLICTS: SyncConflict[] = [
  {
    id: "c1",
    parcelNumber: "10046",
    address: "1234 VINEYARD DR",
    field: "assessed_value",
    localValue: "$312,000",
    remoteValue: "$318,500",
    source: "PACS FTP Sync",
    detectedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    severity: "high",
  },
  {
    id: "c2",
    parcelNumber: "10048",
    address: "5678 CHERRY LN",
    field: "year_built",
    localValue: "1979",
    remoteValue: "1980",
    source: "PACS FTP Sync",
    detectedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    severity: "low",
  },
  {
    id: "c3",
    parcelNumber: "10125",
    address: "910 COLUMBIA BLVD",
    field: "building_area",
    localValue: "2,450 sqft",
    remoteValue: "2,680 sqft",
    source: "ArcGIS Parcel Sync",
    detectedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    severity: "medium",
  },
];

const severityColor = (s: string) => {
  switch (s) {
    case "high": return "bg-red-500/20 text-red-300 border-red-500/30";
    case "medium": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "low": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export function ConflictResolutionQueue() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>(DEMO_CONFLICTS);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

  const resolveConflict = (id: string, resolution: "accept_local" | "accept_remote") => {
    setConflicts((prev) => prev.filter((c) => c.id !== id));
    setSelectedConflict(null);
    toast.success(
      `Conflict resolved: ${resolution === "accept_local" ? "Kept local value" : "Accepted remote value"}`
    );
  };

  const dismissConflict = (id: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== id));
    setSelectedConflict(null);
    toast.info("Conflict dismissed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <GitCompare className="w-4 h-4" />
          Conflict Resolution Queue
        </h3>
        <Badge variant="outline" className="text-xs">
          {conflicts.length} pending
        </Badge>
      </div>

      {conflicts.length === 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400/40" />
            <p className="text-sm text-muted-foreground mb-1">No sync conflicts</p>
            <p className="text-xs text-muted-foreground/70">
              All data sources are in agreement. Conflicts appear when sync operations detect value discrepancies.
            </p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {conflicts.map((conflict) => (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10, height: 0 }}
            layout
          >
            <Card className="bg-card/50 border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {conflict.parcelNumber} — <span className="font-mono text-xs text-muted-foreground">{conflict.field}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{conflict.address}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px]", severityColor(conflict.severity))}>
                    {conflict.severity}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 my-3 p-2 rounded bg-muted/20 border border-border/30">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Local (TerraFusion)</p>
                    <p className="text-sm font-mono font-medium">{conflict.localValue}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Remote ({conflict.source})</p>
                    <p className="text-sm font-mono font-medium text-amber-300">{conflict.remoteValue}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => resolveConflict(conflict.id, "accept_local")}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    Keep Local
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => resolveConflict(conflict.id, "accept_remote")}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    Accept Remote
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    <Eye className="w-3 h-3" />
                    Detail
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Detected {new Date(conflict.detectedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Detail Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Conflict Detail
            </DialogTitle>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Parcel</p>
                  <p className="text-sm font-mono">{selectedConflict.parcelNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Field</p>
                  <p className="text-sm font-mono">{selectedConflict.field}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <p className="text-sm">{selectedConflict.address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Source</p>
                  <p className="text-sm">{selectedConflict.source}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded bg-card/80 border border-primary/20">
                    <p className="text-[10px] text-muted-foreground mb-1">Local Value (TerraFusion)</p>
                    <p className="text-lg font-mono font-semibold">{selectedConflict.localValue}</p>
                  </div>
                  <div className="text-center p-3 rounded bg-card/80 border border-amber-500/20">
                    <p className="text-[10px] text-muted-foreground mb-1">Remote Value</p>
                    <p className="text-lg font-mono font-semibold text-amber-300">{selectedConflict.remoteValue}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Resolution will emit a TerraTrace event and update the parcel record accordingly.
                Accepting the remote value will overwrite the local value and mark the sync as reconciled.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => selectedConflict && dismissConflict(selectedConflict.id)}>
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Dismiss
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedConflict && resolveConflict(selectedConflict.id, "accept_local")}
            >
              <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
              Keep Local
            </Button>
            <Button
              onClick={() => selectedConflict && resolveConflict(selectedConflict.id, "accept_remote")}
            >
              <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
              Accept Remote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
