import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Upload,
  ArrowRight,
  Activity,
  Globe,
  Building2,
  Shield,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TerraTraceActivityFeed } from "@/components/proof/TerraTraceActivityFeed";
import { SystemHealthPanel } from "./SystemHealthPanel";

interface CommandBriefingProps {
  onNavigate: (module: string) => void;
}

export function CommandBriefing({ onNavigate }: CommandBriefingProps) {
  const { data: parcelsCount } = useQuery({
    queryKey: ["briefing-parcels"],
    queryFn: async () => {
      const { count } = await supabase.from("parcels").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: salesCount } = useQuery({
    queryKey: ["briefing-sales"],
    queryFn: async () => {
      const { count } = await supabase.from("sales").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: assessmentsCount } = useQuery({
    queryKey: ["briefing-assessments"],
    queryFn: async () => {
      const { count } = await supabase.from("assessments").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: recentJobs } = useQuery({
    queryKey: ["briefing-ingest-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ingest_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Health indicators
  const { data: pendingAppeals } = useQuery({
    queryKey: ["briefing-pending-appeals"],
    queryFn: async () => {
      const { count } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true })
        .in("status", ["filed", "pending", "scheduled"]);
      return count || 0;
    },
  });

  const { data: openPermits } = useQuery({
    queryKey: ["briefing-open-permits"],
    queryFn: async () => {
      const { count } = await supabase
        .from("permits")
        .select("*", { count: "exact", head: true })
        .in("status", ["applied", "pending", "issued"]);
      return count || 0;
    },
  });

  const { data: pendingExemptions } = useQuery({
    queryKey: ["briefing-pending-exemptions"],
    queryFn: async () => {
      const { count } = await supabase
        .from("exemptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  // Certification readiness
  const { data: certStats } = useQuery({
    queryKey: ["briefing-cert-readiness"],
    queryFn: async () => {
      const { count: totalAssessments } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true });
      const { count: certifiedCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("certified", true);
      const total = totalAssessments || 0;
      const certified = certifiedCount || 0;
      const rate = total > 0 ? Math.round((certified / total) * 100) : 0;
      return { total, certified, rate };
    },
  });

  const { data: dataQuality } = useQuery({
    queryKey: ["briefing-data-quality"],
    queryFn: async () => {
      const total = parcelsCount || 1;
      const { count: withCoords } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .not("latitude", "is", null);
      const { count: withClass } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .not("property_class", "is", null);
      const { count: withNbhd } = await supabase
        .from("parcels")
        .select("*", { count: "exact", head: true })
        .not("neighborhood_code", "is", null);

      const coordsPct = Math.round(((withCoords || 0) / total) * 100);
      const classPct = Math.round(((withClass || 0) / total) * 100);
      const nbhdPct = Math.round(((withNbhd || 0) / total) * 100);
      const overall = Math.round((coordsPct + classPct + nbhdPct) / 3);

      return { coordsPct, classPct, nbhdPct, overall };
    },
    enabled: (parcelsCount || 0) > 0,
  });

  const cards = [
    { label: "Parcels", value: parcelsCount || 0, icon: Database, color: "text-tf-cyan" },
    { label: "Sales", value: salesCount || 0, icon: TrendingUp, color: "text-tf-green" },
    { label: "Assessments", value: assessmentsCount || 0, icon: CheckCircle2, color: "text-tf-gold" },
  ];

  const needsData = (salesCount || 0) < 100;

  const quickActions = [
    {
      title: "Equity Analysis",
      description: "IAAO ratio studies, COD, PRD & tier analysis",
      icon: Activity,
      color: "from-suite-forge/20 to-suite-forge/5",
      borderColor: "border-suite-forge/30",
      iconColor: "text-suite-forge",
      target: "workbench:forge",
    },
    {
      title: "GeoEquity Map",
      description: "Spatial equity heatmaps & neighborhood analysis",
      icon: Globe,
      color: "from-suite-atlas/20 to-suite-atlas/5",
      borderColor: "border-suite-atlas/30",
      iconColor: "text-suite-atlas",
      target: "workbench:atlas",
    },
    {
      title: "Workflows",
      description: "Appeals, permits, exemptions & certification",
      icon: Building2,
      color: "from-suite-dais/20 to-suite-dais/5",
      borderColor: "border-suite-dais/30",
      iconColor: "text-suite-dais",
      target: "workbench:dais",
    },
    {
      title: "Data Ingest",
      description: "Import parcel rolls, sales & GIS data",
      icon: Upload,
      color: "from-tf-cyan/20 to-tf-bright-cyan/5",
      borderColor: "border-tf-cyan/30",
      iconColor: "text-tf-cyan",
      target: "ids",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-light text-foreground">Valuation Command Briefing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          System-wide data health and operational readiness
        </p>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-tf-elevated/50 border-tf-border">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-light">{card.value.toLocaleString()}</p>
                  </div>
                  <Icon className={`w-10 h-10 ${card.color} opacity-50`} />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Action Cards — Jump into Workbench suites */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Jump Into
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <button
                  onClick={() => onNavigate(action.target)}
                  className={`w-full text-left p-4 rounded-xl bg-gradient-to-br ${action.color} border ${action.borderColor} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-background/50 ${action.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">{action.title}</h4>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* System Health Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Data Quality Score */}
        <Card
          className="bg-tf-elevated/50 border-tf-border cursor-pointer hover:border-tf-cyan/40 transition-colors group"
          onClick={() => onNavigate("ids:quality")}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-tf-cyan/20">
                <Shield className="w-4 h-4 text-tf-cyan" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Data Quality</h4>
                <p className="text-xs text-muted-foreground">Parcel completeness score</p>
              </div>
              <Badge variant="outline" className={`ml-auto ${
                (dataQuality?.overall ?? 0) >= 80 ? "bg-tf-green/10 text-tf-green border-tf-green/30" :
                (dataQuality?.overall ?? 0) >= 50 ? "bg-tf-gold/10 text-tf-gold border-tf-gold/30" :
                "bg-destructive/10 text-destructive border-destructive/30"
              }`}>
                {dataQuality?.overall ?? 0}%
              </Badge>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-2">
              <QualityBar label="Coordinates" value={dataQuality?.coordsPct ?? 0} />
              <QualityBar label="Property Class" value={dataQuality?.classPct ?? 0} />
              <QualityBar label="Neighborhood" value={dataQuality?.nbhdPct ?? 0} />
            </div>
          </CardContent>
        </Card>

        {/* Pending Workflows */}
        <Card className="bg-tf-elevated/50 border-tf-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-suite-dais/20">
                <Clock className="w-4 h-4 text-suite-dais" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Pending Workflows</h4>
                <p className="text-xs text-muted-foreground">Items requiring attention</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => onNavigate("workbench:dais:appeals")}
                className="p-3 rounded-lg bg-tf-surface/50 hover:bg-tf-surface transition-colors text-center"
              >
                <p className="text-2xl font-light text-suite-dais">{pendingAppeals ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Appeals</p>
              </button>
              <button
                onClick={() => onNavigate("workbench:dais:permits")}
                className="p-3 rounded-lg bg-tf-surface/50 hover:bg-tf-surface transition-colors text-center"
              >
                <p className="text-2xl font-light text-tf-gold">{openPermits ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Permits</p>
              </button>
              <button
                onClick={() => onNavigate("workbench:dais:exemptions")}
                className="p-3 rounded-lg bg-tf-surface/50 hover:bg-tf-surface transition-colors text-center"
              >
                <p className="text-2xl font-light text-tf-green">{pendingExemptions ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Exemptions</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Get Started CTA */}
      {needsData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-br from-tf-cyan/10 to-tf-bright-cyan/5 border-tf-cyan/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-tf-cyan/20">
                    <Upload className="w-6 h-6 text-tf-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Get Started: Import Your Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your county's parcel rolls and sales data to unlock ratio studies and equity analysis.
                    </p>
                  </div>
                </div>
                <Button onClick={() => onNavigate("ids")} className="bg-tf-cyan hover:bg-tf-cyan/80">
                  Open IDS
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* System Health + Certification Readiness */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <SystemHealthPanel />

        {/* Certification Readiness */}
        <Card
          className="bg-card/50 border-border cursor-pointer hover:border-primary/40 transition-colors group"
          onClick={() => onNavigate("workbench:dais:certification")}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-chart-5/20">
                <CheckCircle2 className="w-4 h-4 text-chart-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium">Roll Certification</h4>
                <p className="text-xs text-muted-foreground">Assessment certification progress</p>
              </div>
              <Badge variant="outline" className={`${
                (certStats?.rate ?? 0) >= 90 ? "bg-chart-5/10 text-chart-5 border-chart-5/30" :
                (certStats?.rate ?? 0) >= 50 ? "bg-chart-4/10 text-chart-4 border-chart-4/30" :
                "bg-destructive/10 text-destructive border-destructive/30"
              }`}>
                {certStats?.rate ?? 0}%
              </Badge>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Certified</span>
                <span className="text-sm font-medium text-chart-5">{(certStats?.certified ?? 0).toLocaleString()}</span>
              </div>
              <Progress value={certStats?.rate ?? 0} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{(certStats?.certified ?? 0).toLocaleString()} of {(certStats?.total ?? 0).toLocaleString()} assessments</span>
                <span className="text-foreground font-medium">{certStats?.rate ?? 0}% complete</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity + TerraTrace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent Ingest Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs && recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.map((job: any) => (
                  <button
                    key={job.id}
                    onClick={() => onNavigate(`ids:versions:${job.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-tf-surface/50 hover:bg-tf-surface hover:border-purple-500/30 border border-transparent transition-colors text-left group"
                  >
                    <div>
                      <p className="text-sm font-medium">{job.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.target_table} • {job.row_count?.toLocaleString() || 0} rows
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        job.status === "complete" ? "bg-tf-green/10 text-tf-green border-tf-green/30" :
                        job.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-tf-cyan/10 text-tf-cyan border-tf-cyan/30"
                      }>
                        {job.status}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No ingest activity yet</p>
                <p className="text-xs mt-1">Import data through the IDS module to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-tf-elevated/50 border-tf-border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-tf-cyan" />
              TerraTrace Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TerraTraceActivityFeed limit={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QualityBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <Progress value={value} className="h-1.5 flex-1" />
      <span className="text-xs font-mono w-10 text-right">{value}%</span>
    </div>
  );
}
