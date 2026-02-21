// TerraFusion OS — Daily Briefing
// "Here's what happened, here's what to do first."
// Morning command brief: one-sentence narrative + today's activity + top NBA action

import { motion } from "framer-motion";
import {
  Sunrise,
  Upload,
  Target,
  Wrench,
  Cpu,
  Activity,
  ArrowRight,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTodaySummary, type TodaySummary } from "@/hooks/useCountyVitalsToday";
import { useCountyVitals } from "@/hooks/useCountyVitals";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import { cn } from "@/lib/utils";

// ─── Narrative Generator ─────────────────────────────────────

function generateNarrative(
  today: TodaySummary | undefined,
  vitals: ReturnType<typeof useCountyVitals>["data"],
  pipeline: ReturnType<typeof usePipelineStatus>["data"]
): string {
  if (!today || today.total === 0) {
    // No activity today
    const quality = vitals?.quality.overall ?? 0;
    if (quality >= 90) return "No activity yet today. Your county data is in excellent shape — consider running calibration or reviewing appeals.";
    if (quality >= 70) return "No activity yet today. Data quality is good but there are a few gaps worth addressing.";
    return "No activity yet today. Start by importing data or addressing the top recommended action below.";
  }

  const parts: string[] = [];

  if (today.imports > 0) {
    parts.push(`${today.imports} import${today.imports > 1 ? "s" : ""} completed`);
  }
  if (today.missions > 0) {
    parts.push(`${today.missions} mission${today.missions > 1 ? "s" : ""} detected`);
  }
  if (today.fixes > 0) {
    parts.push(`${today.fixes} fix${today.fixes > 1 ? "es" : ""} applied`);
  }
  if (today.models > 0) {
    parts.push(`${today.models} model run${today.models > 1 ? "s" : ""}`);
  }
  if (today.workflows > 0) {
    parts.push(`${today.workflows} workflow action${today.workflows > 1 ? "s" : ""}`);
  }

  const narrative = parts.join(", ");

  // Add quality context
  const quality = vitals?.quality.overall ?? 0;
  const hasFailed = pipeline?.overall === "failed";

  if (hasFailed) {
    return `Today: ${narrative}. ⚠️ A pipeline stage needs attention — check the data status above.`;
  }
  if (quality >= 90) {
    return `Today: ${narrative}. County data is in great shape.`;
  }
  if (today.fixes > 0) {
    return `Today: ${narrative}. Nice progress on data quality.`;
  }
  return `Today: ${narrative}.`;
}

// ─── Summary Pill ─────────────────────────────────────────────

const PILL_CONFIG = [
  { key: "imports", label: "Imports", icon: Upload, color: "text-chart-2", bg: "bg-chart-2/10" },
  { key: "missions", label: "Missions", icon: Target, color: "text-chart-4", bg: "bg-chart-4/10" },
  { key: "fixes", label: "Fixes", icon: Wrench, color: "text-chart-1", bg: "bg-chart-1/10" },
  { key: "models", label: "Models", icon: Cpu, color: "text-chart-5", bg: "bg-chart-5/10" },
  { key: "workflows", label: "Workflows", icon: Activity, color: "text-chart-3", bg: "bg-chart-3/10" },
] as const;

// ─── Top NBA summary ─────────────────────────────────────────

function deriveTopAction(
  vitals: ReturnType<typeof useCountyVitals>["data"]
): { label: string; target: string } | null {
  if (!vitals) return null;

  const total = vitals.parcels.total;

  // Failed ingest = top priority
  const failedJob = vitals.ingest.recentJobs.find(j => j.status === "failed");
  if (failedJob) {
    return { label: `Fix failed import: ${failedJob.file_name}`, target: "home:ids" };
  }

  // Missing coords
  const missingCoords = total - vitals.parcels.withCoords;
  if (missingCoords > 0 && total > 0) {
    const pct = Math.round((missingCoords / total) * 100);
    if (pct > 10) {
      return { label: `Geocode ${missingCoords.toLocaleString()} parcels (${pct}% missing)`, target: "factory:geoequity" };
    }
  }

  // Pending appeals
  if (vitals.workflows.pendingAppeals > 0) {
    return { label: `Review ${vitals.workflows.pendingAppeals} pending appeal${vitals.workflows.pendingAppeals > 1 ? "s" : ""}`, target: "workbench:dais:appeals" };
  }

  // Quality below threshold
  if (vitals.quality.overall < 80) {
    return { label: `Improve data quality (currently ${vitals.quality.overall}%)`, target: "home:quality" };
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────

interface DailyBriefingProps {
  onNavigate: (target: string) => void;
  onTimelineFilter?: (type: string) => void;
}

export function DailyBriefing({ onNavigate, onTimelineFilter }: DailyBriefingProps) {
  const { data: today } = useTodaySummary();
  const { data: vitals } = useCountyVitals();
  const { data: pipeline } = usePipelineStatus();

  const narrative = generateNarrative(today, vitals, pipeline);
  const topAction = deriveTopAction(vitals);

  // Don't render if no data at all
  if (!vitals) return null;

  const greeting = getGreeting();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="material-bento p-5 border-l-4 border-l-[hsl(var(--tf-transcend-cyan))]"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.1)]">
          <Sunrise className="w-4 h-4 text-tf-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{greeting} Briefing</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {narrative}
          </p>
        </div>
        {today && today.total > 0 && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-tf-cyan border-[hsl(var(--tf-transcend-cyan)/0.3)] shrink-0">
            {today.total} events today
          </Badge>
        )}
      </div>

      {/* Activity pills */}
      {today && today.total > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {PILL_CONFIG.map(pill => {
            const count = today[pill.key as keyof TodaySummary] as number;
            if (count === 0) return null;
            return (
              <button
                key={pill.key}
                onClick={() => onTimelineFilter?.(pill.key === "imports" ? "ingest" : pill.key === "missions" ? "mission" : pill.key === "fixes" ? "fix" : pill.key === "models" ? "model" : "workflow")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                  pill.bg, pill.color, "hover:opacity-80"
                )}
              >
                <pill.icon className="w-3 h-3" />
                <span className="font-semibold">{count}</span>
                <span className="opacity-70">{pill.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Top recommended action */}
      {topAction && (
        <button
          onClick={() => onNavigate(topAction.target)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] border border-border/40 hover:border-[hsl(var(--tf-transcend-cyan)/0.3)] hover:bg-[hsl(var(--tf-transcend-cyan)/0.04)] transition-all group text-left"
        >
          <Zap className="w-3.5 h-3.5 text-tf-cyan shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Recommended next action
            </p>
            <p className="text-xs font-medium text-foreground mt-0.5 truncate">
              {topAction.label}
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      )}
    </motion.div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
