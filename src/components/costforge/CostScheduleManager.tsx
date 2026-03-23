import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useResidentialSchedules,
  useCommercialSchedules,
  useDepreciationTable,
  useCostMultipliers,
  useCostForgeCoverage,
} from "@/hooks/useCostForgeHooks";
import { Building2, Factory, Percent, Gauge } from "lucide-react";

const BENTON_COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d";

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-border/50 rounded-lg p-6 text-center">
      <p className="text-sm text-muted-foreground">No {label} found for this county.</p>
    </div>
  );
}

function LoadingTable() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function CostScheduleManager() {
  const { data: coverage, isLoading: coverageLoading } = useCostForgeCoverage(BENTON_COUNTY_ID);
  const { data: residential = [], isLoading: residentialLoading } = useResidentialSchedules(BENTON_COUNTY_ID);
  const { data: commercial = [], isLoading: commercialLoading } = useCommercialSchedules(undefined, BENTON_COUNTY_ID);
  const { data: depreciation = [], isLoading: depreciationLoading } = useDepreciationTable("residential", BENTON_COUNTY_ID);
  const { data: multipliers, isLoading: multipliersLoading } = useCostMultipliers(BENTON_COUNTY_ID);
  const multiplierObj: any = multipliers as any;

  const groupedResidential = useMemo(() => {
    return residential.reduce<Record<string, typeof residential>>((acc, row) => {
      const key = (row as any).imprv_type_code || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [residential]);

  return (
    <div className="p-6 space-y-6">
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">CostForge Schedule Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <LoadingTable />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/40 p-3">
                <div className="text-xs text-muted-foreground">Residential Rows</div>
                <div className="text-xl font-semibold">{coverage?.res_schedule_rows ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border/40 p-3">
                <div className="text-xs text-muted-foreground">Commercial Rows</div>
                <div className="text-xl font-semibold">{coverage?.comm_schedule_rows ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border/40 p-3">
                <div className="text-xs text-muted-foreground">Depreciation Rows</div>
                <div className="text-xl font-semibold">{(coverage as any)?.["depr_rows"] ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border/40 p-3">
                <div className="text-xs text-muted-foreground">Imprv Type Codes</div>
                <div className="text-xl font-semibold">{(coverage as any)?.["imprv_type_codes"] ?? 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="residential" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="residential" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            Residential
          </TabsTrigger>
          <TabsTrigger value="commercial" className="gap-1.5 text-xs">
            <Factory className="w-3.5 h-3.5" />
            Commercial
          </TabsTrigger>
          <TabsTrigger value="depreciation" className="gap-1.5 text-xs">
            <Percent className="w-3.5 h-3.5" />
            Depreciation
          </TabsTrigger>
          <TabsTrigger value="multipliers" className="gap-1.5 text-xs">
            <Gauge className="w-3.5 h-3.5" />
            Multipliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="residential" className="mt-0">
          <Card className="border-border/40">
            <CardContent className="pt-5">
              {residentialLoading ? (
                <LoadingTable />
              ) : residential.length === 0 ? (
                <EmptyState label="residential schedules" />
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedResidential).map(([typeCode, rows]) => (
                    <div key={typeCode} className="border border-border/40 rounded-lg overflow-hidden">
                      <div className="bg-muted/40 px-3 py-2 text-xs font-medium flex items-center justify-between">
                        <span>Improvement Type {typeCode}</span>
                        <Badge variant="outline">{rows.length} rows</Badge>
                      </div>
                      <div className="overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/20">
                            <tr>
                              <th className="text-left p-2 font-medium">Model</th>
                              <th className="text-left p-2 font-medium">Grade</th>
                              <th className="text-right p-2 font-medium">Base Rate</th>
                              <th className="text-right p-2 font-medium">Min Sqft</th>
                              <th className="text-right p-2 font-medium">Max Sqft</th>
                            </tr>
                          </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={(r as any).id} className="border-t border-border/30">
                                  <td className="p-2">{(r as any).dwelling_model_code || "-"}</td>
                                  <td className="p-2">{(r as any).grade || "-"}</td>
                                  <td className="p-2 text-right tabular-nums">{(r as any).base_rate ?? "-"}</td>
                                  <td className="p-2 text-right tabular-nums">{(r as any).sqft_min ?? "-"}</td>
                                  <td className="p-2 text-right tabular-nums">{(r as any).sqft_max ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commercial" className="mt-0">
          <Card className="border-border/40">
            <CardContent className="pt-5">
              {commercialLoading ? (
                <LoadingTable />
              ) : commercial.length === 0 ? (
                <EmptyState label="commercial schedules" />
              ) : (
                <div className="overflow-auto border border-border/40 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="text-left p-2 font-medium">Section</th>
                        <th className="text-left p-2 font-medium">Class</th>
                        <th className="text-right p-2 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commercial.map((r) => (
                        <tr key={(r as any).id} className="border-t border-border/30">
                          <td className="p-2">{(r as any).section || "-"}</td>
                          <td className="p-2">{(r as any).class || "-"}</td>
                          <td className="p-2 text-right tabular-nums">{(r as any).rate ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation" className="mt-0">
          <Card className="border-border/40">
            <CardContent className="pt-5">
              {depreciationLoading ? (
                <LoadingTable />
              ) : depreciation.length === 0 ? (
                <EmptyState label="depreciation factors" />
              ) : (
                <div className="overflow-auto border border-border/40 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="text-left p-2 font-medium">Age</th>
                        <th className="text-right p-2 font-medium">Pct Good</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depreciation.map((r) => (
                        <tr key={(r as any).id} className="border-t border-border/30">
                          <td className="p-2">{(r as any).age ?? "-"}</td>
                          <td className="p-2 text-right tabular-nums">{(r as any).pct_good ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multipliers" className="mt-0">
          <Card className="border-border/40">
            <CardContent className="pt-5">
              {multipliersLoading ? (
                <LoadingTable />
              ) : !multipliers ? (
                <EmptyState label="cost multipliers" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="text-xs text-muted-foreground">Current Cost Multiplier</div>
                    <div className="text-lg font-semibold tabular-nums">{multiplierObj?.current_cost_mult ?? "-"}</div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="text-xs text-muted-foreground">Local Multiplier</div>
                    <div className="text-lg font-semibold tabular-nums">{multiplierObj?.local_mult ?? "-"}</div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="text-xs text-muted-foreground">Trend Factor</div>
                    <div className="text-lg font-semibold tabular-nums">{multiplierObj?.trend_factor ?? "-"}</div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="text-xs text-muted-foreground">Economic Factor</div>
                    <div className="text-lg font-semibold tabular-nums">{multiplierObj?.econ_factor ?? "-"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
