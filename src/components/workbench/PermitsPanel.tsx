import { useParcelPermits } from "@/hooks/useParcelPermits";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

interface PermitsPanelProps {
  parcelId: string | null;
}

export function PermitsPanel({ parcelId }: PermitsPanelProps) {
  const { data: permits, isLoading, error } = useParcelPermits(parcelId);

  const fmt = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
      : "\u2014";

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (error) {
    return <p className="text-sm text-destructive py-4">Failed to load permits</p>;
  }

  if (!permits || permits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No permits on record</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl p-6">
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Permits ({permits.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground text-xs">
              <th className="text-left py-2 pr-4">Permit #</th>
              <th className="text-left py-2 pr-4">Type</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-left py-2 pr-4">Issued</th>
              <th className="text-right py-2 pr-4">Est. Value</th>
              <th className="text-center py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {permits.map((p) => (
              <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 pr-4 font-medium">{p.permitNumber ?? "\u2014"}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{p.permitType ?? "\u2014"}</td>
                <td className="py-2.5 pr-4">
                  <Badge variant="outline" className="text-[10px]">{p.status ?? "Unknown"}</Badge>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {p.issuedDate ? new Date(p.issuedDate).toLocaleDateString() : "\u2014"}
                </td>
                <td className="text-right py-2.5 pr-4">{fmt(p.estimatedValue)}</td>
                <td className="text-center py-2.5">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    p.source === "pacs" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {p.source === "pacs" ? "PACS" : "DB"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
