import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, FileCheck, Scale, Bell, ClipboardCheck, ShieldCheck, ExternalLink, Factory as FactoryIcon, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkflowStats } from "@/components/dais/WorkflowStats";
import { AppealsWorkflow } from "@/components/dais/AppealsWorkflow";
import { PermitsWorkflow } from "@/components/dais/PermitsWorkflow";
import { ExemptionsWorkflow } from "@/components/dais/ExemptionsWorkflow";
import { CertificationPipeline } from "@/components/dais/CertificationPipeline";
import { NoticesPanel } from "@/components/dais/NoticesPanel";
import { WorkflowInstanceTracker } from "@/components/workflow";
import { useWorkbench } from "../WorkbenchContext";

interface DaisTabProps {
  initialCategory?: string | null;
  onCategoryConsumed?: () => void;
}

export function DaisTab({ initialCategory, onCategoryConsumed }: DaisTabProps) {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || "appeals");
  const { workMode } = useWorkbench();
  const navigate = useNavigate();

  // Handle deep-linked category
  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
      onCategoryConsumed?.();
    }
  }, [initialCategory, onCategoryConsumed]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-suite-dais/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-suite-dais" />
          </div>
          <div>
            <h2 className="text-xl font-light text-foreground">TerraDais</h2>
            <p className="text-sm text-muted-foreground">
              Operate value — permits, exemptions, appeals, certification
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/roll-readiness")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Roll Readiness
          <ExternalLink className="w-3 h-3" />
        </button>
      </motion.div>

      {/* Workflow Stats + Instance Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WorkflowStats 
            onSelectCategory={setActiveCategory} 
            activeCategory={activeCategory} 
          />
        </div>
        <WorkflowInstanceTracker />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-4">
        <TabsList className="bg-tf-elevated/50 p-1">
          <TabsTrigger 
            value="permits" 
            className="gap-2 data-[state=active]:bg-tf-green/20 data-[state=active]:text-tf-green"
          >
            <FileCheck className="w-4 h-4" />
            Permits
          </TabsTrigger>
          <TabsTrigger 
            value="exemptions"
            className="gap-2 data-[state=active]:bg-tf-gold/20 data-[state=active]:text-tf-gold"
          >
            <ClipboardCheck className="w-4 h-4" />
            Exemptions
          </TabsTrigger>
          <TabsTrigger 
            value="appeals"
            className="gap-2 data-[state=active]:bg-tf-amber/20 data-[state=active]:text-tf-amber"
          >
            <Scale className="w-4 h-4" />
            Appeals
          </TabsTrigger>
          <TabsTrigger 
            value="notices"
            className="gap-2 data-[state=active]:bg-tf-cyan/20 data-[state=active]:text-tf-cyan"
          >
            <Bell className="w-4 h-4" />
            Notices
          </TabsTrigger>
          <TabsTrigger 
            value="certification"
            className="gap-2 data-[state=active]:bg-[hsl(var(--tf-optimized-green)/0.2)] data-[state=active]:text-tf-green"
          >
            <ShieldCheck className="w-4 h-4" />
            Certification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permits" className="mt-0">
          <PermitsWorkflow />
        </TabsContent>

        <TabsContent value="exemptions" className="mt-0">
          <ExemptionsWorkflow />
        </TabsContent>

        <TabsContent value="appeals" className="mt-0">
          <AppealsWorkflow />
        </TabsContent>

        <TabsContent value="notices" className="mt-0">
          <NoticesPanel />
        </TabsContent>

        <TabsContent value="certification" className="mt-0">
          <CertificationPipeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
