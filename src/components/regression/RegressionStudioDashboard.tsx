import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegressionActions } from "./RegressionActions";
import { MultipleRegressionPanel } from "./MultipleRegressionPanel";
import { ANOVAPanel } from "./ANOVAPanel";
import { DiagnosticPlotsPanel } from "./DiagnosticPlotsPanel";
import { RegressionSummaryCards } from "./RegressionSummaryCards";

export function RegressionStudioDashboard() {
  const [activeTab, setActiveTab] = useState("regression");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign">
            Regression Studio — Statistical Laboratory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            PhD-Level Analytics • Multiple Regression • ANOVA • Diagnostic Testing
          </p>
        </div>
        <RegressionActions />
      </motion.div>

      {/* Summary Cards */}
      <RegressionSummaryCards />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3 bg-tf-elevated/50">
          <TabsTrigger value="regression" className="data-[state=active]:bg-tf-transcend-cyan/20">
            Multiple Regression
          </TabsTrigger>
          <TabsTrigger value="anova" className="data-[state=active]:bg-tf-transcend-cyan/20">
            ANOVA
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="data-[state=active]:bg-tf-transcend-cyan/20">
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regression" className="mt-6">
          <MultipleRegressionPanel />
        </TabsContent>

        <TabsContent value="anova" className="mt-6">
          <ANOVAPanel />
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-6">
          <DiagnosticPlotsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
