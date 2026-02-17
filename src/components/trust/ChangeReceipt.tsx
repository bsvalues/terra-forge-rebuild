// TerraFusion OS — Change Receipt (Trust UI Primitive)
// Shown after every write operation. Answers: what changed, why, who, when, what it impacts.
// Rule: "Nothing happens silently."

import { CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangeReceiptData {
  /** What entity was changed */
  entity: string;
  /** Human-readable action (e.g. "Appeal status updated") */
  action: string;
  /** Before/after pairs */
  changes?: Array<{ field: string; before: string; after: string }>;
  /** Why the change was made */
  reason?: string;
  /** Who made the change */
  actor?: string;
  /** When the change was made */
  timestamp: string;
  /** Scope of impact */
  impact?: "parcel" | "neighborhood" | "county";
  /** Link to trace event */
  traceId?: string;
}

interface ChangeReceiptProps {
  receipt: ChangeReceiptData;
  className?: string;
}

export function ChangeReceipt({ receipt, className }: ChangeReceiptProps) {
  const time = new Date(receipt.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={cn("rounded-lg border border-[hsl(var(--tf-optimized-green)/0.3)] bg-[hsl(var(--tf-optimized-green)/0.05)] p-3 space-y-2 text-sm", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />
        <span className="font-medium text-foreground">{receipt.action}</span>
        <span className="ml-auto text-xs text-muted-foreground">{time}</span>
      </div>

      {/* Diff */}
      {receipt.changes && receipt.changes.length > 0 && (
        <div className="space-y-1 pl-6">
          {receipt.changes.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-28 shrink-0">{c.field}</span>
              <span className="text-destructive/70 line-through">{c.before}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-[hsl(var(--tf-optimized-green))]">{c.after}</span>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 pl-6 text-xs text-muted-foreground">
        {receipt.reason && <span>Reason: {receipt.reason}</span>}
        {receipt.actor && <span>• By: {receipt.actor}</span>}
        {receipt.impact && <span>• Impact: {receipt.impact}</span>}
        {receipt.traceId && (
          <button className="inline-flex items-center gap-1 text-[hsl(var(--tf-transcend-cyan))] hover:underline ml-auto">
            <ExternalLink className="w-3 h-3" />
            View Audit
          </button>
        )}
      </div>
    </div>
  );
}
