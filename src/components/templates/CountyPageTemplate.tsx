// TerraFusion OS — County Page Template
// Scope: County | Template: county
// Slots: vitals strip, blockers/queues, quality/pipeline, explain rail

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScopeHeader, type DataStatus } from "@/components/trust/ScopeHeader";

interface CountyPageTemplateProps {
  /** County name for scope header */
  countyName: string;
  /** Data freshness status */
  status?: DataStatus;
  /** Source identifier for provenance */
  source?: string;
  /** ISO timestamp of last fetch */
  fetchedAt?: string | null;
  /** Vitals strip (top row of KPIs) */
  vitals?: ReactNode;
  /** Primary content area */
  children: ReactNode;
  /** Optional explain/side rail */
  explainRail?: ReactNode;
  /** Optional className */
  className?: string;
}

export function CountyPageTemplate({
  countyName,
  status,
  source,
  fetchedAt,
  vitals,
  children,
  explainRail,
  className,
}: CountyPageTemplateProps) {
  return (
    <div className={cn("module-page space-y-4", className)}>
      {/* Scope declaration */}
      <div className="border-b border-border pb-3">
        <ScopeHeader
          scope="county"
          label={countyName}
          status={status}
          source={source}
          fetchedAt={fetchedAt}
        />
      </div>

      {/* Vitals strip */}
      {vitals && (
        <div className="min-w-0">
          {vitals}
        </div>
      )}

      {/* Main content + optional explain rail */}
      <div className="module-template-layout">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {explainRail && (
          <aside className="module-template-rail">
            {explainRail}
          </aside>
        )}
      </div>
    </div>
  );
}
