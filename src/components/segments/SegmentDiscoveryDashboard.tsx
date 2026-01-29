import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  FlaskConical, 
  MapPin, 
  BarChart3, 
  Lightbulb,
  RefreshCw,
  Download,
  ArrowRight
} from "lucide-react";
import { StudyPeriodSelector } from "@/components/vei/StudyPeriodSelector";
import { FactorImportancePanel } from "./FactorImportancePanel";
import { NeighborhoodHeatmap } from "./NeighborhoodHeatmap";
import { SegmentSuggestionPanel } from "./SegmentSuggestionPanel";
import { useStudyPeriods } from "@/hooks/useVEIData";
import { SegmentDefinition } from "@/hooks/useSegmentDiscovery";
import { toast } from "sonner";

export function SegmentDiscoveryDashboard() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("factors");
  
  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();

  // Auto-select active period
  if (studyPeriods && studyPeriods.length > 0 && !selectedPeriodId) {
    const activePeriod = studyPeriods.find((p) => p.status === "active");
    setSelectedPeriodId(activePeriod?.id || studyPeriods[0].id);
  }

  const handleApplySegments = (segments: SegmentDefinition[]) => {
    // Store selected segments for VEI filtering
    localStorage.setItem("vei-active-segments", JSON.stringify(segments));
    toast.success(`Applied ${segments.length} segments to VEI analysis`, {
      description: "Navigate to VEI Suite to see segmented metrics",
      action: {
        label: "Go to VEI",
        onClick: () => {
          // This would navigate to VEI - handled by parent layout
          window.dispatchEvent(new CustomEvent("navigate-to-module", { detail: "vei" }));
        },
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign">
            Segment Discovery — Factor Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven identification of key factors impacting assessment equity
          </p>
        </div>
        <div className="flex items-center gap-3">
          {studyPeriods && studyPeriods.length > 0 && (
            <StudyPeriodSelector
              periods={studyPeriods}
              selectedId={selectedPeriodId}
              onSelect={setSelectedPeriodId}
            />
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Re-analyze
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Workflow Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-lg p-4"
      >
        <div className="flex items-center justify-between gap-4 overflow-x-auto">
          <WorkflowStep 
            icon={FlaskConical} 
            label="Regression Analysis" 
            description="Identify significant factors"
            isActive={activeTab === "factors"}
            onClick={() => setActiveTab("factors")}
          />
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <WorkflowStep 
            icon={MapPin} 
            label="Geographic Analysis" 
            description="Neighborhood-level review"
            isActive={activeTab === "neighborhoods"}
            onClick={() => setActiveTab("neighborhoods")}
          />
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <WorkflowStep 
            icon={Lightbulb} 
            label="Segment Suggestions" 
            description="Data-driven recommendations"
            isActive={activeTab === "suggestions"}
            onClick={() => setActiveTab("suggestions")}
          />
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <WorkflowStep 
            icon={BarChart3} 
            label="Apply to VEI" 
            description="Filter metrics by segment"
            isActive={false}
            onClick={() => {}}
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3 bg-tf-elevated/50">
          <TabsTrigger 
            value="factors" 
            className="data-[state=active]:bg-tf-transcend-cyan/20 gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            Factor Analysis
          </TabsTrigger>
          <TabsTrigger 
            value="neighborhoods" 
            className="data-[state=active]:bg-tf-transcend-cyan/20 gap-2"
          >
            <MapPin className="w-4 h-4" />
            Neighborhoods
          </TabsTrigger>
          <TabsTrigger 
            value="suggestions" 
            className="data-[state=active]:bg-tf-transcend-cyan/20 gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="factors" className="mt-6 space-y-6">
          <FactorImportancePanel studyPeriodId={selectedPeriodId} />
          
          {/* Methodology note */}
          <div className="glass-card rounded-lg p-4 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground mb-2">Methodology</h4>
            <p>
              Factor importance is calculated using regression analysis. For continuous variables 
              (sq ft, age), we compute R² to measure variance explained. For categorical variables 
              (neighborhood, property class), we use ANOVA-based eta-squared. Factors with p-values 
              below 0.05 are marked as statistically significant.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="neighborhoods" className="mt-6 space-y-6">
          <NeighborhoodHeatmap studyPeriodId={selectedPeriodId} />
          
          <div className="glass-card rounded-lg p-4 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground mb-2">Interpretation Guide</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-tf-alert-red">Critical</span>: Median deviation &gt;10% or COD &gt;20% — immediate attention needed</li>
              <li><span className="text-tf-caution-amber">Warning</span>: Median deviation 5-10% or COD 15-20% — review recommended</li>
              <li><span className="text-tf-cyan">Good</span>: Median deviation 2-5% or COD 10-15% — within tolerance</li>
              <li><span className="text-tf-optimized-green">Excellent</span>: Median deviation &lt;2% and COD &lt;10% — optimal performance</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6 space-y-6">
          <SegmentSuggestionPanel 
            studyPeriodId={selectedPeriodId} 
            onApplySegments={handleApplySegments}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkflowStep({ 
  icon: Icon, 
  label, 
  description, 
  isActive,
  onClick,
}: { 
  icon: React.ElementType;
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors flex-shrink-0 ${
        isActive 
          ? 'bg-tf-cyan/20 text-tf-cyan' 
          : 'hover:bg-tf-elevated/50 text-muted-foreground'
      }`}
    >
      <div className={`p-2 rounded-lg ${isActive ? 'bg-tf-cyan/20' : 'bg-tf-elevated'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-left">
        <div className={`text-sm font-medium ${isActive ? 'text-foreground' : ''}`}>
          {label}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}
