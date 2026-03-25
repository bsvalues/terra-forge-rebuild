// TerraFusion OS — County Readiness Report (Phase 196)
// Per-county markdown-style readiness report:
//   schema coverage, key fields, vendor profile, next steps, download.
// Wraps useCountySchemaDiff + supabase parcel count.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, AlertTriangle, Download, Copy,
  MapPin, Database, FileText, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountySchemaDiff, type CountySchemaDiff } from "@/hooks/useCountySchemaDiff";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Static county registry (mirrors Python county_registry.py) ────────────────

interface CountyMeta {
  name: string;
  fips: string;
  vendor: string;
  vendorLabel: string;
  tier: 1 | 2 | 3;
  provisioned: boolean;
  openDataUrl: string | null;
}

const VENDOR_LABELS: Record<string, string> = {
  harris_govern_pacs: "Harris Govern PACS",
  tyler_iasworld:     "Tyler iasWorld / ProVal",
  aumentum_t2:        "Aumentum T2 (TerraScan 2)",
  aumentum_ascend:    "Aumentum Ascend",
  aumentum_sigma:     "Aumentum Sigma",
  inhouse:            "In-House Custom",
  generic_arcgis:     "ArcGIS (Auto-Detected)",
};

const COUNTY_META: Record<string, CountyMeta> = {
  benton:    { name: "Benton County",    fips: "53005", vendor: "harris_govern_pacs", vendorLabel: VENDOR_LABELS.harris_govern_pacs, tier: 1, provisioned: true,  openDataUrl: null },
  yakima:    { name: "Yakima County",    fips: "53077", vendor: "aumentum_ascend",    vendorLabel: VENDOR_LABELS.aumentum_ascend,    tier: 2, provisioned: false, openDataUrl: "https://gis.yakimacounty.us/arcgis/rest/services/Assessor/AssessorParcels/FeatureServer/0" },
  franklin:  { name: "Franklin County",  fips: "53021", vendor: "aumentum_t2",        vendorLabel: VENDOR_LABELS.aumentum_t2,        tier: 2, provisioned: false, openDataUrl: "https://gis.co.franklin.wa.us/arcgis/rest/services/Parcels/Parcels/FeatureServer/0" },
  thurston:  { name: "Thurston County",  fips: "53067", vendor: "aumentum_ascend",    vendorLabel: VENDOR_LABELS.aumentum_ascend,    tier: 2, provisioned: false, openDataUrl: "https://services.arcgis.com/qBoSerlfXyYNdJYP/arcgis/rest/services/..." },
  clark:     { name: "Clark County",     fips: "53011", vendor: "harris_govern_pacs", vendorLabel: VENDOR_LABELS.harris_govern_pacs, tier: 2, provisioned: false, openDataUrl: "https://gis.clark.wa.gov/giserv/.../Parcels/MapServer/0" },
  king:      { name: "King County",      fips: "53033", vendor: "inhouse",            vendorLabel: VENDOR_LABELS.inhouse,            tier: 2, provisioned: false, openDataUrl: "https://gismaps.kingcounty.gov/arcgis/.../KingCo_Parcel/..." },
  snohomish: { name: "Snohomish County", fips: "53061", vendor: "aumentum_ascend",    vendorLabel: VENDOR_LABELS.aumentum_ascend,    tier: 2, provisioned: false, openDataUrl: null },
};

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: "Tier 1 — Full CAMA + GIS",
  2: "Tier 2 — ArcGIS Open Data",
  3: "Tier 3 — WA DNR Fallback",
};

// ── Key fields driving assessor workflows ────────────────────────────────────

const KEY_FIELDS: Array<{ key: string; label: string }> = [
  { key: "parcel_id",      label: "Parcel ID" },
  { key: "owner_name",     label: "Owner Name" },
  { key: "situs_address",  label: "Situs Address" },
  { key: "market_value",   label: "Market Value" },
  { key: "assessed_value", label: "Assessed Value" },
  { key: "land_value",     label: "Land Value" },
  { key: "imprv_value",    label: "Imprv Value" },
  { key: "hood_cd",        label: "Neighborhood" },
  { key: "use_code",       label: "Use Code" },
  { key: "acres",          label: "Acreage" },
];

// ── Coverage helpers ──────────────────────────────────────────────────────────

function coverageLabel(pct: number): string {
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Fair";
  return "Poor";
}

function coverageColor(pct: number): string {
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  if (pct >= 40) return "text-orange-400";
  return "text-rose-400";
}

function coverageBarColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-rose-500";
}

// ── Next steps logic ──────────────────────────────────────────────────────────

