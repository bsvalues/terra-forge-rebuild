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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Search,
  Database,
  FileCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssessorScrapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScrapeResult {
  success: boolean;
  processed?: number;
  successful?: number;
  failed?: number;
  enriched?: number;
  salesAdded?: number;
  failedIds?: string[];
  error?: string;
}

export function AssessorScrapeDialog({
  open,
  onOpenChange,
}: AssessorScrapeDialogProps) {
  const [assessorUrl, setAssessorUrl] = useState("");
  const [parcelIds, setParcelIds] = useState("");
  const [action, setAction] = useState<"enrich" | "validate" | "import">("enrich");
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const handleScrape = async () => {
    if (!assessorUrl) {
      toast.error("Please enter an assessor website URL");
      return;
    }

    const ids = parcelIds
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      toast.error("Please enter at least one parcel ID");
      return;
    }

    setScraping(true);
    setProgress(10);
    setResult(null);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 85));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("assessor-scrape", {
        body: {
          assessorUrl,
          parcelIds: ids,
          action,
        },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message);
      }

      setProgress(100);
      setResult(data as ScrapeResult);

      if (data.success) {
        toast.success(
          `Scraped ${data.successful} parcels, enriched ${data.enriched}, added ${data.salesAdded} sales`
        );
      } else {
        toast.error(data.error || "Scrape failed");
      }
    } catch (error) {
      clearInterval(progressInterval);
      const message = error instanceof Error ? error.message : "Scrape failed";
      setResult({ success: false, error: message });
      toast.error(message);
    } finally {
      setScraping(false);
    }
  };

  const handleClose = () => {
    if (!scraping) {
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
            <Globe className="w-5 h-5 text-tf-cyan" />
            Scrape Assessor Website
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Action Tabs */}
          <Tabs value={action} onValueChange={(v) => setAction(v as typeof action)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="enrich" className="gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Enrich
              </TabsTrigger>
              <TabsTrigger value="validate" className="gap-1.5">
                <FileCheck className="w-3.5 h-3.5" />
                Validate
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Import
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Assessor URL */}
          <div className="space-y-2">
            <Label>Assessor Property Search URL</Label>
            <Input
              placeholder="https://propertyaccess.trueautomation.com/ClientDB=BentonWA"
              value={assessorUrl}
              onChange={(e) => setAssessorUrl(e.target.value)}
              className="bg-tf-substrate border-tf-border font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter the base URL for the county's property search page
            </p>
          </div>

          {/* Parcel IDs */}
          <div className="space-y-2">
            <Label>Parcel IDs (one per line or comma-separated)</Label>
            <Textarea
              placeholder="12345678901&#10;12345678902&#10;12345678903"
              value={parcelIds}
              onChange={(e) => setParcelIds(e.target.value)}
              className="bg-tf-substrate border-tf-border font-mono text-sm min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Max 50 parcels per request to avoid rate limits
            </p>
          </div>

          {/* Info Box */}
          <div className="glass-card rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-tf-cyan flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {action === "enrich" && "Enrich Mode"}
                {action === "validate" && "Validation Mode"}
                {action === "import" && "Import Mode"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {action === "enrich" &&
                  "Updates existing parcels with additional details (sqft, beds, baths, year built) and imports sales history."}
                {action === "validate" &&
                  "Compares your data against the public record and flags discrepancies."}
                {action === "import" &&
                  "Creates new parcel records and associated sales from scraped data."}
              </p>
            </div>
          </div>

          {/* Progress */}
          {scraping && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scraping assessor website...</span>
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
                      <p className="font-medium text-foreground">Scrape Complete</p>
                      <ul className="text-muted-foreground text-xs mt-2 space-y-1">
                        <li>• Parcels processed: {result.processed}</li>
                        <li>• Successfully scraped: {result.successful}</li>
                        <li>• Parcels enriched: {result.enriched}</li>
                        <li>• Sales records added: {result.salesAdded}</li>
                        {result.failed && result.failed > 0 && (
                          <li className="text-amber-400">• Failed: {result.failed}</li>
                        )}
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">Scrape Failed</p>
                      <p className="text-muted-foreground text-xs mt-1">{result.error}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scrape Button */}
          <Button
            onClick={handleScrape}
            className="w-full gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
            disabled={scraping || !assessorUrl || !parcelIds.trim()}
          >
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Scrape Assessor Data
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
