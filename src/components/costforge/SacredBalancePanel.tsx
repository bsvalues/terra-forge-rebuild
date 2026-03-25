import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, Target, Crown, Sparkles } from "lucide-react";

interface SacredLevel {
  level: 3 | 6 | 9;
  name: string;
  description: string;
  score: number;
  target: number;
  status: "transcendent" | "balanced" | "emerging" | "dormant";
  icon: typeof Zap;
  metrics: { label: string; value: number; unit: string }[];
}

const statusConfig = {
  transcendent: {
    bg: "bg-tf-bright-cyan/20",
    border: "border-tf-bright-cyan/50",
    text: "text-tf-bright-cyan",
    glow: "shadow-[0_0_30px_hsl(var(--tf-bright-cyan)/0.4)]",
    label: "Transcendent",
  },
  balanced: {
    bg: "bg-tf-optimized-green/20",
    border: "border-tf-optimized-green/50",
    text: "text-tf-optimized-green",
    glow: "shadow-[0_0_20px_hsl(var(--tf-optimized-green)/0.3)]",
    label: "Balanced",
  },
  emerging: {
    bg: "bg-tf-anomaly-amber/20",
    border: "border-tf-anomaly-amber/50",
    text: "text-tf-anomaly-amber",
    glow: "shadow-[0_0_15px_hsl(var(--tf-anomaly-amber)/0.3)]",
    label: "Emerging",
  },
  dormant: {
    bg: "bg-muted/30",
    border: "border-border",
    text: "text-muted-foreground",
    glow: "",
    label: "Dormant",
  },
};

export function SacredBalancePanel() {
  const [levels, setLevels] = useState<SacredLevel[]>([
    {
      level: 3,
      name: "Foundation",
      description: "Data Integrity & Base Calculations",
      score: 87,
      target: 95,
      status: "balanced",
      icon: Zap,
      metrics: [
        { label: "Data Quality", value: 94, unit: "%" },
        { label: "Calculation Accuracy", value: 89, unit: "%" },
        { label: "Source Validation", value: 78, unit: "%" },
      ],
    },
    {
      level: 6,
      name: "Harmony",
      description: "Model Coherence & Equity Balance",
      score: 72,
      target: 90,
      status: "emerging",
      icon: Target,
      metrics: [
        { label: "Model Coherence", value: 76, unit: "%" },
        { label: "Equity Index", value: 68, unit: "%" },
        { label: "Variance Control", value: 71, unit: "%" },
      ],
    },
    {
      level: 9,
      name: "Transcendence",
      description: "Optimization & Predictive Excellence",
      score: 93,
      target: 99,
      status: "transcendent",
      icon: Crown,
      metrics: [
        { label: "Predictive Accuracy", value: 96, unit: "%" },
        { label: "Optimization Score", value: 91, unit: "%" },
        { label: "Excellence Rating", value: 92, unit: "%" },
      ],
    },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLevels((prev) =>
        prev.map((level) => ({
          ...level,
          score: Math.min(100, Math.max(0, level.score + (Math.random() - 0.5) * 2)),
          metrics: level.metrics.map((m) => ({
            ...m,
            value: Math.min(100, Math.max(0, m.value + (Math.random() - 0.5) * 1.5)),
          })),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Calculate overall sacred balance
  const overallBalance = levels.reduce((acc, l) => acc + l.score, 0) / 3;

  return (
    <div className="space-y-4">
      {/* Overall Balance Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="material-bento rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 20px hsl(var(--tf-transcend-cyan) / 0.3)",
                  "0 0 40px hsl(var(--tf-transcend-cyan) / 0.5)",
                  "0 0 20px hsl(var(--tf-transcend-cyan) / 0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-tf-substrate" />
            </motion.div>
            <div>
              <h3 className="text-lg font-light text-foreground">Sacred Balance Index</h3>
              <p className="text-sm text-muted-foreground">
                3-6-9 Quantum Coherence Score
              </p>
            </div>
          </div>

          <div className="text-right">
            <motion.p
              key={overallBalance.toFixed(1)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-light text-[hsl(var(--tf-transcend-cyan))]"
            >
              {overallBalance.toFixed(1)}%
            </motion.p>
            <p className="text-xs text-muted-foreground">
              Target: 95% Harmonic Resonance
            </p>
          </div>
        </div>

        {/* Sacred Progress Bar */}
        <div className="mt-4 h-2 bg-tf-elevated rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallBalance}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, 
                hsl(var(--tf-transcend-cyan)) 0%, 
                hsl(var(--tf-optimized-green)) 50%,
                hsl(var(--tf-bright-cyan)) 100%)`,
            }}
          />
        </div>
      </motion.div>

      {/* 3-6-9 Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {levels.map((level, index) => {
            const config = statusConfig[level.status];
            const Icon = level.icon;

            return (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={cn(
                  "relative overflow-hidden rounded-lg border p-5",
                  "bg-card/50 backdrop-blur-sm transition-all duration-300",
                  config.border,
                  config.glow
                )}
              >
                {/* Level Number - Sacred */}
                <div className="absolute top-3 right-3">
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn("text-5xl font-light", config.text)}
                    style={{ opacity: 0.15 }}
                  >
                    {level.level}
                  </motion.span>
                </div>

                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.text)} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      Level {level.level} — {level.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <motion.span
                      key={level.score.toFixed(1)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn("text-3xl font-light", config.text)}
                    >
                      {level.score.toFixed(1)}%
                    </motion.span>
                    <span className="text-xs text-muted-foreground">
                      / {level.target}% target
                    </span>
                  </div>
                  
                  {/* Progress */}
                  <div className="mt-2 h-1.5 bg-tf-elevated rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${(level.score / level.target) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className={cn("h-full rounded-full", config.bg)}
                      style={{
                        background: `linear-gradient(90deg, hsl(var(--tf-transcend-cyan)), hsl(var(--tf-optimized-green)))`,
                      }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2 pt-3 border-t border-border/50">
                  {level.metrics.map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                      <span className="text-xs font-medium text-foreground">
                        {metric.value.toFixed(1)}{metric.unit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      config.bg,
                      config.text
                    )}
                  >
                    {config.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
