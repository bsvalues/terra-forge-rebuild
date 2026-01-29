import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, X, TrendingUp, MapPin, Building, Calendar, Layers } from "lucide-react";
import { useFactorAnalysis, FactorAnalysis } from "@/hooks/useSegmentDiscovery";
import { Skeleton } from "@/components/ui/skeleton";

interface FactorImportancePanelProps {
  studyPeriodId: string | undefined;
}

const factorIcons: Record<string, React.ElementType> = {
  neighborhood_code: MapPin,
  zip_code: MapPin,
  building_area: Building,
  land_area: Layers,
  year_built: Calendar,
  property_class: Layers,
  bedrooms: Building,
  bathrooms: Building,
};

export function FactorImportancePanel({ studyPeriodId }: FactorImportancePanelProps) {
  const { data: factors, isLoading } = useFactorAnalysis(studyPeriodId);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tf-cyan" />
            Factor Importance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!factors || factors.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tf-cyan" />
            Factor Importance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No factor data available. Import assessment data to analyze factor importance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxImportance = Math.max(...factors.map(f => f.importance), 0.01);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tf-cyan" />
            Factor Importance — Regression Analysis
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Variance Explained (R²)
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Identifies which property characteristics most impact assessment ratio variation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map((factor, index) => (
          <FactorRow 
            key={factor.factor} 
            factor={factor} 
            index={index}
            maxImportance={maxImportance}
          />
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3 text-tf-optimized-green" />
            <span>Significant (p &lt; 0.05)</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="w-3 h-3 text-muted-foreground" />
            <span>Not Significant</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FactorRow({ 
  factor, 
  index, 
  maxImportance 
}: { 
  factor: FactorAnalysis; 
  index: number;
  maxImportance: number;
}) {
  const Icon = factorIcons[factor.factor] || Layers;
  const importancePercent = (factor.importance / maxImportance) * 100;
  const isTopFactor = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`space-y-2 p-3 rounded-lg ${isTopFactor ? 'bg-tf-elevated/50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${factor.significant ? 'text-tf-cyan' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">{factor.label}</span>
          {factor.significant ? (
            <Check className="w-3 h-3 text-tf-optimized-green" />
          ) : (
            <X className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono ${factor.significant ? 'text-tf-transcend-cyan' : 'text-muted-foreground'}`}>
            {(factor.importance * 100).toFixed(1)}%
          </span>
          {factor.pValue < 0.05 && (
            <Badge 
              className={`text-[10px] px-1.5 py-0 ${
                factor.pValue < 0.01 
                  ? 'bg-tf-optimized-green/20 text-tf-optimized-green' 
                  : 'bg-tf-transcend-cyan/20 text-tf-transcend-cyan'
              }`}
            >
              {factor.pValue < 0.001 ? 'p<.001' : factor.pValue < 0.01 ? 'p<.01' : 'p<.05'}
            </Badge>
          )}
        </div>
      </div>

      {/* Importance bar */}
      <div className="relative h-2 bg-tf-elevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${importancePercent}%` }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            isTopFactor 
              ? 'bg-gradient-to-r from-tf-cyan to-tf-transcend-cyan' 
              : 'bg-tf-cyan/50'
          }`}
        />
      </div>

      {/* Recommendation */}
      <p className="text-xs text-muted-foreground italic">
        {factor.segmentRecommendation}
      </p>
    </motion.div>
  );
}
