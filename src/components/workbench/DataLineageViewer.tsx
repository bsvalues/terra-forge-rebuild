import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  GitBranch, ArrowRight, Database, Hammer, Globe,
  Building2, FolderOpen, Shield, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LineageNode {
  id: string;
  label: string;
  suite: "os" | "forge" | "atlas" | "dais" | "dossier" | "trace";
  type: "source" | "transform" | "output";
  description: string;
}

interface LineageEdge {
  from: string;
  to: string;
  label: string;
}

const suiteConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  os: { icon: Database, color: "text-primary", bg: "bg-primary/20" },
  forge: { icon: Hammer, color: "text-suite-forge", bg: "bg-suite-forge/20" },
  atlas: { icon: Globe, color: "text-suite-atlas", bg: "bg-suite-atlas/20" },
  dais: { icon: Building2, color: "text-suite-dais", bg: "bg-suite-dais/20" },
  dossier: { icon: FolderOpen, color: "text-suite-dossier", bg: "bg-suite-dossier/20" },
  trace: { icon: Shield, color: "text-tf-green", bg: "bg-tf-green/20" },
};

/**
 * Shows the data lineage for a parcel's assessed value — tracing from
 * raw data sources through transformations to outputs like notices and packets.
 */
const parcelLineageNodes: LineageNode[] = [
  { id: "cama", label: "CAMA Import", suite: "os", type: "source", description: "Property characteristics synced from county CAMA system" },
  { id: "sales", label: "Sales Data", suite: "os", type: "source", description: "Arms-length qualified sales from MLS and deed records" },
  { id: "gis", label: "GIS Boundaries", suite: "atlas", type: "source", description: "Parcel geometry, neighborhood polygons, flood zones" },
  { id: "calibration", label: "Model Calibration", suite: "forge", type: "transform", description: "Regression coefficients fitted per neighborhood" },
  { id: "cost-sched", label: "Cost Schedules", suite: "forge", type: "transform", description: "RCN rates by property class, quality, and year" },
  { id: "assessment", label: "Assessment Value", suite: "forge", type: "transform", description: "Final assessed value from reconciled approaches" },
  { id: "equity-check", label: "Equity Analysis", suite: "forge", type: "transform", description: "COD/PRD/median ratio verification per IAAO standards" },
  { id: "notice", label: "Value Notice", suite: "dais", type: "output", description: "Official notice of assessed value sent to property owner" },
  { id: "appeal", label: "Appeal Record", suite: "dais", type: "output", description: "Owner's formal appeal of assessed value" },
  { id: "dossier", label: "Evidence Packet", suite: "dossier", type: "output", description: "Assembled BOE defense packet with narratives and comps" },
  { id: "trace", label: "Audit Trail", suite: "trace", type: "output", description: "Immutable record of all value changes and decisions" },
];

const parcelLineageEdges: LineageEdge[] = [
  { from: "cama", to: "calibration", label: "characteristics" },
  { from: "sales", to: "calibration", label: "qualified sales" },
  { from: "gis", to: "calibration", label: "spatial context" },
  { from: "cama", to: "cost-sched", label: "property class" },
  { from: "calibration", to: "assessment", label: "model output" },
  { from: "cost-sched", to: "assessment", label: "cost value" },
  { from: "assessment", to: "equity-check", label: "verify" },
  { from: "equity-check", to: "notice", label: "certified value" },
  { from: "notice", to: "appeal", label: "if disputed" },
  { from: "appeal", to: "dossier", label: "evidence needed" },
  { from: "assessment", to: "trace", label: "audit" },
  { from: "notice", to: "trace", label: "audit" },
];

export function DataLineageViewer() {
  // Group nodes by type for column layout
  const columns = useMemo(() => ({
    source: parcelLineageNodes.filter((n) => n.type === "source"),
    transform: parcelLineageNodes.filter((n) => n.type === "transform"),
    output: parcelLineageNodes.filter((n) => n.type === "output"),
  }), []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Data Lineage</h3>
        <Badge variant="outline" className="text-[10px]">Parcel Value Chain</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Traces how a parcel's assessed value flows from raw data sources through valuation models to official outputs.
      </p>

      {/* Three-column flow */}
      <div className="grid grid-cols-3 gap-4">
        {/* Sources */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1">
            <Database className="w-3 h-3" /> Data Sources
          </div>
          {columns.source.map((node, idx) => (
            <LineageNodeCard key={node.id} node={node} delay={idx * 0.05} />
          ))}
        </div>

        {/* Transforms */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Transformations
          </div>
          {columns.transform.map((node, idx) => (
            <LineageNodeCard key={node.id} node={node} delay={0.15 + idx * 0.05} />
          ))}
        </div>

        {/* Outputs */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Outputs
          </div>
          {columns.output.map((node, idx) => (
            <LineageNodeCard key={node.id} node={node} delay={0.3 + idx * 0.05} />
          ))}
        </div>
      </div>

      {/* Edge legend */}
      <div className="material-bento rounded-lg p-3">
        <div className="text-[10px] text-muted-foreground font-medium mb-2">Flow Connections</div>
        <div className="flex flex-wrap gap-2">
          {parcelLineageEdges.map((edge, i) => {
            const fromNode = parcelLineageNodes.find((n) => n.id === edge.from);
            const toNode = parcelLineageNodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            return (
              <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[9px] px-1">{fromNode.label}</Badge>
                <ArrowRight className="w-2.5 h-2.5" />
                <Badge variant="outline" className="text-[9px] px-1">{toNode.label}</Badge>
                <span className="text-muted-foreground/60">({edge.label})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LineageNodeCard({ node, delay }: { node: LineageNode; delay: number }) {
  const suite = suiteConfig[node.suite];
  const Icon = suite.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="material-bento rounded-lg p-3 space-y-1"
    >
      <div className="flex items-center gap-2">
        <div className={cn("w-6 h-6 rounded flex items-center justify-center", suite.bg)}>
          <Icon className={cn("w-3.5 h-3.5", suite.color)} />
        </div>
        <span className="text-xs font-medium text-foreground">{node.label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{node.description}</p>
    </motion.div>
  );
}
