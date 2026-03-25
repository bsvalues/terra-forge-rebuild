/**
 * TerraFusion OS — Phase 129: Cross-Neighborhood Equity Comparison Matrix
 * Constitutional owner: TerraForge (equity analysis)
 *
 * Displays a matrix comparing key equity metrics (COD, PRD, median ratio)
 * across all neighborhoods for quick identification of outliers.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Grid3X3,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import { useNeighborhoodEquityOverlay } from "@/hooks/useNeighborhoodStats";

interface AssessmentRatioParcel {
  neighborhood_code: string | null;
  assessed_value: number | null;
}

interface NbhdEquityRow {
  code: string;
  parcelCount: number;
  medianRatio: number;
  cod: number;
  prd: number;
  avgValue: number;
  passesIAAO: boolean;
}

function useNeighborhoodEquityData() {
  return useQuery({
    queryKey: ["nbhd-equity-matrix"],
    queryFn: async () => {
      // Get assessment ratios grouped by neighborhood via parcels
      const { data: ratios, error } = await supabase
        .from("assessment_ratios")
        .select("ratio, parcel_id, parcels!inner(neighborhood_code, assessed_value)")
        .not("ratio", "is", null)
        .limit(1000);

      if (error) throw error;

      // Aggregate by neighborhood
      const map = new Map<string, { ratios: number[]; values: number[] }>();

      for (const r of ratios || []) {
        const parcel = r.parcels as AssessmentRatioParcel | null;
        const nbhd = parcel?.neighborhood_code;
        if (!nbhd) continue;
        if (!map.has(nbhd)) map.set(nbhd, { ratios: [], values: [] });
        const entry = map.get(nbhd)!;
        if (r.ratio) entry.ratios.push(r.ratio);
        const val = parcel?.assessed_value;
        if (val) entry.values.push(val);
      }

      const rows: NbhdEquityRow[] = [];

      for (const [code, data] of map.entries()) {
        if (data.ratios.length < 3) continue;

        const sorted = [...data.ratios].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;

        // COD = avg absolute deviation from median / median * 100
        const cod = (sorted.reduce((s, v) => s + Math.abs(v - median), 0) / sorted.length / median) * 100;

        // PRD = mean ratio / weighted mean ratio
        const totalValue = data.values.reduce((s, v) => s + v, 0);
        const weightedMean = totalValue > 0
          ? data.ratios.reduce((s, r, i) => s + r * (data.values[i] || 1), 0) / totalValue
          : mean;
        const prd = weightedMean > 0 ? mean / weightedMean : 1;

        const avgValue = data.values.length > 0
          ? Math.round(data.values.reduce((s, v) => s + v, 0) / data.values.length)
          : 0;

        // IAAO standards: COD 5-20 for residential, PRD 0.98-1.03
        const passesIAAO = cod <= 20 && prd >= 0.98 && prd <= 1.03;

        rows.push({
          code,
          parcelCount: data.ratios.length,
          medianRatio: parseFloat(median.toFixed(3)),
          cod: parseFloat(cod.toFixed(1)),
          prd: parseFloat(prd.toFixed(3)),
          avgValue,
          passesIAAO,
        });
      }

      return rows.sort((a, b) => b.cod - a.cod); // Worst COD first
    },
    staleTime: 30_000,
  });
}

function getCodClass(cod: number): string {
  if (cod <= 10) return "text-tf-green bg-tf-green/10";
  if (cod <= 15) return "text-tf-gold bg-tf-gold/10";
  if (cod <= 20) return "text-tf-amber bg-tf-amber/10";
  return "text-destructive bg-destructive/10";
}

function getPrdClass(prd: number): string {
  if (prd >= 0.98 && prd <= 1.03) return "text-tf-green bg-tf-green/10";
  if (prd >= 0.95 && prd <= 1.05) return "text-tf-gold bg-tf-gold/10";
  return "text-destructive bg-destructive/10";
}

function getRatioClass(ratio: number): string {
  if (ratio >= 0.90 && ratio <= 1.10) return "text-tf-green";
  if (ratio >= 0.85 && ratio <= 1.15) return "text-tf-gold";
  return "text-destructive";
}

export function NeighborhoodEquityMatrix() {
  const { data: rows, isLoading } = useNeighborhoodEquityData();
  const countyId = useActiveCountyId();
  const {
    data: overlayData,
    isLoading: overlayLoading,
    isError: overlayError,
  } = useNeighborhoodEquityOverlay(countyId);
  type SortKey = "code" | "parcelCount" | "medianRatio" | "cod" | "prd" | "avgValue";
  const [sortKey, setSortKey] = useState<SortKey>("cod");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExportCsv = () => {
    if (!sorted.length) return;
    const header = "Neighborhood,Sales,Median Ratio,COD,PRD,Avg Value,IAAO Compliant";
    const csvRows = sorted.map((r) =>
      `"${r.code}",${r.parcelCount},${r.medianRatio},${r.cod},${r.prd},${r.avgValue},${r.passesIAAO ? "Yes" : "No"}`
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neighborhood-equity-matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => {
    if (!rows?.length) return null;
    const passing = rows.filter((r) => r.passesIAAO).length;
    return {
      total: rows.length,
      passing,
      failing: rows.length - passing,
      avgCod: parseFloat((rows.reduce((s, r) => s + r.cod, 0) / rows.length).toFixed(1)),
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Equity Overlay from RPC */}
      {countyId && (
        <Card className="material-bento border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Grid3X3 className="w-3.5 h-3.5 text-suite-forge" />
              County Equity Overlay
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {overlayLoading && (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading overlay data…
              </div>
            )}
            {overlayError && (
              <div className="flex items-center gap-2 py-2 text-xs text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" /> Failed to load equity overlay from RPC.
              </div>
            )}
            {!overlayLoading && !overlayError && overlayData != null && (
              Array.isArray(overlayData) && overlayData.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">No overlay data returned for this county.</p>
              ) : (
                <pre className="text-[10px] text-muted-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(overlayData, null, 2)}
                </pre>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-medium text-foreground">{summary.total}</div>
              <div className="text-[10px] text-muted-foreground">Neighborhoods</div>
            </CardContent>
          </Card>
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-medium text-tf-green">{summary.passing}</div>
              <div className="text-[10px] text-muted-foreground">IAAO Compliant</div>
            </CardContent>
          </Card>
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-medium text-destructive">{summary.failing}</div>
              <div className="text-[10px] text-muted-foreground">Non-Compliant</div>
            </CardContent>
          </Card>
          <Card className="material-bento border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-medium text-foreground">{summary.avgCod}%</div>
              <div className="text-[10px] text-muted-foreground">Avg COD</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Equity Matrix Table */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-suite-forge" />
              Cross-Neighborhood Equity Matrix
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportCsv}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("code")}>
                    Neighborhood {sortKey === "code" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("parcelCount")}>
                    Sales {sortKey === "parcelCount" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("medianRatio")}>
                    Median Ratio {sortKey === "medianRatio" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("cod")}>
                    COD {sortKey === "cod" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("prd")}>
                    PRD {sortKey === "prd" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("avgValue")}>
                    Avg Value {sortKey === "avgValue" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-center py-2 text-muted-foreground font-medium">IAAO</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.code} className="border-b border-border/10 hover:bg-muted/20">
                    <td className="py-2 font-medium text-foreground">{r.code}</td>
                    <td className="py-2 text-right text-muted-foreground">{r.parcelCount}</td>
                    <td className={cn("py-2 text-right font-medium", getRatioClass(r.medianRatio))}>
                      {r.medianRatio.toFixed(3)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getCodClass(r.cod))}>
                        {r.cod}%
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getPrdClass(r.prd))}>
                        {r.prd.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      ${r.avgValue.toLocaleString()}
                    </td>
                    <td className="py-2 text-center">
                      {r.passesIAAO ? (
                        <CheckCircle2 className="w-4 h-4 text-tf-green mx-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-destructive mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!sorted || sorted.length === 0) && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No assessment ratio data available
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
