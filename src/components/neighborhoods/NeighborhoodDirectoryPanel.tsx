// TerraFusion OS — Neighborhood Configuration Hub (Phase 70)
// Auto-discover → Bulk Register → Configure Model Areas → Calibration Readiness
// "The neighborhood said 'register me' and I said 'you're already a rectangle'" — Ralph Wiggum

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Search, Plus, Home, DollarSign, BarChart3,
  Building2, Calendar, Pencil, Trash2, Layers, CheckCircle2,
  AlertTriangle, Zap, Loader2, Brain, Sparkles,
  ChevronRight, XCircle,
} from "lucide-react";
import {
  useNeighborhoods,
  useNeighborhoodStats,
  useDiscoverNeighborhoods,
  useCreateNeighborhood,
  useUpdateNeighborhood,
  useDeleteNeighborhood,
  useBulkRegisterNeighborhoods,
  type NeighborhoodStats,
  type DiscoveredNeighborhood,
} from "@/hooks/useNeighborhoods";
import { ScopeHeader } from "@/components/trust";

// ── Format helper ───────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
      : `$${n.toLocaleString()}`;

// ── Calibration readiness indicator ─────────────────────────────
function CalibrationBadge({ rSquared }: { rSquared: number | null }) {
  if (rSquared === null || rSquared === undefined) {
    return (
      <Badge variant="outline" className="text-[8px] px-1 text-muted-foreground border-border">
        Not Calibrated
      </Badge>
    );
  }
  const good = rSquared >= 0.7;
  return (
    <Badge
      variant="outline"
      className={`text-[8px] px-1 gap-0.5 ${
        good ? "text-emerald-400 border-emerald-500/20" : "text-amber-400 border-amber-500/20"
      }`}
    >
      R² {rSquared.toFixed(3)}
    </Badge>
  );
}

