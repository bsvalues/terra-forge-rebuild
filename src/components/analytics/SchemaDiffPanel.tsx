// TerraFusion OS — County Schema Diff Panel (Phase 188)
// Displays field coverage analysis for any county's ArcGIS layer.
// Shows matched (green), unmatched raw (yellow), missing canonical (red).

import { useState } from "react";
import { motion } from "framer-motion";
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountySchemaDiff } from "@/hooks/useCountySchemaDiff";
import { toast } from "sonner";

// ── County list (mirrors CountyReadinessReport registry) ──────────────────────

const COUNTY_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: "benton",    label: "Benton County" },
  { slug: "yakima",    label: "Yakima County" },
  { slug: "franklin",  label: "Franklin County" },
  { slug: "thurston",  label: "Thurston County" },
  { slug: "clark",     label: "Clark County" },
  { slug: "king",      label: "King County" },
  { slug: "snohomish", label: "Snohomish County" },
];

// ── Coverage gauge ────────────────────────────────────────────────────────────

function CoverageGauge({ pct }: { pct: number }) {
  const color =
    pct >= 70 ? "hsl(var(--tf-optimized-green))" :
    pct >= 40 ? "hsl(var(--tf-sacred-gold))" :
    "hsl(var(--tf-warning-red))";

  return (
    <div className="relative w-32 h-32 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="70%" outerRadius="90%"
          startAngle={90} endAngle={-270}
          data={[{ value: pct, fill: color }]}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted)/0.2)" }} cornerRadius={4} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
          {pct}%
        </span>
        <span className="text-[10px] text-muted-foreground">coverage</span>
      </div>
    </div>
  );
}

// ── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  raw,
  kind,
}: {
  label: string;
  raw?: string;
  kind: "matched" | "unmatched" | "missing";
}) {
  const cfg = {
    matched:  { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/8" },
    unmatched:{ icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/8"  },
    missing:  { icon: XCircle,       color: "text-rose-400",    bg: "bg-rose-500/8"   },
  }[kind];

  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bg}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} />
      <span className="text-xs font-mono text-foreground/80 flex-1 min-w-0 truncate">
        {label}
      </span>
      {raw && raw !== label && (
        <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[120px]">
          &larr; {raw}
        </span>
      )}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1">
      <button
        className="flex items-center gap-2 w-full text-left group"
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs font-medium text-foreground/70">{title}</span>
        <Badge variant="outline" className="text-[10px] ml-auto">{count}</Badge>
      </button>
      {open && <div className="space-y-1 pl-2">{children}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SchemaDiffPanel() {
  const [countySlug, setCountySlug] = useState("franklin");
  const { data, isLoading, error } = useCountySchemaDiff(countySlug);

  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[] = ["Canon Field,Raw Field,Status"];

    // Matched
    Object.entries(data.matched).forEach(([canon, raw]) => {
      rows.push(`"${canon}","${raw}","Matched"`);
    });

    // Unmatched raw fields (no canonical match)
    data.unmatched.forEach((raw) => {
      rows.push(`"","${raw}","Unmatched"`);
    });

    // Missing canonical fields
    data.missing_canonical.forEach((canon) => {
      rows.push(`"${canon}","","Missing"`);
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${countySlug}_schema_diff.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Schema diff exported", { description: `${countySlug}_schema_diff.csv saved.` });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">County Schema Diff</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ArcGIS field coverage vs. TerraFusion canonical schema
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={countySlug} onValueChange={setCountySlug}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {COUNTY_OPTIONS.map(({ slug, label }) => (
                <SelectItem key={slug} value={slug} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2 text-xs"
            onClick={handleExportCSV}
            disabled={!data}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {error && (
        <Card className="material-bento border-border/50">
          <CardContent className="p-6 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-2 text-rose-400/50" />
            <p className="text-sm text-muted-foreground">{String(error)}</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Summary card */}
          <Card className="material-bento border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-6 flex-wrap">
                <CoverageGauge pct={data.coverage_pct} />
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{data.layer_name ?? countySlug}</p>
                    <p className="text-xs text-muted-foreground">
                      Detected vendor: <span className="text-foreground/80 font-mono">{data.vendor}</span>
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{Object.keys(data.matched).length}</span> matched
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{data.unmatched.length}</span> unmatched raw
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{data.missing_canonical.length}</span> missing canonical
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fields card */}
          <Card className="material-bento border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Field Mapping Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Section title="Matched canonical fields" count={Object.keys(data.matched).length}>
                {Object.entries(data.matched).map(([canon, raw]) => (
                  <FieldRow key={canon} label={canon} raw={raw} kind="matched" />
                ))}
              </Section>
              {data.unmatched.length > 0 && (
                <Section title="Unmatched raw fields" count={data.unmatched.length} defaultOpen={false}>
                  {data.unmatched.map((f) => (
                    <FieldRow key={f} label={f} kind="unmatched" />
                  ))}
                </Section>
              )}
              {data.missing_canonical.length > 0 && (
                <Section title="Missing canonical fields" count={data.missing_canonical.length} defaultOpen={false}>
                  {data.missing_canonical.map((f) => (
                    <FieldRow key={f} label={f} kind="missing" />
                  ))}
                </Section>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
