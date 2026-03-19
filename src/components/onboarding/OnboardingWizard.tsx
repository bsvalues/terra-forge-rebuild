// TerraFusion OS — County Onboarding Wizard (Phase 83 Refactor)
// Guides new users through county setup and first data import.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  useListCounties, useCreateCounty, useJoinCounty,
} from "@/hooks/useOnboardingStatus";
import { cn } from "@/lib/utils";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ChooseStep } from "./steps/ChooseStep";
import { CreateCountyStep } from "./steps/CreateCountyStep";
import { JoinCountyStep } from "./steps/JoinCountyStep";
import { NextStepsStep } from "./steps/NextStepsStep";

type WizardStep = "welcome" | "choose" | "create" | "join" | "next-steps";

export function OnboardingWizard() {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [countyName, setCountyName] = useState("");
  const [fipsCode, setFipsCode] = useState("");
  const [state, setState] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("");

  const { data: counties, isLoading: countiesLoading } = useListCounties();
  const createCounty = useCreateCounty();
  const joinCounty = useJoinCounty();

  const handleCreate = () => {
    if (!countyName || !fipsCode || !state) return;
    createCounty.mutate(
      { name: countyName, fipsCode, state },
      { onSuccess: () => setStep("next-steps") }
    );
  };

  const handleJoin = () => {
    if (!selectedCounty) return;
    joinCounty.mutate(selectedCounty, {
      onSuccess: () => setStep("next-steps"),
    });
  };

  const handleComplete = () => {
    window.location.reload();
  };

  const STEPS = ["welcome", "choose", "create", "next-steps"] as const;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s) => (
            <div
              key={s}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                step === s || (step === "join" && s === "create")
                  ? "bg-primary"
                  : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <StepCard key={step}>
            {step === "welcome" && <WelcomeStep onNext={() => setStep("choose")} />}
            {step === "choose" && (
              <ChooseStep
                availableCount={counties?.length ?? 0}
                onCreateNew={() => setStep("create")}
                onJoinExisting={() => setStep("join")}
              />
            )}
            {step === "create" && (
              <CreateCountyStep
                countyName={countyName}
                fipsCode={fipsCode}
                state={state}
                isPending={createCounty.isPending}
                onCountyNameChange={setCountyName}
                onFipsCodeChange={setFipsCode}
                onStateChange={setState}
                onBack={() => setStep("choose")}
                onSubmit={handleCreate}
              />
            )}
            {step === "join" && (
              <JoinCountyStep
                counties={counties ?? []}
                isLoading={countiesLoading}
                selectedCounty={selectedCounty}
                isPending={joinCounty.isPending}
                onSelect={setSelectedCounty}
                onBack={() => setStep("choose")}
                onSubmit={handleJoin}
              />
            )}
            {step === "next-steps" && (
              <NextStepsStep
                countyName={countyName || "Your County"}
                onComplete={handleComplete}
              />
            )}
          </StepCard>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-border/50 bg-card/90 backdrop-blur-sm shadow-lg">
        <CardContent className="p-8">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
