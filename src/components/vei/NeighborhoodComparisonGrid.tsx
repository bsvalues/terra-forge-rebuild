import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowUpDown, AlertTriangle, CheckCircle } from "lucide-react";
import type { RatioStatistics } from "@/hooks/useRatioAnalysis";

export interface NeighborhoodRow {
  neighborhood_code: string;
  sample_size: number;
  median_ratio: number | null;
  cod: number | null;
  prd: number | null;
  prb: number | null;
}

interface NeighborhoodComparisonGridProps {
  data: NeighborhoodRow[];
  isLoading: boolean;
}

type SortKey = "neighborhood_code" | "sample_size" | "median_ratio" | "cod" | "prd";

export function NeighborhoodComparisonGrid({ data, isLoading }: NeighborhoodComparisonGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cod");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [data, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "neighborhood_code"); }
  };

  const getCODStatus = (cod: number) => {
    if (cod <= 10) return "vei-excellent";
    if (cod <= 15) return "vei-good";
    if (cod <= 20) return "vei-caution";
    return "vei-concern";
  };

  const getPRDStatus = (prd: number) => {
    const dev = Math.abs(prd - 1);
    if (dev <= 0.03) return "vei-excellent";
    if (dev <= 0.05) return "vei-good";
    if (dev <= 0.10) return "vei-caution";
    return "vei-concern";
  };

  if (isLoading) {
    return (
      <div className="material-bento p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="material-bento p-8 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No neighborhood data available. Ensure parcels have neighborhood codes assigned.</p>
      </div>
    );
  }

  const flagged = sorted.filter(n => (n.cod ?? 0) > 15 || Math.abs((n.prd ?? 1) - 1) > 0.05);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="text-right p-2 cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </th>
  );

  // Aggregate IAAO compliance stats
  const compliant = sorted.filter(n => (n.cod ?? 0) <= 15 && Math.abs((n.prd ?? 1) - 1) <= 0.05);
  const complianceRate = sorted.length > 0 ? Math.round((compliant.length / sorted.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="material-bento rounded-lg p-6 space-y-4"
    >
      {/* IAAO Compliance Scorecard */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <div className="rounded-lg bg-[hsl(var(--tf-elevated)/0.5)] p-3 text-center">
          <div className="text-2xl font-light text-foreground">{sorted.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Neighborhoods</div>
        </div>
        <div className="rounded-lg bg-[hsl(var(--tf-elevated)/0.5)] p-3 text-center">
          <div className={`text-2xl font-light ${complianceRate >= 80 ? "text-vei-excellent" : complianceRate >= 60 ? "text-vei-caution" : "text-vei-concern"}`}>
            {complianceRate}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">IAAO Compliant</div>
        </div>
        <div className="rounded-lg bg-[hsl(var(--vei-excellent)/0.08)] p-3 text-center">
          <div className="text-2xl font-light text-vei-excellent">{compliant.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Passing</div>
        </div>
        <div className="rounded-lg bg-[hsl(var(--vei-caution)/0.08)] p-3 text-center">
          <div className="text-2xl font-light text-vei-caution">{flagged.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Flagged</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Neighborhood Comparison
          </h2>
          <p className="text-sm text-muted-foreground">
            {sorted.length} neighborhoods • {flagged.length > 0 ? (
              <span className="text-vei-caution">{flagged.length} flagged for review</span>
            ) : (
              <span className="text-vei-excellent">All within IAAO standards</span>
            )}
          </p>
        </div>
        {flagged.length > 0 && (
          <Badge className="bg-vei-caution/20 text-vei-caution">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {flagged.length} need attention
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground sticky top-0 bg-card z-10">
            <tr>
              <th className="text-left p-2 cursor-pointer" onClick={() => toggleSort("neighborhood_code")}>
                <span className="inline-flex items-center gap-1">
                  Neighborhood
                  {sortKey === "neighborhood_code" && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <SortHeader label="Sample" field="sample_size" />
              <SortHeader label="Median Ratio" field="median_ratio" />
              <SortHeader label="COD" field="cod" />
              <SortHeader label="PRD" field="prd" />
              <th className="text-center p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((n, i) => {
              const cod = n.cod ?? 0;
              const prd = n.prd ?? 1;
              const codColor = getCODStatus(cod);
              const prdColor = getPRDStatus(prd);
              const isOk = cod <= 15 && Math.abs(prd - 1) <= 0.05;

              return (
                <tr key={n.neighborhood_code} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium">{n.neighborhood_code}</td>
                  <td className="p-2 text-right">{n.sample_size}</td>
                  <td className="p-2 text-right font-mono">{(n.median_ratio ?? 0).toFixed(3)}</td>
                  <td className={`p-2 text-right font-mono text-${codColor}`}>{cod.toFixed(1)}%</td>
                  <td className={`p-2 text-right font-mono text-${prdColor}`}>{prd.toFixed(3)}</td>
                  <td className="p-2 text-center">
                    {isOk ? (
                      <CheckCircle className="w-4 h-4 text-vei-excellent inline" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-vei-caution inline" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
