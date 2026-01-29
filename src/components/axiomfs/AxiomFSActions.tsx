import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, FolderPlus, Grid3X3, List, Download, Search, Settings } from "lucide-react";

interface AxiomFSActionsProps {
  viewMode: "lattice" | "list";
  onViewModeChange: (mode: "lattice" | "list") => void;
}

export function AxiomFSActions({ viewMode, onViewModeChange }: AxiomFSActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      <div className="flex items-center bg-tf-elevated/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 ${viewMode === "lattice" ? "bg-tf-transcend-cyan/20 text-tf-transcend-cyan" : ""}`}
          onClick={() => onViewModeChange("lattice")}
        >
          <Grid3X3 className="w-4 h-4" />
          3D Lattice
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 ${viewMode === "list" ? "bg-tf-transcend-cyan/20 text-tf-transcend-cyan" : ""}`}
          onClick={() => onViewModeChange("list")}
        >
          <List className="w-4 h-4" />
          List
        </Button>
      </div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button className="gap-2 btn-sovereign">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderPlus className="w-4 h-4" />
          New Folder
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" size="icon">
          <Search className="w-4 h-4" />
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
