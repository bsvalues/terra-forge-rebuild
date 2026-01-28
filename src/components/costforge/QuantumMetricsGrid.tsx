import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Activity,
  Gauge,
  Orbit,
  Waves,
  Atom,
  Compass,
} from "lucide-react";

interface QuantumMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trendValue: number;
  icon: typeof Activity;
  category: "coherence" | "resonance" | "alignment";
}

const categoryConfig = {
  coherence: {
    gradient: "from-tf-cyan/20 to-tf-cyan/5",
    accent: "text-tf-cyan",
    border: "border-tf-cyan/30",
  },
  resonance: {
    gradient: "from-tf-green/20 to-tf-green/5",
    accent: "text-tf-green",
    border: "border-tf-green/30",
  },
  alignment: {
    gradient: "from-tf-bright-cyan/20 to-tf-bright-cyan/5",
    accent: "text-tf-bright-cyan",
    border: "border-tf-bright-cyan/30",
  },
};

export function QuantumMetricsGrid() {
  const [metrics, setMetrics] = useState<QuantumMetric[]>([
    {
      id: "coherence-factor",
      label: "Coherence Factor",
      value: 0.924,
      unit: "φ",
      trend: "up",
      trendValue: 2.3,
      icon: Orbit,
      category: "coherence",
    },
    {
      id: "resonance-index",
      label: "Resonance Index",
      value: 1.618,
      unit: "Φ",
      trend: "stable",
      trendValue: 0.1,
      icon: Waves,
      category: "resonance",
    },
    {
      id: "quantum-entropy",
      label: "Quantum Entropy",
      value: 0.042,
      unit: "S",
      trend: "down",
      trendValue: -1.2,
      icon: Atom,
      category: "coherence",
    },
    {
      id: "harmonic-alignment",
      label: "Harmonic Alignment",
      value: 95.7,
      unit: "%",
      trend: "up",
      trendValue: 3.1,
      icon: Compass,
      category: "alignment",
    },
    {
      id: "field-strength",
      label: "Field Strength",
      value: 847,
      unit: "μT",
      trend: "up",
      trendValue: 12,
      icon: Activity,
      category: "resonance",
    },
    {
      id: "balance-ratio",
      label: "Balance Ratio",
      value: 3.69,
      unit: ":",
      trend: "stable",
      trendValue: 0,
      icon: Gauge,
      category: "alignment",
    },
  ]);

  // Simulate real-time quantum fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          const fluctuation = (Math.random() - 0.5) * 0.02 * metric.value;
          return {
            ...metric,
            value: Math.max(0, metric.value + fluctuation),
            trendValue: metric.trendValue + (Math.random() - 0.5) * 0.5,
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric, index) => {
        const config = categoryConfig[metric.category];
        const Icon = metric.icon;

        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            className={cn(
              "relative overflow-hidden rounded-lg border p-4",
              "bg-gradient-to-br backdrop-blur-sm",
              config.gradient,
              config.border
            )}
          >
            {/* Icon */}
            <div className="flex items-center justify-between mb-3">
              <Icon className={cn("w-4 h-4", config.accent)} />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-2 h-2 rounded-full bg-tf-cyan/50"
              />
            </div>

            {/* Value */}
            <motion.p
              key={metric.value.toFixed(3)}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className={cn("text-xl font-light tabular-nums", config.accent)}
            >
              {metric.value.toFixed(3)}
              <span className="text-xs ml-1 text-muted-foreground">
                {metric.unit}
              </span>
            </motion.p>

            {/* Label */}
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {metric.label}
            </p>

            {/* Trend */}
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs",
                  metric.trend === "up" && "text-tf-optimized-green",
                  metric.trend === "down" && "text-tf-warning-red",
                  metric.trend === "stable" && "text-muted-foreground"
                )}
              >
                {metric.trend === "up" && "↑"}
                {metric.trend === "down" && "↓"}
                {metric.trend === "stable" && "→"}
                {Math.abs(metric.trendValue).toFixed(1)}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
