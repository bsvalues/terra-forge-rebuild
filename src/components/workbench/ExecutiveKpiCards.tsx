// TerraFusion OS — Phase 99: Executive KPI Dashboard Cards
// High-level county metrics displayed on Summary tab when no parcel is selected.

import {
  Building2, FileCheck2, FileText, AlertTriangle,
  Gavel, BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { countyMetric } from "@/lib/countyMetric";
import { Button } from "@/components/ui/button";

export function ExecutiveKpiCards() {
  const { data: vitals, isLoading, isError, refetch, isFetching } = useCountyVitals();

  const cards = [
    { label: "Parcels", value: vitals?.parcels.total, icon: Building2 },
    { label: "Assessments", value: vitals?.assessments.total, icon: FileText },
    { label: "Certified assessments", value: vitals?.assessments.certified, icon: FileCheck2 },
    { label: "Pending appeals", value: vitals?.workflows.pendingAppeals, icon: Gavel },
    { label: "Open data issues", value: vitals?.dataQuality.openIssues, icon: AlertTriangle },
    { label: "Sales records", value: vitals?.sales.total, icon: BarChart3 },
  ];

  return (
    <section aria-label="County records" className="border-y border-border py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-medium">County records</h3>
        {isError ? <div className="flex items-center gap-2 text-xs text-destructive" role="status">Counts unavailable <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>Retry</Button></div> :
          vitals && <span className="text-xs text-muted-foreground">Retrieved {new Date(vitals.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
        {cards.map((c) => <div key={c.label} className="min-w-0">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground"><c.icon className="h-3.5 w-3.5 shrink-0" />{c.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{isLoading ? <Skeleton className="h-6 w-20" /> : countyMetric(c.value, isError)?.toLocaleString() ?? "—"}</dd>
        </div>)}
      </dl>
    </section>
  );
}
