import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Database, Upload, ShieldCheck, GitBranch, Route } from "lucide-react";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { useCountyMeta } from "@/hooks/useCountyMeta";
import { InventoryPillar } from "./pillars/InventoryPillar";
import { IngestWizard } from "./IngestWizard";
import { QualityPillar } from "./pillars/QualityPillar";
import { VersionsPillar } from "./pillars/VersionsPillar";
import { WorkToolBar } from "@/components/navigation/WorkToolBar";
import { RoutingPillar } from "./pillars/RoutingPillar";

interface IDSCommandCenterProps {
  initialPillar?: string | null;
  onPillarConsumed?: () => void;
  highlightJobId?: string | null;
  onJobIdConsumed?: () => void;
}
const PANELS = ["ingest", "inventory", "quality", "versions", "routing"];

export function IDSCommandCenter({ initialPillar, onPillarConsumed, highlightJobId, onJobIdConsumed }: IDSCommandCenterProps = {}) {
  const [params, setParams] = useSearchParams();
  const county = useCountyMeta();
  const requested = params.get("panel");
  const activePillar = requested && PANELS.includes(requested) ? requested : "ingest";
  const setPanel = (panel: string) => setParams(current => { const next = new URLSearchParams(current); next.set("panel", panel); return next; }, { replace: true });
  useEffect(() => {
    if (initialPillar && PANELS.includes(initialPillar)) {
      setParams(current => { const next = new URLSearchParams(current); next.set("panel", initialPillar); return next; }, { replace: true });
      onPillarConsumed?.();
    }
  }, [initialPillar, onPillarConsumed, setParams]);
  return <div className="module-page space-y-5">
    <ModuleHeader title="Data Ingestion" icon={Database} actions={<span className="text-sm text-muted-foreground">{county?.name ?? "County workspace"}</span>} />
    <Tabs value={activePillar} onValueChange={setPanel} className="space-y-5">
      <WorkToolBar active={activePillar} onSelect={setPanel} primary={["ingest", "inventory", "versions"]} tools={[{id:"ingest",label:"Import data",icon:Upload},{id:"inventory",label:"County data",icon:Database},{id:"versions",label:"Import history",icon:GitBranch},{id:"quality",label:"Data quality",icon:ShieldCheck},{id:"routing",label:"Processing history",icon:Route}]} />
      <TabsContent value="ingest" forceMount className="data-[state=inactive]:hidden"><IngestWizard /></TabsContent>
      <TabsContent value="inventory"><InventoryPillar /></TabsContent>
      <TabsContent value="quality"><QualityPillar /></TabsContent>
      <TabsContent value="versions"><VersionsPillar highlightJobId={highlightJobId} onJobIdConsumed={onJobIdConsumed} /></TabsContent>
      <TabsContent value="routing"><RoutingPillar /></TabsContent>
    </Tabs>
  </div>;
}