function nextSteps(meta: CountyMeta, coveragePct: number): string[] {
  const steps: string[] = [];
  if (meta.tier === 3) {
    steps.push("Request ArcGIS parcel service URL from county GIS department");
    steps.push("Run seed_wa_dnr.py for baseline parcel data");
  }
  if (meta.tier === 2) {
    steps.push("Run county-specific seed script to populate parcels");
    steps.push("Validate centroids with backfill_centroids.py");
  }
  if (coveragePct < 60) {
    steps.push("Probe ArcGIS service fields; update field_alias_dict.json with missing aliases");
    steps.push("Request field mapping documentation from county assessor IT");
  }
  if (!meta.provisioned) {
    steps.push("Provision county row in Supabase counties table");
    steps.push("Run County Onboarding Wizard in TerraFusion Admin UI");
  }
  if (meta.tier <= 2 && coveragePct >= 60) {
    steps.push("Negotiate CAMA database direct access with vendor SLA");
    steps.push("Schedule demo with county assessor using open-data baseline");
  }
  if (meta.tier === 1) {
    steps.push("Enable sales ratio analysis via vw_sales_reconciliation_summary");
    steps.push("Run IAAO ratio studies: COD, PRD, median ratio");
  }
  return steps.length ? steps : ["County is fully onboarded — no immediate action required"];
}

// ── Download helpers ──────────────────────────────────────────────────────────

