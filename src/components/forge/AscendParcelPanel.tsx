import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { useFullValueHistory } from "@/hooks/useFullValueHistory";
import { Database } from "lucide-react";

export function AscendParcelPanel() {
  const { parcel } = useWorkbench();
  const { data = [], isLoading } = useFullValueHistory(parcel.id);

  const ascendRows = useMemo(() => {
    return data
      .filter((d) => d.source_system === "ascend")
      .sort((a, b) => (a.roll_year ?? 0) - (b.roll_year ?? 0));
  }, [data]);

  if (!parcel.id) {
    return (
      <Card className="border-border/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">Select a parcel to view legacy Ascend records.</CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Legacy Data (Ascend)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-4 h-4" />
          Legacy Data (Ascend)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Ascend years: {ascendRows.length}</Badge>
          <span>Parcel ID: {parcel.id}</span>
        </div>

        {ascendRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
            No Ascend rows were found for this parcel.
          </div>
        ) : (
          <div className="overflow-auto border border-border/40 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/20">
                <tr>
                  <th className="text-left p-2 font-medium">Year</th>
                  <th className="text-right p-2 font-medium">Land</th>
                  <th className="text-right p-2 font-medium">Improvement</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-right p-2 font-medium">Taxable</th>
                </tr>
              </thead>
              <tbody>
                {ascendRows.map((r) => (
                  <tr key={`${r.roll_year}-${r.source_system}`} className="border-t border-border/30">
                    <td className="p-2">{r.roll_year}</td>
                    <td className="p-2 text-right tabular-nums">{r.land_value?.toLocaleString() ?? "-"}</td>
                    <td className="p-2 text-right tabular-nums">{r.impr_value?.toLocaleString() ?? "-"}</td>
                    <td className="p-2 text-right tabular-nums">{r.total_value?.toLocaleString() ?? "-"}</td>
                    <td className="p-2 text-right tabular-nums">{r.taxable_value?.toLocaleString() ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
