import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PacsOwnerPanel } from "./PacsOwnerPanel";
import { PacsSalesPanel } from "./PacsSalesPanel";
import { PacsPropertyPanel } from "./PacsPropertyPanel";
import { Users, DollarSign, Building } from "lucide-react";

interface ParcelDossierPACSProps {
  propId: number;
  geoId?: string | null;
  hoodCd?: string | null;
}

export function ParcelDossierPACS({ propId, geoId, hoodCd }: ParcelDossierPACSProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">PACS Property Dossier</h2>
        <span className="text-sm text-muted-foreground">Prop ID: {propId}</span>
        {geoId && <span className="text-sm text-muted-foreground">Geo: {geoId}</span>}
      </div>

      <Tabs defaultValue="ownership" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        <TabsContent value="ownership" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PacsOwnerPanel propId={propId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PacsSalesPanel propId={propId} hoodCd={hoodCd} />
          </Suspense>
        </TabsContent>

        <TabsContent value="property" className="mt-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <PacsPropertyPanel propId={propId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
