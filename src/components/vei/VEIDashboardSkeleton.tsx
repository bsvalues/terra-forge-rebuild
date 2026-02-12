import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function VEIDashboardSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      {/* Header Skeleton */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </motion.div>

      {/* Summary Panel Skeleton */}
      <motion.div variants={itemVariants}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </motion.div>

      {/* Metrics Row Skeleton */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="material-bento rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <motion.div key={i} variants={itemVariants} className="material-bento rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-[280px] w-full rounded" />
          </motion.div>
        ))}
      </div>

      {/* Tier Ratio Plot Skeleton */}
      <motion.div variants={itemVariants} className="material-bento rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-[280px] w-full rounded" />
      </motion.div>

      {/* Footer Skeleton */}
      <motion.div variants={itemVariants} className="text-center py-4 space-y-2">
        <Skeleton className="h-3 w-96 mx-auto" />
        <Skeleton className="h-3 w-64 mx-auto" />
      </motion.div>
    </motion.div>
  );
}
