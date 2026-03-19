// TerraFusion OS — SLCo Demo Landing Dashboard (Phase 63)
// Executive-grade overview for Salt Lake County assessors.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, MapPin, TrendingUp, Shield, BarChart3,
  ArrowRight, CheckCircle2, Clock, Database, Users,
  Layers, Scale, FileText, Rocket, Sparkles, Activity,
  AlertTriangle, Globe, Mountain, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useCountyVitals } from "@/hooks/useCountyVitals";

// ── Quick-start template definitions ───────────────────────────────
const QUICK_START_TEMPLATES = [
  {
    id: "annual-reval",
    icon: TrendingUp,
    title: "Annual Revaluation",
    desc: "Full county revaluation workflow — ingest, calibrate, certify, notify",
    steps: ["Ingest UGRC data", "Run regression models", "Review ratio studies", "Certify neighborhoods", "Generate notices"],
    duration: "4-6 weeks",
    color: "text-primary",
  },
  {
    id: "appeal-defense",
    icon: Scale,
    title: "Appeal Defense Prep",
    desc: "Assemble evidence packets for BOE hearings with AI-drafted narratives",
    steps: ["Pull appeal queue", "Generate comp grids", "Draft defense narratives", "Assemble BOE packets"],
    duration: "1-2 weeks",
    color: "text-amber-400",
  },
  {
    id: "data-onboard",
    icon: Database,
    title: "County Data Onboarding",
    desc: "First-time data import from UGRC, Recorder, and CAMA sources",
    steps: ["Configure sources", "Run SLCO Pipeline", "Validate quality", "Publish data marts"],
    duration: "2-3 days",
    color: "text-emerald-400",
  },
  {
    id: "neighborhood-review",
    icon: MapPin,
    title: "Neighborhood Review",
    desc: "Focused spatial analysis and equity review for targeted neighborhoods",
    steps: ["Select neighborhoods", "Run spatial analysis", "Check equity metrics", "Certify results"],
    duration: "1-2 weeks",
    color: "text-blue-400",
  },
];

// ── SLCo jurisdiction districts ────────────────────────────────────
const SLCO_DISTRICTS = [
  { name: "Salt Lake City", parcels: 62_400, status: "active" as const },
  { name: "West Valley City", parcels: 31_200, status: "active" as const },
  { name: "West Jordan", parcels: 24_800, status: "pending" as const },
  { name: "Sandy", parcels: 22_100, status: "active" as const },
  { name: "South Jordan", parcels: 18_600, status: "pending" as const },
  { name: "Taylorsville", parcels: 16_900, status: "pending" as const },
  { name: "Murray", parcels: 12_300, status: "pending" as const },
  { name: "Midvale", parcels: 8_700, status: "pending" as const },
  { name: "Cottonwood Heights", parcels: 7_200, status: "pending" as const },
  { name: "Draper", parcels: 11_400, status: "pending" as const },
  { name: "Herriman", parcels: 14_100, status: "pending" as const },
  { name: "Riverton", parcels: 13_500, status: "pending" as const },
];

