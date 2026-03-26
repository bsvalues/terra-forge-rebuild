import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Play,
  Pencil,
  Search,
  Clock,
  Database,
  X,
  Bell,
  BellOff,
  Share2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useSavedFilters,
  useCreateFilter,
  useUpdateFilter,
  useDeleteFilter,
  useMarkFilterUsed,
  useFilterPreview,
  FILTER_FIELDS,
  OPERATOR_LABELS,
  type SavedFilter,
  type FilterCondition,
  type FilterConfig,
} from "@/hooks/useSavedFilters";

// ── Filter Builder Dialog ────────────────────────────────────────
function FilterBuilderDialog({
  open,
  onOpenChange,
  editFilter,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editFilter?: SavedFilter | null;
}) {
  const createFilter = useCreateFilter();
  const updateFilter = useUpdateFilter();

  const [name, setName] = useState(editFilter?.name ?? "");
  const [description, setDescription] = useState(editFilter?.description ?? "");
  const [dataset, setDataset] = useState(editFilter?.target_dataset ?? "parcels");
  const [conditions, setConditions] = useState<FilterCondition[]>(
    editFilter?.filter_config?.conditions ?? []
  );
  const [isPinned, setIsPinned] = useState(editFilter?.is_pinned ?? false);
  const [alertOnChange, setAlertOnChange] = useState(editFilter?.alert_on_change ?? false);
  const [isShared, setIsShared] = useState(editFilter?.is_shared ?? false);

  const { count: previewCount, loading: previewLoading } = useFilterPreview(dataset, conditions);

  const fields = FILTER_FIELDS[dataset] ?? FILTER_FIELDS.parcels;

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { field: fields[0].field, operator: "eq", value: "" },
    ]);
  };

  const updateCondition = (idx: number, updates: Partial<FilterCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...updates } : c))
    );
  };

  const removeCondition = (idx: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const config: FilterConfig = { conditions };
    if (editFilter) {
      updateFilter.mutate(
        { id: editFilter.id, name, description, target_dataset: dataset, filter_config: config, is_pinned: isPinned, alert_on_change: alertOnChange, is_shared: isShared },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createFilter.mutate(
        { name, description, target_dataset: dataset, filter_config: config, is_pinned: isPinned, alert_on_change: alertOnChange, is_shared: isShared },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editFilter ? "Edit Smart View" : "New Smart View"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-value residential" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note…" />
          </div>
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select value={dataset} onValueChange={setDataset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parcels">Parcels</SelectItem>
                <SelectItem value="sales">Sales / Ratios</SelectItem>
                <SelectItem value="appeals">Appeals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Filter Conditions</Label>
              <Button size="sm" variant="outline" onClick={addCondition}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            <AnimatePresence>
              {conditions.map((cond, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2"
                >
                  <Select value={cond.field} onValueChange={(v) => updateCondition(idx, { field: v })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(idx, { operator: v as FilterCondition["operator"] })}
                  >
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPERATOR_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cond.operator !== "is_null" && cond.operator !== "is_not_null" && (
                    <Input
                      className="flex-1"
                      value={String(cond.value ?? "")}
                      onChange={(e) => updateCondition(idx, { value: e.target.value })}
                      placeholder="Value…"
                    />
                  )}
                  <Button size="icon" variant="ghost" onClick={() => removeCondition(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No conditions yet — add one above.</p>
            )}
          </div>

          {/* Pin toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isPinned ? "default" : "outline"}
              onClick={() => setIsPinned(!isPinned)}
            >
              {isPinned ? <Pin className="w-3 h-3 mr-1" /> : <PinOff className="w-3 h-3 mr-1" />}
              {isPinned ? "Pinned" : "Not pinned"}
            </Button>
            <span className="text-xs text-muted-foreground">Pinned views appear at the top</span>
          </div>

          {/* Alert toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={alertOnChange ? "default" : "outline"}
              onClick={() => setAlertOnChange(!alertOnChange)}
            >
              {alertOnChange ? <Bell className="w-3 h-3 mr-1" /> : <BellOff className="w-3 h-3 mr-1" />}
              {alertOnChange ? "Alerts on" : "No alerts"}
            </Button>
            <span className="text-xs text-muted-foreground">Notify when result count changes</span>
          </div>

          {/* Share toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isShared ? "default" : "outline"}
              onClick={() => setIsShared(!isShared)}
            >
              <Share2 className="w-3 h-3 mr-1" />
              {isShared ? "Shared" : "Private"}
            </Button>
            <span className="text-xs text-muted-foreground">Shared views are visible to county colleagues</span>
          </div>

          {/* Live Preview */}
          {conditions.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              {previewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Database className="w-4 h-4 text-primary" />
              )}
              <span className="text-sm font-medium">
                {previewLoading
                  ? "Counting..."
                  : previewCount !== null
                    ? `${previewCount.toLocaleString()} matching records`
                    : "Add filter values to preview"}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || createFilter.isPending || updateFilter.isPending}>
            {editFilter ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Saved Filters Panel ──────────────────────────────────────────
export function SavedFiltersPanel() {
  const { data: filters = [], isLoading } = useSavedFilters();
  const deleteFilter = useDeleteFilter();
  const updateFilter = useUpdateFilter();
  const markUsed = useMarkFilterUsed();
  const [search, setSearch] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);

  const filtered = filters.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pinnedCount = filters.filter((f) => f.is_pinned).length;

  const handleApply = (filter: SavedFilter) => {
    markUsed.mutate({ id: filter.id });
    // In a full implementation this would navigate to the target dataset with filters applied
  };

  const handleEdit = (filter: SavedFilter) => {
    setEditingFilter(filter);
    setBuilderOpen(true);
  };

  const handleTogglePin = (filter: SavedFilter) => {
    updateFilter.mutate({ id: filter.id, is_pinned: !filter.is_pinned });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" />
            Smart Views
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save filter configurations for quick access to frequently-used data slices
          </p>
        </div>
        <Button onClick={() => { setEditingFilter(null); setBuilderOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Smart View
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{filters.length}</div>
              <div className="text-xs text-muted-foreground">Total Views</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Pin className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{pinnedCount}</div>
              <div className="text-xs text-muted-foreground">Pinned</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {new Set(filters.map((f) => f.target_dataset)).size}
              </div>
              <div className="text-xs text-muted-foreground">Datasets</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search smart views…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No matching views found" : "No smart views yet — create one to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((filter) => (
              <motion.div
                key={filter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {filter.is_pinned && (
                            <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-foreground truncate">{filter.name}</h3>
                          <Badge variant="secondary" className="text-[10px]">
                            {filter.target_dataset}
                          </Badge>
                          {filter.alert_on_change && (
                            <Bell className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          )}
                          {filter.is_shared && (
                            <Share2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        {filter.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{filter.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{filter.filter_config.conditions?.length ?? 0} conditions</span>
                          {filter.last_used_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Used {new Date(filter.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                          {filter.result_count !== null && (
                            <span>{filter.result_count.toLocaleString()} results</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <Button size="sm" variant="default" onClick={() => handleApply(filter)}>
                          <Play className="w-3 h-3 mr-1" /> Apply
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(filter)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleTogglePin(filter)}
                        >
                          {filter.is_pinned ? (
                            <PinOff className="w-3 h-3 text-amber-500" />
                          ) : (
                            <Pin className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteFilter.mutate(filter.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Builder Dialog */}
      <FilterBuilderDialog
        open={builderOpen}
        onOpenChange={(v) => { setBuilderOpen(v); if (!v) setEditingFilter(null); }}
        editFilter={editingFilter}
      />
    </div>
  );
}
