import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegressionActions } from "./RegressionActions";
import { MultipleRegressionPanel } from "./MultipleRegressionPanel";
import { ANOVAPanel } from "./ANOVAPanel";
import { DiagnosticPlotsPanel } from "./DiagnosticPlotsPanel";
import { RegressionSummaryCards } from "./RegressionSummaryCards";
import { NeighborhoodEffectsPanel } from "./NeighborhoodEffectsPanel";
import { useRegressionAnalysis, useRunRegressionAnalysis } from "@/hooks/useRegressionAnalysis";
import { useStudyPeriods } from "@/hooks/useVEIData";
import { StudyPeriodSelector } from "@/components/vei/StudyPeriodSelector";
import { MapPin } from "lucide-react";

export function RegressionStudioDashboard() {
  const [activeTab, setActiveTab] = useState("regression");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();

  const { data: studyPeriods, isLoading: isLoadingPeriods } = useStudyPeriods();
  const { data: regressionResult, isLoading: isLoadingRegression } = useRegressionAnalysis(selectedPeriodId);
  const runAnalysis = useRunRegressionAnalysis();

  // Auto-select active period
  useEffect(() => {
    if (studyPeriods && studyPeriods.length > 0 && !selectedPeriodId) {
      const activePeriod = studyPeriods.find((p) => p.status === "active");
      setSelectedPeriodId(activePeriod?.id || studyPeriods[0].id);
    }
  }, [studyPeriods, selectedPeriodId]);

  const handleRunAnalysis = () => {
    if (selectedPeriodId) {
      runAnalysis.mutate(selectedPeriodId);
    }
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
          <h2 className="text-2xl font-light text-[hsl(var(--tf-transcend-cyan))]">
            Regression Studio — Statistical Laboratory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            PhD-Level Analytics • Multiple Regression • ANOVA • Diagnostic Testing
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
          <RegressionActions
            onRunAnalysis={handleRunAnalysis}
            isRunning={runAnalysis.isPending}
            hasResult={!!regressionResult}
            result={regressionResult}
          />
        </div>
      </motion.div>

      {/* Summary Cards */}
      <RegressionSummaryCards 
        result={regressionResult} 
        isLoading={isLoadingRegression || runAnalysis.isPending} 
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-tf-elevated/50">
          <TabsTrigger value="regression" className="data-[state=active]:bg-tf-transcend-cyan/20">
            Multiple Regression
          </TabsTrigger>
          <TabsTrigger value="neighborhoods" className="data-[state=active]:bg-tf-transcend-cyan/20 gap-1">
            <MapPin className="w-3 h-3" />
            Geographic
          </TabsTrigger>
          <TabsTrigger value="anova" className="data-[state=active]:bg-tf-transcend-cyan/20">
            ANOVA
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="data-[state=active]:bg-tf-transcend-cyan/20">
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regression" className="mt-6">
          <MultipleRegressionPanel 
            result={regressionResult} 
            isLoading={isLoadingRegression || runAnalysis.isPending} 
          />
        </TabsContent>

        <TabsContent value="neighborhoods" className="mt-6">
          <NeighborhoodEffectsPanel 
            effects={regressionResult?.neighborhoodEffects} 
            isLoading={isLoadingRegression || runAnalysis.isPending} 
          />
        </TabsContent>

        <TabsContent value="anova" className="mt-6">
          <ANOVAPanel 
            result={regressionResult} 
            isLoading={isLoadingRegression || runAnalysis.isPending} 
          />
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-6">
          <DiagnosticPlotsPanel 
            result={regressionResult} 
            isLoading={isLoadingRegression || runAnalysis.isPending} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
