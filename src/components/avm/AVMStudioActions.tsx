import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Download, Loader2 } from "lucide-react";
import { useTrainAVM } from "@/hooks/useAVMRuns";

export function AVMStudioActions() {
  const trainMutation = useTrainAVM();

  return (
    <div className="flex items-center gap-2">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          className="gap-2 btn-sovereign"
          onClick={() => trainMutation.mutate()}
          disabled={trainMutation.isPending}
        >
          {trainMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Training…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Train Models
            </>
          )}
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </motion.div>
    </div>
  );
}
