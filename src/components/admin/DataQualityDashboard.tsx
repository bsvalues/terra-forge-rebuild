import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Database,
  MapPin,
  Building2,
  Calendar,
  Bed,
  Bath,
  Ruler,
  Tag,
  Map,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataQuality, FieldCompleteness, CityMetrics } from "@/hooks/useDataQuality";
import { cn } from "@/lib/utils";

const QUALITY_CONFIG = {
  good: {
    color: "text-tf-green",
    bg: "bg-tf-green/20",
    border: "border-tf-green/30",
    label: "Good",
    icon: CheckCircle,
  },
  fair: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    label: "Fair",
    icon: AlertTriangle,
  },
  poor: {
    color: "text-destructive",
    bg: "bg-destructive/20",
    border: "border-destructive/30",
    label: "Poor",
    icon: XCircle,
  },
};

const FIELD_ICONS: Record<string, typeof Database> = {
  assessed_value: Database,
  building_area: Ruler,
  year_built: Calendar,
  bedrooms: Bed,
  bathrooms: Bath,
  coordinates: MapPin,
  land_area: Map,
  property_class: Tag,
  neighborhood_code: Building2,
};

function QualityBadge({ quality }: { quality: "good" | "fair" | "poor" }) {
  const config = QUALITY_CONFIG[quality];
  const Icon = config.icon;
  return (
    <Badge className={cn(config.bg, config.color, config.border, "gap-1")}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function FieldCompletenessCard({ field }: { field: FieldCompleteness }) {
  const Icon = FIELD_ICONS[field.field] || Database;
  const config = QUALITY_CONFIG[field.quality];

  return (
    <div className="p-4 rounded-xl bg-tf-substrate border border-tf-border hover:border-tf-cyan/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-4 h-4", config.color)} />
          </div>
          <span className="font-medium text-sm">{field.label}</span>
        </div>
        <span className={cn("text-lg font-light", config.color)}>{field.percentage}%</span>
      </div>
      <Progress value={field.percentage} className="h-1.5" />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{field.complete.toLocaleString()} complete</span>
        <span>{(field.total - field.complete).toLocaleString()} missing</span>
      </div>
    </div>
  );
}

function CityRow({ city }: { city: CityMetrics }) {
  const config = QUALITY_CONFIG[city.quality];

  return (
    <TableRow className="hover:bg-tf-substrate/50">
      <TableCell>
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{city.city}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">{city.parcelCount.toLocaleString()}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={city.avgCompleteness} className="h-1.5 w-20" />
          <span className={cn("text-sm font-medium", config.color)}>{city.avgCompleteness}%</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <QualityBadge quality={city.quality} />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[250px]">
              <div className="text-xs space-y-1">
                <p className="font-medium mb-2">Field Coverage</p>
                <div className="grid grid-cols-2 gap-1">
                  <span>Building Area:</span><span>{city.fields.building_area}%</span>
                  <span>Year Built:</span><span>{city.fields.year_built}%</span>
                  <span>Bedrooms:</span><span>{city.fields.bedrooms}%</span>
                  <span>Coordinates:</span><span>{city.fields.coordinates}%</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}

export function DataQualityDashboard() {
  const { data: metrics, isLoading, refetch, isRefetching } = useDataQuality();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-tf-cyan" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Unable to load data quality metrics</p>
      </div>
    );
  }

  const overallConfig = QUALITY_CONFIG[metrics.overallQuality];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-tf-cyan" />
            Data Quality Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Coverage and completeness metrics across {metrics.totalParcels.toLocaleString()} parcels
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Database className="w-4 h-4" />
              Total Parcels
            </div>
            <div className="text-2xl font-light text-foreground">
              {metrics.totalParcels.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-4 h-4" />
              Total Sales
            </div>
            <div className="text-2xl font-light text-tf-gold">
              {metrics.totalSales.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <overallConfig.icon className="w-4 h-4" />
              Overall Completeness
            </div>
            <div className={cn("text-2xl font-light", overallConfig.color)}>
              {metrics.overallCompleteness}%
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-tf-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Calendar className="w-4 h-4" />
              Updated (7 days)
            </div>
            <div className="text-2xl font-light text-tf-cyan">
              {metrics.recentUpdates.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Quality Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "glass-card rounded-xl p-5 border-2",
          overallConfig.border,
          overallConfig.bg
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", overallConfig.bg)}>
              <overallConfig.icon className={cn("w-7 h-7", overallConfig.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg text-foreground">
                  Overall Data Quality: {overallConfig.label}
                </span>
                <QualityBadge quality={metrics.overallQuality} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {metrics.overallCompleteness >= 80
                  ? "Your data is well-populated across most fields."
                  : metrics.overallCompleteness >= 50
                  ? "Some fields need enrichment. Consider running data collection jobs."
                  : "Significant data gaps exist. Run statewide scrape to improve coverage."}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-4xl font-light", overallConfig.color)}>
              {metrics.overallCompleteness}%
            </div>
            <div className="text-xs text-muted-foreground">average completeness</div>
          </div>
        </div>
      </motion.div>

      {/* Field Completeness Grid */}
      <Card className="glass-card border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="w-4 h-4 text-tf-cyan" />
            Field Completeness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.fieldCompleteness.map((field) => (
              <FieldCompletenessCard key={field.field} field={field} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* City/Location Breakdown */}
      <Card className="glass-card border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tf-cyan" />
            Coverage by City
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.cityMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No city data available</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Parcels</TableHead>
                    <TableHead>Completeness</TableHead>
                    <TableHead className="text-center">Quality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.cityMetrics.slice(0, 25).map((city) => (
                    <CityRow key={city.city} city={city} />
                  ))}
                </TableBody>
              </Table>
              {metrics.cityMetrics.length > 25 && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Showing top 25 of {metrics.cityMetrics.length} cities
                </p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
