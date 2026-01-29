import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Database,
  Home,
  Calendar,
  Ruler,
  DollarSign,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

// All 39 Washington State counties
const WA_COUNTIES = [
  "Adams", "Asotin", "Benton", "Chelan", "Clallam", "Clark", "Columbia", "Cowlitz",
  "Douglas", "Ferry", "Franklin", "Garfield", "Grant", "Grays Harbor", "Island",
  "Jefferson", "King", "Kitsap", "Kittitas", "Klickitat", "Lewis", "Lincoln",
  "Mason", "Okanogan", "Pacific", "Pend Oreille", "Pierce", "San Juan", "Skagit",
  "Skamania", "Snohomish", "Spokane", "Stevens", "Thurston", "Wahkiakum",
  "Walla Walla", "Whatcom", "Whitman", "Yakima",
];

interface CountyStats {
  county: string;
  totalParcels: number;
  hasAssessedValue: number;
  hasBuildingArea: number;
  hasYearBuilt: number;
  hasBedrooms: number;
  hasBathrooms: number;
  hasCoordinates: number;
  hasNeighborhood: number;
  overallCompleteness: number;
}

interface FieldCompleteness {
  field: string;
  label: string;
  icon: React.ReactNode;
  filled: number;
  total: number;
  percentage: number;
}

function getQualityColor(percentage: number): string {
  if (percentage >= 80) return "text-tf-optimized-green";
  if (percentage >= 50) return "text-tf-sacred-gold";
  return "text-destructive";
}

function getQualityBadge(percentage: number): { label: string; className: string } {
  if (percentage >= 80) return { label: "Good", className: "bg-tf-optimized-green/20 text-tf-optimized-green border-tf-optimized-green/30" };
  if (percentage >= 50) return { label: "Fair", className: "bg-tf-sacred-gold/20 text-tf-sacred-gold border-tf-sacred-gold/30" };
  return { label: "Poor", className: "bg-destructive/20 text-destructive border-destructive/30" };
}

function getQualityIcon(percentage: number): React.ReactNode {
  if (percentage >= 80) return <CheckCircle className="w-4 h-4 text-tf-optimized-green" />;
  if (percentage >= 50) return <AlertTriangle className="w-4 h-4 text-tf-sacred-gold" />;
  return <XCircle className="w-4 h-4 text-destructive" />;
}

