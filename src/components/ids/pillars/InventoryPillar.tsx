import { useCountyVitals } from "@/hooks/useCountyVitals";
import { formatVital, knownVital } from "@/lib/countyMetric";
import { Button } from "@/components/ui/button";

/** Counts are inventory, not evidence of freshness, spatial coverage or validation. */
export function InventoryPillar() {
  const { data: vitals, isLoading, isError, refetch } = useCountyVitals();
  const rows = [
    { label: "Parcels", count: knownVital(vitals?.metricAvailability, "parcels", vitals?.parcels.total), scope: "Property records" },
    { label: "Sales", count: knownVital(vitals?.metricAvailability, "sales", vitals?.sales.total), scope: "Transaction records" },
    { label: "Assessments", count: knownVital(vitals?.metricAvailability, "assessments", vitals?.assessments.total), scope: "Valuation-year records" },
  ];
  return <section className="space-y-5" aria-labelledby="inventory-title">
    <div className="module-toolbar"><h2 id="inventory-title" className="text-lg font-semibold">County inventory</h2><Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>Refresh</Button></div>
    {isError && <p role="alert" className="text-sm text-destructive">Inventory could not be loaded.</p>}
    <div className="module-records" role="region" aria-label="County record counts" tabIndex={0}>
      <table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-3 font-medium">Records</th><th className="p-3 font-medium">Scope</th><th className="py-3 text-right font-medium">Count</th></tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-b border-border"><th className="py-4 font-medium">{row.label}</th><td className="p-3 text-muted-foreground">{row.scope}</td><td className="py-4 text-right tabular-nums">{isLoading ? "Loading…" : isError ? "—" : formatVital(row.count)}</td></tr>)}</tbody></table>
    </div>
    <dl className="module-data-band"><div><dt className="text-xs text-muted-foreground">Source freshness</dt><dd className="mt-1 text-sm">Not measured</dd></div><div><dt className="text-xs text-muted-foreground">Building record coverage</dt><dd className="mt-1 text-sm">Not measured</dd></div><div><dt className="text-xs text-muted-foreground">Inventory checked</dt><dd className="mt-1 text-sm">{!isError && vitals?.fetchedAt ? new Date(vitals.fetchedAt).toLocaleString() : "—"}</dd></div></dl>
  </section>;
}
