import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PacsOwnerPanel } from "./PacsOwnerPanel";
import { PacsSalesPanel } from "./PacsSalesPanel";
import { PacsPropertyPanel } from "./PacsPropertyPanel";
import { PropertyProfilePanel } from "./PropertyProfilePanel";
import { usePacsParcelBridge } from "@/hooks/usePacsParcelBridge";
import { Users, DollarSign, Building, AlertTriangle, ClipboardList } from "lucide-react";

interface ParcelDossierPACSProps {
  /** Supabase parcel UUID — auto-resolves to prop_id via bridge */
  parcelId?: string | null;
  /** Direct PACS prop_id — bypasses bridge resolution */
  propId?: number | null;
  geoId?: string | null;
  hoodCd?: string | null;
}

export function ParcelDossierPACS({ parcelId, propId: directPropId, geoId, hoodCd }: ParcelDossierPACSProps) {
  const bridge = usePacsParcelBridge(directPropId ? null : parcelId ?? null);
  const resolvedPropId = directPropId ?? bridge.data?.prop_id ?? null;
  const resolvedGeoId = geoId ?? bridge.data?.geo_id ?? null;

  if (!directPropId && bridge.isLoading) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  if (!resolvedPropId) {
    return (
      <div className="flex items-center gap-3 p-6 text-muted-foreground">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <div>
          <p className="font-medium">No Legacy Link</p>
          <p className="text-sm">This parcel has no linked legacy record. It may not exist in the source system yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Legacy Source Record</h2>
        <span className="text-sm text-muted-foreground">Prop ID: {resolvedPropId}</span>
        {resolvedGeoId && <span className="text-sm text-muted-foreground">Geo: {resolvedGeoId}</span>}
      </div>

      <Tabs defaultValue="ownership" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ownership" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Ownership
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="property" className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            Property
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ownership" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PacsOwnerPanel propId={resolvedPropId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PacsSalesPanel propId={resolvedPropId} hoodCd={hoodCd} />
          </Suspense>
        </TabsContent>

        <TabsContent value="property" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PacsPropertyPanel propId={resolvedPropId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PropertyProfilePanel propId={resolvedPropId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
