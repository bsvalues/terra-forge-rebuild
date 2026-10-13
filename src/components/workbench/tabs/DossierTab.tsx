import { useState } from "react";
import { FolderOpen, FileText, Brain, Package, Upload, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { DocumentsPanel } from "@/components/dossier/DocumentsPanel";
import { DocumentUploadDialog } from "@/components/dossier/DocumentUploadDialog";
import { NarrativeDraftingPanel } from "@/components/dossier/NarrativeDraftingPanel";
import { PacketAssemblyPanel } from "@/components/dossier/PacketAssemblyPanel";
import { ParcelAnnotations } from "@/components/dossier/ParcelAnnotations";
import { CalcTracePanel } from "@/components/costforge/CalcTracePanel";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";

export function DossierTab() {
  const [activeView, setActiveView] = useWorkspaceTool("evidenceTool", ["files", "narratives", "packets", "annotations", "traces"], "files");
  const [uploadOpen, setUploadOpen] = useState(false);
  const { parcel } = useWorkbench();
  const parcelId = parcel.id;

  return (
    <div className="p-6 space-y-6">
      <ModuleHeader title="Evidence" icon={FolderOpen} actions={<Button size="sm" className="gap-2" onClick={() => setUploadOpen(true)} disabled={!parcelId}><Upload className="h-4 w-4" />Upload document</Button>} />
      <WorkToolBar tools={[{id:"files",label:"Documents",icon:FileText},{id:"annotations",label:"Notes",icon:StickyNote},{id:"narratives",label:"Narratives",icon:Brain},{id:"packets",label:"Packets",icon:Package},{id:"traces",label:"Calculation traces",group:"Evidence review"}]} primary={["files","annotations","narratives","packets"]} active={activeView} onSelect={setActiveView} />
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsContent value="files" className="mt-4">
          <DocumentsPanel parcelId={parcelId} />
        </TabsContent>

        <TabsContent value="narratives" className="mt-4">
          <NarrativeDraftingPanel parcelId={parcelId} />
        </TabsContent>

        <TabsContent value="packets" className="mt-4">
          <PacketAssemblyPanel parcelId={parcelId} />
        </TabsContent>
        <TabsContent value="annotations" className="mt-4">
          <ParcelAnnotations parcelId={parcelId} />
        </TabsContent>
        <TabsContent value="traces" className="mt-4">
          <CalcTracePanel parcelId={parcelId} />
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
