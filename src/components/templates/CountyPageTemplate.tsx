// TerraFusion OS — County Page Template
// Scope: County | Template: county
// Slots: vitals strip, blockers/queues, quality/pipeline, explain rail

import { ReactNode } from "react";
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
    <div className={className}>
      {/* Scope declaration */}
      <div className="px-6 pt-4 pb-2">
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
        <div className="px-6 pb-4">
          {vitals}
        </div>
      )}

      {/* Main content + optional explain rail */}
      <div className="flex gap-6 px-6 pb-6">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {explainRail && (
          <aside className="hidden xl:block w-80 shrink-0">
            {explainRail}
          </aside>
        )}
      </div>
    </div>
  );
}
