import { useState } from "react";
import { usePacsLandDetails, type PacsLandDetail } from "@/hooks/usePacsLandDetails";
import { usePacsImprovements, usePacsImprovementDetails, type PacsImprovement, type PacsImprovementDetail } from "@/hooks/usePacsImprovements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Layers, Building, ChevronDown } from "lucide-react";

interface PacsPropertyPanelProps {
  propId: number;
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function formatNumber(val: number | null, decimals = 2): string {
  if (val == null) return "—";
  return Number(val).toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function ImprovementDetailRow({ propId, imprv }: { propId: number; imprv: PacsImprovement }) {
  const [open, setOpen] = useState(false);
  const { data: details } = usePacsImprovementDetails(open ? propId : null, open ? imprv.imprv_id : null);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <TableRow className="cursor-pointer hover:bg-muted/30">
        <TableCell>
          <CollapsibleTrigger className="flex items-center gap-1 text-left">
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
            {imprv.imprv_desc ?? imprv.imprv_type_cd ?? "—"}
          </CollapsibleTrigger>
        </TableCell>
        <TableCell className="text-right font-medium">{formatCurrency(imprv.imprv_val)}</TableCell>
        <TableCell className="text-right">{imprv.economic_pct != null ? `${imprv.economic_pct}%` : "—"}</TableCell>
        <TableCell className="text-right">{imprv.physical_pct != null ? `${imprv.physical_pct}%` : "—"}</TableCell>
        <TableCell>
          <Badge variant="outline">{imprv.imprv_val_source ?? "—"}</Badge>
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <>
          {details?.map((d: PacsImprovementDetail) => (
            <TableRow key={d.id} className="bg-muted/10 text-xs">
              <TableCell className="pl-8">
                {d.imprv_det_type_cd ?? "—"} / {d.imprv_det_class_cd ?? "—"}
                {d.actual_year_built && <span className="ml-2 text-muted-foreground">Built {d.actual_year_built}</span>}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(d.imprv_det_val)}</TableCell>
              <TableCell className="text-right">{d.living_area ? `${formatNumber(d.living_area, 0)} sqft` : "—"}</TableCell>
              <TableCell className="text-right">
                {d.num_bedrooms != null ? `${d.num_bedrooms}bd` : ""}
                {d.total_bath != null ? ` / ${d.total_bath}ba` : ""}
              </TableCell>
              <TableCell>
                {d.condition_cd && <Badge variant="outline" className="text-xs">{d.condition_cd}</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PacsPropertyPanel({ propId }: PacsPropertyPanelProps) {
  const { data: landSegs, isLoading: landLoading } = usePacsLandDetails(propId);
  const { data: improvements, isLoading: imprvLoading } = usePacsImprovements(propId);

  if (landLoading || imprvLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>;
  }

  const totalLandVal = landSegs?.reduce((sum, s) => sum + (Number(s.land_val) || 0), 0) ?? 0;
  const totalImprvVal = improvements?.reduce((sum, i) => sum + (Number(i.imprv_val) || 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Land Segments */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Land Segments ({landSegs?.length ?? 0}) — Total: {formatCurrency(totalLandVal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!landSegs?.length ? (
            <p className="text-sm text-muted-foreground">No PACS land data for this property</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seg</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Acres</TableHead>
                    <TableHead className="text-right">Sq Ft</TableHead>
                    <TableHead className="text-right">Land Value</TableHead>
                    <TableHead className="text-right">Ag Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {landSegs.map((s: PacsLandDetail) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.land_seg_id ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{s.land_type_cd ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right">{formatNumber(s.land_acres, 2)}</TableCell>
                      <TableCell className="text-right">{formatNumber(s.land_sqft, 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.land_val)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.ag_val)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvements */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            Improvements ({improvements?.length ?? 0}) — Total: {formatCurrency(totalImprvVal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!improvements?.length ? (
            <p className="text-sm text-muted-foreground">No PACS improvement data for this property</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Econ %</TableHead>
                    <TableHead className="text-right">Phys %</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {improvements.map((i: PacsImprovement) => (
                    <ImprovementDetailRow key={i.id} propId={propId} imprv={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
