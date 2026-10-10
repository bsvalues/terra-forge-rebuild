// TerraFusion OS — Parcel Page Template
// Scope: Parcel | Template: parcel
// Slots: parcel header, snapshot summary, workflow rail, detail sections

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScopeHeader, type DataStatus } from "@/components/trust/ScopeHeader";

interface ParcelPageTemplateProps {
  /** Parcel number or address for scope header */
  parcelLabel: string;
  /** Data status */
  status?: DataStatus;
  /** Source identifier for provenance */
  source?: string;
  /** ISO timestamp */
  fetchedAt?: string | null;
  /** Parcel 360 snapshot summary (top) */
  summary?: ReactNode;
  /** Primary content area (sections, not infinite tabs) */
  children: ReactNode;
  /** Workflow rail (right side — appeals, permits, queue) */
  workflowRail?: ReactNode;
  /** Optional className */
  className?: string;
}

export function ParcelPageTemplate({
  parcelLabel,
  status,
  source,
  fetchedAt,
  summary,
  children,
  workflowRail,
  className,
}: ParcelPageTemplateProps) {
  return (
    <div className={cn("module-page space-y-4", className)}>
      {/* Scope declaration */}
      <div className="border-b border-border pb-3">
        <ScopeHeader
          scope="parcel"
          label={parcelLabel}
          status={status}
          source={source}
          fetchedAt={fetchedAt}
        />
      </div>

      {/* Snapshot summary */}
      {summary && (
        <div className="min-w-0">
          {summary}
        </div>
      )}

      {/* Main content + workflow rail */}
      <div className="module-template-layout">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {workflowRail && (
          <aside className="module-template-rail">
            {workflowRail}
          </aside>
        )}
      </div>
    </div>
  );
}
