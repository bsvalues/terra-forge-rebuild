import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Download, FileText, Settings } from "lucide-react";

export function RegressionActions() {
  return (
    <div className="flex items-center gap-2">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button className="gap-2 btn-sovereign">
          <Play className="w-4 h-4" />
          Run Analysis
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refit
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Report
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
