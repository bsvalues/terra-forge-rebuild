// TerraFusion OS — Factory Page Template
// Scope: Neighborhood/Run | Template: factory
// Slots: left controls, center results/QA, right explain/preview/publish

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScopeHeader, type DataScope, type DataStatus } from "@/components/trust/ScopeHeader";

interface FactoryPageTemplateProps {
  /** Scope level (neighborhood or run) */
  scope?: DataScope;
  /** Label for scope header (e.g. neighborhood code, run ID) */
  scopeLabel: string;
  /** Data status */
  status?: DataStatus;
  /** Source identifier for provenance */
  source?: string;
  /** ISO timestamp */
  fetchedAt?: string | null;
  /** Left panel: selectors, controls, neighborhood picker */
  controls?: ReactNode;
  /** Center: results, charts, QA tables */
  children: ReactNode;
  /** Right panel: explain, preview impact, publish controls */
  explainPanel?: ReactNode;
  /** Optional className */
  className?: string;
}

export function FactoryPageTemplate({
  scope = "neighborhood",
  scopeLabel,
  status,
  source,
  fetchedAt,
  controls,
  children,
  explainPanel,
  className,
}: FactoryPageTemplateProps) {
  return (
    <div className={cn("module-page space-y-4", className)}>
      {/* Scope declaration */}
      <div className="border-b border-border pb-3">
        <ScopeHeader
          scope={scope}
          label={scopeLabel}
          status={status}
          source={source}
          fetchedAt={fetchedAt}
        />
      </div>

      {/* Three-column layout */}
      <div className="module-template-layout">
        {/* Left: controls */}
        {controls && (
          <aside className="module-template-rail space-y-4">
            {controls}
          </aside>
        )}

        {/* Center: results */}
        <div className="flex-1 min-w-0 space-y-4">
          {children}
        </div>

        {/* Right: explain + publish */}
        {explainPanel && (
          <aside className="module-template-rail space-y-4">
            {explainPanel}
          </aside>
        )}
      </div>
    </div>
  );
}
