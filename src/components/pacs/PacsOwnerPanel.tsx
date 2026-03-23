import { usePacsOwnerLookup, type PacsOwner } from "@/hooks/usePacsOwnerLookup";
import { usePacsAssessmentRoll, type PacsAssessmentRollEntry } from "@/hooks/usePacsAssessmentRoll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText } from "lucide-react";

interface PacsOwnerPanelProps {
  propId: number;
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

export function PacsOwnerPanel({ propId }: PacsOwnerPanelProps) {
  const { data: owners, isLoading: ownersLoading, error: ownersError } = usePacsOwnerLookup(propId);
  const { data: roll, isLoading: rollLoading } = usePacsAssessmentRoll(propId);

  if (ownersLoading || rollLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>;
  }

  if (ownersError) {
    return <div className="text-sm text-red-400 p-4">Failed to load owner data: {String(ownersError)}</div>;
  }

  const latestRoll = roll?.[0] as PacsAssessmentRollEntry | undefined;

  return (
    <div className="space-y-4">
      {/* Current Owners */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Current Owners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!owners?.length ? (
            <p className="text-sm text-muted-foreground">No PACS owner data for this property</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner Name</TableHead>
                  <TableHead className="text-right">Ownership %</TableHead>
                  <TableHead className="text-right">Tax Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((o: PacsOwner) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.owner_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {o.pct_ownership != null ? (
                        <Badge variant={o.pct_ownership === 100 ? "default" : "secondary"}>
                          {o.pct_ownership}%
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{o.owner_tax_yr ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assessment Roll Summary */}
      {latestRoll && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Assessment Roll — {latestRoll.roll_year ?? "Current"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Situs</span>
                <p className="font-medium">{latestRoll.situs_display ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Imprv (Homestead)</span>
                <p className="font-medium">{formatCurrency(latestRoll.imprv_hstd_val)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Imprv (Non-Hstd)</span>
                <p className="font-medium">{formatCurrency(latestRoll.imprv_non_hstd_val)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Land (Homestead)</span>
                <p className="font-medium">{formatCurrency(latestRoll.land_hstd_val)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Land (Non-Hstd)</span>
                <p className="font-medium">{formatCurrency(latestRoll.land_non_hstd_val)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tax Area</span>
                <p className="font-medium">{latestRoll.tax_area_desc ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Appraised (Classified)</span>
                <p className="font-medium">{formatCurrency(latestRoll.appraised_classified)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Taxable (Classified)</span>
                <p className="font-medium">{formatCurrency(latestRoll.taxable_classified)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Use Code</span>
                <p className="font-medium">{latestRoll.property_use_cd ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
