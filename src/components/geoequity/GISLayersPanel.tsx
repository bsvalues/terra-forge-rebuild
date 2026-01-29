import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  MapPin,
  Box,
  Minus,
  Hexagon,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { GISLayer } from "@/hooks/useGISData";

interface GISLayersPanelProps {
  layers: GISLayer[];
  isLoading: boolean;
}

export function GISLayersPanel({ layers, isLoading }: GISLayersPanelProps) {
  const getLayerIcon = (type: string) => {
    switch (type) {
      case "point":
        return <MapPin className="w-4 h-4" />;
      case "line":
        return <Minus className="w-4 h-4" />;
      case "polygon":
      case "parcel":
        return <Hexagon className="w-4 h-4" />;
      case "boundary":
        return <Box className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getFormatBadge = (format: string | null) => {
    if (!format) return null;
    const colors: Record<string, string> = {
      shapefile: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      geojson: "bg-green-500/20 text-green-400 border-green-500/30",
      csv: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      kml: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      gdb: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    return (
      <Badge variant="outline" className={colors[format] || ""}>
        {format.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-tf-cyan animate-spin" />
        <p className="text-muted-foreground">Loading layers...</p>
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <div className="glass-card rounded-lg p-12 text-center">
        <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No GIS layers imported</p>
        <p className="text-xs text-muted-foreground mt-2">
          Import shapefiles, GeoJSON, or connect to ArcGIS to add layers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Layer List */}
      <div className="grid gap-3">
        {layers.map((layer, index) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-tf-sacred-gold/20 text-tf-sacred-gold">
                  {getLayerIcon(layer.layer_type)}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{layer.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {layer.feature_count.toLocaleString()} features
                    </span>
                    <span className="text-xs text-muted-foreground">
                      SRID: {layer.srid}
                    </span>
                    {getFormatBadge(layer.file_format)}
                    <Badge variant="outline" className="capitalize">
                      {layer.layer_type}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bounds info */}
            {layer.bounds && (
              <div className="mt-3 pt-3 border-t border-tf-border text-xs text-muted-foreground">
                <span>Bounds: </span>
                <span className="font-mono">
                  [{layer.bounds.minLng?.toFixed(4)}, {layer.bounds.minLat?.toFixed(4)}] →
                  [{layer.bounds.maxLng?.toFixed(4)}, {layer.bounds.maxLat?.toFixed(4)}]
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="glass-card rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Layer Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Total Layers</div>
            <div className="font-medium">{layers.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Total Features</div>
            <div className="font-medium">
              {layers.reduce((a, l) => a + l.feature_count, 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Parcel Layers</div>
            <div className="font-medium">
              {layers.filter((l) => l.layer_type === "parcel").length}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Boundary Layers</div>
            <div className="font-medium">
              {layers.filter((l) => l.layer_type === "boundary").length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
