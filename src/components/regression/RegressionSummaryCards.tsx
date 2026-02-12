import { motion } from "framer-motion";
import { TrendingUp, Target, Activity, Percent } from "lucide-react";
import { RegressionResult } from "@/hooks/useRegressionAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

interface RegressionSummaryCardsProps {
  result: RegressionResult | undefined;
  isLoading: boolean;
}

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
      className="material-bento rounded-lg p-4"
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

function SummaryCardSkeleton({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="material-bento rounded-lg p-4"
    >
      <div className="flex items-start justify-between">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="w-12 h-4" />
      </div>
      <div className="mt-3">
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    </motion.div>
  );
}

export function RegressionSummaryCards({ result, isLoading }: RegressionSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <SummaryCardSkeleton key={i} delay={i * 0.1} />
        ))}
      </div>
    );
  }

  if (!result) {
    // Show placeholder cards when no data
    const placeholderCards = [
      {
        icon: <TrendingUp className="w-5 h-5 text-tf-transcend-cyan" />,
        label: "R² Adjusted",
        value: "—",
        subValue: "Run analysis",
        color: "bg-tf-transcend-cyan/10",
      },
      {
        icon: <Target className="w-5 h-5 text-tf-optimized-green" />,
        label: "F-Statistic",
        value: "—",
        subValue: "No data",
        color: "bg-tf-optimized-green/10",
      },
      {
        icon: <Activity className="w-5 h-5 text-tf-caution-amber" />,
        label: "Std. Error",
        value: "—",
        subValue: "σ̂",
        color: "bg-tf-caution-amber/10",
      },
      {
        icon: <Percent className="w-5 h-5 text-tf-sacred-gold" />,
        label: "Durbin-Watson",
        value: "—",
        subValue: "Independence",
        color: "bg-tf-sacred-gold/10",
      },
    ];

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {placeholderCards.map((card, index) => (
          <SummaryCard key={card.label} {...card} delay={index * 0.1} />
        ))}
      </div>
    );
  }

  const { modelStats, diagnostics } = result;

  const cards = [
    {
      icon: <TrendingUp className="w-5 h-5 text-tf-transcend-cyan" />,
      label: "R² Adjusted",
      value: modelStats.rSquaredAdj.toFixed(4),
      subValue: `${(modelStats.rSquaredAdj * 100).toFixed(2)}%`,
      color: "bg-tf-transcend-cyan/10",
    },
    {
      icon: <Target className="w-5 h-5 text-tf-optimized-green" />,
      label: "F-Statistic",
      value: modelStats.fStatistic.toFixed(2),
      subValue: modelStats.fPValue < 0.001 ? "p < 0.001" : `p = ${modelStats.fPValue.toFixed(3)}`,
      color: "bg-tf-optimized-green/10",
    },
    {
      icon: <Activity className="w-5 h-5 text-tf-caution-amber" />,
      label: "RMSE",
      value: modelStats.rmse.toFixed(4),
      subValue: "σ̂",
      color: "bg-tf-caution-amber/10",
    },
    {
      icon: <Percent className="w-5 h-5 text-tf-sacred-gold" />,
      label: "Durbin-Watson",
      value: diagnostics.durbinWatson.toFixed(3),
      subValue: diagnostics.independencePassed ? "No autocorrelation" : "Check independence",
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
