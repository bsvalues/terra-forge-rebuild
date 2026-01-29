import { motion } from "framer-motion";
import { TrendingUp, Target, Activity, Percent } from "lucide-react";

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  delay: number;
}

function SummaryCard({ icon, label, value, subValue, color, delay }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-lg p-4"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        {subValue && (
          <span className="text-xs text-muted-foreground">{subValue}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

export function RegressionSummaryCards() {
  const cards = [
    {
      icon: <TrendingUp className="w-5 h-5 text-tf-transcend-cyan" />,
      label: "R² Adjusted",
      value: "0.9234",
      subValue: "92.34%",
      color: "bg-tf-transcend-cyan/10",
    },
    {
      icon: <Target className="w-5 h-5 text-tf-optimized-green" />,
      label: "F-Statistic",
      value: "847.32",
      subValue: "p < 0.001",
      color: "bg-tf-optimized-green/10",
    },
    {
      icon: <Activity className="w-5 h-5 text-tf-caution-amber" />,
      label: "Std. Error",
      value: "12,450",
      subValue: "σ̂",
      color: "bg-tf-caution-amber/10",
    },
    {
      icon: <Percent className="w-5 h-5 text-tf-sacred-gold" />,
      label: "Durbin-Watson",
      value: "1.987",
      subValue: "No autocorrelation",
      color: "bg-tf-sacred-gold/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <SummaryCard key={card.label} {...card} delay={index * 0.1} />
      ))}
    </div>
  );
}
