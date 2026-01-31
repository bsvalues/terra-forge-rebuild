import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, FileCheck, Scale, Bell, ClipboardCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkflowStats } from "@/components/dais/WorkflowStats";
import { AppealsWorkflow } from "@/components/dais/AppealsWorkflow";
import { PermitsWorkflow } from "@/components/dais/PermitsWorkflow";
import { ExemptionsWorkflow } from "@/components/dais/ExemptionsWorkflow";
import { useWorkbench } from "../WorkbenchContext";

export function DaisTab() {
  const [activeCategory, setActiveCategory] = useState<string>("appeals");
  const { workMode } = useWorkbench();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-suite-dais/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-suite-dais" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">TerraDais</h2>
          <p className="text-sm text-muted-foreground">
            Operate value — permits, exemptions, appeals, certification
          </p>
        </div>
      </motion.div>

      {/* Workflow Stats */}
      <WorkflowStats 
        onSelectCategory={setActiveCategory} 
        activeCategory={activeCategory} 
      />

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-tf-cyan" />
              Official Notices
            </h3>
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Notice generation coming soon</p>
              <p className="text-sm mt-1">Generate and track assessment notices and correspondence</p>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
