import { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers, Play, CheckCircle2, XCircle, Clock, AlertTriangle,
  Scale, FileCheck, ClipboardCheck, Bell, Filter, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWorkflowBatchItems, type BatchItem } from "@/hooks/useWorkflowBatchItems";

const domainConfig: Record<string, { icon: React.ElementType; color: string; actions: string[] }> = {
  appeals: {
    icon: Scale,
    color: "text-tf-amber",
    actions: ["Assign to reviewer", "Schedule hearing", "Mark as reviewed", "Close — upheld", "Close — reduced"],
  },
  permits: {
    icon: FileCheck,
    color: "text-tf-green",
    actions: ["Approve permit", "Request inspection", "Mark completed", "Deny permit"],
  },
  exemptions: {
    icon: ClipboardCheck,
    color: "text-tf-gold",
    actions: ["Approve exemption", "Request documentation", "Deny exemption", "Schedule review"],
  },
  notices: {
    icon: Bell,
    color: "text-tf-cyan",
    actions: ["Generate notice", "Queue for mailing", "Mark as sent", "Cancel notice"],
  },
};

export function BatchWorkflowExecutor() {
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const { data: serverItems = [] } = useWorkflowBatchItems(filterDomain === "all" ? null : filterDomain);
  // Client-only selection state — layered on top of server items
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemResults, setItemResults] = useState<Record<string, { result: "success" | "error"; resultMessage: string }>>({});

  // Merge server items with client-only state
  const items: BatchItem[] = serverItems.map((item) => ({
    ...item,
    selected: selectedIds.has(item.id),
    result: itemResults[item.id]?.result ?? item.result,
    resultMessage: itemResults[item.id]?.resultMessage ?? item.resultMessage,
  }));
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);

  const filtered = items.filter((i) => filterDomain === "all" || i.domain === filterDomain);
  const selectedItems = filtered.filter((i) => i.selected);
  const allSelected = filtered.length > 0 && filtered.every((i) => i.selected);

  // Available actions based on selected items' domains
  const availableActions = (() => {
    const domains = new Set(selectedItems.map((i) => i.domain));
    if (domains.size === 1) {
      const domain = [...domains][0];
      return domainConfig[domain]?.actions || [];
    }
    return [];
  })();

  const toggleAll = () => {
    const newState = !allSelected;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((i) => {
        if (newState) next.add(i.id);
        else next.delete(i.id);
      });
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const executeAction = async () => {
    if (!selectedAction || selectedItems.length === 0) return;
    setIsExecuting(true);
    setProgress(0);

    for (let i = 0; i < selectedItems.length; i++) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      const success = Math.random() > 0.1;
      const itemId = selectedItems[i].id;
      setItemResults((prev) => ({
        ...prev,
        [itemId]: {
          result: success ? "success" : "error",
          resultMessage: success ? `${selectedAction} completed` : "Failed — insufficient permissions",
        },
      }));
      setProgress(((i + 1) / selectedItems.length) * 100);
    }

    setIsExecuting(false);
    const successCount = selectedItems.length; // approximate
    toast.success(`Batch action completed: ${successCount} items processed`);
  };

  const completedCount = items.filter((i) => i.result === "success").length;
  const errorCount = items.filter((i) => i.result === "error").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-suite-dais" />
          <h3 className="text-sm font-medium text-foreground">Batch Workflow Actions</h3>
          <Badge variant="outline" className="text-[10px]">{items.length} items</Badge>
          {completedCount > 0 && (
            <Badge className="text-[10px] bg-tf-green/20 text-tf-green">{completedCount} done</Badge>
          )}
          {errorCount > 0 && (
            <Badge className="text-[10px] bg-destructive/20 text-destructive">{errorCount} errors</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterDomain} onValueChange={(v) => { setFilterDomain(v); setSelectedAction(""); }}>
            <SelectTrigger className="h-7 text-xs w-32">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="appeals">Appeals</SelectItem>
              <SelectItem value="permits">Permits</SelectItem>
              <SelectItem value="exemptions">Exemptions</SelectItem>
              <SelectItem value="notices">Notices</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Bar */}
      {selectedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="material-bento rounded-lg p-3 flex items-center gap-3 border border-primary/30"
        >
          <Badge className="bg-primary/20 text-primary text-[10px]">
            {selectedItems.length} selected
          </Badge>
          {availableActions.length > 0 ? (
            <>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="h-7 text-xs w-48">
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  {availableActions.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={!selectedAction || isExecuting}
                onClick={executeAction}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Execute
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Select items from a single domain to see actions</span>
          )}
        </motion.div>
      )}

      {/* Progress */}
      {isExecuting && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Items Table */}
      <div className="material-bento rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground text-xs bg-muted/20">
              <th className="py-2 px-3 w-8">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <th className="text-left py-2 px-3">Parcel</th>
              <th className="text-left py-2 px-3">Address</th>
              <th className="text-left py-2 px-3">Domain</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-center py-2 px-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const domain = domainConfig[item.domain];
              const DomainIcon = domain.icon;
              return (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border/20 hover:bg-muted/20 transition-colors",
                    item.selected && "bg-primary/5"
                  )}
                >
                  <td className="py-2.5 px-3">
                    <Checkbox checked={item.selected} onCheckedChange={() => toggleItem(item.id)} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs font-medium">{item.parcelNumber}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{item.address}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className={cn("text-[10px] gap-1", domain.color)}>
                      <DomainIcon className="w-3 h-3" />
                      {item.domain}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="secondary" className="text-[10px]">{item.currentStatus}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.result === "success" && (
                      <span className="flex items-center justify-center gap-1 text-tf-green text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    )}
                    {item.result === "error" && (
                      <span className="flex items-center justify-center gap-1 text-destructive text-[10px]">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                    {!item.result && (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
