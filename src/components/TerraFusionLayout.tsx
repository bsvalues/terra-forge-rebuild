import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SovereignSidebar } from "./navigation/SovereignSidebar";
import { SovereignHeader } from "./navigation/SovereignHeader";
import { SovereignOrb } from "./navigation/SovereignOrb";
import { VEIDashboard } from "./vei/VEIDashboard";
import { CostForgeDashboard } from "./costforge/CostForgeDashboard";
import { AVMStudioDashboard } from "./avm/AVMStudioDashboard";
import { RegressionStudioDashboard } from "./regression/RegressionStudioDashboard";
import { AxiomFSDashboard } from "./axiomfs/AxiomFSDashboard";
import { SegmentDiscoveryDashboard } from "./segments";
import { ValuationAnatomyDashboard } from "./anatomy";
import { GeoEquityDashboard } from "./geoequity";
import { StudyPeriodManager } from "./admin";

const SettingsPlaceholder = () => (
  <div className="p-6">
    <div className="glass-card p-12 rounded-lg text-center">
      <h2 className="text-2xl font-light text-gradient-sovereign mb-4">Settings</h2>
      <p className="text-muted-foreground">System Configuration</p>
      <p className="text-sm text-muted-foreground mt-2">Coming Soon</p>
    </div>
  </div>
);

const moduleConfig: Record<string, { title: string; description: string; component: React.ComponentType }> = {
  vei: {
    title: "VEI Suite",
    description: "Vertical Equity Index — Minimum Viable Standard",
    component: VEIDashboard,
  },
  segments: {
    title: "Segment Discovery",
    description: "Data-Driven Factor Analysis",
    component: SegmentDiscoveryDashboard,
  },
  geoequity: {
    title: "GeoEquity",
    description: "Geographic Equity Analysis & GIS Integration",
    component: GeoEquityDashboard,
  },
  anatomy: {
    title: "Valuation Anatomy",
    description: "3D Property Value Driver Visualization",
    component: ValuationAnatomyDashboard,
  },
  costforge: {
    title: "CostForge AI",
    description: "3-6-9 Quantum Valuation Engine",
    component: CostForgeDashboard,
  },
  avm: {
    title: "AVM Studio",
    description: "Machine Learning Model Laboratory",
    component: AVMStudioDashboard,
  },
  axiom: {
    title: "AxiomFS",
    description: "Sovereign File Lattice",
    component: AxiomFSDashboard,
  },
  regression: {
    title: "Regression Studio",
    description: "PhD-Level Statistical Analytics",
    component: RegressionStudioDashboard,
  },
  admin: {
    title: "Administration",
    description: "Study Period & System Management",
    component: StudyPeriodManager,
  },
  settings: {
    title: "Settings",
    description: "System Configuration",
    component: SettingsPlaceholder,
  },
};

export function TerraFusionLayout() {
  const [activeModule, setActiveModule] = useState("vei");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for navigation events from child components
  useEffect(() => {
    const handleNavigate = (event: CustomEvent<string>) => {
      if (moduleConfig[event.detail]) {
        setActiveModule(event.detail);
      }
    };

    window.addEventListener("navigate-to-module", handleNavigate as EventListener);
    return () => {
      window.removeEventListener("navigate-to-module", handleNavigate as EventListener);
    };
  }, []);

  const currentModule = moduleConfig[activeModule] || moduleConfig.vei;
  const ModuleComponent = currentModule.component;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <SovereignSidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content area */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="min-h-screen"
      >
        {/* Header */}
        <SovereignHeader
          moduleTitle={currentModule.title}
          moduleDescription={currentModule.description}
        />

        {/* Module content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ModuleComponent />
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* Sovereign Orb - Mobile/Alternative Navigation */}
      <div className="hidden">
        <SovereignOrb
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
      </div>

      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--tf-transcend-cyan) / 0.03) 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}
