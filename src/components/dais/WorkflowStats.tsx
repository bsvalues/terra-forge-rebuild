import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileCheck,
  ClipboardCheck,
  Scale,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowStatsProps {
  onSelectCategory: (category: string) => void;
  activeCategory: string;
}

export function WorkflowStats({ onSelectCategory, activeCategory }: WorkflowStatsProps) {
  // Fetch appeals count
  const { data: appealsData } = useQuery({
    queryKey: ["appeals-stats"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "scheduled"]);

      const { count: totalCount } = await supabase
        .from("appeals")
        .select("*", { count: "exact", head: true });

      return {
        pending: pendingCount || 0,
        total: totalCount || 0,
      };
    },
  });

  const stats = [
    {
      id: "permits",
      title: "Permits",
      icon: FileCheck,
      pending: 12,
      total: 45,
      color: "tf-green",
      trend: "+3 this week",
    },
    {
      id: "exemptions",
      title: "Exemptions",
      icon: ClipboardCheck,
      pending: 8,
      total: 156,
      color: "tf-gold",
      trend: "5 expiring soon",
    },
    {
      id: "appeals",
      title: "Appeals",
      icon: Scale,
      pending: appealsData?.pending || 0,
      total: appealsData?.total || 0,
      color: "tf-amber",
      trend: `${appealsData?.pending || 0} active`,
    },
    {
      id: "notices",
      title: "Notices",
      icon: Bell,
      pending: 0,
      total: 234,
      color: "tf-cyan",
      trend: "All sent",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={`glass-card border-tf-border cursor-pointer transition-all hover:border-${stat.color}/50 ${
              activeCategory === stat.id ? `border-${stat.color}/50 bg-${stat.color}/5` : ""
            }`}
            onClick={() => onSelectCategory(stat.id)}
          >
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-${stat.color}/20 flex items-center justify-center`}
                >
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-light text-${stat.color}`}>
                    {stat.pending}
                  </div>
                  <div className="text-xs text-muted-foreground">pending</div>
                </div>
              </div>
              <h3 className="font-medium text-foreground mb-1">{stat.title}</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stat.total} total</span>
                <span className={`text-${stat.color}`}>{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
