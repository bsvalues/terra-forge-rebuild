import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Calculator,
  Brain,
  FolderTree,
  Settings,
  Zap,
} from "lucide-react";

interface SovereignNavProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const modules = [
  { id: "vei", label: "VEI Suite", icon: TrendingUp, angle: -90 },
  { id: "costforge", label: "CostForge", icon: Calculator, angle: -45 },
  { id: "avm", label: "AVM Studio", icon: Brain, angle: 0 },
  { id: "axiom", label: "AxiomFS", icon: FolderTree, angle: 45 },
  { id: "regression", label: "Regression", icon: LayoutDashboard, angle: 90 },
  { id: "settings", label: "Settings", icon: Settings, angle: 135 },
];

// Phi-governed layout constant
const PHI_DISTANCE = 161.8;
const ORB_SIZE = 60;

export function SovereignOrb({ activeModule, onModuleChange }: SovereignNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getNodePosition = (angle: number, distance: number = PHI_DISTANCE) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radians) * distance,
      y: Math.sin(radians) * distance,
    };
  };

  return (
    <div className="fixed bottom-8 left-8 z-50">
      {/* Background glow when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 -m-32 pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(var(--tf-transcend-cyan) / 0.1) 0%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Orbital ring */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute border-2 border-tf-cyan rounded-full pointer-events-none"
            style={{
              width: PHI_DISTANCE * 2 + ORB_SIZE,
              height: PHI_DISTANCE * 2 + ORB_SIZE,
              left: -PHI_DISTANCE,
              top: -PHI_DISTANCE,
            }}
          />
        )}
      </AnimatePresence>

      {/* Module nodes */}
      <AnimatePresence>
        {isExpanded &&
          modules.map((module, index) => {
            const pos = getNodePosition(module.angle);
            const Icon = module.icon;
            const isActive = activeModule === module.id;

            return (
              <motion.button
                key={module.id}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: pos.x,
                  y: pos.y,
                }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: index * 0.05,
                }}
                onClick={() => {
                  onModuleChange(module.id);
                  setIsExpanded(false);
                }}
                className={cn(
                  "absolute sovereign-node w-14 h-14 flex items-center justify-center",
                  "transition-all duration-300",
                  isActive && "border-tf-cyan shadow-sovereign"
                )}
                style={{
                  left: ORB_SIZE / 2 - 28,
                  top: ORB_SIZE / 2 - 28,
                }}
                title={module.label}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-tf-cyan" : "text-muted-foreground"
                )} />
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Central command orb */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative w-[60px] h-[60px] rounded-full",
          "bg-gradient-to-br from-tf-surface to-tf-substrate",
          "border-2 border-tf-cyan/50",
          "flex items-center justify-center",
          "transition-all duration-300",
          isExpanded ? "shadow-sovereign-lg" : "shadow-sovereign"
        )}
      >
        {/* Animated inner glow */}
        <motion.div
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-2 rounded-full bg-gradient-radial from-tf-cyan/30 to-transparent"
        />

        {/* Icon */}
        <Zap className={cn(
          "w-6 h-6 relative z-10 transition-colors",
          isExpanded ? "text-tf-cyan" : "text-muted-foreground"
        )} />

        {/* Rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-tf-cyan/20"
          style={{
            borderTopColor: "hsl(var(--tf-transcend-cyan))",
          }}
        />
      </motion.button>

      {/* Label */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 -translate-x-1/2 -bottom-8 whitespace-nowrap"
          >
            <span className="text-xs text-muted-foreground">Command</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
