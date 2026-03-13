import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Database,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Globe,
  Upload,
  Server,
  FileSpreadsheet,
  Pencil,
  Trash2,
  ExternalLink,
  Plug,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDataSourcesList, useAddDataSource, useDeleteDataSource } from "@/hooks/useDataSources";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SOURCE_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  csv_upload: { label: "CSV Upload", icon: <Upload className="w-4 h-4" />, color: "text-tf-cyan" },
  arcgis_rest: { label: "ArcGIS REST", icon: <Globe className="w-4 h-4" />, color: "text-emerald-400" },
  api_endpoint: { label: "API Endpoint", icon: <Plug className="w-4 h-4" />, color: "text-violet-400" },
  legacy_cama: { label: "Legacy CAMA", icon: <Server className="w-4 h-4" />, color: "text-amber-400" },
  ftp_feed: { label: "FTP Feed", icon: <FileSpreadsheet className="w-4 h-4" />, color: "text-blue-400" },
  manual_entry: { label: "Manual Entry", icon: <Pencil className="w-4 h-4" />, color: "text-muted-foreground" },
};

const syncStatusBadge = (status?: string | null) => {
  switch (status) {
    case "synced": return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Synced</Badge>;
    case "partial": return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Partial</Badge>;
    case "failed": return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">Failed</Badge>;
    case "pending": return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Pending</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">Never</Badge>;
  }
};

export function DataSourceRegistry() {
  const { profile } = useAuthContext();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", source_type: "csv_upload", connection_url: "", description: "" });

  const { data: sources, isLoading } = useDataSourcesList(profile?.county_id);
  const addMutation = useAddDataSource(profile?.county_id);
  const deleteMutation = useDeleteDataSource();

  const handleAdd = () => {
    addMutation.mutate(
      { name: newSource.name, source_type: newSource.source_type, description: newSource.description, connection_url: newSource.connection_url },
      {
        onSuccess: () => {
          toast.success(`Data source "${newSource.name}" registered`);
          setShowAddDialog(false);
          setNewSource({ name: "", source_type: "csv_upload", connection_url: "", description: "" });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => toast.success("Data source removed") });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Database className="w-4 h-4" />
          Data Source Registry
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-3.5 h-3.5" />
          Register Source
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted/50 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-muted/30 rounded animate-pulse w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!sources || sources.length === 0) && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-1">No data sources registered</p>
            <p className="text-xs text-muted-foreground/70">Register CSV uploads, ArcGIS endpoints, or legacy CAMA connections to track data lineage.</p>
          </CardContent>
        </Card>
      )}

      {sources && sources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {sources.map((src) => {
              const meta = SOURCE_TYPE_META[src.source_type] || SOURCE_TYPE_META.manual_entry;
              return (
                <motion.div
                  key={src.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="bg-card/50 border-border/50 hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={meta.color}>{meta.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{src.name}</p>
                            <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                          </div>
                        </div>
                        {syncStatusBadge(src.sync_status)}
                      </div>

                      {src.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{src.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {src.record_count != null
                            ? `${src.record_count.toLocaleString()} records`
                            : "No records"}
                        </span>
                        <span>
                          {src.last_sync_at
                            ? `Last sync: ${new Date(src.last_sync_at).toLocaleDateString()}`
                            : "Never synced"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => toast.info("Sync triggered (simulated)")}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Sync
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                          onClick={() => handleDelete(src.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Register Data Source
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source Name</Label>
              <Input
                placeholder="e.g. Benton County PACS FTP"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Source Type</Label>
              <Select value={newSource.source_type} onValueChange={(v) => setNewSource({ ...newSource, source_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_TYPE_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">{meta.icon} {meta.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Connection URL (optional)</Label>
              <Input
                placeholder="https://... or ftp://..."
                value={newSource.connection_url}
                onChange={(e) => setNewSource({ ...newSource, connection_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                placeholder="Short description of this data source"
                value={newSource.description}
                onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => handleAdd()}
              disabled={!newSource.name || addMutation.isPending}
              className="gap-1.5"
            >
              {addMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
