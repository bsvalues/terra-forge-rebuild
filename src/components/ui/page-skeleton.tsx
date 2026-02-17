// TerraFusion OS — Universal Page Loading Skeleton (Swarm A: Polish)

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /** Number of stat cards in the top row */
  stats?: number;
  /** Number of content cards below */
  cards?: number;
  /** Show a hero/header skeleton */
  hero?: boolean;
}

export function PageSkeleton({ stats = 4, cards = 2, hero = true }: PageSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6 max-w-7xl mx-auto"
    >
      {/* Header skeleton */}
      {hero && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}

      {/* Stats row */}
      <div className={`grid grid-cols-2 md:grid-cols-${Math.min(stats, 4)} gap-4`}>
        {Array.from({ length: stats }).map((_, i) => (
          <Skeleton key={`stat-${i}`} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Content cards */}
      <div className={`grid grid-cols-1 ${cards > 1 ? "lg:grid-cols-2" : ""} gap-6`}>
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={`card-${i}`} className="h-64 rounded-2xl" />
        ))}
      </div>

      {/* Shimmer effect */}
      <div className="flex justify-center pt-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground animate-pulse">Loading module…</span>
        </div>
      </div>
    </motion.div>
  );
}
