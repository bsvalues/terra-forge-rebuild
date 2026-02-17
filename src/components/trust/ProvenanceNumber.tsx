// TerraFusion OS — ProvenanceNumber (Trust UI Primitive)
// Wraps any displayed number with a tooltip showing source hook, cache age, and last fetch.
// Rule 5 of the Data Constitution: "Every number on screen has provenance."

import { ReactNode, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProvenanceNumberProps {
  /** The rendered number/value — can be string or JSX */
  children: ReactNode;
  /** Query key / hook name (e.g. "county-vitals") */
  source: string;
  /** ISO timestamp of last fetch */
  fetchedAt?: string | null;
  /** Cache policy label (e.g. "stale after 60s") */
  cachePolicy?: string;
  /** Extra className for the wrapper */
  className?: string;
}

export function ProvenanceNumber({
  children,
  source,
  fetchedAt,
  cachePolicy = "cached 60s",
  className,
}: ProvenanceNumberProps) {
  const { timeLabel, ageLabel } = useMemo(() => {
    if (!fetchedAt) return { timeLabel: "—", ageLabel: "unknown" };
    const ts = new Date(fetchedAt);
    const ageSec = Math.round((Date.now() - ts.getTime()) / 1000);
    const age =
      ageSec < 60
        ? `${ageSec}s ago`
        : ageSec < 3600
        ? `${Math.floor(ageSec / 60)}m ago`
        : `${Math.floor(ageSec / 3600)}h ago`;
    return {
      timeLabel: ts.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ageLabel: age,
    };
  }, [fetchedAt]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "cursor-help decoration-dotted underline underline-offset-4 decoration-muted-foreground/30",
            className
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="text-xs space-y-0.5 max-w-52"
      >
        <p className="font-medium text-foreground">
          Source: <span className="font-mono text-primary">{source}</span>
        </p>
        <p>
          Fetched: {timeLabel}{" "}
          <span className="text-muted-foreground">({ageLabel})</span>
        </p>
        <p className="text-muted-foreground">{cachePolicy}</p>
      </TooltipContent>
    </Tooltip>
  );
}
