import { useParcelExemptions } from "@/hooks/useParcelExemptions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ExemptionsPanelProps {
  parcelId: string | null;
}

export function ExemptionsPanel({ parcelId }: ExemptionsPanelProps) {
  const { data: exemptions, isLoading, error } = useParcelExemptions(parcelId);

  const fmt = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
      : "\u2014";

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (error) {
    return <p className="text-sm text-destructive py-4">Failed to load exemptions</p>;
  }

  if (!exemptions || exemptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No exemptions on record</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-chart-5" />
        Exemptions ({exemptions.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground text-xs">
              <th className="text-left py-2 pr-4">Type</th>
              <th className="text-left py-2 pr-4">Tax Year</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-left py-2 pr-4">Applied</th>
              <th className="text-left py-2 pr-4">Expires</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {exemptions.map((e) => (
              <tr key={e.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 pr-4 font-medium">{e.exemptionType ?? "\u2014"}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{e.taxYear ?? "\u2014"}</td>
                <td className="py-2.5 pr-4">
                  <Badge variant="outline" className="text-[10px]">{e.status ?? "Unknown"}</Badge>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {e.applicationDate ? new Date(e.applicationDate).toLocaleDateString() : "\u2014"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {e.expirationDate ? new Date(e.expirationDate).toLocaleDateString() : "\u2014"}
                </td>
                <td className="text-right py-2.5 font-medium">{fmt(e.exemptionAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
