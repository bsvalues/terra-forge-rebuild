import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileJson,
  Map,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useParseGISFile } from "@/hooks/useGISData";
import { toast } from "sonner";

interface GISImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GISImportDialog({ open, onOpenChange }: GISImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [layerName, setLayerName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseGISFile = useParseGISFile();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set layer name from filename
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setLayerName(baseName);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !layerName) {
      toast.error("Please select a file and provide a layer name");
      return;
    }

    setImporting(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      await parseGISFile.mutateAsync({ file: selectedFile, layerName });
      setProgress(100);
      setTimeout(() => {
        onOpenChange(false);
        setSelectedFile(null);
        setLayerName("");
        setProgress(0);
        setImporting(false);
      }, 500);
    } catch (error) {
      setImporting(false);
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const getSupportedFormats = () => [
    { ext: ".shp", name: "Shapefile", icon: <Map className="w-4 h-4" /> },
    { ext: ".geojson", name: "GeoJSON", icon: <FileJson className="w-4 h-4" /> },
    { ext: ".json", name: "JSON", icon: <FileJson className="w-4 h-4" /> },
    { ext: ".csv", name: "CSV (with coords)", icon: <Database className="w-4 h-4" /> },
    { ext: ".kml", name: "KML", icon: <Map className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-tf-elevated border-tf-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-tf-cyan" />
            Import GIS Data
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full bg-tf-substrate">
            <TabsTrigger value="file" className="flex-1">Upload File</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">From URL</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4 space-y-4">
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? "border-tf-cyan bg-tf-cyan/10"
                  : "border-tf-border hover:border-tf-cyan/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".shp,.shx,.dbf,.prj,.geojson,.json,.csv,.kml"
                onChange={handleFileSelect}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-6 h-6 text-tf-cyan" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click or drag files to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports Shapefile, GeoJSON, CSV, KML
                  </p>
                </>
              )}
            </div>

            {/* Layer Name */}
            <div className="space-y-2">
              <Label>Layer Name</Label>
              <Input
                placeholder="Parcels_2024"
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                className="bg-tf-substrate border-tf-border"
              />
            </div>

            {/* Supported Formats */}
            <div className="material-bento rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Supported Formats:</p>
              <div className="flex flex-wrap gap-2">
                {getSupportedFormats().map((fmt) => (
                  <div
                    key={fmt.ext}
                    className="flex items-center gap-1 text-xs bg-tf-substrate px-2 py-1 rounded"
                  >
                    {fmt.icon}
                    <span>{fmt.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Importing...</span>
                  <span className="text-tf-cyan">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Import Button */}
            <Button
              onClick={handleImport}
              className="w-full gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
              disabled={!selectedFile || !layerName || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Layer
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>GeoJSON URL</Label>
              <Input
                placeholder="https://example.com/parcels.geojson"
                className="bg-tf-substrate border-tf-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Layer Name</Label>
              <Input
                placeholder="Remote Parcels"
                className="bg-tf-substrate border-tf-border"
              />
            </div>

            <div className="material-bento rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-tf-sacred-gold flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">CORS Notice</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Remote URLs must allow cross-origin requests. For ArcGIS services,
                  use the Data Sources panel to configure proper authentication.
                </p>
              </div>
            </div>

            <Button className="w-full gap-2" disabled>
              <Upload className="w-4 h-4" />
              Import from URL
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
