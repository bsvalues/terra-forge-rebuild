// TerraFusion OS — Mission Preview Drawer
// Shows top offenders + why_flagged for any mission.
// "Show me exactly which parcels and why."

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrustBoundary } from "@/components/trust/TrustBoundary";
import { getMission } from "@/lib/missionConstitution";
import { useMissionPreview } from "@/hooks/useMissionPreview";
import { FixPackPanel } from "./FixPackPanel";
import { AlertTriangle, FileText, MapPin, Wrench } from "lucide-react";
import { motion } from "framer-motion";

interface MissionPreviewDrawerProps {
  missionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToParcel?: (parcelId: string) => void;
}

export function MissionPreviewDrawer({ missionId, open, onOpenChange, onNavigateToParcel }: MissionPreviewDrawerProps) {
  const { data, isLoading } = useMissionPreview(open ? missionId : null);
  const mission = missionId ? getMission(missionId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold truncate">
                {mission?.title ?? "Mission Preview"}
              </SheetTitle>
              {data && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data.total} {data.total === 1 ? "parcel" : "parcels"} flagged
                </p>
              )}
            </div>
            {data && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {data.total}
              </Badge>
            )}
          </div>
          {data && (
            <TrustBoundary
              sources={data.sources}
              fetchedAt={data.as_of}
              confidence={data.confidence as "high" | "medium" | "low"}
              scopeN={data.scope?.scope_n ?? data.scope?.total_parcels}
              minClassN={data.scope?.min_class_n}
              className="mt-2"
            />
          )}
        </SheetHeader>

        <Tabs defaultValue="offenders" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-3 mt-2 w-auto">
            <TabsTrigger value="offenders" className="text-xs gap-1"><FileText className="w-3 h-3" />Offenders</TabsTrigger>
            <TabsTrigger value="fix" className="text-xs gap-1"><Wrench className="w-3 h-3" />Fix Pack</TabsTrigger>
          </TabsList>

          <TabsContent value="offenders" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}

                {data?.rows?.map((row, i) => (
                  <motion.div
                    key={row.parcel_id ?? i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => row.parcel_id && onNavigateToParcel?.(row.parcel_id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-foreground">{row.apn ?? "—"}</span>
                          {row.property_class && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{row.property_class}</Badge>
                          )}
                        </div>
                        {row.situs && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground truncate">{row.situs}</span>
                          </div>
                        )}
                      </div>
                      {row.neighborhood && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">{row.neighborhood}</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-chart-4 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{row.why_flagged}</p>
                    </div>
                    {row.signals && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(row.signals as Record<string, any>).map(([k, v]) => (
                          <span key={k} className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {k}: {typeof v === "number" ? v.toLocaleString() : String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                {data && data.rows.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No offenders found.</div>
                )}
                {data && data.rows.length < data.total && (
                  <p className="text-center text-[10px] text-muted-foreground py-2">
                    Showing {data.rows.length} of {data.total} flagged parcels
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="fix" className="flex-1 min-h-0 mt-0">
            <div className="p-3">
              {missionId && <FixPackPanel missionId={missionId} onComplete={() => onOpenChange(false)} />}
            </div>
          </TabsContent>
        </Tabs>

        {data?.context && Object.keys(data.context).length > 0 && (
          <div className="border-t border-border p-3">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Detection Rules</p>
            <div className="flex flex-wrap gap-1">
              {data.context.rules?.map?.((rule: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[9px] font-mono px-1.5 py-0">{rule}</Badge>
              ))}
              {data.context.method && (
                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">method: {data.context.method}</Badge>
              )}
              {data.context.group_by && (
                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">grouped by: {data.context.group_by}</Badge>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
