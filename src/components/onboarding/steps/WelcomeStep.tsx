// TerraFusion OS — Onboarding: Welcome Step
import { motion } from "framer-motion";
import { Database, Globe, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-6">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center mx-auto shadow-lg"
      >
        <span className="text-primary-foreground font-bold text-2xl">TF</span>
      </motion.div>

      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to TerraFusion
        </h1>
        <p className="text-muted-foreground">
          The AI-powered mass appraisal platform. Let's set up your county to get started.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          { icon: Database, label: "Smart Ingestion" },
          { icon: Globe, label: "Spatial Analysis" },
          { icon: Sparkles, label: "AI Copilot" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/30">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="w-full bg-primary text-primary-foreground" size="lg">
        Get Started
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
