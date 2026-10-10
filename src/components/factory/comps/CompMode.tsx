import { useNavigate } from "react-router-dom";
import { useCompGrid } from "@/hooks/useCompGrid";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

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
  const navigate = useNavigate();
  const { data: parcels = [], isLoading, isError, refetch } = useCompGrid(neighborhoodCode);

  const ratios = parcels.flatMap((p) => p.ratio == null ? [] : [p.ratio]);
  const medianRatio = ratios.length > 0 ? ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : null;
  const cod = medianRatio && ratios.length > 0
    ? (ratios.reduce((sum, r) => sum + Math.abs(r - medianRatio), 0) / ratios.length / medianRatio) * 100
    : null;

  if (!neighborhoodCode) {
    return (
      <section className="module-section space-y-2 py-6">
        <h2 className="text-sm font-medium">Comp Review</h2>
        <p className="text-sm text-muted-foreground">No neighborhood selected.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="module-data-band">
        <StatCard label="Loaded parcels" value={isLoading || isError ? "—" : parcels.length.toString()} />
        <StatCard label="With sales" value={isLoading || isError ? "—" : ratios.length.toString()} />
        <StatCard label="Median Ratio" value={medianRatio?.toFixed(4) ?? "—"} highlight={medianRatio != null && medianRatio >= 0.9 && medianRatio <= 1.1} />
        <StatCard label="COD" value={cod?.toFixed(2) ?? "—"} highlight={cod != null && cod <= 15} />
      </div>

      <div className="module-section space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Parcel Ratio Grid</h3>
          <p className="text-xs text-muted-foreground">
            {neighborhoodCode} — {isLoading ? "Loading parcels…" : isError ? "Records unavailable" : `${parcels.length} loaded parcels, ${ratios.length} with qualified sales`}
          </p>
        </div>
        <div className="module-records max-h-[500px]" role="region" aria-label="Parcel ratio grid" tabIndex={0}>
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent sticky top-0 bg-background">
                <TableHead className="text-xs">Parcel #</TableHead>
                <TableHead className="text-xs">Address</TableHead>
                <TableHead className="text-xs text-right">Assessed</TableHead>
                <TableHead className="text-xs text-right">Sale Price</TableHead>
                <TableHead className="text-xs text-right">Ratio</TableHead>
                <TableHead className="text-xs text-center">Flag</TableHead>
                <TableHead className="text-xs text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {isError && <TableRow><TableCell colSpan={7} className="py-6 text-center">
                <p className="mb-2 text-sm text-muted-foreground">Parcel ratios could not be loaded.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
              </TableCell></TableRow>}
              {!isLoading && !isError && parcels.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">No parcels in the loaded review.</TableCell></TableRow>}
              {!isError && parcels.map((p) => (
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
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" aria-label={`Open parcel ${p.parcel_number}`} title="Open parcel"
                      onClick={() => navigate(`/property/${p.id}`)}
                      className="text-primary"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
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
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-mono ${highlight ? "text-tf-green" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
