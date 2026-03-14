// TerraFusion OS — Segment Manager Panel (Phase 26.2)

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProvenanceNumber } from "@/components/trust";
import {
  Layers, Plus, Trash2, Zap, MapPin, Building,
  Calendar, Tag, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  useSegmentDefinitions,
  useCreateSegment,
  useToggleSegment,
  useDeleteSegment,
  useSegmentEquityMetrics,
  type CreateSegmentInput,
} from "@/hooks/useSegmentDefinitions";
import { useNeighborhoodClustering } from "@/hooks/useAdvancedAnalytics";
import { toast } from "sonner";

const FACTOR_ICONS: Record<string, React.ElementType> = {
  building_area: Building,
  neighborhood_code: MapPin,
  year_built: Calendar,
  property_class: Tag,
};

const FACTOR_LABELS: Record<string, string> = {
  building_area: "Square Footage",
  neighborhood_code: "Neighborhood",
  year_built: "Property Age",
  property_class: "Property Class",
};

export function SegmentManagerPanel() {
  const { data: segments, isLoading } = useSegmentDefinitions();
  const { data: clusterData } = useNeighborhoodClustering();
  const equityMetrics = useSegmentEquityMetrics(segments ?? []);
  const createSegment = useCreateSegment();
  const toggleSegment = useToggleSegment();
  const deleteSegment = useDeleteSegment();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleImportFromCluster = () => {
    if (!clusterData || clusterData.centroids.length === 0) {
      toast.error("No clustering results available. Run clustering first.");
      return;
    }

    clusterData.centroids.forEach((c) => {
      const clusterNeighborhoods = clusterData.clusters
        .filter((n) => n.clusterId === c.id)
        .map((n) => n.code);

      createSegment.mutate({
        name: `${c.label} Neighborhoods`,
        description: `Auto-generated from clustering: avg value $${c.avgValue.toLocaleString()}, avg sqft ${c.avgSqft}`,
        factor: "neighborhood_code",
        ranges: clusterNeighborhoods.map((code) => ({ label: code, min: null, max: null })),
        importance: c.count / (clusterData.clusters.length || 1),
        source: "cluster",
        cluster_id: c.id,
      });
    });

    toast.success(`Imported ${clusterData.centroids.length} cluster-based segments`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const activeCount = (segments ?? []).filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(!showCreate)}
          className="gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Segment
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleImportFromCluster}
          disabled={!clusterData || clusterData.centroids.length === 0}
          className="gap-1.5 text-xs"
        >
          <Zap className="w-3.5 h-3.5" />
          Import from Clusters
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {segments?.length ?? 0} segments • {activeCount} active
          </Badge>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CreateSegmentForm
              onSubmit={(input) => {
                createSegment.mutate(input);
                setShowCreate(false);
              }}
              onCancel={() => setShowCreate(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segment list */}
      {(segments ?? []).length === 0 ? (
        <div className="material-bento rounded-2xl p-12 text-center">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No segments defined yet. Create one manually or import from clustering results.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(segments ?? []).map((seg) => {
            const Icon = FACTOR_ICONS[seg.factor] || Tag;
            const eqData = equityMetrics.data?.find((e) => e.segmentId === seg.id);
            const isExpanded = expandedId === seg.id;

            return (
              <motion.div
                key={seg.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="material-bento rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--tf-elevated))] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground truncate">{seg.name}</h3>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {seg.source}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {FACTOR_LABELS[seg.factor] || seg.factor} • {seg.ranges.length} ranges
                    </p>
                  </div>
                  <Switch
                    checked={seg.is_active}
                    onCheckedChange={(checked) => toggleSegment.mutate({ id: seg.id, is_active: checked })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setExpandedId(isExpanded ? null : seg.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteSegment.mutate(seg.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Expanded: show ranges + equity metrics */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-3"
                    >
                      {/* Ranges */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {seg.ranges.map((r, i) => (
                          <div key={i} className="p-2 rounded-lg bg-muted/20 text-xs">
                            <span className="text-foreground font-medium">{r.label}</span>
                            {r.min !== null && r.max !== null && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {r.min.toLocaleString()} – {r.max.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Equity metrics per range */}
                      {eqData && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/50">
                                <th className="text-left py-1.5 px-2 text-muted-foreground">Range</th>
                                <th className="text-right py-1.5 px-2 text-muted-foreground">Parcels</th>
                                <th className="text-right py-1.5 px-2 text-muted-foreground">Sales</th>
                                <th className="text-right py-1.5 px-2 text-muted-foreground">Median Ratio</th>
                                <th className="text-right py-1.5 px-2 text-muted-foreground">COD</th>
                              </tr>
                            </thead>
                            <tbody>
                              {eqData.ranges.map((r) => (
                                <tr key={r.rangeLabel} className="border-b border-border/20">
                                  <td className="py-1.5 px-2 text-foreground">{r.rangeLabel}</td>
                                  <td className="py-1.5 px-2 text-right text-muted-foreground">{r.parcelCount}</td>
                                  <td className="py-1.5 px-2 text-right text-muted-foreground">{r.salesCount}</td>
                                  <td className="py-1.5 px-2 text-right">
                                    <ProvenanceNumber source="segment-equity" cachePolicy="cached 120s">
                                      <span className={ratioColor(r.medianRatio)}>
                                        {r.medianRatio?.toFixed(3) ?? "—"}
                                      </span>
                                    </ProvenanceNumber>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">
                                    <ProvenanceNumber source="segment-equity" cachePolicy="cached 120s">
                                      <span className={codColor(r.cod)}>
                                        {r.cod?.toFixed(1) ?? "—"}%
                                      </span>
                                    </ProvenanceNumber>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ratioColor(ratio: number | null): string {
  if (ratio === null) return "text-muted-foreground";
  if (ratio >= 0.95 && ratio <= 1.05) return "text-[hsl(var(--tf-optimized-green))]";
  if (ratio >= 0.90 && ratio <= 1.10) return "text-[hsl(var(--tf-sacred-gold))]";
  return "text-[hsl(var(--tf-warning-red))]";
}

function codColor(cod: number | null): string {
  if (cod === null) return "text-muted-foreground";
  if (cod <= 10) return "text-[hsl(var(--tf-optimized-green))]";
  if (cod <= 15) return "text-[hsl(var(--tf-sacred-gold))]";
  return "text-[hsl(var(--tf-warning-red))]";
}

// ── Create Segment Form ─────────────────────────────────────

function CreateSegmentForm({ onSubmit, onCancel }: { onSubmit: (input: CreateSegmentInput) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [factor, setFactor] = useState("building_area");
  const [rangesStr, setRangesStr] = useState("0-1500, 1500-2500, 2500-4000, 4000+");

  const handleSubmit = () => {
    if (!name.trim()) return;

    const ranges = rangesStr.split(",").map((r) => {
      const trimmed = r.trim();
      if (trimmed.endsWith("+")) {
        const min = parseInt(trimmed.replace("+", ""));
        return { label: `${min.toLocaleString()}+`, min, max: null };
      }
      const parts = trimmed.split("-").map((p) => parseInt(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { label: `${parts[0].toLocaleString()}–${parts[1].toLocaleString()}`, min: parts[0], max: parts[1] };
      }
      return { label: trimmed, min: null, max: null };
    });

    onSubmit({ name, factor, ranges });
  };

  return (
    <div className="material-bento rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-medium text-foreground">Create Segment</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Size Tiers"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Factor</label>
          <select
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="building_area">Square Footage</option>
            <option value="year_built">Property Age</option>
            <option value="neighborhood_code">Neighborhood</option>
            <option value="property_class">Property Class</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Ranges (comma-separated)</label>
          <Input
            value={rangesStr}
            onChange={(e) => setRangesStr(e.target.value)}
            placeholder="0-1500, 1500-2500, 2500+"
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} className="text-xs">Create</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs">Cancel</Button>
      </div>
    </div>
  );
}
