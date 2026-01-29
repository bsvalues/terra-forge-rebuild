import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  FileCheck,
  Search,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Washington State County Assessor URLs
const WA_COUNTY_ASSESSORS = [
  { county: "Adams", url: "https://propertysearch.adamscountywa.gov" },
  { county: "Asotin", url: "https://taxsifter.co.asotin.wa.us" },
  { county: "Benton", url: "https://propertyaccess.trueautomation.com/ClientDB/BentonWA" },
  { county: "Chelan", url: "https://propertyaccess.trueautomation.com/ClientDB/ChelanWA" },
  { county: "Clallam", url: "https://propertyaccess.trueautomation.com/ClientDB/ClallamWA" },
  { county: "Clark", url: "https://gis.clark.wa.gov/gishome/property" },
  { county: "Columbia", url: "https://taxsifter.co.columbia.wa.us" },
  { county: "Cowlitz", url: "https://www.cowlitzinfo.net/epic" },
  { county: "Douglas", url: "https://taxsifter.co.douglas.wa.us" },
  { county: "Ferry", url: "https://taxsifter.co.ferry.wa.us" },
  { county: "Franklin", url: "https://taxsifter.co.franklin.wa.us" },
  { county: "Garfield", url: "https://www.co.garfield.wa.us/assessor" },
  { county: "Grant", url: "https://taxsifter.co.grant.wa.us" },
  { county: "Grays Harbor", url: "https://taxsifter.co.grays-harbor.wa.us" },
  { county: "Island", url: "https://propertyaccess.islandcountywa.gov" },
  { county: "Jefferson", url: "https://propertysearch.co.jefferson.wa.us" },
  { county: "King", url: "https://blue.kingcounty.com/Assessor/eRealProperty" },
  { county: "Kitsap", url: "https://psearch.kitsapgov.com" },
  { county: "Kittitas", url: "https://taxsifter.co.kittitas.wa.us" },
  { county: "Klickitat", url: "https://propertysearch.klickitatcounty.org" },
  { county: "Lewis", url: "https://lewiscountywa.gov/assessor/property-search" },
  { county: "Lincoln", url: "https://taxsifter.co.lincoln.wa.us" },
  { county: "Mason", url: "https://parcels.co.mason.wa.us" },
  { county: "Okanogan", url: "https://taxsifter.okanogancounty.org" },
  { county: "Pacific", url: "https://taxsifter.co.pacific.wa.us" },
  { county: "Pend Oreille", url: "https://propertysearch.pendoreille.org" },
  { county: "Pierce", url: "https://atip.piercecountywa.gov" },
  { county: "San Juan", url: "https://parcelsearch.sanjuanco.com" },
  { county: "Skagit", url: "https://www.skagitcounty.net/Search/Property" },
  { county: "Skamania", url: "https://mapsifter.skamania.net" },
  { county: "Snohomish", url: "https://scopi.snoco.org" },
  { county: "Spokane", url: "https://cp.spokanecounty.org/scout" },
  { county: "Stevens", url: "https://propertysearch.co.stevens.wa.us" },
  { county: "Thurston", url: "https://tcproperty.co.thurston.wa.us" },
  { county: "Wahkiakum", url: "https://taxsifter.co.wahkiakum.wa.us" },
  { county: "Walla Walla", url: "https://propertysearch.co.walla-walla.wa.us" },
  { county: "Whatcom", url: "https://property.whatcomcounty.us" },
  { county: "Whitman", url: "https://taxsifter.whitmancounty.net" },
  { county: "Yakima", url: "https://propertysearch.co.yakima.wa.us" },
];

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
  const [selectedCounty, setSelectedCounty] = useState("");
  const [action, setAction] = useState<"enrich" | "validate" | "import">("enrich");
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [parcelsToEnrich, setParcelsToEnrich] = useState<string[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);

  const assessorUrl = WA_COUNTY_ASSESSORS.find((c) => c.county === selectedCounty)?.url || "";

  // Auto-fetch parcels that need enrichment
  useEffect(() => {
    if (open && action === "enrich") {
      fetchParcelsNeedingEnrichment();
    }
  }, [open, action]);

  const fetchParcelsNeedingEnrichment = async () => {
    setLoadingParcels(true);
    try {
      // Get parcels missing key data fields
      const { data, error } = await supabase
        .from("parcels")
        .select("parcel_number")
        .or("building_area.is.null,year_built.is.null,bedrooms.is.null")
        .limit(50);

      if (error) throw error;
      setParcelsToEnrich(data?.map((p) => p.parcel_number) || []);
    } catch (err) {
      console.error("Error fetching parcels:", err);
    } finally {
      setLoadingParcels(false);
    }
  };

  const handleScrape = async () => {
    if (!assessorUrl) {
      toast.error("Please enter an assessor website URL");
      return;
    }

    if (action === "enrich" && parcelsToEnrich.length === 0) {
      toast.info("No parcels need enrichment - all have complete data");
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
          parcelIds: parcelsToEnrich,
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
        // Refresh the list after successful scrape
        if (action === "enrich") {
          fetchParcelsNeedingEnrichment();
        }
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

          {/* County Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Washington County
            </Label>
            <Select value={selectedCounty} onValueChange={setSelectedCounty}>
              <SelectTrigger className="bg-tf-substrate border-tf-border">
                <SelectValue placeholder="Select a county..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {WA_COUNTY_ASSESSORS.map((c) => (
                  <SelectItem key={c.county} value={c.county}>
                    {c.county} County
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCounty && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                {assessorUrl}
              </p>
            )}
          </div>

          {/* Auto-detected parcels info */}
          {action === "enrich" && (
            <div className="glass-card rounded-lg p-4 flex items-start gap-3">
              <Database className="w-5 h-5 text-tf-cyan flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    {loadingParcels ? "Finding parcels..." : `${parcelsToEnrich.length} parcels need enrichment`}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchParcelsNeedingEnrichment}
                    disabled={loadingParcels}
                    className="h-7 px-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingParcels ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  {loadingParcels
                    ? "Checking database for parcels missing building details..."
                    : parcelsToEnrich.length > 0
                    ? `Parcels missing sqft, year built, or bedroom count will be enriched automatically.`
                    : "All parcels have complete data. Import new parcels first."}
                </p>
              </div>
            </div>
          )}

          {/* Info Box for other modes */}
          {action !== "enrich" && (
            <div className="glass-card rounded-lg p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-tf-cyan flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {action === "validate" && "Validation Mode"}
                  {action === "import" && "Import Mode"}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {action === "validate" &&
                    "Compares your data against the public record and flags discrepancies."}
                  {action === "import" &&
                    "Discovers and imports new parcels from the assessor website."}
                </p>
              </div>
            </div>
          )}

          {/* Progress */}
          {scraping && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Scraping {parcelsToEnrich.length} parcels...
                </span>
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
            disabled={scraping || !assessorUrl || (action === "enrich" && parcelsToEnrich.length === 0)}
          >
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                {action === "enrich"
                  ? `Enrich ${parcelsToEnrich.length} Parcels`
                  : action === "validate"
                  ? "Validate Data"
                  : "Import Parcels"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}