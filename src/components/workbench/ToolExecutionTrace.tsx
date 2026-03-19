// TerraFusion OS — Phase 96: Tool Execution Trace Panel
// Live visualization of TerraPilot tool invocations with timing and status.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight,
  Navigation, Users, FileText, MapPin, Activity, Shield,
  BarChart3, Bell, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ToolStatus = "pending" | "running" | "success" | "failed";
type ToolRisk = "read" | "write-medium" | "write-high";

interface ToolExecution {
  id: string;
  toolId: string;
  toolName: string;
  category: string;
  suite: string;
  risk: ToolRisk;
  status: ToolStatus;
  startedAt: number;
  completedAt?: number;
  result?: string;
  error?: string;
}

// Demo data for visualization
const DEMO_EXECUTIONS: ToolExecution[] = [
  {
    id: "1", toolId: "search_parcels", toolName: "Search Parcels",
    category: "data", suite: "os", risk: "read", status: "success",
    startedAt: Date.now() - 5200, completedAt: Date.now() - 4800,
    result: "Found 3 parcels matching 'Main St'",
  },
  {
    id: "2", toolId: "route_to_parcel", toolName: "Open Parcel",
    category: "navigation", suite: "os", risk: "read", status: "success",
    startedAt: Date.now() - 4700, completedAt: Date.now() - 4500,
    result: "Navigated to parcel 16-05-230-001",
  },
  {
    id: "3", toolId: "fetch_comps", toolName: "Find Comparables",
    category: "data", suite: "forge", risk: "read", status: "success",
    startedAt: Date.now() - 4400, completedAt: Date.now() - 3200,
    result: "Located 8 comparable properties within 0.5mi",
  },
  {
    id: "4", toolId: "explain_value_change", toolName: "Explain Value Change",
    category: "explain", suite: "forge", risk: "read", status: "success",
    startedAt: Date.now() - 3100, completedAt: Date.now() - 1800,
    result: "Generated 340-word narrative explaining 12% increase",
  },
  {
    id: "5", toolId: "assemble_packet", toolName: "Assemble BOE Packet",
    category: "execution", suite: "dossier", risk: "write-medium", status: "running",
    startedAt: Date.now() - 1500,
  },
];

const SUITE_COLORS: Record<string, string> = {
  os: "text-muted-foreground",
  forge: "text-mode-valuation",
  atlas: "text-mode-mapping",
  dais: "text-mode-admin",
  dossier: "text-mode-case",
};

const CATEGORY_ICONS: Record<string, typeof Zap> = {
  navigation: Navigation,
  workflow: Users,
  data: BarChart3,
  execution: Zap,
  monitoring: Activity,
  draft: FileText,
  explain: FileText,
  summarize: FileText,
  synthesize: FileText,
  template: FileText,
};

const RISK_STYLES: Record<ToolRisk, { bg: string; text: string }> = {
  "read": { bg: "bg-muted/30", text: "text-muted-foreground" },
  "write-medium": { bg: "bg-chart-3/10", text: "text-chart-3" },
  "write-high": { bg: "bg-destructive/10", text: "text-destructive" },
};

function ExecutionRow({ exec }: { exec: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[exec.category] ?? Zap;
  const durationMs = exec.completedAt ? exec.completedAt - exec.startedAt : Date.now() - exec.startedAt;
  const risk = RISK_STYLES[exec.risk];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-l-2 border-border/30 pl-3 py-1.5"
    >
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 rounded px-1.5 py-1 -ml-1.5"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status indicator */}
        {exec.status === "running" ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
        ) : exec.status === "success" ? (
          <CheckCircle2 className="w-3 h-3 text-chart-5 shrink-0" />
        ) : exec.status === "failed" ? (
          <XCircle className="w-3 h-3 text-destructive shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
        )}

        <Icon className={cn("w-3.5 h-3.5 shrink-0", SUITE_COLORS[exec.suite])} />

        <span className="text-xs font-medium truncate flex-1">{exec.toolName}</span>

        <Badge variant="outline" className={cn("text-[8px] px-1 shrink-0", risk.text)}>
          {exec.risk}
        </Badge>

        <Badge variant="outline" className="text-[8px] px-1 shrink-0 capitalize">
          {exec.suite}
        </Badge>

        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
        </span>

        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-5 mt-1"
          >
            {exec.result && (
              <p className="text-[11px] text-muted-foreground bg-muted/20 rounded p-2">
                {exec.result}
              </p>
            )}
            {exec.error && (
              <p className="text-[11px] text-destructive bg-destructive/5 rounded p-2">
                {exec.error}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
              <span>Tool: <code className="font-mono">{exec.toolId}</code></span>
              <span>Started: {new Date(exec.startedAt).toLocaleTimeString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface ToolExecutionTraceProps {
  executions?: ToolExecution[];
  className?: string;
}

export function ToolExecutionTrace({ executions = DEMO_EXECUTIONS, className }: ToolExecutionTraceProps) {
  const running = executions.filter((e) => e.status === "running").length;
  const succeeded = executions.filter((e) => e.status === "success").length;
  const failed = executions.filter((e) => e.status === "failed").length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Tool Execution Trace</span>
        </div>
        <div className="flex items-center gap-2">
          {running > 0 && (
            <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30 gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              {running} active
            </Badge>
          )}
          <Badge variant="outline" className="text-[9px] text-chart-5">{succeeded} ok</Badge>
          {failed > 0 && (
            <Badge variant="outline" className="text-[9px] text-destructive">{failed} err</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-0.5 pr-2">
          {executions.map((exec) => (
            <ExecutionRow key={exec.id} exec={exec} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export type { ToolExecution, ToolStatus, ToolRisk };
