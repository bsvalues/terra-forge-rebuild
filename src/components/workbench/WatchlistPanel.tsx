// TerraFusion OS — Phase 112: Parcel Watchlist Panel
// Quick-access watchlist with priority badges, notes, and navigation.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Star,
  Loader2,
  MapPin,
  DollarSign,
  Trash2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  useWatchlist,
  useRemoveFromWatchlist,
  type WatchlistItem,
  type WatchlistPriority,
} from "@/hooks/useParcelWatchlist";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRIORITY_CONFIG: Record<WatchlistPriority, { color: string; label: string }> = {
  critical: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Critical" },
  high: { color: "bg-chart-4/15 text-chart-4 border-chart-4/30", label: "High" },
  normal: { color: "bg-primary/15 text-primary border-primary/30", label: "Normal" },
  low: { color: "bg-muted text-muted-foreground border-border/30", label: "Low" },
};

export function WatchlistPanel() {
  const { data: watchlist = [], isLoading } = useWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const { setParcel } = useWorkbench();
  const [filter, setFilter] = useState("");

  const filtered = watchlist.filter(w => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      w.parcel_number?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q) ||
      w.neighborhood_code?.toLowerCase().includes(q) ||
      w.note?.toLowerCase().includes(q)
    );
  });

  // Sort: critical > high > normal > low
  const priorityOrder: WatchlistPriority[] = ["critical", "high", "normal", "low"];
  const sorted = [...filtered].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  );

  const handleNavigate = (item: WatchlistItem) => {
    setParcel({
      id: item.parcel_id,
      parcelNumber: item.parcel_number ?? null,
      address: item.address ?? null,
      assessedValue: item.assessed_value ?? null,
      neighborhoodCode: item.neighborhood_code ?? null,
      propertyClass: item.property_class ?? null,
    });
  };

  const handleRemove = async (item: WatchlistItem) => {
    try {
      await removeMutation.mutateAsync({ watchlistId: item.id, parcelId: item.parcel_id });
      toast.success("Removed from watchlist");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-tf-gold" />
            Parcel Watchlist
            <Badge variant="outline" className="text-[9px] ml-1">
              {watchlist.length}
            </Badge>
          </CardTitle>
        </div>
        {watchlist.length > 3 && (
          <Input
            placeholder="Filter parcels…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-7 text-xs mt-2"
          />
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading watchlist…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-6">
            <Star className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {filter ? "No parcels match filter" : "No parcels in watchlist"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <AnimatePresence>
              {sorted.map((item, i) => {
                const cfg = PRIORITY_CONFIG[item.priority];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/20 transition-colors border-b border-border/10 last:border-0"
                  >
                    <button
                      onClick={() => handleNavigate(item)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.parcel_number ?? "Unknown"}
                        </span>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 shrink-0", cfg.color)}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5 pl-5">
                        {item.address ?? "No address"}
                        {item.assessed_value && (
                          <span className="ml-2 text-foreground">
                            ${item.assessed_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5 pl-5 italic">
                          {item.note}
                        </div>
                      )}
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemove(item)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
