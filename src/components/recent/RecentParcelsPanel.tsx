// TerraFusion OS — Recent Parcels Panel
// Shows recently viewed parcels with quick navigation

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowRight, X, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRecentParcels, type RecentParcel } from "@/hooks/useRecentParcels";
import { formatDistanceToNow } from "date-fns";

interface RecentParcelsCardProps {
  item: RecentParcel;
  onNavigate: (parcel: RecentParcel) => void;
  onRemove: (id: string) => void;
}

function RecentParcelCard({ item, onNavigate, onRemove }: RecentParcelsCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="group"
    >
      <Card className="border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground truncate">
                {item.parcelNumber || "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                ${item.assessedValue?.toLocaleString() || "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{item.address || "No address"}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Viewed {formatDistanceToNow(new Date(item.viewedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onNavigate(item)}
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface RecentParcelsPanelProps {
  onNavigateToParcel?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

export function RecentParcelsPanel({ onNavigateToParcel }: RecentParcelsPanelProps) {
  const { recents, removeRecent, clearRecents } = useRecentParcels();
  const [search, setSearch] = useState("");

  const filtered = recents.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.parcelNumber?.toLowerCase().includes(q) ||
      item.address?.toLowerCase().includes(q)
    );
  });

  const handleNavigate = (item: RecentParcel) => {
    onNavigateToParcel?.({
      id: item.id,
      parcelNumber: item.parcelNumber,
      address: item.address,
      assessedValue: item.assessedValue,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Recent Parcels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Parcels you've recently viewed for quick re-access
          </p>
        </div>
        {recents.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearRecents} className="text-xs gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </Button>
        )}
      </div>

      {/* Search */}
      {recents.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter recent parcels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {recents.length ? "No parcels match your filter" : "No recent parcels"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              View parcels in the Workbench and they'll appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((item) => (
              <RecentParcelCard
                key={item.id}
                item={item}
                onNavigate={handleNavigate}
                onRemove={removeRecent}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
