// TerraFusion OS — Scope Header (Trust UI Primitive)
// Declares the current scope so users always know: "What am I looking at?"
// Follows the Four Scopes model: County • Neighborhood • Parcel • Run

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProvenanceBadge } from "./ProvenanceBadge";

export type DataScope = "county" | "neighborhood" | "parcel" | "run";
export type DataStatus = "draft" | "candidate" | "published";

interface ScopeHeaderProps {
  /** The scope level */
  scope: DataScope;
  /** Label for the scope (e.g. county name, parcel number) */
  label: string;
  /** Data freshness source */
  source?: string;
  /** ISO timestamp of last fetch */
  fetchedAt?: string | null;
  /** Draft/Candidate/Published status */
  status?: DataStatus;
  /** Additional className */
  className?: string;
}

const scopeIcons: Record<DataScope, string> = {
  county: "🏛",
  neighborhood: "🏘",
  parcel: "📍",
  run: "⚙",
};

const statusStyles: Record<DataStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  candidate: "bg-[hsl(var(--tf-sacred-gold)/0.15)] text-[hsl(var(--tf-sacred-gold))] border-[hsl(var(--tf-sacred-gold)/0.3)]",
  published: "bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]",
};

export function ScopeHeader({
  scope,
  label,
  source,
  fetchedAt,
  status,
  className,
}: ScopeHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span>{scopeIcons[scope]}</span>
      <span className="uppercase tracking-wider font-medium text-foreground/70">{scope}</span>
      <span className="text-foreground font-medium">{label}</span>
      {status && (
        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusStyles[status])}>
          {status}
        </Badge>
      )}
      {source && (
        <>
          <span className="text-border">|</span>
          <ProvenanceBadge source={source} fetchedAt={fetchedAt} compact />
        </>
      )}
    </div>
  );
}
