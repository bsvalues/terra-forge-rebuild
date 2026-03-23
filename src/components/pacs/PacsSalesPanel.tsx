import { usePacsSalesHistory, type PacsSale } from "@/hooks/usePacsSalesHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";

interface PacsSalesPanelProps {
  propId: number;
  hoodCd?: string | null;
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function formatDate(val: string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ratioBadge(ratio: number | null) {
  if (ratio == null) return <span className="text-muted-foreground">—</span>;
  const r = Number(ratio);
  let variant: "default" | "secondary" | "destructive" = "default";
  if (r < 0.90 || r > 1.10) variant = r < 0.80 || r > 1.20 ? "destructive" : "secondary";
  return <Badge variant={variant}>{r.toFixed(3)}</Badge>;
}

export function PacsSalesPanel({ propId }: PacsSalesPanelProps) {
  const { data: sales, isLoading, error } = usePacsSalesHistory(propId);

  if (isLoading) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  if (error) {
    return <div className="text-sm text-red-400 p-4">Failed to load sales data: {String(error)}</div>;
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Sales History ({sales?.length ?? 0} records)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!sales?.length ? (
          <p className="text-sm text-muted-foreground">No PACS sales data for this property</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale Date</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Ratio</TableHead>
                  <TableHead>Ratio Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s: PacsSale) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.sale_date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(s.sale_price)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.sale_type_cd ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(s.market_value)}</TableCell>
                    <TableCell className="text-right">{ratioBadge(s.ratio)}</TableCell>
                    <TableCell>{s.ratio_cd ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
