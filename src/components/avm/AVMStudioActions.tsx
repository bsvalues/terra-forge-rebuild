import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Download, Settings, Layers } from "lucide-react";

export function AVMStudioActions() {
  return (
    <div className="flex items-center gap-2">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button className="gap-2 btn-sovereign">
          <Play className="w-4 h-4" />
          Train Models
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="w-4 h-4" />
          Compare
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
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
