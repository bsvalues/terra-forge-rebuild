import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Square, Search, Filter, Layers, Download, MapPin,
  ChevronDown, AlertTriangle, Loader2, Star, LayoutGrid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useBulkSelection,
  useBulkParcelSearch,
  useBulkAssignNeighborhood,
  useBulkUpdatePropertyClass,
  useBulkAddToWatchlist,
  exportParcelsCsv,
  BULK_ACTIONS,
  type BulkAction,
  type BulkParcelRow,
} from "@/hooks/useBulkOperations";

export function BulkOperationsPanel() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [hoodFilter, setHoodFilter] = useState<string>("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [actionInput, setActionInput] = useState("");

  const selection = useBulkSelection();
  const { data: parcels = [], isLoading } = useBulkParcelSearch(search, {
    propertyClass: classFilter || undefined,
    neighborhoodCode: hoodFilter || undefined,
  });

  const assignHood = useBulkAssignNeighborhood();
  const updateClass = useBulkUpdatePropertyClass();
  const addWatchlist = useBulkAddToWatchlist();

  const isExecuting = assignHood.isPending || updateClass.isPending || addWatchlist.isPending;

  // Derive unique values for filter dropdowns
  const propertyClasses = useMemo(() =>
    [...new Set(parcels.map(p => p.property_class).filter(Boolean))] as string[],
    [parcels]
  );
  const neighborhoods = useMemo(() =>
    [...new Set(parcels.map(p => p.neighborhood_code).filter(Boolean))] as string[],
    [parcels]
  );

  const handleSelectAll = () => {
    if (selection.selectedCount === parcels.length) {
      selection.clearSelection();
    } else {
      selection.selectAll(parcels.map(p => p.id));
    }
  };

  const openAction = (action: BulkAction) => {
    setPendingAction(action);
    setActionInput("");
    if (action === "export_selected") {
      const selected = parcels.filter(p => selection.isSelected(p.id));
      exportParcelsCsv(selected);
      return;
    }
    if (action === "add_to_watchlist" || action === "flag_for_review") {
      setActionDialogOpen(true);
      return;
    }
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    const ids = Array.from(selection.selectedIds);

    switch (pendingAction) {
      case "assign_neighborhood":
        await assignHood.mutateAsync({ parcelIds: ids, neighborhoodCode: actionInput });
        break;
      case "update_property_class":
        await updateClass.mutateAsync({ parcelIds: ids, propertyClass: actionInput });
        break;
      case "flag_for_review":
        await addWatchlist.mutateAsync({ parcelIds: ids, priority: "high" });
        break;
      case "add_to_watchlist":
        await addWatchlist.mutateAsync({ parcelIds: ids, priority: "normal" });
        break;
    }

    selection.clearSelection();
    setActionDialogOpen(false);
    setPendingAction(null);
  };

  const actionConfig = pendingAction ? BULK_ACTIONS.find(a => a.id === pendingAction) : null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-primary" />
          Bulk Operations
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Multi-select parcels and apply batch actions across your roll
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Results" value={parcels.length} icon={<MapPin className="w-4 h-4" />} />
        <StatCard label="Selected" value={selection.selectedCount} icon={<CheckSquare className="w-4 h-4" />} accent />
        <StatCard label="Classes" value={propertyClasses.length} icon={<Filter className="w-4 h-4" />} />
        <StatCard label="Neighborhoods" value={neighborhoods.length} icon={<Layers className="w-4 h-4" />} />
      </div>

      {/* Search + Filters */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by parcel number or address..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={classFilter} onValueChange={v => setClassFilter(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Classes</SelectItem>
                {propertyClasses.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hoodFilter} onValueChange={v => setHoodFilter(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Neighborhoods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Neighborhoods</SelectItem>
                {neighborhoods.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Toolbar (visible when selected) */}
      <AnimatePresence>
        {selection.selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selection.selectedCount} parcel{selection.selectedCount !== 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {BULK_ACTIONS.map(action => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.id === "export_selected" ? "outline" : "default"}
                      onClick={() => openAction(action.id)}
                      disabled={isExecuting}
                      className="text-xs"
                    >
                      {action.id === "export_selected" && <Download className="w-3.5 h-3.5 mr-1" />}
                      {action.id === "flag_for_review" && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                      {action.id === "add_to_watchlist" && <Star className="w-3.5 h-3.5 mr-1" />}
                      {action.id === "assign_neighborhood" && <Layers className="w-3.5 h-3.5 mr-1" />}
                      {action.id === "update_property_class" && <Filter className="w-3.5 h-3.5 mr-1" />}
                      {action.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={selection.clearSelection} className="text-xs text-muted-foreground">
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parcel Table */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="p-3 w-10">
                  <button onClick={handleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                    {selection.selectedCount === parcels.length && parcels.length > 0
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">Parcel #</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Address</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden sm:table-cell">City</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Class</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Neighborhood</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No parcels found. Adjust your search or filters.</p>
                  </td>
                </tr>
              ) : parcels.map(p => (
                <tr
                  key={p.id}
                  onClick={() => selection.toggle(p.id)}
                  className={`border-b border-border/30 cursor-pointer transition-colors ${
                    selection.isSelected(p.id) ? "bg-primary/5" : "hover:bg-muted/20"
                  }`}
                >
                  <td className="p-3">
                    {selection.isSelected(p.id)
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground" />
                    }
                  </td>
                  <td className="p-3 font-mono text-xs">{p.parcel_number}</td>
                  <td className="p-3 truncate max-w-[200px]">{p.address}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{p.city || "—"}</td>
                  <td className="p-3 hidden md:table-cell">
                    {p.property_class ? (
                      <Badge variant="outline" className="text-[10px]">{p.property_class}</Badge>
                    ) : "—"}
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{p.neighborhood_code || "—"}</td>
                  <td className="p-3 text-right font-medium">${p.assessed_value?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parcels.length >= 200 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/30">
            Showing first 200 results. Refine your search to narrow down.
          </div>
        )}
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{actionConfig?.label}</DialogTitle>
            <DialogDescription>
              {actionConfig?.description} — applies to {selection.selectedCount} parcel{selection.selectedCount !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          {actionConfig?.requiresInput && (
            <div className="space-y-2 py-2">
              <Label>{actionConfig.inputLabel}</Label>
              <Input
                placeholder={actionConfig.inputPlaceholder}
                value={actionInput}
                onChange={e => setActionInput(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={executeAction}
              disabled={isExecuting || (actionConfig?.requiresInput && !actionInput.trim())}
            >
              {isExecuting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Apply to {selection.selectedCount} Parcels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          accent ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
        }`}>
          {icon}
        </div>
        <div>
          <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
