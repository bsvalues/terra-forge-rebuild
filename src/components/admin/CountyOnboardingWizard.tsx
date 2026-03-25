// TerraFusion OS — County Onboarding Wizard (Phase 191)
// 3-step guided flow: select county → review schema compatibility → confirm seed.
// Step 2 re-uses CountyCompatibilityScore card + schema diff data from Phase 188/189.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle2, MapPin, Terminal, Database, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCountySchemaDiff } from "@/hooks/useCountySchemaDiff";

// ── Open-data county registry (client-side) ───────────────────────────────────
const OPEN_DATA_COUNTIES = [
  { slug: "franklin",  name: "Franklin County",  fips: "53021", vendor: "aumentum_t2",     tier: "open-data" },
  { slug: "yakima",    name: "Yakima County",    fips: "53077", vendor: "aumentum_ascend", tier: "open-data" },
  { slug: "thurston",  name: "Thurston County",  fips: "53067", vendor: "aumentum_ascend", tier: "open-data" },
  { slug: "clark",     name: "Clark County",     fips: "53011", vendor: "harris_pacs",     tier: "open-data" },
  { slug: "king",      name: "King County",      fips: "53033", vendor: "inhouse",         tier: "open-data" },
  { slug: "snohomish", name: "Snohomish County", fips: "53061", vendor: "aumentum_ascend", tier: "open-data" },
] as const;

// ── CLI command generator ─────────────────────────────────────────────────────
function seedCommand(slug: string): string {
  return `py -3.12 scripts/seed_${slug}.py --limit 2000 --out ${slug}_sample.json`;
}

// ── Step indicators ───────────────────────────────────────────────────────────
function StepDot({ n, current }: { n: number; current: number }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors
      ${done ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400" :
        active ? "bg-primary/20 border-primary text-primary" :
        "bg-muted/30 border-border/50 text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );
}

// ── Step 1: County picker ─────────────────────────────────────────────────────
function Step1({ selected, onSelect }: { selected: string | null; onSelect: (s: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Select a county to onboard. All shown counties have public ArcGIS open-data feeds.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPEN_DATA_COUNTIES.map(({ slug, name, fips, vendor }) => (
          <button
            key={slug}
            onClick={() => onSelect(slug)}
            className={`text-left p-3 rounded-xl border transition-all
              ${selected === slug
                ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{vendor} · FIPS {fips}</p>
              </div>
              {selected === slug && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Schema compatibility review ───────────────────────────────────────
function Step2({ slug }: { slug: string }) {
  const { data, isLoading } = useCountySchemaDiff(slug);
  const county = OPEN_DATA_COUNTIES.find(c => c.slug === slug);

  if (isLoading || !data) {
    return <div className="text-xs text-muted-foreground text-center py-8">Loading schema data…</div>;
  }

  const matchedCount = Object.keys(data.matched).length;
  const totalCanonical = matchedCount + data.missing_canonical.length;
  const coverageColor =
    data.coverage_pct >= 70 ? "text-emerald-400" :
    data.coverage_pct >= 40 ? "text-amber-400" :
    "text-rose-400";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Schema analysis for <span className="text-foreground font-medium">{county?.name}</span> based on the ArcGIS field list.
        Coverage shows how many TerraFusion canonical fields can be mapped automatically.
      </p>

      <Card className="material-bento border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className={`text-3xl font-semibold tabular-nums ${coverageColor}`}>{data.coverage_pct}%</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">field coverage</p>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Schema coverage</span>
                <span className="text-foreground font-medium">{matchedCount}/{totalCanonical} fields</span>
              </div>
              <Progress value={data.coverage_pct} className="h-2" />
              <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                <span className="text-emerald-400">{matchedCount} matched</span>
                <span className="text-amber-400">{data.unmatched.length} unmatched raw</span>
                <span className="text-rose-400">{data.missing_canonical.length} missing</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
          <p className="text-muted-foreground font-medium">Detected vendor</p>
          <p className="font-mono text-foreground">{data.vendor}</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
          <p className="text-muted-foreground font-medium">Layer name</p>
          <p className="font-mono text-foreground">{data.layer_name ?? "Unknown"}</p>
        </div>
      </div>

      {data.missing_canonical.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <p className="text-[10px] text-rose-400 font-medium mb-1">Missing canonical fields</p>
          <p className="text-[10px] text-muted-foreground font-mono">{data.missing_canonical.join(", ")}</p>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Confirm + seed instructions ───────────────────────────────────────
function Step3({ slug }: { slug: string }) {
  const county = OPEN_DATA_COUNTIES.find(c => c.slug === slug);
  const cmd = seedCommand(slug);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Ready to seed {county?.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Run the seed script to ingest parcel data from the ArcGIS open-data feed.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">1 — Run the seed script</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-[hsl(var(--tf-substrate)/0.6)] border border-border/40 font-mono text-[11px] text-foreground/80 overflow-x-auto">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <code>{cmd}</code>
          </div>
          <button
            onClick={handleCopy}
            className="text-[11px] px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex-shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">2 — Upload to Supabase</p>
        <p className="text-xs text-muted-foreground">
          Run <code className="font-mono text-foreground/70 bg-muted/30 px-1 rounded">bun run dev</code> and use the Data Ops panel to push the JSON seed file,
          or pipe directly using the seeder's <code className="font-mono text-foreground/70 bg-muted/30 px-1 rounded">--supabase</code> flag (coming in Phase 194).
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">3 — Verify</p>
        <p className="text-xs text-muted-foreground">
          After seeding, visit <strong>County Compatibility</strong> to confirm the parcel count and schema score have updated.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-[11px] text-sky-400/80">
        <span className="font-medium text-sky-400">Note:</span> {county?.name} will appear as "Open Data" tier in the County Selector until a study period is created.
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function CountyOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const canAdvance = step === 1 ? !!selectedSlug : step < 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-2xl"
    >
      {/* Header */}
      <div>
        <h2 className="text-base font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          County Onboarding Wizard
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          3 steps to bring a new county's parcel data into TerraFusion
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <StepDot n={n} current={step} />
            {n < 3 && <div className={`h-px flex-1 w-8 transition-colors ${step > n ? "bg-emerald-500/50" : "bg-border/50"}`} />}
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-2">Step {step} of 3</span>
      </div>

      {/* Step content */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {step === 1 ? "Select County" : step === 2 ? "Review Schema" : "Seed Instructions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              {step === 1 && <Step1 selected={selectedSlug} onSelect={setSelectedSlug} />}
              {step === 2 && selectedSlug && <Step2 slug={selectedSlug} />}
              {step === 3 && selectedSlug && <Step3 slug={selectedSlug} />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All steps complete
          </div>
        )}
      </div>
    </motion.div>
  );
}
