import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Download, Loader2, CheckSquare, AlertTriangle } from "lucide-react";
import { useTrainAVM, useAVMRuns, type AVMRun } from "@/hooks/useAVMRuns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";

// ── Apply champion predictions → draft assessments ────────────────────────────
function useApplyAVMToAssessments() {
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (run: AVMRun) => {
      if (!run.predictions || run.predictions.length === 0) {
        throw new Error("No predictions in this run");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("county_id")
        .eq("user_id", user.id)
        .single();

      const countyId = profile?.county_id;
      if (!countyId) throw new Error("No county assignment");

      // Upsert draft assessments
      const rows = run.predictions.map((p) => ({
        parcel_id: p.parcel_id,
        county_id: countyId,
        tax_year: new Date().getFullYear(),
        land_value: 0,
        improvement_value: Math.round(p.predicted),
        total_value: Math.round(p.predicted),
        certified: false,
      }));

      // Insert in batches of 100
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await supabase
          .from("assessments")
          .upsert(batch, { onConflict: "parcel_id,tax_year" });
        if (error) throw error;
        inserted += batch.length;
      }

      // Emit trace event
      await (supabase as any).from("trace_events").insert({
        county_id: countyId,
        actor_id: user.id,
        source_module: "forge",
        event_type: "avm_applied_to_assessments",
        event_data: {
          run_id: run.id,
          model_name: run.model_name,
          parcels_updated: inserted,
          r_squared: run.r_squared,
          cod: run.cod,
        },
      });

      return inserted;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: `${count} draft assessments created`, description: "Values not certified — review in DAIS before locking." });
    },
    onError: (err: Error) => {
      toast({ title: "Apply failed", description: err.message, variant: "destructive" });
    },
  });
}

function ApplyAssessmentsDialog({ champion }: { champion: AVMRun | null }) {
  const [open, setOpen] = useState(false);
  const applyMutation = useApplyAVMToAssessments();
  const { role } = useUserRole();
  const canApply = role === "admin" || role === "analyst";

  if (!canApply) return null;

  const pct = champion?.predictions?.length ?? 0;

  function handleConfirm() {
    if (!champion) return;
    applyMutation.mutate(champion, {
      onSuccess: () => setOpen(false),
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={!champion || pct === 0}
        onClick={() => setOpen(true)}
        title={!champion ? "Train a model first" : "Apply champion predictions as draft assessments"}
      >
        <CheckSquare className="w-4 h-4" />
        Apply to Assessments
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Apply AVM Predictions
            </DialogTitle>
            <DialogDescription>
              This will create <strong>{pct} draft assessments</strong> from the champion model predictions.
              Values will be marked <em>uncertified</em> and must be reviewed before certification.
            </DialogDescription>
          </DialogHeader>

          {champion && (
            <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1.5 my-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{champion.model_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">R²</span>
                <span className="tabular-nums">{champion.r_squared?.toFixed(3) ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">COD</span>
                <span className="tabular-nums">{champion.cod?.toFixed(1) ?? "—"}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcels</span>
                <span className="tabular-nums">{pct}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={applyMutation.isPending}
              className="gap-2"
            >
              {applyMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Applying…</>
              ) : (
                <><CheckSquare className="w-4 h-4" />Confirm Apply</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AVMStudioActions() {
  const trainMutation = useTrainAVM();
  const { data: runs } = useAVMRuns();
  const champion = runs?.find((r) => r.status === "champion") ?? null;

  return (
    <div className="flex items-center gap-2">
      <ApplyAssessmentsDialog champion={champion} />

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          className="gap-2 btn-sovereign"
          onClick={() => trainMutation.mutate()}
          disabled={trainMutation.isPending}
        >
          {trainMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Training…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Train Models
            </>
          )}
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </motion.div>
    </div>
  );
}
