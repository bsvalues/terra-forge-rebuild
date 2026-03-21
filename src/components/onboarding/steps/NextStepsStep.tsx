// TerraFusion OS — Onboarding: Next Steps (Phase 83)
import { motion } from "framer-motion";
import {
  Upload, Database, Map, Sparkles, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BENTON_BOOTSTRAP_STEPS,
  isBentonCountyName,
  type BentonBootstrapStep,
} from "@/config/bentonBootstrapPlan";

interface NextStepsStepProps {
  countyName: string;
  onComplete: () => void;
}

const NEXT_STEPS = [
  {
    icon: Upload,
    title: "Import Parcel Data",
    description: "Upload your CAMA extract (CSV/Excel) to populate parcels, assessments, and sales.",
    action: "Import Data",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Database,
    title: "Connect Data Sources",
    description: "Link to your county's ArcGIS FeatureServer or external CAMA system for live sync.",
    action: "Connect",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
  {
    icon: Map,
    title: "Load GIS Layers",
    description: "Import parcel boundaries, flood zones, and zoning layers for spatial analysis.",
    action: "Add Layers",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    icon: Sparkles,
    title: "Meet TerraPilot",
    description: "Your AI copilot is ready. Ask questions, draft notices, or run valuation models.",
    action: "Open Pilot",
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
];

function getStepBadgeVariant(status: BentonBootstrapStep["status"]) {
  switch (status) {
    case "implemented":
      return "bg-chart-2/15 text-chart-2 border-chart-2/30";
    case "partial":
      return "bg-chart-5/15 text-chart-5 border-chart-5/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function NextStepsStep({ countyName, onComplete }: NextStepsStepProps) {
  const isBenton = isBentonCountyName(countyName);
  const steps = isBenton ? BENTON_BOOTSTRAP_STEPS : NEXT_STEPS;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 className="w-8 h-8 text-chart-2" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">
          {countyName} is Ready!
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isBenton
            ? "Your county is set up. Follow the Benton bootstrap order to get PACS and GIS seeded cleanly."
            : "Your county is set up. Here's what to do next:"}
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/50 bg-card/80 hover:bg-card/90 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${step.bgColor}`}>
                  <step.icon className={`w-4 h-4 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    {"status" in step && (
                      <Badge variant="outline" className={getStepBadgeVariant(step.status)}>
                        {step.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-primary text-primary-foreground"
        size="lg"
      >
        Enter TerraFusion
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
