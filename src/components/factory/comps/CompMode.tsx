import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Grid3X3 } from "lucide-react";

interface CompModeProps {
  neighborhoodCode: string | null;
}

function ratioColor(ratio: number | null) {
  if (ratio == null) return "text-muted-foreground";
  if (ratio >= 0.9 && ratio <= 1.1) return "text-tf-green";
  if ((ratio >= 0.8 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.2)) return "text-tf-gold";
  return "text-destructive";
}

function ratioBadge(ratio: number | null) {
  if (ratio == null) return "outline";
  if (ratio >= 0.9 && ratio <= 1.1) return "default" as const;
  if ((ratio >= 0.8 && ratio < 0.9) || (ratio > 1.1 && ratio <= 1.2)) return "secondary" as const;
  return "destructive" as const;
}

export function CompMode({ neighborhoodCode }: CompModeProps) {
  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["comp-grid", neighborhoodCode],
    enabled: !!neighborhoodCode,
    queryFn: async () => {
      // Fetch parcels with their latest sale
      const { data: p, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value, building_area, year_built")
        .eq("neighborhood_code", neighborhoodCode!)
        .order("parcel_number")
        .limit(200);
      if (error) throw error;
      if (!p?.length) return [];

      // Fetch latest qualified sale per parcel
      const ids = p.map((x) => x.id);
      const { data: sales } = await supabase
        .from("sales")
        .select("parcel_id, sale_price, sale_date")
        .in("parcel_id", ids)
        .eq("is_qualified", true)
        .gt("sale_price", 0)
        .order("sale_date", { ascending: false });

      const latestSale = new Map<string, { sale_price: number; sale_date: string }>();
      for (const s of sales || []) {
        if (!latestSale.has(s.parcel_id)) latestSale.set(s.parcel_id, s);
      }

      return p.map((parcel) => {
        const sale = latestSale.get(parcel.id);
        const ratio = sale ? parcel.assessed_value / sale.sale_price : null;
        return { ...parcel, sale_price: sale?.sale_price ?? null, sale_date: sale?.sale_date ?? null, ratio };
      });
    },
  });

  // Compute summary stats
  const ratios = parcels.filter((p) => p.ratio != null).map((p) => p.ratio!);
  const medianRatio = ratios.length > 0 ? ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : null;
  const meanRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
  const cod = medianRatio && ratios.length > 0
    ? (ratios.reduce((sum, r) => sum + Math.abs(r - medianRatio), 0) / ratios.length / medianRatio) * 100
    : null;

  if (!neighborhoodCode) {
    return (
      <div className="material-bento p-16 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--tf-elevated))] flex items-center justify-center">
          <Grid3X3 className="w-8 h-8 text-[hsl(var(--tf-transcend-cyan)/0.5)]" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-foreground">Comp Review</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a neighborhood to begin ratio review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Parcels" value={parcels.length.toString()} />
        <StatCard label="With Sales" value={ratios.length.toString()} />
        <StatCard label="Median Ratio" value={medianRatio?.toFixed(4) ?? "—"} highlight={medianRatio != null && medianRatio >= 0.9 && medianRatio <= 1.1} />
        <StatCard label="COD" value={cod?.toFixed(2) ?? "—"} highlight={cod != null && cod <= 15} />
      </div>

      {/* Comp Grid Table */}
      <div className="material-bento overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Parcel Ratio Grid</h3>
          <p className="text-xs text-muted-foreground">
            {neighborhoodCode} — {parcels.length} parcels, {ratios.length} with qualified sales
          </p>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent sticky top-0 bg-[hsl(var(--tf-surface))]">
                <TableHead className="text-xs">Parcel #</TableHead>
                <TableHead className="text-xs">Address</TableHead>
                <TableHead className="text-xs text-right">Assessed</TableHead>
                <TableHead className="text-xs text-right">Sale Price</TableHead>
                <TableHead className="text-xs text-right">Ratio</TableHead>
                <TableHead className="text-xs text-center">Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {parcels.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.parcel_number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{p.address}</TableCell>
                  <TableCell className="text-right font-mono text-sm">${p.assessed_value.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {p.sale_price ? `$${p.sale_price.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${ratioColor(p.ratio)}`}>
                    {p.ratio?.toFixed(4) ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.ratio != null && (
                      <Badge variant={ratioBadge(p.ratio)} className="text-[10px]">
                        {p.ratio >= 0.9 && p.ratio <= 1.1 ? "✓" : p.ratio >= 0.8 && p.ratio <= 1.2 ? "⚠" : "✗"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="material-bento p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-mono ${highlight ? "text-tf-green" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