export function CountyDataQualityReport() {
  // Fetch aggregated parcel stats
  const { data: parcelStats, isLoading } = useQuery({
    queryKey: ["county-data-quality"],
    queryFn: async () => {
      // Get all parcels with their data completeness
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("city, state, assessed_value, building_area, year_built, bedrooms, bathrooms, latitude, longitude, neighborhood_code");

      if (error) throw error;
      return parcels || [];
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Compute county-level statistics
  const countyStats = useMemo(() => {
    if (!parcelStats) return [];

    // Group parcels by city (we'll use city as proxy for county since we don't have county field)
    const cityGroups: Record<string, typeof parcelStats> = {};
    parcelStats.forEach((p) => {
      const city = p.city || "Unknown";
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(p);
    });

    // For demo purposes, map cities to counties or show cities
    // In production, you'd have a proper county field
    const stats: CountyStats[] = Object.entries(cityGroups).map(([city, parcels]) => {
      const total = parcels.length;
      return {
        county: city,
        totalParcels: total,
        hasAssessedValue: parcels.filter((p) => p.assessed_value && p.assessed_value > 0).length,
        hasBuildingArea: parcels.filter((p) => p.building_area && p.building_area > 0).length,
        hasYearBuilt: parcels.filter((p) => p.year_built && p.year_built > 0).length,
        hasBedrooms: parcels.filter((p) => p.bedrooms && p.bedrooms > 0).length,
        hasBathrooms: parcels.filter((p) => p.bathrooms && p.bathrooms > 0).length,
        hasCoordinates: parcels.filter((p) => p.latitude && p.longitude).length,
        hasNeighborhood: parcels.filter((p) => p.neighborhood_code).length,
        overallCompleteness: 0,
      };
    });

    // Calculate overall completeness (average of all fields)
    stats.forEach((s) => {
      if (s.totalParcels === 0) {
        s.overallCompleteness = 0;
      } else {
        const fields = [
          s.hasAssessedValue,
          s.hasBuildingArea,
          s.hasYearBuilt,
          s.hasBedrooms,
          s.hasBathrooms,
          s.hasCoordinates,
          s.hasNeighborhood,
        ];
        s.overallCompleteness = Math.round(
          (fields.reduce((sum, f) => sum + (f / s.totalParcels) * 100, 0) / fields.length)
        );
      }
    });

    return stats.sort((a, b) => b.totalParcels - a.totalParcels);
  }, [parcelStats]);

  // Compute overall field completeness across all parcels
  const fieldCompleteness = useMemo((): FieldCompleteness[] => {
    if (!parcelStats || parcelStats.length === 0) return [];

    const total = parcelStats.length;
    const fields = [
      {
        field: "assessed_value",
        label: "Assessed Value",
        icon: <DollarSign className="w-4 h-4" />,
        filled: parcelStats.filter((p) => p.assessed_value && p.assessed_value > 0).length,
      },
      {
        field: "building_area",
        label: "Building Area",
        icon: <Ruler className="w-4 h-4" />,
        filled: parcelStats.filter((p) => p.building_area && p.building_area > 0).length,
      },
      {
        field: "year_built",
        label: "Year Built",
        icon: <Calendar className="w-4 h-4" />,
        filled: parcelStats.filter((p) => p.year_built && p.year_built > 0).length,
      },
      {
        field: "bedrooms",
        label: "Bedrooms",
        icon: <Home className="w-4 h-4" />,
        filled: parcelStats.filter((p) => p.bedrooms && p.bedrooms > 0).length,
      },
      {
        field: "coordinates",
        label: "Coordinates",
        icon: <MapPin className="w-4 h-4" />,
        filled: parcelStats.filter((p) => p.latitude && p.longitude).length,
      },
      {
        field: "neighborhood",
        label: "Neighborhood",
        icon: <Database className="w-4 h-4" />,
        filled: parcelStats.filter((p) => p.neighborhood_code).length,
      },
    ];

    return fields.map((f) => ({
      ...f,
      total,
      percentage: total > 0 ? Math.round((f.filled / total) * 100) : 0,
    }));
  }, [parcelStats]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalParcels = parcelStats?.length || 0;
    const avgCompleteness = countyStats.length > 0
      ? Math.round(countyStats.reduce((sum, s) => sum + s.overallCompleteness, 0) / countyStats.length)
      : 0;
    const goodQualityCount = countyStats.filter((s) => s.overallCompleteness >= 80).length;
    const needsAttentionCount = countyStats.filter((s) => s.overallCompleteness < 50).length;

    return { totalParcels, avgCompleteness, goodQualityCount, needsAttentionCount };
  }, [parcelStats, countyStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-tf-elevated border-tf-border">
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-tf-elevated border-tf-border">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Database className="w-4 h-4" />
              Total Parcels
            </div>
            <div className="text-2xl font-light text-foreground">
              {overallStats.totalParcels.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-4 h-4" />
              Avg Completeness
            </div>
            <div className={`text-2xl font-light ${getQualityColor(overallStats.avgCompleteness)}`}>
              {overallStats.avgCompleteness}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CheckCircle className="w-4 h-4" />
              Good Quality
            </div>
            <div className="text-2xl font-light text-tf-optimized-green">
              {overallStats.goodQualityCount} areas
            </div>
          </CardContent>
        </Card>
        <Card className="bg-tf-elevated border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="w-4 h-4" />
              Needs Attention
            </div>
            <div className="text-2xl font-light text-destructive">
              {overallStats.needsAttentionCount} areas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Field Completeness Overview */}
      <Card className="bg-tf-elevated border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tf-cyan" />
            Field Completeness Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fieldCompleteness.map((field) => (
              <motion.div
                key={field.field}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg bg-tf-substrate"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {field.icon}
                    {field.label}
                  </div>
                  {getQualityIcon(field.percentage)}
                </div>
                <div className={`text-2xl font-light ${getQualityColor(field.percentage)}`}>
                  {field.percentage}%
                </div>
                <Progress value={field.percentage} className="h-1.5 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {field.filled.toLocaleString()} / {field.total.toLocaleString()} parcels
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* County/Area Breakdown */}
      <Card className="bg-tf-elevated border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tf-cyan" />
            Data Quality by Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          {countyStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No parcel data available</p>
              <p className="text-xs">Import parcels or run a statewide scrape to see quality metrics</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {countyStats.map((county, idx) => {
                  const quality = getQualityBadge(county.overallCompleteness);
                  return (
                    <motion.div
                      key={county.county}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-tf-cyan/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-tf-cyan" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{county.county}</span>
                            <Badge variant="outline" className="text-xs">
                              {county.totalParcels.toLocaleString()} parcels
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <Progress
                              value={county.overallCompleteness}
                              className="h-1.5 flex-1 max-w-[200px]"
                            />
                            <span className={`text-sm font-medium ${getQualityColor(county.overallCompleteness)}`}>
                              {county.overallCompleteness}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="text-center">
                          <div className="font-medium text-foreground">
                            {Math.round((county.hasAssessedValue / county.totalParcels) * 100) || 0}%
                          </div>
                          <div>Value</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-foreground">
                            {Math.round((county.hasBuildingArea / county.totalParcels) * 100) || 0}%
                          </div>
                          <div>Area</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-foreground">
                            {Math.round((county.hasCoordinates / county.totalParcels) * 100) || 0}%
                          </div>
                          <div>Coords</div>
                        </div>
                        <Badge className={quality.className}>{quality.label}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Washington Counties Reference (for when data is sparse) */}
      {countyStats.length < 10 && (
        <Card className="bg-tf-elevated border-tf-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Washington State Counties ({WA_COUNTIES.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {WA_COUNTIES.map((county) => {
                const hasData = countyStats.some(
                  (s) => s.county.toLowerCase().includes(county.toLowerCase())
                );
                return (
                  <Badge
                    key={county}
                    variant="outline"
                    className={hasData ? "bg-tf-cyan/10 border-tf-cyan/30" : "opacity-50"}
                  >
                    {county}
                    {hasData && <CheckCircle className="w-3 h-3 ml-1 text-tf-cyan" />}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
