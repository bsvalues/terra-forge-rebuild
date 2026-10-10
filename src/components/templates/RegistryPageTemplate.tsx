// TerraFusion OS — Registry Page Template
// Scope: Run/Version | Template: registry
// Slots: filter bar, tab content (Changes/Catalog/Runs/Models), drill drawers

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScopeHeader, type DataStatus } from "@/components/trust/ScopeHeader";

interface RegistryPageTemplateProps {
  /** Label for scope header */
  scopeLabel?: string;
  /** Data status */
  status?: DataStatus;
  /** Source identifier for provenance */
  source?: string;
  /** ISO timestamp */
  fetchedAt?: string | null;
  /** Global filter bar (time, module, scope filters) */
  filterBar?: ReactNode;
  /** Main content (tab views for Changes/Catalog/Runs/Models) */
  children: ReactNode;
  /** Optional className */
  className?: string;
}

export function RegistryPageTemplate({
  scopeLabel = "All Records",
  status,
  source,
  fetchedAt,
  filterBar,
  children,
  className,
}: RegistryPageTemplateProps) {
  return (
    <div className={cn("module-page space-y-4", className)}>
      {/* Scope declaration */}
      <div className="border-b border-border pb-3">
        <ScopeHeader
          scope="run"
          label={scopeLabel}
          status={status}
          source={source}
          fetchedAt={fetchedAt}
        />
      </div>

      {/* Filter bar */}
      {filterBar && (
        <div className="min-w-0">
          {filterBar}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
