// TerraFusion OS — Parcel Page Template
// Scope: Parcel | Template: parcel
// Slots: parcel header, snapshot summary, workflow rail, detail sections

import { ReactNode } from "react";
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
    <div className={className}>
      {/* Scope declaration */}
      <div className="px-6 pt-4 pb-2">
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
        <div className="px-6 pb-4">
          {summary}
        </div>
      )}

      {/* Main content + workflow rail */}
      <div className="flex gap-6 px-6 pb-6">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {workflowRail && (
          <aside className="hidden lg:block w-80 shrink-0">
            {workflowRail}
          </aside>
        )}
      </div>
    </div>
  );
}
