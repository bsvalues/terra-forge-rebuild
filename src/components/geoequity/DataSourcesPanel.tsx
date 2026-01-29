import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  Globe,
  HardDrive,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
} from "lucide-react";
import { GISDataSource, useCreateDataSource, useSyncDataSource } from "@/hooks/useGISData";
import { toast } from "sonner";

interface DataSourcesPanelProps {
  dataSources: GISDataSource[];
  isLoading: boolean;
}

export function DataSourcesPanel({ dataSources, isLoading }: DataSourcesPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    source_type: "ftp" as "ftp" | "arcgis" | "file_upload",
    connection_url: "",
  });

  const createSource = useCreateDataSource();
  const syncSource = useSyncDataSource();

  const handleAddSource = () => {
    if (!newSource.name || !newSource.connection_url) {
      toast.error("Please fill in all required fields");
      return;
    }

    createSource.mutate({
      name: newSource.name,
      source_type: newSource.source_type,
      connection_url: newSource.connection_url,
    });

    setAddDialogOpen(false);
    setNewSource({ name: "", source_type: "ftp", connection_url: "" });
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "ftp":
        return <Server className="w-5 h-5" />;
      case "arcgis":
        return <Globe className="w-5 h-5" />;
      case "file_upload":
        return <HardDrive className="w-5 h-5" />;
      default:
        return <Server className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="secondary" className="bg-tf-optimized-green/20 text-tf-optimized-green border-tf-optimized-green/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        );
      case "syncing":
        return (
          <Badge variant="secondary" className="bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-tf-cyan animate-spin" />
        <p className="text-muted-foreground">Loading data sources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Source Button */}
      <div className="flex justify-end">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-tf-cyan hover:bg-tf-cyan/90">
              <Plus className="w-4 h-4" />
              Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-tf-elevated border-tf-border">
            <DialogHeader>
              <DialogTitle>Add Data Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Source Name</Label>
                <Input
                  placeholder="County FTP Server"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="bg-tf-substrate border-tf-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select
                  value={newSource.source_type}
                  onValueChange={(v) => setNewSource({ ...newSource, source_type: v as typeof newSource.source_type })}
                >
                  <SelectTrigger className="bg-tf-substrate border-tf-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-tf-elevated border-tf-border">
                    <SelectItem value="ftp">FTP Server</SelectItem>
                    <SelectItem value="arcgis">ArcGIS Online</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {newSource.source_type === "ftp"
                    ? "FTP URL"
                    : newSource.source_type === "arcgis"
                    ? "ArcGIS REST Endpoint"
                    : "Storage Path"}
                </Label>
                <Input
                  placeholder={
                    newSource.source_type === "ftp"
                      ? "ftp://ftp.county.gov/gis/"
                      : newSource.source_type === "arcgis"
                      ? "https://services.arcgis.com/.../FeatureServer"
                      : "/uploads/gis-data"
                  }
                  value={newSource.connection_url}
                  onChange={(e) => setNewSource({ ...newSource, connection_url: e.target.value })}
                  className="bg-tf-substrate border-tf-border"
                />
              </div>

              <Button onClick={handleAddSource} className="w-full bg-tf-cyan hover:bg-tf-cyan/90">
                Add Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources List */}
      {dataSources.length === 0 ? (
        <div className="glass-card rounded-lg p-12 text-center">
          <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No data sources configured</p>
          <p className="text-xs text-muted-foreground mt-2">
            Add an FTP server or ArcGIS Online endpoint to start syncing GIS data
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {dataSources.map((source, index) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-tf-cyan/20 text-tf-cyan">
                    {getSourceIcon(source.source_type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{source.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {source.connection_url || "No URL configured"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {getStatusBadge(source.sync_status)}
                      <span className="text-xs text-muted-foreground">
                        {source.last_sync_at
                          ? `Last sync: ${new Date(source.last_sync_at).toLocaleString()}`
                          : "Never synced"}
                      </span>
                    </div>
                    {source.sync_error && (
                      <p className="text-xs text-destructive mt-2">{source.sync_error}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => syncSource.mutate(source.id)}
                  disabled={source.sync_status === "syncing"}
                >
                  <RefreshCw className={`w-4 h-4 ${source.sync_status === "syncing" ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