// ── Onboarding Step Card ───────────────────────────────────────────
function OnboardingStep({
  step,
  title,
  desc,
  completed,
  active,
  onAction,
  actionLabel,
}: {
  step: number;
  title: string;
  desc: string;
  completed: boolean;
  active: boolean;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1 }}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
        completed
          ? "bg-emerald-500/5 border-emerald-500/20"
          : active
            ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/5"
            : "bg-muted/10 border-border/20"
      }`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 ${
          completed
            ? "bg-emerald-500/20 text-emerald-400"
            : active
              ? "bg-primary/20 text-primary"
              : "bg-muted/30 text-muted-foreground"
        }`}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {active && onAction && (
        <Button size="sm" onClick={onAction} className="text-xs gap-1 flex-shrink-0">
          {actionLabel || "Start"}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
interface SLCODemoLandingProps {
  onNavigate: (target: string) => void;
}

export function SLCODemoLanding({ onNavigate }: SLCODemoLandingProps) {
  const { data: vitals } = useCountyVitals();
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const totalParcels = vitals?.parcels?.total || 0;
  const qualityScore = vitals?.quality?.overall || 0;

  // Determine onboarding state
  const hasData = totalParcels > 0;
  const onboardingSteps = [
    { title: "Connect Data Sources", desc: "Configure UGRC, Recorder, and CAMA connections", completed: true },
    { title: "Run Initial Pipeline", desc: "Ingest and normalize Salt Lake County parcel data", completed: hasData },
    { title: "Validate & Remediate Data", desc: "AI-powered diagnosis, PostGIS-driven repair, human-approved fixes", completed: hasData && qualityScore > 60 },
    { title: "Configure Neighborhoods", desc: "Define neighborhood boundaries and model areas", completed: false },
    { title: "Launch Revaluation", desc: "Begin annual revaluation cycle with calibrated models", completed: false },
  ];

  const completedSteps = onboardingSteps.filter((s) => s.completed).length;
  const activeStepIdx = onboardingSteps.findIndex((s) => !s.completed);
  const onboardingProgress = Math.round((completedSteps / onboardingSteps.length) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/3 rounded-full blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
                <Mountain className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Salt Lake County</h1>
                <p className="text-sm text-muted-foreground">
                  TerraFusion OS — Assessment Operations Center
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              Welcome to the TerraFusion demo environment for Salt Lake County.
              This operational hub provides real-time access to parcel data, valuation models,
              and assessor workflows across all SLCo jurisdictions.
            </p>
            <div className="flex gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Globe className="h-3 w-3" />
                FIPS 49035
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <MapPin className="h-3 w-3" />
                {SLCO_DISTRICTS.length} Jurisdictions
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Building2 className="h-3 w-3" />
                ~350K Parcels
              </Badge>
            </div>
          </div>

          {/* Right stats */}
          <div className="hidden lg:flex gap-4">
            {[
              { label: "Parcels Loaded", value: totalParcels.toLocaleString(), icon: Database },
              { label: "Data Quality", value: `${qualityScore}%`, icon: Shield },
              { label: "Onboarding", value: `${onboardingProgress}%`, icon: Rocket },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-card/80 border border-border/30 min-w-[120px] text-center">
                <stat.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold font-mono">{stat.value}</div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Guided Onboarding ─────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Getting Started — SLCo Assessor Onboarding
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {completedSteps}/{onboardingSteps.length} Complete
            </Badge>
          </div>
          <Progress value={onboardingProgress} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {onboardingSteps.map((s, i) => (
            <OnboardingStep
              key={i}
              step={i + 1}
              title={s.title}
              desc={s.desc}
              completed={s.completed}
              active={i === activeStepIdx}
              onAction={
                i === activeStepIdx
                  ? () => {
                      if (i === 0) onNavigate("slco-pipeline");
                      else if (i === 1) onNavigate("slco-pipeline");
                      else if (i === 2) onNavigate("data-doctor");
                      else if (i === 3) onNavigate("neighborhoods");
                      else onNavigate("dashboard");
                    }
                  : undefined
              }
              actionLabel={
                i === 0 ? "Configure" :
                i === 1 ? "Run Pipeline" :
                i === 2 ? "Review Quality" :
                i === 3 ? "Define Areas" :
                "Begin"
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* ── Jurisdiction Map (Interactive Grid) ───────────────────── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            SLCo Jurisdiction Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {SLCO_DISTRICTS.map((d) => (
              <motion.div
                key={d.name}
                whileHover={{ scale: 1.03 }}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  d.status === "active"
                    ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                    : "bg-muted/10 border-border/20 hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {d.status === "active" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-[10px] font-semibold truncate">{d.name}</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono">
                  {d.parcels.toLocaleString()} parcels
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Data Loaded
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pending
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator className="opacity-30" />

      {/* ── Quick-Start Templates ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Quick-Start Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUICK_START_TEMPLATES.map((t) => {
            const expanded = expandedTemplate === t.id;
            return (
              <motion.div key={t.id} layout>
                <Card
                  className="border-border/50 bg-card/80 hover:bg-card cursor-pointer transition-colors"
                  onClick={() => setExpandedTemplate(expanded ? null : t.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <t.icon className={`h-5 w-5 ${t.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{t.title}</h3>
                          <Badge variant="outline" className="text-[9px]">{t.duration}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>

                        {expanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 space-y-1.5"
                          >
                            {t.steps.map((step, i) => (
                              <div key={i} className="flex items-center gap-2 text-[10px]">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary flex-shrink-0">
                                  {i + 1}
                                </div>
                                <span>{step}</span>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              className="mt-2 text-xs w-full gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (t.id === "annual-reval") onNavigate("dashboard");
                                else if (t.id === "appeal-defense") onNavigate("appeal-insights");
                                else if (t.id === "data-onboard") onNavigate("slco-pipeline");
                                else onNavigate("neighborhoods");
                              }}
                            >
                              Launch Template
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Quick Navigation Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Database, label: "SLCo Pipeline", view: "slco-pipeline", desc: "Ingestion & normalization" },
          { icon: BarChart3, label: "Command Briefing", view: "dashboard", desc: "County overview" },
          { icon: Scale, label: "Appeal Insights", view: "appeal-insights", desc: "Filing trends & defense" },
          { icon: Activity, label: "Activity Feed", view: "activity", desc: "Real-time audit trail" },
        ].map((nav) => (
          <Card
            key={nav.view}
            className="border-border/50 bg-card/80 hover:bg-card cursor-pointer transition-all hover:border-primary/30 group"
            onClick={() => onNavigate(nav.view)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <nav.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-xs font-semibold">{nav.label}</span>
                <p className="text-[9px] text-muted-foreground">{nav.desc}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
