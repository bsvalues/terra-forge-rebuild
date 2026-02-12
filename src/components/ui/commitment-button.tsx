import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode, MouseEventHandler } from "react";

interface CommitmentButtonProps {
  children: ReactNode;
  variant?: "primary" | "destructive" | "gold";
  className?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
}

/**
 * CommitmentButton — Tactile Maximalism (Layer 3).
 * Reserved ONLY for high-consequence actions:
 * Run, Publish, Certify, Export, Lock Model, Generate Defense Packet, Approve.
 */
export function CommitmentButton({
  children,
  className,
  variant = "primary",
  disabled,
  onClick,
  type = "button",
}: CommitmentButtonProps) {
  const variantClasses = {
    primary: "material-interactive",
    destructive:
      "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-[0_4px_16px_hsl(0_75%_55%/0.3)]",
    gold: "bg-gradient-to-r from-tf-gold to-tf-amber text-tf-substrate shadow-[0_4px_16px_hsl(45_95%_55%/0.3)]",
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
}
