import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileCheck,
  ClipboardCheck,
  Scale,
  Bell,
} from "lucide-react";
import {
  useAppealsStats,
  usePermitsStats,
  useExemptionsStats,
  useNoticesStats,
} from "@/hooks/useWorkflowStats";

interface WorkflowStatsProps {
  onSelectCategory: (category: string) => void;
  activeCategory: string;
}

export function WorkflowStats({ onSelectCategory, activeCategory }: WorkflowStatsProps) {
  const { data: appealsData } = useAppealsStats();
  const { data: permitsData } = usePermitsStats();
  const { data: exemptionsData } = useExemptionsStats();
  const { data: noticesData } = useNoticesStats();

  const stats = [
    {
      id: "permits",
      title: "Permits",
      icon: FileCheck,
      pending: permitsData?.pending || 0,
      total: permitsData?.total || 0,
      color: "tf-green",
      trend: `${permitsData?.pending || 0} uncertified`,
    },
    {
      id: "exemptions",
      title: "Exemptions",
      icon: ClipboardCheck,
      pending: exemptionsData?.pending || 0,
      total: exemptionsData?.total || 0,
      color: "tf-gold",
      trend: `${exemptionsData?.pending || 0} pending review`,
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
      pending: noticesData?.pending || 0,
      total: noticesData?.total || 0,
      color: "tf-cyan",
      trend: noticesData?.pending ? `${noticesData.pending} in queue` : "All sent",
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
            className={`material-bento border-tf-border cursor-pointer transition-all hover:border-${stat.color}/50 ${
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
