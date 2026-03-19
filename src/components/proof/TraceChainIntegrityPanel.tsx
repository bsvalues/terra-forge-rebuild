// TerraFusion OS — Phase 81: Trace Chain Integrity Panel
// Visual indicator of hash-chain health for the Trust Registry.

import { useTraceChainVerification } from "@/hooks/useTraceChainVerification";
import { Shield, ShieldCheck, ShieldAlert, Loader2, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TraceChainIntegrityPanelProps {
  countyId?: string;
  compact?: boolean;
}

export function TraceChainIntegrityPanel({ countyId, compact = false }: TraceChainIntegrityPanelProps) {
  const { data: result, isLoading, error } = useTraceChainVerification(countyId);

  if (!countyId) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" />
        <span>No county context</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Verifying chain…</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Verification unavailable</span>
      </div>
    );
  }

  const { chain_valid, total_checked, first_broken_sequence } = result;

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] gap-1",
          chain_valid
            ? "border-chart-2/40 text-chart-2"
            : "border-destructive/40 text-destructive"
        )}
      >
        {chain_valid ? (
          <ShieldCheck className="w-3 h-3" />
        ) : (
          <ShieldAlert className="w-3 h-3" />
        )}
        {chain_valid ? "Chain OK" : "Chain Broken"}
      </Badge>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        chain_valid
          ? "bg-chart-2/5 border-chart-2/20"
          : "bg-destructive/5 border-destructive/20"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {chain_valid ? (
          <ShieldCheck className="w-5 h-5 text-chart-2" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-destructive" />
        )}
        <span className={cn("font-semibold", chain_valid ? "text-chart-2" : "text-destructive")}>
          {chain_valid ? "Hash-Chain Intact" : "Hash-Chain Broken"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          <span>Events verified:</span>
          <span className="text-foreground font-medium">{total_checked}</span>
        </div>
        {!chain_valid && first_broken_sequence && (
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-destructive" />
            <span>Break at seq:</span>
            <span className="text-destructive font-medium">{first_broken_sequence}</span>
          </div>
        )}
      </div>

      {chain_valid && (
        <p className="text-[11px] text-muted-foreground mt-2">
          All {total_checked} events have valid cryptographic linkage. No tampering detected.
        </p>
      )}
    </div>
  );
}
