// QuarantineReviewPanel — Admin UI for triaging quarantined rows.
// Phase 4 of the runtime-provenance initiative: humans adjudicate the bad data
// the OS captured instead of dropping it.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Eye,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useQuarantineList,
  useQuarantineCounts,
  useQuarantineMutation,
  type QuarantineRow,
} from "@/hooks/useQuarantine";
import { toast } from "@/hooks/use-toast";
import type { QuarantineStatus, QuarantineSeverity } from "@/services/quarantine";

const SEVERITY_STYLES: Record<QuarantineSeverity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export function QuarantineReviewPanel() {
  const [status, setStatus] = useState<QuarantineStatus>("pending");
  const [severity, setSeverity] = useState<"all" | QuarantineSeverity>("all");
  const [selected, setSelected] = useState<QuarantineRow | null>(null);

  const counts = useQuarantineCounts();
  const list = useQuarantineList({
    status,
    severity: severity === "all" ? undefined : severity,
  });
  const mutation = useQuarantineMutation();

  const act = async (id: string, next: QuarantineStatus) => {
    try {
      await mutation.mutateAsync({ id, status: next });
      toast({
        title: "Quarantine updated",
        description: `Row marked as ${next}.`,
      });
      setSelected(null);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header + counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Total quarantined
          </div>
          <div className="text-2xl font-light mt-1">
            {counts.data?.total ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Pending review
          </div>
          <div className="text-2xl font-light mt-1 text-amber-400">
            {counts.data?.pending ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Critical
          </div>
          <div className="text-2xl font-light mt-1 text-destructive">
            {counts.data?.critical ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Warning
          </div>
          <div className="text-2xl font-light mt-1 text-amber-400">
            {counts.data?.warning ?? 0}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select value={status} onValueChange={(v) => setStatus(v as QuarantineStatus)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="restored">Restored</SelectItem>
              <SelectItem value="discarded">Discarded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Severity</span>
          <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => list.refetch()}
          className="ml-auto"
        >
          Refresh
        </Button>
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {list.isLoading ? (
          <div className="p-12 flex justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : list.isError ? (
          <div className="p-12 text-center text-destructive text-sm">
            Failed to load quarantine: {String(list.error)}
          </div>
        ) : (list.data ?? []).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            No {status} quarantine rows. Data spine is clean.
          </div>
        ) : (
          <ScrollArea className="h-[520px]">
            <div className="divide-y divide-border/40">
              {(list.data ?? []).map((row) => (
                <div
                  key={row.id}
                  className="p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {row.severity === "critical" ? (
                        <ShieldAlert className="w-4 h-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={SEVERITY_STYLES[row.severity]}>
                          {row.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {row.reason_code}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {row.source}
                          {row.source_product ? ` · ${row.source_product}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(row.created_at).toLocaleString()}
                        </span>
                      </div>
                      {row.reason_detail && (
                        <div className="text-sm mt-1 text-foreground/80 line-clamp-2">
                          {row.reason_detail}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected(row)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> Inspect
                        </Button>
                        {row.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-400 hover:text-emerald-300"
                              disabled={mutation.isPending}
                              onClick={() => act(row.id, "restored")}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={mutation.isPending}
                              onClick={() => act(row.id, "discarded")}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Discard
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Payload viewer */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.severity === "critical" ? (
                <ShieldAlert className="w-5 h-5 text-destructive" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              Quarantined row · {selected?.reason_code}
            </DialogTitle>
            <DialogDescription>
              {selected?.source}
              {selected?.source_product ? ` · ${selected.source_product}` : ""}
              {selected?.reason_detail ? ` — ${selected.reason_detail}` : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[420px] rounded border border-border/40 bg-muted/20 p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {selected ? JSON.stringify(selected.payload, null, 2) : ""}
            </pre>
          </ScrollArea>
          {selected?.status === "pending" && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => selected && act(selected.id, "discarded")}
                disabled={mutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Discard
              </Button>
              <Button
                onClick={() => selected && act(selected.id, "restored")}
                disabled={mutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Restore
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
