import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VEIMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  status: "excellent" | "good" | "caution" | "concern";
  statusLabel: string;
  icon: LucideIcon;
  target: string;
}

const statusConfig = {
  excellent: {
    bg: "bg-vei-excellent/10",
    border: "border-vei-excellent/30",
    text: "text-vei-excellent",
    glow: "shadow-[0_0_20px_hsl(var(--vei-excellent)/0.2)]",
  },
  good: {
    bg: "bg-vei-good/10",
    border: "border-vei-good/30",
    text: "text-vei-good",
    glow: "shadow-[0_0_20px_hsl(var(--vei-good)/0.2)]",
  },
  caution: {
    bg: "bg-vei-caution/10",
    border: "border-vei-caution/30",
    text: "text-vei-caution",
    glow: "shadow-[0_0_20px_hsl(var(--vei-caution)/0.2)]",
  },
  concern: {
    bg: "bg-vei-concern/10",
    border: "border-vei-concern/30",
    text: "text-vei-concern",
    glow: "shadow-[0_0_20px_hsl(var(--vei-concern)/0.2)]",
  },
};

export function VEIMetricCard({
  title,
  value,
  subtitle,
  status,
  statusLabel,
  icon: Icon,
  target,
}: VEIMetricCardProps) {
  const config = statusConfig[status];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative overflow-hidden rounded-lg border p-5",
        "bg-card/50 backdrop-blur-sm",
        config.border,
        config.glow
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 opacity-30",
          config.bg
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className={cn("text-3xl font-light tracking-tight", config.text)}>
              {value}
            </p>
          </div>
          <div className={cn("p-2 rounded-full", config.bg)}>
            <Icon className={cn("w-5 h-5", config.text)} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              config.bg,
              config.text
            )}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Target: <span className="text-foreground">{target}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
