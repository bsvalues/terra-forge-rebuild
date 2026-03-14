// TerraFusion OS — Data Quality Scoring Engine Dashboard
// Agent Factory: "The grades are letters and the letters are my friends" 🅰️📎

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, AlertTriangle, Clock, MapPin, BarChart3,
  Loader2, Target, TrendingDown, Zap, FileWarning,
} from "lucide-react";
import { useDataQualityScoring, type NeighborhoodQuality, type StaleAlert, type ParcelScore } from "@/hooks/useDataQualityScoring";
import { cn } from "@/lib/utils";
import { ScopeHeader, ProvenanceBadge, ProvenanceNumber } from "@/components/trust";

// ── Grade Config ───────────────────────────────────────────────

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  A: { color: "text-tf-green", bg: "bg-tf-green/15", border: "border-tf-green/30" },
  B: { color: "text-tf-cyan", bg: "bg-tf-cyan/15", border: "border-tf-cyan/30" },
  C: { color: "text-amber-400", bg: "bg-amber-400/15", border: "border-amber-400/30" },
  D: { color: "text-orange-400", bg: "bg-orange-400/15", border: "border-orange-400/30" },
  F: { color: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/30" },
};

function GradeBadge({ grade, size = "sm" }: { grade: string; size?: "sm" | "lg" }) {
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.F;
  return (
    <span className={cn(
      "inline-flex items-center justify-center font-bold rounded-lg",
      cfg.bg, cfg.color, cfg.border, "border",
      size === "lg" ? "w-14 h-14 text-2xl" : "w-8 h-8 text-sm"
    )}>
      {grade}
    </span>
  );
}

// ── Grade Distribution Bar ─────────────────────────────────────

