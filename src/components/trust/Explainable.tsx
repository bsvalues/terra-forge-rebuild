// TerraFusion OS — Explainable (Convenience Wrapper)
// Makes any KPI tile or metric number X-Ray capable with one line.
//
// Usage:
//   <Explainable metricKey="quality.overall" fetchedAt={vitals?.fetchedAt} onNavigate={onNavigate}>
//     <KpiTile value="87%" label="Data Quality" />
//   </Explainable>
//
// Constitutional note: this is a Tier-0 OS primitive. It references METRIC_CATALOG
// but never writes to any data domain.

import { ExplainThisPanel } from "@/components/dashboard/ExplainThisPanel";
import type { MetricExplanation } from "@/lib/metrics/metricCatalog";

interface ExplainableProps {
  /** Key into METRIC_CATALOG — e.g. "quality.overall" */
  metricKey: string;
  /** ISO timestamp for this metric's freshness */
  fetchedAt?: string | null;
  /**
   * Per-key freshness map. Pass this instead of fetchedAt when you want
   * history navigation to show the correct "As of" for each metric.
   */
  fetchedAtByKey?: Record<string, string | null | undefined>;
  /** Last plain-English change event for this metric */
  lastChangeLabel?: string | null;
  /** Override any field in the catalog entry */
  override?: Partial<MetricExplanation>;
  /** Canonical navigate handler */
  onNavigate?: (target: string) => void;
  /** The metric display (number, badge, tile, etc.) */
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrap any number or KPI tile with `<Explainable>` to give it X-Ray Vision.
 * The user clicks the child and gets the full Explain This panel.
 */
export function Explainable({
  metricKey,
  fetchedAt,
  fetchedAtByKey,
  lastChangeLabel,
  override,
  onNavigate,
  children,
  className,
}: ExplainableProps) {
  return (
    <ExplainThisPanel
      metricKey={metricKey}
      fetchedAt={fetchedAt}
      fetchedAtByKey={fetchedAtByKey}
      lastChangeLabel={lastChangeLabel}
      override={override}
      onNavigate={onNavigate}
      className={className}
    >
      {children}
    </ExplainThisPanel>
  );
}
