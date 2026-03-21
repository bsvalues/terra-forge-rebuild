import { useWorkbench } from "../WorkbenchContext";
import { SketchModule } from "@/components/sketch";
import { PenTool } from "lucide-react";

export function SketchTab() {
  const { parcel, setActiveTab } = useWorkbench();

  if (!parcel.id) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <PenTool className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">Select a parcel to begin sketching</p>
        <p className="text-sm">Choose a property from the search bar above</p>
      </div>
    );
  }

  return (
    <SketchModule
      assignmentId={parcel.id}
      parcelId={parcel.id}
      onBack={() => setActiveTab("forge")}
      onSaved={() => setActiveTab("summary")}
    />
  );
}
