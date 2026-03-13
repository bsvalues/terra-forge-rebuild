import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, CheckCircle, AlertTriangle, XCircle,
  TrendingUp, Database, Home, Calendar, Ruler, DollarSign,
} from "lucide-react";
import { useDataQualityStats, useNeighborhoodDataQuality } from "@/hooks/useDataQualityStats";
import { Skeleton } from "@/components/ui/skeleton";

function getQualityColor(pct: number) {
  if (pct >= 80) return "text-tf-optimized-green";
  if (pct >= 50) return "text-tf-sacred-gold";
  return "text-destructive";
}

function getQualityBadge(pct: number) {
  if (pct >= 80) return { label: "Good", className: "bg-tf-optimized-green/20 text-tf-optimized-green border-tf-optimized-green/30" };
  if (pct >= 50) return { label: "Fair", className: "bg-tf-sacred-gold/20 text-tf-sacred-gold border-tf-sacred-gold/30" };
  return { label: "Poor", className: "bg-destructive/20 text-destructive border-destructive/30" };
}

function getQualityIcon(pct: number) {
  if (pct >= 80) return <CheckCircle className="w-4 h-4 text-tf-optimized-green" />;
  if (pct >= 50) return <AlertTriangle className="w-4 h-4 text-tf-sacred-gold" />;
  return <XCircle className="w-4 h-4 text-destructive" />;
}

export function CountyDataQualityReport() {
  const { data: stats, isLoading: statsLoading } = useDataQualityStats();
  const { data: neighborhoods = [], isLoading: nbhdLoading } = useNeighborhoodDataQuality();
  const isLoading = statsLoading || nbhdLoading;

  const fields = useMemo(() => {
    if (!stats || stats.total_parcels === 0) return [];
    const t = stats.total_parcels;
    return [
      { field: "assessed_value", label: "Assessed Value", icon: <DollarSign className="w-4 h-4" />, filled: stats.has_assessed_value, total: t, percentage: Math.round((stats.has_assessed_value / t) * 100) },
      { field: "building_area", label: "Building Area", icon: <Ruler className="w-4 h-4" />, filled: stats.has_building_area, total: t, percentage: Math.round((stats.has_building_area / t) * 100) },
      { field: "year_built", label: "Year Built", icon: <Calendar className="w-4 h-4" />, filled: stats.has_year_built, total: t, percentage: Math.round((stats.has_year_built / t) * 100) },
      { field: "bedrooms", label: "Bedrooms", icon: <Home className="w-4 h-4" />, filled: stats.has_bedrooms, total: t, percentage: Math.round((stats.has_bedrooms / t) * 100) },
      { field: "coordinates", label: "Coordinates", icon: <MapPin className="w-4 h-4" />, filled: stats.has_coordinates, total: t, percentage: Math.round((stats.has_coordinates / t) * 100) },
      { field: "neighborhood", label: "Neighborhood", icon: <Database className="w-4 h-4" />, filled: stats.has_neighborhood, total: t, percentage: Math.round((stats.has_neighborhood / t) * 100) },
    ];
  }, [stats]);

  const overallPct = useMemo(() => {
    if (!fields.length) return 0;
    return Math.round(fields.reduce((s, f) => s + f.percentage, 0) / fields.length);
  }, [fields]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-tf-elevated border-tf-border"><CardContent className="pt-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const goodCount = neighborhoods.filter((n) => n.overall_pct >= 80).length;
  const poorCount = neighborhoods.filter((n) => n.overall_pct < 50).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Database className="w-4 h-4" />Total Parcels</div>
            <div className="text-2xl font-light text-foreground">{(stats?.total_parcels ?? 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="w-4 h-4" />Avg Completeness</div>
            <div className={`text-2xl font-light ${getQualityColor(overallPct)}`}>{overallPct}%</div>
          </CardContent>
        </Card>
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle className="w-4 h-4" />Good Quality</div>
            <div className="text-2xl font-light text-tf-optimized-green">{goodCount} areas</div>
          </CardContent>
        </Card>
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="w-4 h-4" />Needs Attention</div>
            <div className="text-2xl font-light text-destructive">{poorCount} areas</div>
          </CardContent>
        </Card>
      </div>

      {/* Field Completeness */}
      <Card className="bg-tf-elevated border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-tf-cyan" />Field Completeness Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fields.map((f) => (
              <motion.div key={f.field} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-lg bg-tf-substrate">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">{f.icon}{f.label}</div>
                  {getQualityIcon(f.percentage)}
                </div>
                <div className={`text-2xl font-light ${getQualityColor(f.percentage)}`}>{f.percentage}%</div>
                <Progress value={f.percentage} className="h-1.5 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">{f.filled.toLocaleString()} / {f.total.toLocaleString()} parcels</div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Neighborhood Breakdown */}
      <Card className="bg-tf-elevated border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-tf-cyan" />Data Quality by Neighborhood</CardTitle>
        </CardHeader>
        <CardContent>
          {neighborhoods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No parcel data available</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {neighborhoods.map((nbhd, idx) => {
                  const q = getQualityBadge(nbhd.overall_pct);
                  const t = nbhd.total_parcels;
                  return (
                    <motion.div key={nbhd.neighborhood_code} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-tf-cyan/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-tf-cyan" /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{nbhd.neighborhood_code}</span>
                            <Badge variant="outline" className="text-xs">{t.toLocaleString()} parcels</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <Progress value={nbhd.overall_pct} className="h-1.5 flex-1 max-w-[200px]" />
                            <span className={`text-sm font-medium ${getQualityColor(nbhd.overall_pct)}`}>{nbhd.overall_pct}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="text-center"><div className="font-medium text-foreground">{t > 0 ? Math.round((nbhd.has_assessed_value / t) * 100) : 0}%</div><div>Value</div></div>
                        <div className="text-center"><div className="font-medium text-foreground">{t > 0 ? Math.round((nbhd.has_building_area / t) * 100) : 0}%</div><div>Area</div></div>
                        <div className="text-center"><div className="font-medium text-foreground">{t > 0 ? Math.round((nbhd.has_coordinates / t) * 100) : 0}%</div><div>Coords</div></div>
                        <Badge className={q.className}>{q.label}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
