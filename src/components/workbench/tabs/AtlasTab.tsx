import { useNavigate } from "react-router-dom";
import { Map, Layers, ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { useWorkspaceTool } from "@/hooks/useWorkspaceTool";
import { ParcelMap } from "../ParcelMap";
import { GISLayersPanel } from "@/components/geoequity/GISLayersPanel";
import { useGISLayers } from "@/hooks/useGISData";
import { NeighborhoodValuationHeatmap } from "@/components/atlas/NeighborhoodValuationHeatmap";
import { NeighborhoodMarketSparklines } from "@/components/atlas/NeighborhoodMarketSparklines";
import { useWorkbench } from "../WorkbenchContext";

export function AtlasTab() {
  const navigate = useNavigate();
  const { studyPeriod } = useWorkbench();
  const [view, setView] = useWorkspaceTool("mapTool", ["map", "layers", "valuation", "trends"], "map");
  const { data: layers = [], isLoading, error } = useGISLayers();
  return <div className="module-page space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Property map</h2><Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/factory/geoequity")}><ExternalLink className="h-3 w-3" />County maps</Button></div>
    <WorkToolBar tools={[{id:"map",label:"Parcel location",icon:Map},{id:"layers",label:"GIS layers",icon:Layers},{id:"valuation",label:"Neighborhood values",group:"County geography"},{id:"trends",label:"Market trends",group:"County geography"}]} primary={["map","layers"]} active={view} onSelect={setView} />
    {view === "map" && <ParcelMap />}
    {view === "layers" && <section className="space-y-4"><Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/home/geometry")}><Upload className="h-4 w-4" />Manage spatial imports</Button>{error ? <p className="text-sm text-destructive">GIS layers unavailable</p> : <GISLayersPanel layers={layers} isLoading={isLoading} />}</section>}
    {view === "valuation" && <NeighborhoodValuationHeatmap />}
    {view === "trends" && <NeighborhoodMarketSparklines studyPeriodId={studyPeriod.id ?? undefined} />}
  </div>;
}