// ── Discovery Card ──────────────────────────────────────────────
function DiscoveryCard({
  nbhd,
  selected,
  onToggle,
}: {
  nbhd: DiscoveredNeighborhood;
  selected: boolean;
  onToggle: () => void;
}) {
  const coordPct = nbhd.parcel_count > 0
    ? Math.round((nbhd.with_coords / nbhd.parcel_count) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        selected
          ? "border-primary/40 bg-primary/5"
          : nbhd.is_registered
            ? "border-emerald-500/20 bg-emerald-500/5 opacity-60"
            : "border-border/30 bg-card/50 hover:border-primary/20"
      }`}
      onClick={nbhd.is_registered ? undefined : onToggle}
    >
      <div className="flex items-start gap-3">
        {!nbhd.is_registered && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mt-0.5"
          />
        )}
        {nbhd.is_registered && (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {nbhd.hood_cd}
            </Badge>
            <CalibrationBadge rSquared={nbhd.latest_r_squared} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-[10px]">
            <div className="flex items-center gap-1">
              <Home className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Parcels:</span>
              <span className="text-foreground font-medium">{nbhd.parcel_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Avg:</span>
              <span className="text-foreground font-medium">{fmt(nbhd.avg_value || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Coords:</span>
              <span className={`font-medium ${coordPct >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                {coordPct}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Classes:</span>
              <span className="text-foreground font-medium">{nbhd.class_count}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Registered Neighborhood Card ────────────────────────────────
function RegisteredCard({
  stat,
  registered,
  index,
  onEdit,
  onDelete,
}: {
  stat: NeighborhoodStats;
  registered: boolean;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="bg-card/50 border-border/30 hover:border-primary/30 transition-colors group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {stat.hood_cd}
              </Badge>
              {registered && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  Registered
                </Badge>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {registered && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <CardTitle className="text-sm font-medium">
            {stat.hood_name || "Unnamed Neighborhood"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Parcels:</span>
              <span className="font-medium text-foreground">{stat.parcel_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Median:</span>
              <span className="font-medium text-foreground">{fmt(stat.median_value)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Avg SF:</span>
              <span className="font-medium text-foreground">
                {stat.avg_building_area?.toLocaleString() ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Yr:</span>
              <span className="font-medium text-foreground">
                {stat.avg_year_built ?? "—"}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Total assessed</span>
              <span className="font-medium text-foreground">{fmt(stat.total_value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                style={{ width: `${Math.min((stat.parcel_count / 50) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PANEL
// ══════════════════════════════════════════════════════════════════

export function NeighborhoodDirectoryPanel() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formModelType, setFormModelType] = useState("linear");
  const [formDescription, setFormDescription] = useState("");
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("discover");

  const { data: neighborhoods = [], isLoading: loadingNbhds } = useNeighborhoods();
  const { data: stats = [], isLoading: loadingStats } = useNeighborhoodStats();
  const { data: discovered = [], isLoading: loadingDiscovery } = useDiscoverNeighborhoods();
  const createMut = useCreateNeighborhood();
  const updateMut = useUpdateNeighborhood();
  const deleteMut = useDeleteNeighborhood();
  const bulkRegister = useBulkRegisterNeighborhoods();

  // Merge stats with neighborhood names
  const enrichedStats = useMemo(() => {
    const nameMap = new Map(neighborhoods.map(n => [n.hood_cd, n.hood_name]));
    return stats.map(s => ({ ...s, hood_name: nameMap.get(s.hood_cd) || s.hood_name }));
  }, [neighborhoods, stats]);

  const filtered = useMemo(() => {
    if (!search) return enrichedStats;
    const q = search.toLowerCase();
    return enrichedStats.filter(
      s => s.hood_cd.toLowerCase().includes(q) || (s.hood_name?.toLowerCase().includes(q))
    );
  }, [enrichedStats, search]);

  const filteredDiscovery = useMemo(() => {
    if (!search) return discovered;
    const q = search.toLowerCase();
    return discovered.filter(d => d.hood_cd.toLowerCase().includes(q));
  }, [discovered, search]);

  // Aggregate stats
  const totalParcels = enrichedStats.reduce((s, n) => s + n.parcel_count, 0);
  const _totalValue = enrichedStats.reduce((s, n) => s + n.total_value, 0);
  const registeredCount = neighborhoods.length;
  const unregisteredCount = discovered.filter(d => !d.is_registered).length;
  const calibratedCount = discovered.filter(d => d.latest_r_squared !== null).length;

  const handleSubmit = () => {
    if (editId) {
      updateMut.mutate({
        id: editId,
        hood_name: formName,
        model_type: formModelType,
        description: formDescription,
      }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    } else {
      createMut.mutate({
        hood_cd: formCode,
        hood_name: formName,
        year: formYear,
        model_type: formModelType,
        description: formDescription,
      }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormCode("");
    setFormName("");
    setFormYear(new Date().getFullYear());
    setFormModelType("linear");
    setFormDescription("");
  };

  const openEdit = (nbhd: { hood_cd: string }) => {
    const full = neighborhoods.find(n => n.hood_cd === nbhd.hood_cd);
    if (full) {
      setEditId(full.id);
      setFormCode(full.hood_cd);
      setFormName(full.hood_name || "");
      setFormYear(full.year);
      setFormModelType(full.model_type || "linear");
      setFormDescription(full.description || "");
      setDialogOpen(true);
    }
  };

  const toggleBulkSelect = (code: string) => {
    setSelectedForBulk(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAllUnregistered = () => {
    const unregistered = discovered.filter(d => !d.is_registered).map(d => d.hood_cd);
    setSelectedForBulk(new Set(unregistered));
  };

  const handleBulkRegister = () => {
    if (selectedForBulk.size === 0) return;
    bulkRegister.mutate(Array.from(selectedForBulk), {
      onSuccess: () => setSelectedForBulk(new Set()),
    });
  };

  const isLoading = loadingNbhds || loadingStats || loadingDiscovery;
  const registrationPct = discovered.length > 0
    ? Math.round(discovered.filter(d => d.is_registered).length / discovered.length * 100)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Neighborhood Configuration</h2>
              <p className="text-xs text-muted-foreground">
                Auto-discover • Bulk register • Configure model areas • Track calibration
              </p>
            </div>
          </div>
          <ScopeHeader scope="county" label="SLCo" source="neighborhoods" status="draft" />
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Discovered", value: discovered.length, icon: Search, color: "text-blue-400" },
          { label: "Registered", value: registeredCount, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Unregistered", value: unregisteredCount, icon: AlertTriangle, color: unregisteredCount > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Calibrated", value: calibratedCount, icon: Brain, color: "text-purple-400" },
          { label: "Total Parcels", value: totalParcels.toLocaleString(), icon: Home, color: "text-primary" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/50 border-border/30">
            <CardContent className="p-3 flex items-center gap-2.5">
              <stat.icon className={`h-4 w-4 ${stat.color} flex-shrink-0`} />
              <div>
                <div className="text-lg font-bold font-mono text-foreground">{stat.value}</div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registration progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Registration Progress</span>
          <span className="font-mono font-medium text-foreground">{registrationPct}%</span>
        </div>
        <Progress value={registrationPct} className="h-2" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search neighborhoods by code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border/30"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discover" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Discover & Register
            {unregisteredCount > 0 && (
              <Badge variant="destructive" className="text-[8px] px-1 py-0 ml-1">
                {unregisteredCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Directory ({enrichedStats.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Discover Tab ──────────────────────────────────────── */}
        <TabsContent value="discover" className="space-y-4 mt-4">
          {/* Bulk action bar */}
          {unregisteredCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Zap className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs text-foreground flex-1">
                {selectedForBulk.size > 0
                  ? `${selectedForBulk.size} selected for registration`
                  : `${unregisteredCount} unregistered neighborhoods found in parcel data`
                }
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllUnregistered}
                className="text-xs"
              >
                Select All
              </Button>
              <Button
                size="sm"
                onClick={handleBulkRegister}
                disabled={selectedForBulk.size === 0 || bulkRegister.isPending}
                className="text-xs gap-1.5"
              >
                {bulkRegister.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Register {selectedForBulk.size > 0 ? `(${selectedForBulk.size})` : ""}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredDiscovery.length === 0 ? (
            <Card className="bg-card/50 border-border/30">
              <CardContent className="p-12 text-center">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No neighborhoods match your search" : "No neighborhood codes found in parcel data"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDiscovery.map((nbhd) => (
                  <DiscoveryCard
                    key={nbhd.hood_cd}
                    nbhd={nbhd}
                    selected={selectedForBulk.has(nbhd.hood_cd)}
                    onToggle={() => toggleBulkSelect(nbhd.hood_cd)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ── Directory Tab ─────────────────────────────────────── */}
        <TabsContent value="directory" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Neighborhood
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editId ? "Edit Neighborhood" : "Add Neighborhood"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Neighborhood Code</Label>
                    <Input
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. R-101"
                      disabled={!!editId}
                    />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Downtown Core"
                    />
                  </div>
                  <div>
                    <Label>Model Type</Label>
                    <Select value={formModelType} onValueChange={setFormModelType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear Regression</SelectItem>
                        <SelectItem value="multiplicative">Multiplicative</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Linear + Multiplicative)</SelectItem>
                        <SelectItem value="cost_only">Cost Approach Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Notes about this model area…"
                    />
                  </div>
                  {!editId && (
                    <div>
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={formYear}
                        onChange={(e) => setFormYear(Number(e.target.value))}
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!formCode || createMut.isPending || updateMut.isPending}
                    className="w-full"
                  >
                    {editId ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="bg-card/50 border-border/30">
              <CardContent className="p-12 text-center">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No neighborhoods match your search" : "No neighborhood data. Use Discover tab to register."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((n, i) => (
                  <RegisteredCard
                    key={n.hood_cd}
                    stat={n}
                    index={i}
                    registered={neighborhoods.some(nb => nb.hood_cd === n.hood_cd)}
                    onEdit={() => openEdit({ hood_cd: n.hood_cd })}
                    onDelete={() => {
                      const full = neighborhoods.find(nb => nb.hood_cd === n.hood_cd);
                      if (full) deleteMut.mutate(full.id);
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
