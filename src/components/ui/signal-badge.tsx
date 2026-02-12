import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SignalVariant = "cyan" | "gold" | "red" | "green";

interface SignalBadgeProps {
  children: ReactNode;
  variant: SignalVariant;
  pulse?: boolean;
  className?: string;
}

/**
 * SignalBadge — Layer 4 (Signal).
 * Neon alerts for critical system states only:
 * "Audit Mode Active", "Model Locked", "COD Exceeded", "Roll Certified".
 */
export function SignalBadge({ children, variant, pulse = false, className }: SignalBadgeProps) {
  return (
    <motion.span
      animate={pulse ? { opacity: [1, 0.7, 1] } : undefined}
      transition={pulse ? { duration: 2, repeat: Infinity } : undefined}
      className={cn(
        "material-signal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs",
        `signal-${variant}`,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "cyan" && "bg-tf-cyan",
          variant === "gold" && "bg-tf-gold",
          variant === "red" && "bg-tf-red",
          variant === "green" && "bg-tf-green"
        )}
      />
      {children}
    </motion.span>
  );
}
