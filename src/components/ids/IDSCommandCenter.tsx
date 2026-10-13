import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Database, Upload, ShieldCheck, GitBranch, Route } from "lucide-react";
import { ModuleHeader } from "@/components/layout/ModuleHeader";
import { useCountyMeta } from "@/hooks/useCountyMeta";
import { InventoryPillar } from "./pillars/InventoryPillar";
import { IngestWizard } from "./IngestWizard";
import { QualityPillar } from "./pillars/QualityPillar";
import { VersionsPillar } from "./pillars/VersionsPillar";
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
      <TabsList aria-label="Data ingestion sections">
        <TabsTrigger value="ingest" className="gap-2"><Upload className="h-4 w-4" />Import data</TabsTrigger>
        <TabsTrigger value="inventory" className="gap-2"><Database className="h-4 w-4" />Inventory</TabsTrigger>
        <TabsTrigger value="quality" className="gap-2"><ShieldCheck className="h-4 w-4" />Quality</TabsTrigger>
        <TabsTrigger value="versions" className="gap-2"><GitBranch className="h-4 w-4" />Import history</TabsTrigger>
        <TabsTrigger value="routing" className="gap-2"><Route className="h-4 w-4" />Routing</TabsTrigger>
      </TabsList>
      <TabsContent value="ingest"><IngestWizard /></TabsContent>
      <TabsContent value="inventory"><InventoryPillar /></TabsContent>
      <TabsContent value="quality"><QualityPillar /></TabsContent>
      <TabsContent value="versions"><VersionsPillar highlightJobId={highlightJobId} onJobIdConsumed={onJobIdConsumed} /></TabsContent>
      <TabsContent value="routing"><RoutingPillar /></TabsContent>
    </Tabs>
  </div>;
}
