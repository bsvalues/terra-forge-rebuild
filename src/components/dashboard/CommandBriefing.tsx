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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const cards = [
    { label: "Parcels", value: parcelsCount || 0, icon: Database, color: "text-tf-cyan" },
    { label: "Sales", value: salesCount || 0, icon: TrendingUp, color: "text-tf-green" },
    { label: "Assessments", value: assessmentsCount || 0, icon: CheckCircle2, color: "text-tf-gold" },
  ];

  const needsData = (salesCount || 0) < 100;

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

      {/* Action Cards */}
      {needsData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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

      {/* Recent Activity */}
      <Card className="bg-tf-elevated/50 border-tf-border">
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Ingest Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs && recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-tf-surface/50">
                  <div>
                    <p className="text-sm font-medium">{job.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.target_table} • {job.row_count?.toLocaleString() || 0} rows
                    </p>
                  </div>
                  <Badge variant="outline" className={
                    job.status === "complete" ? "bg-tf-green/10 text-tf-green border-tf-green/30" :
                    job.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                    "bg-tf-cyan/10 text-tf-cyan border-tf-cyan/30"
                  }>
                    {job.status}
                  </Badge>
                </div>
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
    </div>
  );
}
