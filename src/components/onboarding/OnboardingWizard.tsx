// TerraFusion OS — County Onboarding Wizard
// Guides new users through county setup and first data import.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Database, ArrowRight, Check, Plus,
  Loader2, Globe, Users, Upload, ChevronRight, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useListCounties, useCreateCounty, useJoinCounty,
  type AvailableCounty,
} from "@/hooks/useOnboardingStatus";
import { cn } from "@/lib/utils";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

type WizardStep = "welcome" | "choose" | "create" | "join" | "next-steps";

export function OnboardingWizard() {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [countyName, setCountyName] = useState("");
  const [fipsCode, setFipsCode] = useState("");
  const [state, setState] = useState("");
  const [selectedCounty, setSelectedCounty] = useState<string>("");

  const { data: counties, isLoading: countiesLoading } = useListCounties();
  const createCounty = useCreateCounty();
  const joinCounty = useJoinCounty();

  const handleCreate = () => {
    if (!countyName || !fipsCode || !state) return;
    createCounty.mutate({ name: countyName, fipsCode, state });
  };

  const handleJoin = () => {
    if (!selectedCounty) return;
    joinCounty.mutate(selectedCounty);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["welcome", "choose", "create", "next-steps"].map((s, i) => (
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
          {step === "welcome" && (
            <StepCard key="welcome">
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
                    The AI-powered mass appraisal platform. Let's set up your county
                    to get started.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <FeatureChip icon={Database} label="Smart Ingestion" />
                  <FeatureChip icon={Globe} label="Spatial Analysis" />
                  <FeatureChip icon={Sparkles} label="AI Copilot" />
                </div>

                <Button
                  onClick={() => setStep("choose")}
                  className="w-full bg-primary text-primary-foreground"
                  size="lg"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </StepCard>
          )}

          {step === "choose" && (
            <StepCard key="choose">
              <div className="space-y-6">
                <div className="text-center">
                  <Building2 className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-foreground">Set Up Your County</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a new county or join an existing one
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Card
                    className="cursor-pointer border-border/50 hover:border-primary/40 transition-colors bg-card/80"
                    onClick={() => setStep("create")}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Create New County</p>
                        <p className="text-xs text-muted-foreground">
                          You'll be the administrator
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                  </Card>

                  {counties && counties.length > 0 && (
                    <Card
                      className="cursor-pointer border-border/50 hover:border-chart-5/40 transition-colors bg-card/80"
                      onClick={() => setStep("join")}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-chart-5/10">
                          <Users className="w-5 h-5 text-chart-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Join Existing County</p>
                          <p className="text-xs text-muted-foreground">
                            {counties.length} {counties.length === 1 ? "county" : "counties"} available
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </StepCard>
          )}

          {step === "create" && (
            <StepCard key="create">
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Create County</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your county details to begin
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="county-name" className="text-sm">County Name</Label>
                    <Input
                      id="county-name"
                      placeholder="e.g., Salt Lake County"
                      value={countyName}
                      onChange={(e) => setCountyName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="fips" className="text-sm">FIPS Code</Label>
                      <Input
                        id="fips"
                        placeholder="e.g., 53005"
                        value={fipsCode}
                        onChange={(e) => setFipsCode(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">State</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!countyName || !fipsCode || !state || createCounty.isPending}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    {createCounty.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Create County
                  </Button>
                </div>
              </div>
            </StepCard>
          )}

          {step === "join" && (
            <StepCard key="join">
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Join County</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a county to join as a viewer
                  </p>
                </div>

                {countiesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {counties?.map((c) => (
                      <Card
                        key={c.id}
                        className={cn(
                          "cursor-pointer border-border/50 transition-colors",
                          selectedCounty === c.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/20 bg-card/80"
                        )}
                        onClick={() => setSelectedCounty(c.id)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <MapPin className={cn(
                            "w-4 h-4",
                            selectedCounty === c.id ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.state} · FIPS {c.fips_code}</p>
                          </div>
                          {selectedCounty === c.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleJoin}
                    disabled={!selectedCounty || joinCounty.isPending}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    {joinCounty.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Join County
                  </Button>
                </div>
              </div>
            </StepCard>
          )}
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
        <CardContent className="p-8">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/30">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
