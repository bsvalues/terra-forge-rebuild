import { motion } from "framer-motion";
import { FolderOpen, FileText, Image, FileArchive, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DossierTab() {
  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-suite-dossier/20 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-suite-dossier" />
          </div>
          <div>
            <h2 className="text-xl font-light text-foreground">TerraDossier</h2>
            <p className="text-sm text-muted-foreground">Prove the decision — evidence, narratives, packets</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 bg-suite-dossier hover:bg-suite-dossier/90">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Documents", icon: FileText, count: 12 },
          { title: "Images", icon: Image, count: 8 },
          { title: "Packets", icon: FileArchive, count: 2 },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="material-bento rounded-xl p-5 cursor-pointer hover:border-suite-dossier/30"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-suite-dossier" />
              <span className="font-medium text-foreground">{item.title}</span>
              <span className="ml-auto text-sm text-muted-foreground">{item.count}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="material-bento rounded-2xl p-6 min-h-[300px]"
      >
        <h3 className="text-lg font-medium text-foreground mb-4">File Browser</h3>
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Select a category to browse files</p>
        </div>
      </motion.div>
    </div>
  );
}
