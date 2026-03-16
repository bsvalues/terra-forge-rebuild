// TerraFusion OS — Neighborhood Directory & Analytics
// Read-contract: useNeighborhoods + useNeighborhoodStats

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Search,
  Plus,
  Home,
  DollarSign,
  BarChart3,
  Hash,
  Building2,
  Calendar,
  Pencil,
  Trash2,
  TrendingUp,
  Layers,
} from "lucide-react";
import {
  useNeighborhoods,
  useNeighborhoodStats,
  useCreateNeighborhood,
  useUpdateNeighborhood,
  useDeleteNeighborhood,
  type NeighborhoodStats,
} from "@/hooks/useNeighborhoods";

export function NeighborhoodDirectoryPanel() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear());

  const { data: neighborhoods = [], isLoading: loadingNbhds } = useNeighborhoods();
  const { data: stats = [], isLoading: loadingStats } = useNeighborhoodStats();
  const createMut = useCreateNeighborhood();
  const updateMut = useUpdateNeighborhood();
  const deleteMut = useDeleteNeighborhood();

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

  // Aggregate stats
  const totalParcels = enrichedStats.reduce((s, n) => s + n.parcel_count, 0);
  const totalValue = enrichedStats.reduce((s, n) => s + n.total_value, 0);
  const activeNeighborhoods = enrichedStats.length;

  const handleSubmit = () => {
    if (editId) {
      updateMut.mutate({ id: editId, hood_name: formName }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    } else {
      createMut.mutate({ hood_cd: formCode, hood_name: formName, year: formYear }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormCode("");
    setFormName("");
    setFormYear(new Date().getFullYear());
  };

  const openEdit = (nbhd: { id: string; hood_cd: string; hood_name: string | null }) => {
    const full = neighborhoods.find(n => n.hood_cd === nbhd.hood_cd);
    if (full) {
      setEditId(full.id);
      setFormCode(full.hood_cd);
      setFormName(full.hood_name || "");
      setFormYear(full.year);
      setDialogOpen(true);
    }
  };

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `$${(n / 1_000).toFixed(0)}K`
        : `$${n.toLocaleString()}`;

  const isLoading = loadingNbhds || loadingStats;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">Neighborhood Directory</h2>
          <p className="text-sm text-muted-foreground">Browse, manage, and analyze neighborhood boundaries and statistics</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Neighborhoods", value: activeNeighborhoods, icon: Layers, color: "text-primary" },
          { label: "Total Parcels", value: totalParcels.toLocaleString(), icon: Home, color: "text-tf-cyan" },
          { label: "Total Assessed", value: fmt(totalValue), icon: DollarSign, color: "text-tf-green" },
          { label: "Registered", value: neighborhoods.length, icon: Hash, color: "text-tf-gold" },
        ].map((card) => (
          <Card key={card.label} className="bg-card/50 border-border/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-semibold text-foreground">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Create */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50 border-border/30"
          />
        </div>
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

      {/* Neighborhood Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-12 text-center">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "No neighborhoods match your search" : "No neighborhood data available yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((n, i) => (
              <NeighborhoodCard
                key={n.hood_cd}
                stat={n}
                index={i}
                hasRegistered={neighborhoods.some(nb => nb.hood_cd === n.hood_cd)}
                onEdit={() => openEdit({ id: "", hood_cd: n.hood_cd, hood_name: n.hood_name })}
                onDelete={() => {
                  const full = neighborhoods.find(nb => nb.hood_cd === n.hood_cd);
                  if (full) deleteMut.mutate(full.id);
                }}
                fmt={fmt}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function NeighborhoodCard({
  stat,
  index,
  hasRegistered,
  onEdit,
  onDelete,
  fmt,
}: {
  stat: NeighborhoodStats;
  index: number;
  hasRegistered: boolean;
  onEdit: () => void;
  onDelete: () => void;
  fmt: (n: number) => string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
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
              {hasRegistered && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  Registered
                </Badge>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {hasRegistered && (
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
          {/* Value bar */}
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
