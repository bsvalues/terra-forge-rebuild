import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, MapPin, Home, Calendar, DollarSign, TrendingUp, Layers } from "lucide-react";
import type { ParcelValuation, ValuationSegment, FeatureContribution } from "@/hooks/useValuationAnatomy";

interface ValuationDetailsPanelProps {
  item: ParcelValuation | ValuationSegment | null;
  onClose: () => void;
  onDrillDown: () => void;
}

function isParcel(item: ParcelValuation | ValuationSegment): item is ParcelValuation {
  return "parcelNumber" in item;
}

export function ValuationDetailsPanel({ item, onClose, onDrillDown }: ValuationDetailsPanelProps) {
  if (!item) {
    return (
      <Card className="glass-card h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select a parcel or segment</p>
            <p className="text-xs mt-1">to view valuation anatomy</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const parcel = isParcel(item) ? item : null;
  const segment = !isParcel(item) ? item : null;
  const features = item.features || [];

  return (
    <Card className="glass-card h-full overflow-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {parcel ? <Home className="w-4 h-4 text-tf-cyan" /> : <MapPin className="w-4 h-4 text-tf-sacred-gold" />}
              {parcel ? parcel.parcelNumber : segment?.name}
            </CardTitle>
            {parcel && (
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                {parcel.address}
              </p>
            )}
            {segment && (
              <p className="text-xs text-muted-foreground mt-1">
                {segment.count} parcels • {segment.type}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Value Summary */}
        <div className="p-3 rounded-lg bg-tf-elevated/50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {parcel ? "Assessed Value" : "Avg Value"}
            </span>
            <span className="text-lg font-light text-tf-cyan">
              ${(parcel?.assessedValue || segment?.avgValue || 0).toLocaleString()}
            </span>
          </div>
          
          {parcel && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Land Value</span>
                <span>${parcel.landValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Improvement</span>
                <span>${parcel.improvementValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">A/S Ratio</span>
                <Badge 
                  className={`text-xs ${
                    Math.abs(parcel.ratio - 1) < 0.03 
                      ? 'bg-tf-optimized-green/20 text-tf-optimized-green'
                      : Math.abs(parcel.ratio - 1) < 0.07
                        ? 'bg-tf-caution-amber/20 text-tf-caution-amber'
                        : 'bg-tf-alert-red/20 text-tf-alert-red'
                  }`}
                >
                  {parcel.ratio.toFixed(3)}
                </Badge>
              </div>
            </>
          )}

          {segment && (
            <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
              <span className="text-muted-foreground">Avg Ratio</span>
              <Badge 
                className={`text-xs ${
                  Math.abs(segment.avgRatio - 1) < 0.03 
                    ? 'bg-tf-optimized-green/20 text-tf-optimized-green'
                    : 'bg-tf-caution-amber/20 text-tf-caution-amber'
                }`}
              >
                {segment.avgRatio.toFixed(3)}
              </Badge>
            </div>
          )}
        </div>

        {/* Property Details */}
        {parcel && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-tf-base/50">
              <span className="text-muted-foreground block">Neighborhood</span>
              <span className="font-medium">{parcel.neighborhood}</span>
            </div>
            <div className="p-2 rounded bg-tf-base/50">
              <span className="text-muted-foreground block">Class</span>
              <span className="font-medium">{parcel.propertyClass}</span>
            </div>
            {parcel.yearBuilt && (
              <div className="p-2 rounded bg-tf-base/50">
                <span className="text-muted-foreground block">Year Built</span>
                <span className="font-medium">{parcel.yearBuilt}</span>
              </div>
            )}
            {parcel.buildingArea && (
              <div className="p-2 rounded bg-tf-base/50">
                <span className="text-muted-foreground block">Living Area</span>
                <span className="font-medium">{parcel.buildingArea.toLocaleString()} sf</span>
              </div>
            )}
          </div>
        )}

        {/* Feature Contributions */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            Value Drivers
          </h4>
          <div className="space-y-3">
            {features.slice(0, 6).map((feature) => (
              <FeatureRow key={feature.id} feature={feature} />
            ))}
          </div>
        </div>

        {/* Drill Down Button */}
        <Button 
          onClick={onDrillDown}
          className="w-full bg-gradient-to-r from-tf-cyan to-tf-transcend-cyan hover:opacity-90"
        >
          <Layers className="w-4 h-4 mr-2" />
          View Anatomy in 3D
        </Button>
      </CardContent>
    </Card>
  );
}

function FeatureRow({ feature }: { feature: FeatureContribution }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: feature.color }}
          />
          <span>{feature.label}</span>
        </div>
        <span className="text-muted-foreground">
          {feature.percentage.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-1.5 bg-tf-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${feature.percentage}%` }}
          transition={{ duration: 0.5 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: feature.color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{typeof feature.value === 'number' ? feature.value : feature.value}</span>
        <span>${feature.contribution.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}
