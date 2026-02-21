// TerraFusion OS — Fix Pack Panel
// Preview → Confirm → Celebrate → Prove

import { useState } from "react";
import { useMissionFix, type FixPackResult } from "@/hooks/useMissionFix";
import { getMission, IMPACT_LABELS } from "@/lib/missionConstitution";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, Shield, Sparkles, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FixPackPanelProps {
  missionId: string;
  onComplete?: () => void;
}

// Strategies per mission
const MISSION_STRATEGIES: Record<string, { value: string; label: string; description: string; roleGate?: string }[]> = {
  "impossible-year-built": [
    { value: "set_null_and_flag", label: "Set to Unknown", description: "Clear nonsensical years and mark for manual review — safest option" },
    { value: "clamp_with_reason", label: "Clamp to Range", description: "Future years → current year, pre-1700 → NULL. Requires data_admin role.", roleGate: "admin" },
  ],
  "missing-building-area": [
    { value: "create_measurement_tasks", label: "Create Measurement Tasks", description: "Generate field measurement workflow tasks for each affected parcel" },
  ],
};

type Phase = "strategy" | "preview" | "confirm" | "victory";

export function FixPackPanel({ missionId, onComplete }: FixPackPanelProps) {
  const mission = getMission(missionId);
  const strategies = MISSION_STRATEGIES[missionId] ?? [];
  const [phase, setPhase] = useState<Phase>("strategy");
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [preview, setPreview] = useState<FixPackResult | null>(null);
  const [commitResult, setCommitResult] = useState<FixPackResult | null>(null);
  const fixMutation = useMissionFix();

  if (strategies.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Fix packs not yet available for this mission.
      </div>
    );
  }

  const handlePreview = async (strategy: string) => {
    setSelectedStrategy(strategy);
    const result = await fixMutation.mutateAsync({ missionId, strategy, dryRun: true });
    setPreview(result);
    setPhase("preview");
  };

  const handleCommit = async () => {
    if (!selectedStrategy) return;
    setPhase("confirm");
    const result = await fixMutation.mutateAsync({ missionId, strategy: selectedStrategy, dryRun: false });
    setCommitResult(result);
    setPhase("victory");
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {phase === "strategy" && (
          <motion.div key="strategy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Choose fix strategy</p>
            {strategies.map((s) => (
              <button
                key={s.value}
                onClick={() => handlePreview(s.value)}
                disabled={fixMutation.isPending}
                className={cn(
                  "w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors",
                  fixMutation.isPending && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{s.label}</span>
                  {s.roleGate && <Badge variant="outline" className="text-[9px] px-1 py-0">admin</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 ml-5.5">{s.description}</p>
              </button>
            ))}
            {fixMutation.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Computing preview…
              </div>
            )}
          </motion.div>
        )}

        {phase === "preview" && preview && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-sm font-medium">{preview.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="text-[10px]">{preview.affected} parcels</Badge>
                <Badge variant="outline" className="text-[10px]">dry run</Badge>
              </div>
            </div>

            {preview.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-chart-4">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCommit} disabled={fixMutation.isPending} className="gap-1.5">
                {fixMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Confirm Fix
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setPhase("strategy"); setPreview(null); }} className="gap-1.5">
                <Undo2 className="w-3 h-3" /> Back
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "confirm" && (
          <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Applying fix…</span>
          </motion.div>
        )}

        {phase === "victory" && commitResult && (
          <motion.div key="victory" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
            <div className="p-4 rounded-lg border border-[hsl(var(--tf-optimized-green))]/30 bg-[hsl(var(--tf-optimized-green))]/5 text-center">
              <Sparkles className="w-6 h-6 mx-auto text-[hsl(var(--tf-optimized-green))] mb-2" />
              <p className="text-sm font-semibold">Fixed {commitResult.affected} parcels</p>
              {mission && (
                <Badge className="mt-2 text-[10px]" style={{ backgroundColor: IMPACT_LABELS[mission.impactCategory]?.color + "22", color: IMPACT_LABELS[mission.impactCategory]?.color }}>
                  {IMPACT_LABELS[mission.impactCategory]?.label}
                </Badge>
              )}
            </div>
            {commitResult.receipt_id && (
              <p className="text-[10px] text-muted-foreground text-center font-mono">
                Receipt: {commitResult.receipt_id.slice(0, 8)}…
              </p>
            )}
            <Button size="sm" variant="outline" className="w-full" onClick={() => { setPhase("strategy"); setPreview(null); setCommitResult(null); onComplete?.(); }}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
