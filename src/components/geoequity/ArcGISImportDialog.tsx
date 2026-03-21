import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { GISDataSource } from "@/hooks/useGISData";
import { BENTON_PARCEL_FIELD_CANDIDATES } from "@/config/bentonGISSources";
import { invokeArcGISSync } from "@/services/ingestService";
import { toast } from "sonner";

interface ArcGISImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSources: GISDataSource[];
}

interface SyncResult {
  success: boolean;
  featuresRetrieved?: number;
  centroidsExtracted?: number;
  parcelsMatched?: number;
  parcelsUpdated?: number;
  parcelFieldUsed?: string;
  error?: string;
}

export function ArcGISImportDialog({
  open,
  onOpenChange,
  dataSources,
}: ArcGISImportDialogProps) {
  const [mode, setMode] = useState<"url" | "saved">("url");
  const [arcgisUrl, setArcgisUrl] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [parcelNumberField, setParcelNumberField] = useState<string>(BENTON_PARCEL_FIELD_CANDIDATES[0]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SyncResult | null>(null);

  const arcgisSources = dataSources.filter((s) => s.source_type === "arcgis");

  const handleImport = async () => {
    const url = mode === "url" ? arcgisUrl : arcgisSources.find((s) => s.id === selectedSourceId)?.connection_url;

    if (!url) {
      toast.error("Please provide an ArcGIS URL or select a saved source");
      return;
    }

    setImporting(true);
    setProgress(10);
    setResult(null);

    // Simulate progress during import
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85));
    }, 500);

    try {
      const data = await invokeArcGISSync({
        arcgisUrl: url,
        parcelNumberField,
        sourceId: mode === "saved" ? selectedSourceId : undefined,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(data as SyncResult);

      if (data.success) {
        toast.success(`Updated coordinates for ${data.parcelsUpdated} parcels`);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch (error) {
      clearInterval(progressInterval);
      const message = error instanceof Error ? error.message : "Import failed";
      setResult({ success: false, error: message });
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      onOpenChange(false);
      setResult(null);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-tf-elevated border-tf-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tf-cyan" />
            Import Parcel Coordinates from ArcGIS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("url")}
              className={mode === "url" ? "bg-tf-cyan hover:bg-tf-cyan/90" : ""}
            >
              Enter URL
            </Button>
            <Button
              variant={mode === "saved" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("saved")}
              disabled={arcgisSources.length === 0}
              className={mode === "saved" ? "bg-tf-cyan hover:bg-tf-cyan/90" : ""}
            >
              Saved Sources ({arcgisSources.length})
            </Button>
          </div>

          {/* URL Input or Saved Source Selection */}
          {mode === "url" ? (
            <div className="space-y-2">
              <Label>ArcGIS REST Service URL</Label>
              <Input
                placeholder="https://services.arcgis.com/.../FeatureServer/0"
                value={arcgisUrl}
                onChange={(e) => setArcgisUrl(e.target.value)}
                className="bg-tf-substrate border-tf-border font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                  Paste the full URL to a parcel layer endpoint (FeatureServer or MapServer).
                  For Benton, try `geo_id` first, then `prop_id`, `PIN`, or `APN` depending on the service schema.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Saved Source</Label>
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger className="bg-tf-substrate border-tf-border">
                  <SelectValue placeholder="Choose a source..." />
                </SelectTrigger>
                <SelectContent className="bg-tf-elevated border-tf-border">
                  {arcgisSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-tf-cyan" />
                        {source.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parcel Number Field */}
          <div className="space-y-2">
            <Label>Parcel Number Field Name</Label>
            <Select value={parcelNumberField} onValueChange={setParcelNumberField}>
              <SelectTrigger className="bg-tf-substrate border-tf-border">
                <SelectValue placeholder="Choose parcel field" />
              </SelectTrigger>
              <SelectContent className="bg-tf-elevated border-tf-border">
                {BENTON_PARCEL_FIELD_CANDIDATES.map((fieldName) => (
                  <SelectItem key={fieldName} value={fieldName}>{fieldName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Field in ArcGIS containing parcel numbers (e.g., PARCEL_ID, PIN, APN, geo_id, prop_id)
            </p>
          </div>

          {/* Info Box */}
          <div className="material-bento rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-tf-cyan flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">How it works</p>
              <p className="text-muted-foreground text-xs mt-1">
                Fetches parcel geometries from ArcGIS, calculates centroids, and updates
                matching parcels in your database with lat/lng coordinates.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                This dialog is for parcel centroid sync only. Boundary and polygon layers such as
                jurisdictions, taxing districts, and neighborhoods should use the polygon ingest flow.
              </p>
            </div>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Importing coordinates...</span>
                <span className="text-tf-cyan">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`rounded-lg p-4 ${
                result.success
                  ? "bg-tf-optimized-green/10 border border-tf-optimized-green/30"
                  : "bg-destructive/10 border border-destructive/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-tf-optimized-green flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div className="text-sm">
                  {result.success ? (
                    <>
                      <p className="font-medium text-foreground">Import Complete</p>
                      <ul className="text-muted-foreground text-xs mt-2 space-y-1">
                        <li>• Features retrieved: {result.featuresRetrieved?.toLocaleString()}</li>
                        <li>• Centroids extracted: {result.centroidsExtracted?.toLocaleString()}</li>
                        <li>• Parcels matched: {result.parcelsMatched?.toLocaleString()}</li>
                        <li>• Coordinates updated: {result.parcelsUpdated?.toLocaleString()}</li>
                        <li>• Field used: {result.parcelFieldUsed}</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">Import Failed</p>
                      <p className="text-muted-foreground text-xs mt-1">{result.error}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            className="w-full gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
            disabled={importing || (mode === "url" ? !arcgisUrl : !selectedSourceId)}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                Import Coordinates
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
