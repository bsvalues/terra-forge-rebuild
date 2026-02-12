import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lightbulb, ChevronRight, Layers, MapPin, Building, Calendar, Check } from "lucide-react";
import { useSegmentSuggestions, SegmentDefinition } from "@/hooks/useSegmentDiscovery";
import { Skeleton } from "@/components/ui/skeleton";

interface SegmentSuggestionPanelProps {
  studyPeriodId: string | undefined;
  onApplySegments?: (segments: SegmentDefinition[]) => void;
}

const factorIcons: Record<string, React.ElementType> = {
  neighborhood_code: MapPin,
  building_area: Building,
  year_built: Calendar,
  property_class: Layers,
};

export function SegmentSuggestionPanel({ studyPeriodId, onApplySegments }: SegmentSuggestionPanelProps) {
  const { data: suggestions, isLoading } = useSegmentSuggestions(studyPeriodId);
  const [activeSegments, setActiveSegments] = useState<Record<string, boolean>>({});

  // Initialize active state from suggestions
  const getIsActive = (segment: SegmentDefinition) => {
    return activeSegments[segment.id] ?? segment.isActive;
  };

  const toggleSegment = (segmentId: string) => {
    setActiveSegments(prev => ({
      ...prev,
      [segmentId]: !getIsActive(suggestions?.find(s => s.id === segmentId)!),
    }));
  };

  const handleApplySegments = () => {
    if (suggestions && onApplySegments) {
      const selected = suggestions.filter(s => getIsActive(s));
      onApplySegments(selected);
    }
  };

  if (isLoading) {
    return (
      <Card className="material-bento">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-tf-sacred-gold" />
            Segment Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="material-bento">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-tf-sacred-gold" />
            Segment Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No segment suggestions available. Import more data for analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeCount = suggestions.filter(s => getIsActive(s)).length;

  return (
    <Card className="material-bento">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-tf-sacred-gold" />
            Data-Driven Segment Suggestions
          </CardTitle>
          <Badge className="bg-tf-sacred-gold/20 text-tf-sacred-gold text-xs">
            {activeCount} Active
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Segments generated from regression analysis to identify areas needing adjustment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((segment, index) => (
          <SegmentCard 
            key={segment.id} 
            segment={segment} 
            index={index}
            isActive={getIsActive(segment)}
            onToggle={() => toggleSegment(segment.id)}
          />
        ))}

        {/* Apply Button */}
        <div className="pt-4 border-t border-border/50">
          <Button 
            onClick={handleApplySegments}
            className="w-full bg-gradient-to-r from-tf-cyan to-tf-transcend-cyan hover:opacity-90"
            disabled={activeCount === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Apply {activeCount} Segment{activeCount !== 1 ? 's' : ''} to VEI Analysis
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Segments will be used to filter and analyze VEI metrics
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentCard({ 
  segment, 
  index,
  isActive,
  onToggle,
}: { 
  segment: SegmentDefinition;
  index: number;
  isActive: boolean;
  onToggle: () => void;
}) {
  const Icon = factorIcons[segment.factor] || Layers;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-lg border transition-colors ${
        isActive 
          ? 'bg-tf-elevated/50 border-tf-cyan/30' 
          : 'bg-tf-base/30 border-border/50'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-tf-cyan/20' : 'bg-tf-elevated'}`}>
              <Icon className={`w-4 h-4 ${isActive ? 'text-tf-cyan' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h4 className="text-sm font-medium">{segment.name}</h4>
              <p className="text-xs text-muted-foreground">
                {segment.ranges.length} categories • {(segment.importance * 100).toFixed(0)}% importance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch 
              checked={isActive} 
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-tf-cyan"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Expanded ranges */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border/50"
          >
            <div className="grid grid-cols-2 gap-2">
              {segment.ranges.map((range, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-tf-base/50 text-xs"
                >
                  <span className="truncate">{range.label}</span>
                  {range.count !== undefined && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      n={range.count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
