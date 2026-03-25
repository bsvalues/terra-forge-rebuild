// TerraFusion OS — Unified Sales History Panel
// Renders sales from all sources (canonical, Ascend, PACS) with source badges.

import { useParcelSalesHistory, type UnifiedSale } from "@/hooks/useParcelSalesHistory";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface SalesHistoryPanelProps {
  parcelId: string | null;
  parcelNumber: string | null;
}

const fmtCurrency = (v: number | null | undefined) =>
  v != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(v)
    : "\u2014";

const fmtDate = (iso: string | null) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function SourceBadge({ source }: { source: UnifiedSale["sourceSystem"] }) {
  const styles: Record<string, string> = {
    canonical:
      "bg-muted text-muted-foreground border-border/50",
    ascend:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    pacs:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };
  const labels: Record<string, string> = {
    canonical: "Canonical",
    ascend: "Ascend",
    pacs: "PACS",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] border", styles[source])}>
      {labels[source]}
    </Badge>
  );
}

function QualifiedBadge({ qualified }: { qualified: boolean | null }) {
  if (qualified === true) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
        Qualified
      </span>
    );
  }
  if (qualified === false) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-destructive">
        Unqualified
      </span>
    );
  }
  return <span className="text-[10px] text-muted-foreground">\u2014</span>;
}

export function SalesHistoryPanel({ parcelId, parcelNumber }: SalesHistoryPanelProps) {
  const { data: sales, isLoading, error } = useParcelSalesHistory(parcelId, parcelNumber);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-2xl p-6"
    >
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-chart-5" />
        Sales History
        <span className="text-xs text-muted-foreground font-normal ml-1">
          (Unified)
        </span>
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-center py-6 text-destructive text-sm">
          Failed to load sales history.
        </p>
      ) : sales && sales.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-right py-2 pr-4">Price</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">
                  Grantor &rarr; Grantee
                </th>
                <th className="text-center py-2 pr-4">Source</th>
                <th className="text-center py-2">Qualified</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-2.5 pr-4 font-medium">
                    {fmtDate(s.saleDate)}
                  </td>
                  <td className="text-right py-2.5 pr-4 text-chart-5 font-medium">
                    {fmtCurrency(s.salePrice)}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {s.saleType || s.deedType || "\u2014"}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground text-xs truncate max-w-[200px]">
                    {s.grantor || "\u2014"} &rarr; {s.grantee || "\u2014"}
                  </td>
                  <td className="text-center py-2.5 pr-4">
                    <SourceBadge source={s.sourceSystem} />
                  </td>
                  <td className="text-center py-2.5">
                    <QualifiedBadge qualified={s.qualified} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center py-6 text-muted-foreground text-sm">
          No sales history found for this parcel.
        </p>
      )}
    </motion.div>
  );
}
