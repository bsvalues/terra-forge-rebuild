// TerraFusion OS — Phase 71: Revaluation Launch Panel
// "The revaluation button tastes like responsibility." — Ralph Wiggum

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Rocket, CheckCircle2, AlertTriangle, MapPin, Building2,
  BarChart3, Shield, Clock, Play, Layers,
  Activity, Target,
} from "lucide-react";
import {
  useRevaluationCycles,
  useLaunchRevaluation,
  type RevaluationCycle,
} from "@/hooks/useRevaluationCycles";
import { useNeighborhoods, useDiscoverNeighborhoods } from "@/hooks/useNeighborhoods";
import { useCountyVitals } from "@/hooks/useCountyVitals";

// ── Readiness Gate ─────────────────────────────────────────────────
interface ReadinessGate {
  label: string;
  passed: boolean;
  detail: string;
  severity: "critical" | "warning" | "info";
}

function ReadinessGateRow({ gate }: { gate: ReadinessGate }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      gate.passed
        ? "bg-emerald-500/5 border-emerald-500/20"
        : gate.severity === "critical"
          ? "bg-destructive/5 border-destructive/20"
          : "bg-amber-500/5 border-amber-500/20"
    }`}>
      {gate.passed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
      ) : gate.severity === "critical" ? (
        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold">{gate.label}</span>
        <p className="text-[10px] text-muted-foreground">{gate.detail}</p>
      </div>
      <Badge
        variant="outline"
        className={`text-[9px] ${gate.passed ? "text-emerald-400" : gate.severity === "critical" ? "text-destructive" : "text-amber-400"}`}
      >
        {gate.passed ? "PASS" : gate.severity === "critical" ? "FAIL" : "WARN"}
      </Badge>
    </div>
  );
}

// ── Cycle History Card ─────────────────────────────────────────────
function CycleCard({ cycle }: { cycle: RevaluationCycle }) {
  const statusColor = {
    launched: "text-primary",
    in_progress: "text-amber-400",
    completed: "text-emerald-400",
    failed: "text-destructive",
    draft: "text-muted-foreground",
  }[cycle.status] || "text-muted-foreground";

  const progress = cycle.total_parcels > 0
    ? Math.round((cycle.parcels_valued / cycle.total_parcels) * 100)
    : 0;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="text-sm font-semibold">{cycle.cycle_name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={`text-[9px] ${statusColor}`}>
                {cycle.status.toUpperCase()}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                TY {cycle.tax_year}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-mono">
              {cycle.total_parcels.toLocaleString()}
            </div>
            <span className="text-[9px] text-muted-foreground">parcels</span>
          </div>
        </div>

        <Progress value={progress} className="h-1.5 mb-2" />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs font-bold font-mono">{cycle.neighborhoods?.length || 0}</div>
            <span className="text-[9px] text-muted-foreground">Neighborhoods</span>
          </div>
          <div>
            <div className="text-xs font-bold font-mono">{cycle.quality_score ?? "—"}</div>
            <span className="text-[9px] text-muted-foreground">Quality</span>
          </div>
          <div>
            <div className="text-xs font-bold font-mono">{cycle.defensibility_score ?? "—"}</div>
            <span className="text-[9px] text-muted-foreground">Defensibility</span>
          </div>
        </div>

        {cycle.launched_at && (
          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Launched {new Date(cycle.launched_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function RevaluationLaunchPanel() {
  const { data: vitals, isLoading: vitalsLoading } = useCountyVitals();
  const { data: neighborhoods, isLoading: nbhdLoading } = useNeighborhoods();
  useDiscoverNeighborhoods();
  const { data: cycles, isLoading: cyclesLoading } = useRevaluationCycles();
  const launchMutation = useLaunchRevaluation();

  const [cycleName, setCycleName] = useState(`${new Date().getFullYear()} Annual Revaluation`);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [selectedNbhds, setSelectedNbhds] = useState<string[]>([]);
  const [useAllNbhds, setUseAllNbhds] = useState(true);

  const isLoading = vitalsLoading || nbhdLoading || cyclesLoading;

  // Registered neighborhoods
  const registeredNbhds = useMemo(() =>
    (neighborhoods || []).filter(n => n.status === "registered" || n.status === "calibrated"),
    [neighborhoods]
  );

  // Compute readiness gates
  const gates = useMemo<ReadinessGate[]>(() => {
    if (!vitals) return [];
    const totalParcels = vitals.parcels.total;
    const nbhdCount = registeredNbhds.length;
    const calibratedCount = vitals.calibration.calibratedNeighborhoods;
    const qualityScore = vitals.quality.overall;
    const hardBlockers = vitals.dataQuality.hardBlockers;
    const defScore = vitals.defensibility.overall;

    return [
      {
        label: "Data Loaded",
        passed: totalParcels > 0,
        detail: totalParcels > 0
          ? `${totalParcels.toLocaleString()} parcels in database`
          : "No parcel data loaded",
        severity: "critical" as const,
      },
      {
        label: "Neighborhoods Registered",
        passed: nbhdCount > 0,
        detail: nbhdCount > 0
          ? `${nbhdCount} neighborhoods configured`
          : "No neighborhoods registered",
        severity: "critical" as const,
      },
      {
        label: "Zero Hard Blockers",
        passed: hardBlockers === 0,
        detail: hardBlockers === 0
          ? "No hard data quality blockers"
          : `${hardBlockers} hard blocker(s) must be resolved`,
        severity: "critical" as const,
      },
      {
        label: "Data Quality ≥ 60%",
        passed: qualityScore >= 60,
        detail: `Current quality score: ${qualityScore}%`,
        severity: "warning" as const,
      },
      {
        label: "Calibration Coverage",
        passed: calibratedCount > 0,
        detail: calibratedCount > 0
          ? `${calibratedCount} neighborhood(s) calibrated`
          : "No calibration runs completed",
        severity: "warning" as const,
      },
      {
        label: "Defensibility ≥ 50",
        passed: defScore >= 50,
        detail: `Current defensibility score: ${defScore}`,
        severity: "info" as const,
      },
    ];
  }, [vitals, registeredNbhds]);

  const criticalsPassed = gates.filter(g => g.severity === "critical").every(g => g.passed);
  const allPassed = gates.every(g => g.passed);
  const passedCount = gates.filter(g => g.passed).length;

  const handleLaunch = () => {
    launchMutation.mutate({
      cycleName,
      taxYear,
      neighborhoods: useAllNbhds ? undefined : selectedNbhds,
    });
  };

  const toggleNbhd = (code: string) => {
    setSelectedNbhds(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Launch Revaluation</h1>
            <p className="text-sm text-muted-foreground">
              Begin the annual revaluation cycle with calibrated models
            </p>
          </div>
        </div>
      </motion.div>

      {/* Readiness Gates */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Launch Readiness Check
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] ${allPassed ? "text-emerald-400" : criticalsPassed ? "text-amber-400" : "text-destructive"}`}
            >
              {allPassed ? "ALL CLEAR" : criticalsPassed ? "WARNINGS" : "NOT READY"}
            </Badge>
          </div>
          <Progress
            value={(passedCount / Math.max(gates.length, 1)) * 100}
            className="h-1.5 mt-2"
          />
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {gates.map((gate, i) => (
            <motion.div
              key={gate.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ReadinessGateRow gate={gate} />
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Cycle Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Cycle Name
              </label>
              <Input
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                className="text-sm"
                placeholder="e.g. 2026 Annual Revaluation"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Tax Year
              </label>
              <Input
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="text-sm"
              />
            </div>
          </div>

          <Separator className="opacity-30" />

          {/* Neighborhood Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Neighborhoods ({useAllNbhds ? registeredNbhds.length : selectedNbhds.length} selected)
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-6"
                onClick={() => {
                  setUseAllNbhds(!useAllNbhds);
                  if (!useAllNbhds) setSelectedNbhds([]);
                }}
              >
                {useAllNbhds ? "Select Specific" : "Use All"}
              </Button>
            </div>

            {!useAllNbhds && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto"
              >
                {registeredNbhds.map((n) => {
                  const selected = selectedNbhds.includes(n.hood_cd);
                  return (
                    <button
                      key={n.id}
                      onClick={() => toggleNbhd(n.hood_cd)}
                      className={`p-2 rounded-lg border text-left text-[10px] transition-colors ${
                        selected
                          ? "bg-primary/10 border-primary/30 text-foreground"
                          : "bg-muted/10 border-border/20 text-muted-foreground hover:bg-muted/20"
                      }`}
                    >
                      <div className="font-semibold truncate">{n.hood_cd}</div>
                      {n.hood_name && (
                        <div className="text-[9px] truncate opacity-70">{n.hood_name}</div>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </div>

          <Separator className="opacity-30" />

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Building2, label: "Parcels", value: vitals?.parcels.total.toLocaleString() || "0" },
              { icon: Layers, label: "Neighborhoods", value: String(registeredNbhds.length) },
              { icon: BarChart3, label: "Calibrated", value: String(vitals?.calibration.calibratedNeighborhoods || 0) },
              { icon: Shield, label: "Defensibility", value: String(vitals?.defensibility.overall || 0) },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-lg bg-muted/10 border border-border/20 text-center">
                <stat.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                <div className="text-sm font-bold font-mono">{stat.value}</div>
                <span className="text-[9px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Launch Button */}
          <Button
            size="lg"
            className="w-full gap-2 text-sm"
            disabled={!criticalsPassed || launchMutation.isPending}
            onClick={handleLaunch}
          >
            {launchMutation.isPending ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Launch Revaluation Cycle
              </>
            )}
          </Button>

          {!criticalsPassed && (
            <p className="text-[10px] text-destructive text-center">
              Resolve all critical gates before launching
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cycle History */}
      {cycles && cycles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Cycle History
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cycles.map((cycle) => (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CycleCard cycle={cycle} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Launch Success Summary */}
      <AnimatePresence>
        {launchMutation.isSuccess && launchMutation.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-400">
                    Revaluation Cycle Launched Successfully
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-sm font-bold font-mono">
                      {launchMutation.data.total_parcels.toLocaleString()}
                    </div>
                    <span className="text-[9px] text-muted-foreground">Total Parcels</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono">
                      {launchMutation.data.neighborhoods?.length || 0}
                    </div>
                    <span className="text-[9px] text-muted-foreground">Neighborhoods</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono">
                      {launchMutation.data.quality_score}%
                    </div>
                    <span className="text-[9px] text-muted-foreground">Quality</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono">
                      {launchMutation.data.defensibility_score}
                    </div>
                    <span className="text-[9px] text-muted-foreground">Defensibility</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