function buildMarkdown(
  slug: string,
  meta: CountyMeta,
  diff: CountySchemaDiff,
  parcelCount: number | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const coverage = diff.coverage_pct;
  const steps = nextSteps(meta, coverage);
  const bar = "█".repeat(Math.round(coverage / 5)) + "░".repeat(20 - Math.round(coverage / 5));

  const keyFieldRows = KEY_FIELDS.map(({ key, label }) => {
    const raw = diff.matched[key] ?? null;
    return `| ${label} | ${raw ? `✅ \`${raw}\`` : "❌"} |`;
  }).join("\n");

  const missingFields = diff.missing_canonical.length
    ? diff.missing_canonical.map((f) => `- \`${f}\``).join("\n")
    : "_None — full coverage_";

  return [
    `# ${meta.name} — TerraFusion Readiness Report`,
    "",
    `> Generated: ${today} | TerraFusion OS v1.0 | Phase 196`,
    "",
    "---",
    "",
    "## County Profile",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| **County** | ${meta.name} |`,
    `| **FIPS** | ${meta.fips} |`,
    `| **CAMA Vendor** | ${meta.vendorLabel} |`,
    `| **Data Tier** | ${TIER_LABELS[meta.tier]} |`,
    `| **Provisioned** | ${meta.provisioned ? "✅ Yes" : "❌ No"} |`,
    parcelCount != null ? `| **Parcel Count** | ${parcelCount.toLocaleString()} |` : "",
    "",
    "---",
    "",
    "## Schema Coverage",
    "",
    `${coverageLabel(coverage)} — [${bar}] ${coverage.toFixed(1)}%`,
    "",
    "### Key Fields",
    "",
    "| Field | Present |",
    "|-------|---------|",
    keyFieldRows,
    "",
    "### Missing Canonical Fields",
    "",
    missingFields,
    "",
    "---",
    "",
    "## Recommended Next Steps",
    "",
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "",
    "---",
    "",
    `*Report generated by TerraFusion OS — County Onboarding Module (Phase 196)*`,
  ].filter((l) => l !== undefined).join("\n");
}

function downloadMarkdown(slug: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}_readiness_report.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

export function CountyReadinessReport() {
  const [selectedSlug, setSelectedSlug] = useState<string>("benton");

  const meta = COUNTY_META[selectedSlug];
  const { data: diff, isLoading: diffLoading } = useCountySchemaDiff(selectedSlug);

  // Fetch county UUID by FIPS, then live parcel count
  const { data: countyRow } = useQuery({
    queryKey: ["county-by-fips", meta?.fips],
    queryFn: async () => {
      if (!meta?.fips) return null;
      const { data } = await supabase
        .from("counties")
        .select("id")
        .eq("fips_code", meta.fips)
        .maybeSingle();
      return data;
    },
    enabled: !!meta?.fips,
  });

  const selectedCountyId = countyRow?.id ?? null;

  const { data: liveParcelData } = useQuery({
    queryKey: ["parcel-count", selectedCountyId],
    queryFn: async () => {
      const { count } = await supabase
        .from("parcels")
        .select("id", { count: "exact", head: true })
        .eq("county_id", selectedCountyId!);
      return count;
    },
    enabled: !!selectedCountyId,
  });

  // Prefer live count when non-null, fall back to diff parcel count
  const displayParcelCount = liveParcelData != null ? liveParcelData : diff?.parcel_count ?? null;

  const handleDownload = () => {
    if (!meta || !diff) return;
    const content = buildMarkdown(selectedSlug, meta, diff, displayParcelCount);
    downloadMarkdown(selectedSlug, content);
  };

  const handleCopy = () => {
    if (!meta || !diff) return;
    const content = buildMarkdown(selectedSlug, meta, diff, displayParcelCount);
    navigator.clipboard.writeText(content);
    toast.success("Report copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">County Readiness Report</h2>
            <p className="text-xs text-white/50 mt-0.5">
              Schema coverage, vendor profile, and onboarding next steps per county
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!diff}
            className="h-8 gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!diff}
            className="h-8 gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Download className="w-3.5 h-3.5" />
            Download .md
          </Button>
        </div>
      </div>

      {/* County selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedSlug} onValueChange={setSelectedSlug}>
          <SelectTrigger className="w-56 bg-white/5 border-white/10 text-white text-sm">
            <MapPin className="w-3.5 h-3.5 mr-2 text-cyan-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            {Object.entries(COUNTY_META).map(([slug, m]) => (
              <SelectItem key={slug} value={slug} className="text-white/80 focus:bg-white/5 focus:text-white">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {meta && (
          <Badge className={`text-[10px] ${meta.provisioned ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-white/40 border-white/10"}`}>
            {meta.provisioned ? "Provisioned" : "Stub"}
          </Badge>
        )}
        <Badge className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
          {meta ? TIER_LABELS[meta.tier] : "—"}
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        {diffLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-white/5" />
            <Skeleton className="h-48 w-full bg-white/5" />
          </div>
        )}

        {!diffLoading && meta && diff && (
          <motion.div
            key={selectedSlug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Profile + Coverage row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* County profile */}
              <Card className="bg-white/3 border-white/8">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    County Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 text-xs">
                  {[
                    { label: "FIPS",    value: meta.fips },
                    { label: "Vendor",  value: meta.vendorLabel },
                    { label: "Tier",    value: TIER_LABELS[meta.tier] },
                    {
                      label: "Parcels",
                      value: displayParcelCount != null
                        ? `${displayParcelCount.toLocaleString()}${liveParcelData != null ? " (live)" : ""}`
                        : "N/A",
                    },
                    { label: "Layer",   value: diff.layer_name ?? "N/A" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-0.5 border-b border-white/5 last:border-0">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white/80 font-mono">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Schema coverage gauge */}
              <Card className="bg-white/3 border-white/8">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    Schema Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-end justify-between">
                    <span className={`text-3xl font-bold ${coverageColor(diff.coverage_pct)}`}>
                      {diff.coverage_pct.toFixed(0)}%
                    </span>
                    <span className={`text-sm font-medium ${coverageColor(diff.coverage_pct)}`}>
                      {coverageLabel(diff.coverage_pct)}
                    </span>
                  </div>
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 rounded-full ${coverageBarColor(diff.coverage_pct)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${diff.coverage_pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/3 rounded p-2">
                      <div className="text-white/40">Matched</div>
                      <div className="text-white font-semibold">{Object.keys(diff.matched).length} fields</div>
                    </div>
                    <div className="bg-white/3 rounded p-2">
                      <div className="text-white/40">Missing</div>
                      <div className="text-white font-semibold">{diff.missing_canonical.length} fields</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key fields table */}
            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/70">
                  Key Fields Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {KEY_FIELDS.map(({ key, label }) => {
                    const raw = diff.matched[key] ?? null;
                    return (
                      <div
                        key={key}
                        className={`rounded p-2 text-xs flex flex-col gap-1 ${
                          raw ? "bg-emerald-500/8 border border-emerald-500/20" : "bg-white/3 border border-white/8"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {raw ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-400/70 flex-shrink-0" />
                          )}
                          <span className={raw ? "text-white/80" : "text-white/40"}>{label}</span>
                        </div>
                        {raw && (
                          <span className="font-mono text-[10px] text-white/30 truncate">{raw}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Next steps */}
            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2">
                  {nextSteps(meta, diff.coverage_pct).map((step, i) => (
                    <li key={i} className="flex gap-3 text-xs text-white/60">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/8 text-white/40 flex items-center justify-center text-[10px] font-semibold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Unmatched fields (collapsible detail) */}
            {diff.missing_canonical.length > 0 && (
              <Card className="bg-white/3 border-white/8">
                <CardContent className="pt-4">
                  <p className="text-xs text-white/40 mb-2">
                    Missing canonical fields — no alias configured for <span className="font-mono text-white/50">{diff.vendor}</span>:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {diff.missing_canonical.map((f) => (
                      <Badge key={f} className="text-[10px] bg-rose-500/8 text-rose-400/70 border-rose-500/20 font-mono">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {!diffLoading && !diff && (
          <Card className="bg-white/3 border-white/8">
            <CardContent className="pt-8 pb-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400/50 mx-auto mb-3" />
              <p className="text-sm text-white/40">No schema data available for {meta?.name ?? selectedSlug}.</p>
              <p className="text-xs text-white/25 mt-1">Run a seed script or probe the ArcGIS service to generate data.</p>
            </CardContent>
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}
