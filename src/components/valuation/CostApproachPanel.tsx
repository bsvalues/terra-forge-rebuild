// TerraFusion OS — Phase 87: Cost Approach Panel
// Displays cost schedules and cost approach run results.

import { DollarSign, Calculator, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCostSchedules, useCostApproachRuns } from "@/hooks/useCostApproach";
import { useAuthContext } from "@/contexts/AuthContext";

export function CostApproachPanel() {
  const { profile } = useAuthContext();
  const countyId = profile?.county_id ?? undefined;
  const { data: schedules = [], isLoading: schedulesLoading } = useCostSchedules(countyId);
  const { data: runs = [], isLoading: runsLoading } = useCostApproachRuns(countyId);

  const isLoading = schedulesLoading || runsLoading;

  return (
    <div className="space-y-4">
      {/* Cost Schedules */}
      <Card className="bg-card/80 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-chart-4" />
            Cost Schedules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No cost schedules configured.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 text-muted-foreground">
                    <th className="px-4 py-2 text-left">Class</th>
                    <th className="px-4 py-2 text-left">Grade</th>
                    <th className="px-4 py-2 text-right">$/sqft</th>
                    <th className="px-4 py-2 text-right">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-border/10 hover:bg-muted/20">
                      <td className="px-4 py-2 text-foreground">{s.property_class}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-[10px]">{s.quality_grade}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right text-foreground font-mono">
                        ${s.base_cost_per_sqft.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{s.effective_year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Cost Approach Runs */}
      <Card className="bg-card/80 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4 text-chart-3" />
            Cost Approach Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px]">
            {runsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : runs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No cost approach runs executed yet.
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {runs.map((run) => (
                  <div key={run.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Neighborhood {run.neighborhood_code}
                      </span>
                      <Badge
                        variant="outline"
                        className={run.status === "completed" ? "text-chart-2" : "text-chart-4"}
                      >
                        {run.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Processed: {run.parcels_processed}</span>
                      <span>Matched: {run.parcels_matched}</span>
                      {run.median_ratio && <span>Median Ratio: {run.median_ratio.toFixed(4)}</span>}
                      {run.cod && <span>COD: {run.cod.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
