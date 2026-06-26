// TerraFusion OS — Parcel Watchlist Panel
// Displays and manages the user's bookmarked/starred parcels

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  StarOff,
  Trash2,
  StickyNote,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  useWatchlist,
  useRemoveFromWatchlist,
  useUpdateWatchlistItem,
  type WatchlistItem,
  type WatchlistPriority,
} from "@/hooks/useParcelWatchlist";
import { formatDistanceToNow } from "date-fns";

const PRIORITY_CONFIG: Record<WatchlistPriority, { label: string; color: string; icon?: typeof AlertTriangle }> = {
  critical: { label: "Critical", color: "bg-destructive text-destructive-foreground" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  normal: { label: "Normal", color: "bg-muted text-muted-foreground" },
  low: { label: "Low", color: "bg-muted/50 text-muted-foreground/70" },
};

interface WatchlistCardProps {
  item: WatchlistItem;
  onNavigate?: (parcelId: string) => void;
}

function WatchlistCard({ item, onNavigate }: WatchlistCardProps) {
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(item.note || "");
  const [priority, setPriority] = useState<WatchlistPriority>(item.priority);
  const removeMutation = useRemoveFromWatchlist();
  const updateMutation = useUpdateWatchlistItem();

  const handleSave = async () => {
    await updateMutation.mutateAsync({ id: item.id, note: noteText, priority });
    setEditing(false);
  };

  const pConfig = PRIORITY_CONFIG[item.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group"
    >
      <Card className="border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                <span className="font-mono text-sm font-semibold text-foreground truncate">
                  {item.parcel_number || "—"}
                </span>
                <Badge className={`text-[10px] px-1.5 py-0 ${pConfig.color}`}>
                  {pConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.address || "No address"}</p>
              {item.assessed_value && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${item.assessed_value.toLocaleString()}
                  {item.property_class && <span className="ml-2 opacity-60">• {item.property_class}</span>}
                </p>
              )}
              {item.note && !editing && (
                <p className="text-xs text-muted-foreground/80 mt-2 italic border-l-2 border-primary/20 pl-2">
                  {item.note}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onNavigate?.(item.parcel_id)}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditing(!editing)}
              >
                <StickyNote className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/60 hover:text-destructive"
                onClick={() => removeMutation.mutate({ watchlistId: item.id, parcelId: item.parcel_id })}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Edit panel */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Select value={priority} onValueChange={(v) => setPriority(v as WatchlistPriority)}>
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface WatchlistPanelProps {
  onNavigateToParcel?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

export function WatchlistPanel({ onNavigateToParcel }: WatchlistPanelProps) {
  const { data: watchlist, isLoading } = useWatchlist();
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const filtered = (watchlist || []).filter((item) => {
    const matchesSearch =
      !search ||
      item.parcel_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.address?.toLowerCase().includes(search.toLowerCase()) ||
      item.note?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const priorityCounts = {
    critical: (watchlist || []).filter((w) => w.priority === "critical").length,
    high: (watchlist || []).filter((w) => w.priority === "high").length,
    normal: (watchlist || []).filter((w) => w.priority === "normal").length,
    low: (watchlist || []).filter((w) => w.priority === "low").length,
  };

  const handleNavigate = (parcelId: string) => {
    const item = watchlist?.find((w) => w.parcel_id === parcelId);
    if (item && onNavigateToParcel) {
      onNavigateToParcel({
        id: item.parcel_id,
        parcelNumber: item.parcel_number || "",
        address: item.address || "",
        assessedValue: item.assessed_value || 0,
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          Parcel Watchlist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bookmarked parcels for quick access and monitoring
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["critical", "high", "normal", "low"] as const).map((p) => (
          <Card key={p} className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-foreground">{priorityCounts[p]}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{p}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search parcels, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32 h-9">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="p-12 text-center">
            <StarOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {watchlist?.length ? "No parcels match your filters" : "No parcels in your watchlist"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Star parcels from the Workbench to add them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((item) => (
              <WatchlistCard key={item.id} item={item} onNavigate={handleNavigate} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
