import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { Database } from "lucide-react";

export function VEIEmptyState() {
  return (
    <div className="module-page space-y-4">
      <ModuleHeader title="Ratio Studies" description="Assessment-to-sale ratios and equity review" />
      <section className="py-8 border-b border-border" aria-labelledby="ratio-empty-title">
        <Database className="h-5 w-5 text-muted-foreground mb-3" aria-hidden="true" />
        <h2 id="ratio-empty-title" className="text-base font-semibold text-foreground">No matched sales for this analysis</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">Ratio analysis requires matched assessments and qualified sales for the selected period.</p>
      </section>
    </div>
  );
}
