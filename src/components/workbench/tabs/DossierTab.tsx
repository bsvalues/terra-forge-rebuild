import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, FileText, Brain, Package, Upload, Shield, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { DocumentsPanel } from "@/components/dossier/DocumentsPanel";
import { DocumentUploadDialog } from "@/components/dossier/DocumentUploadDialog";
import { NarrativeDraftingPanel } from "@/components/dossier/NarrativeDraftingPanel";
import { PacketAssemblyPanel } from "@/components/dossier/PacketAssemblyPanel";
import { ParcelAnnotations } from "@/components/dossier/ParcelAnnotations";

export function DossierTab() {
  const [activeView, setActiveView] = useState("files");
  const [uploadOpen, setUploadOpen] = useState(false);
  const { parcel } = useWorkbench();
  const parcelId = parcel.id;

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
        <Button
          size="sm"
          className="gap-2 bg-suite-dossier hover:bg-suite-dossier/90"
          onClick={() => setUploadOpen(true)}
          disabled={!parcelId}
        >
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </motion.div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-tf-elevated/50">
          <TabsTrigger value="files" className="gap-2 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="narratives" className="gap-2 text-xs">
            <Brain className="w-3.5 h-3.5" />
            Narratives
          </TabsTrigger>
          <TabsTrigger value="packets" className="gap-2 text-xs">
            <Package className="w-3.5 h-3.5" />
            Packets
          </TabsTrigger>
          <TabsTrigger value="annotations" className="gap-2 text-xs">
            <StickyNote className="w-3.5 h-3.5" />
            Annotations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-4">
          <DocumentsPanel parcelId={parcelId} />
        </TabsContent>

        <TabsContent value="narratives" className="mt-4">
          <NarrativeDraftingPanel parcelId={parcelId} />
        </TabsContent>

        <TabsContent value="packets" className="mt-4">
          <PacketAssemblyPanel parcelId={parcelId} />
        </TabsContent>
      </Tabs>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        parcelId={parcelId}
      />
    </div>
  );
}