function GradeDistribution({ dist, total }: { dist: Record<string, number>; total: number }) {
  const grades = ["A", "B", "C", "D", "F"] as const;
  return (
    <div className="space-y-2">
      {grades.map((g) => {
        const pct = total > 0 ? Math.round((dist[g] / total) * 100) : 0;
        const cfg = GRADE_CONFIG[g];
        return (
          <div key={g} className="flex items-center gap-3">
            <GradeBadge grade={g} />
            <div className="flex-1">
              <Progress value={pct} className="h-2" />
            </div>
            <span className={cn("text-sm font-mono w-16 text-right", cfg.color)}>
              {dist[g].toLocaleString()} <span className="text-muted-foreground text-xs">({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Field Coverage Table ───────────────────────────────────────

function FieldCoverageTable({ fields }: { fields: { field: string; label: string; weight: number; coveragePct: number }[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead className="text-center">Weight</TableHead>
          <TableHead>Coverage</TableHead>
          <TableHead className="text-right">%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.sort((a, b) => a.coveragePct - b.coveragePct).map((f) => {
          const color = f.coveragePct >= 80 ? "text-tf-green" : f.coveragePct >= 50 ? "text-amber-400" : "text-destructive";
          return (
            <TableRow key={f.field}>
              <TableCell className="font-medium">{f.label}</TableCell>
              <TableCell className="text-center text-muted-foreground">{f.weight}</TableCell>
              <TableCell><Progress value={f.coveragePct} className="h-1.5 w-24" /></TableCell>
              <TableCell className={cn("text-right font-mono", color)}>{f.coveragePct}%</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Neighborhood Heatmap ───────────────────────────────────────

function NeighborhoodHeatmap({ neighborhoods }: { neighborhoods: NeighborhoodQuality[] }) {
  if (neighborhoods.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No neighborhood data available</p>;
  }

  return (
    <div className="space-y-4">
      {/* Visual heatmap grid */}
      <div className="flex flex-wrap gap-2">
        {neighborhoods.map((n) => {
          const cfg = GRADE_CONFIG[n.grade];
          return (
            <div
              key={n.code}
              className={cn(
                "rounded-lg border px-3 py-2 text-center transition-all hover:scale-105 cursor-default min-w-[80px]",
                cfg.bg, cfg.border
              )}
              title={`${n.code}: ${n.avgScore}% avg score, ${n.parcelCount} parcels`}
            >
              <div className={cn("text-xs font-mono font-bold", cfg.color)}>{n.code}</div>
              <div className={cn("text-lg font-light", cfg.color)}>{n.avgScore}</div>
              <div className="text-[10px] text-muted-foreground">{n.parcelCount} parcels</div>
            </div>
          );
        })}
      </div>

      {/* Detailed table */}
      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Neighborhood</TableHead>
              <TableHead className="text-center">Grade</TableHead>
              <TableHead className="text-right">Avg Score</TableHead>
              <TableHead className="text-right">Parcels</TableHead>
              <TableHead className="text-right">Complete</TableHead>
              <TableHead className="text-right">Stale</TableHead>
              <TableHead>Worst Gaps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {neighborhoods.map((n) => (
              <TableRow key={n.code}>
                <TableCell className="font-mono font-medium">{n.code}</TableCell>
                <TableCell className="text-center"><GradeBadge grade={n.grade} /></TableCell>
                <TableCell className={cn("text-right font-mono", GRADE_CONFIG[n.grade].color)}>{n.avgScore}%</TableCell>
                <TableCell className="text-right">{n.parcelCount}</TableCell>
                <TableCell className="text-right text-tf-green">{n.completeParcels}</TableCell>
                <TableCell className="text-right">{n.staleParcels > 0 ? <span className="text-amber-400">{n.staleParcels}</span> : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {n.worstFields.map((f) => (
                      <Badge key={f.field} variant="outline" className="text-[10px] py-0">
                        {f.field.replace("_", " ")} {f.missingPct}%
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ── Stale Data Alerts ──────────────────────────────────────────

function StaleDataAlerts({ alerts }: { alerts: StaleAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>All parcels are up to date</p>
      </div>
    );
  }

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Critical ({critical.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-sm text-muted-foreground">Warning ({warning.length})</span>
        </div>
      </div>
      <ScrollArea className="h-[350px]">
        <div className="space-y-2">
          {alerts.slice(0, 30).map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                a.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-amber-400/30 bg-amber-400/5"
              )}
            >
              {a.severity === "critical"
                ? <FileWarning className="w-4 h-4 text-destructive shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.address}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-mono">{a.parcelNumber}</span>
                  {a.neighborhoodCode && <span>• {a.neighborhoodCode}</span>}
                </div>
              </div>
              <span className={cn(
                "text-xs font-medium shrink-0",
                a.severity === "critical" ? "text-destructive" : "text-amber-400"
              )}>
                {a.daysSinceUpdate}d ago
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Lowest Score Parcels ───────────────────────────────────────

function LowestScoreParcels({ parcels }: { parcels: ParcelScore[] }) {
  return (
    <ScrollArea className="h-[350px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parcel</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Missing Fields</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcels.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="text-sm font-medium truncate max-w-[200px]">{p.address}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.parcelNumber}</div>
              </TableCell>
              <TableCell className="text-center"><GradeBadge grade={p.grade} /></TableCell>
              <TableCell className={cn("text-right font-mono", GRADE_CONFIG[p.grade].color)}>{p.score}%</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap max-w-[250px]">
                  {p.missingFields.slice(0, 4).map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] py-0 text-destructive border-destructive/30">
                      {f.replace("_", " ")}
                    </Badge>
                  ))}
                  {p.missingFields.length > 4 && (
                    <Badge variant="outline" className="text-[10px] py-0">+{p.missingFields.length - 4}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {p.isStale ? <span className="text-amber-400">{p.daysSinceUpdate}d</span> : `${p.daysSinceUpdate}d`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────

export function DataQualityScoringEngine() {
  const { data, isLoading } = useDataQualityScoring();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-tf-cyan" />
      </div>
    );
  }

  if (!data || data.totalParcels === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No parcel data to score</p>
      </div>
    );
  }

  const cfg = GRADE_CONFIG[data.overallGrade];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-tf-cyan" />
            Data Quality Scoring Engine
          </h3>
          <p className="text-sm text-muted-foreground">
            Weighted completeness scoring across {data.totalParcels.toLocaleString()} parcels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeHeader scope="county" label="Benton" source="data-quality" status="published" />
          <ProvenanceBadge source="data-quality" />
        </div>
      </div>

      {/* Overall Score Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-xl p-6 border-2", cfg.border, cfg.bg)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <GradeBadge grade={data.overallGrade} size="lg" />
            <div>
              <div className="text-lg font-medium text-foreground">
                Overall Quality: Grade {data.overallGrade}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.avgScore >= 80 ? "Excellent data coverage — valuation-ready." :
                 data.avgScore >= 60 ? "Good coverage with some gaps to address." :
                 data.avgScore >= 40 ? "Moderate gaps — prioritize enrichment campaigns." :
                 "Significant data gaps — immediate enrichment required."}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-4xl font-light", cfg.color)}>{data.avgScore}%</div>
            <div className="text-xs text-muted-foreground">weighted avg</div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="material-bento border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="w-4 h-4" /> Total Parcels
            </div>
            <div className="text-2xl font-light">{data.totalParcels.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Zap className="w-4 h-4" /> Perfect Score (A)
            </div>
            <div className="text-2xl font-light text-tf-green">{data.gradeDistribution.A.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingDown className="w-4 h-4" /> Failing (F)
            </div>
            <div className="text-2xl font-light text-destructive">{data.gradeDistribution.F.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="w-4 h-4" /> Stale Alerts
            </div>
            <div className="text-2xl font-light text-amber-400">{data.staleAlerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="heatmap" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-xl">
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="stale">Stale</TabsTrigger>
          <TabsTrigger value="worst">Worst</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap">
          <Card className="material-bento border-tf-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-tf-cyan" />
                Neighborhood Quality Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NeighborhoodHeatmap neighborhoods={data.neighborhoodQuality} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card className="material-bento border-tf-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-tf-cyan" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GradeDistribution dist={data.gradeDistribution} total={data.totalParcels} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields">
          <Card className="material-bento border-tf-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-tf-cyan" />
                Weighted Field Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldCoverageTable fields={data.fieldCoverage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stale">
          <Card className="material-bento border-tf-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Stale Data Alerts
                {data.staleAlerts.length > 0 && (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                    {data.staleAlerts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StaleDataAlerts alerts={data.staleAlerts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worst">
          <Card className="material-bento border-tf-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Lowest Scoring Parcels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LowestScoreParcels parcels={data.lowestScoreParcels} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
