import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusTransition {
  to: string;
  label: string;
  variant?: "default" | "destructive" | "success" | "warning";
}

/** State-machine definitions: current status → valid next statuses */
export const APPEAL_TRANSITIONS: Record<string, StatusTransition[]> = {
  pending: [
    { to: "scheduled", label: "Schedule Hearing" },
    { to: "in_hearing", label: "Move to Hearing" },
    { to: "resolved", label: "Resolve", variant: "success" },
    { to: "denied", label: "Deny", variant: "destructive" },
    { to: "withdrawn", label: "Withdraw", variant: "warning" },
  ],
  scheduled: [
    { to: "in_hearing", label: "Start Hearing" },
    { to: "resolved", label: "Resolve", variant: "success" },
    { to: "denied", label: "Deny", variant: "destructive" },
    { to: "withdrawn", label: "Withdraw", variant: "warning" },
  ],
  in_hearing: [
    { to: "resolved", label: "Resolve", variant: "success" },
    { to: "denied", label: "Deny", variant: "destructive" },
  ],
  resolved: [],
  denied: [],
  withdrawn: [],
};

export const PERMIT_TRANSITIONS: Record<string, StatusTransition[]> = {
  pending: [
    { to: "approved", label: "Approve", variant: "success" },
    { to: "failed", label: "Reject", variant: "destructive" },
  ],
  approved: [
    { to: "issued", label: "Issue Permit", variant: "success" },
    { to: "inspection_scheduled", label: "Schedule Inspection" },
    { to: "failed", label: "Revoke", variant: "destructive" },
  ],
  issued: [
    { to: "inspection_scheduled", label: "Schedule Inspection" },
    { to: "passed", label: "Mark Passed", variant: "success" },
    { to: "failed", label: "Mark Failed", variant: "destructive" },
    { to: "expired", label: "Mark Expired", variant: "warning" },
  ],
  inspection_scheduled: [
    { to: "passed", label: "Passed Inspection", variant: "success" },
    { to: "failed", label: "Failed Inspection", variant: "destructive" },
  ],
  passed: [],
  failed: [
    { to: "pending", label: "Reopen as Pending" },
  ],
  expired: [],
};

export const EXEMPTION_TRANSITIONS: Record<string, StatusTransition[]> = {
  pending: [
    { to: "approved", label: "Approve", variant: "success" },
    { to: "denied", label: "Deny", variant: "destructive" },
  ],
  approved: [
    { to: "renewal_required", label: "Flag for Renewal", variant: "warning" },
    { to: "expired", label: "Mark Expired", variant: "warning" },
    { to: "denied", label: "Revoke", variant: "destructive" },
  ],
  renewal_required: [
    { to: "approved", label: "Renew", variant: "success" },
    { to: "expired", label: "Mark Expired", variant: "warning" },
    { to: "denied", label: "Deny Renewal", variant: "destructive" },
  ],
  denied: [],
  expired: [
    { to: "pending", label: "Reapply" },
  ],
};

const VARIANT_STYLES: Record<string, string> = {
  default: "text-foreground",
  success: "text-tf-green",
  destructive: "text-destructive",
  warning: "text-tf-gold",
};

interface StatusTransitionDropdownProps {
  currentStatus: string;
  transitions: Record<string, StatusTransition[]>;
  onTransition: (newStatus: string) => void;
  isPending: boolean;
  accentClass?: string;
}

export function StatusTransitionDropdown({
  currentStatus,
  transitions,
  onTransition,
  isPending,
  accentClass = "bg-suite-dais hover:bg-suite-dais/90",
}: StatusTransitionDropdownProps) {
  const available = transitions[currentStatus] ?? [];

  if (available.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isPending} className={cn("gap-2", accentClass)}>
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Change Status
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-50 bg-popover border border-border shadow-lg min-w-[180px]"
      >
        {available.map((t) => (
          <DropdownMenuItem
            key={t.to}
            onClick={() => onTransition(t.to)}
            className={cn(
              "cursor-pointer",
              VARIANT_STYLES[t.variant ?? "default"]
            )}
          >
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
