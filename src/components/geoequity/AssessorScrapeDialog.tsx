import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  CheckSquare,
  Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ParcelFiltersPanel, type ParcelFilters } from "./ParcelFilters";
import { BatchSizeSelector } from "./BatchSizeSelector";

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

const STORAGE_KEY = "terrafusion_selected_counties";

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

interface BatchResult {
  county: string;
  result: ScrapeResult;
}

export function AssessorScrapeDialog({
  open,
  onOpenChange,
}: AssessorScrapeDialogProps) {
  const [selectedCounties, setSelectedCounties] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [action, setAction] = useState<"enrich" | "validate" | "import">("enrich");
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCounty, setCurrentCounty] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [parcelsToEnrich, setParcelsToEnrich] = useState<string[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [filters, setFilters] = useState<ParcelFilters>({});
  const [batchSize, setBatchSize] = useState(50);
  const [totalMatchingParcels, setTotalMatchingParcels] = useState(0);

  // Persist selected counties to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCounties));
  }, [selectedCounties]);

  // Fetch parcels with filters
  const fetchParcelsNeedingEnrichment = useCallback(async () => {
    setLoadingParcels(true);
    try {
      let query = supabase
        .from("parcels")
        .select("parcel_number", { count: "exact" })
        .or("building_area.is.null,year_built.is.null,bedrooms.is.null");

      // Apply filters
      if (filters.neighborhood) {
        query = query.eq("neighborhood_code", filters.neighborhood);
      }
      if (filters.city) {
        query = query.eq("city", filters.city);
      }
      if (filters.propertyClass) {
        query = query.eq("property_class", filters.propertyClass);
      }
      if (filters.minSqft) {
        query = query.gte("building_area", filters.minSqft);
      }
      if (filters.maxSqft) {
        query = query.lte("building_area", filters.maxSqft);
      }
      if (filters.minYear) {
        query = query.gte("year_built", filters.minYear);
      }
      if (filters.maxYear) {
        query = query.lte("year_built", filters.maxYear);
      }
      if (filters.minBeds) {
        query = query.gte("bedrooms", filters.minBeds);
      }
      if (filters.maxBeds) {
        query = query.lte("bedrooms", filters.maxBeds);
      }

      const { data, error, count } = await query.limit(batchSize);

      if (error) throw error;
      setParcelsToEnrich(data?.map((p) => p.parcel_number) || []);
      setTotalMatchingParcels(count || 0);
    } catch (err) {
      console.error("Error fetching parcels:", err);
    } finally {
      setLoadingParcels(false);
    }
  }, [filters, batchSize]);

  // Auto-fetch parcels on open or when filters/batch size change
  useEffect(() => {
    if (open && action === "enrich") {
      fetchParcelsNeedingEnrichment();
    }
  }, [open, action, fetchParcelsNeedingEnrichment]);

  const toggleCounty = (county: string) => {
    setSelectedCounties((prev) =>
      prev.includes(county)
        ? prev.filter((c) => c !== county)
        : [...prev, county]
    );
  };

  const selectAll = () => {
    setSelectedCounties(WA_COUNTY_ASSESSORS.map((c) => c.county));
  };

  const clearAll = () => {
    setSelectedCounties([]);
  };

  const handleScrape = async () => {
    if (selectedCounties.length === 0) {
      toast.error("Please select at least one county");
      return;
    }

    if (action === "enrich" && parcelsToEnrich.length === 0) {
      toast.info("No parcels need enrichment - adjust filters or import data first");
      return;
    }

    setScraping(true);
    setProgress(0);
    setBatchResults([]);

    const results: BatchResult[] = [];
    const totalCounties = selectedCounties.length;

    for (let i = 0; i < totalCounties; i++) {
      const county = selectedCounties[i];
      const assessorUrl = WA_COUNTY_ASSESSORS.find((c) => c.county === county)?.url;
      
      if (!assessorUrl) continue;

      setCurrentCounty(county);
      setProgress(Math.round(((i) / totalCounties) * 100));

      try {
        const { data, error } = await supabase.functions.invoke("assessor-scrape", {
          body: {
            assessorUrl,
            parcelIds: parcelsToEnrich,
            action,
          },
        });

        if (error) {
          results.push({ county, result: { success: false, error: error.message } });
        } else {
          results.push({ county, result: data as ScrapeResult });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Scrape failed";
        results.push({ county, result: { success: false, error: message } });
      }

      // Small delay between counties to avoid rate limits
      if (i < totalCounties - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setBatchResults(results);
    setProgress(100);
    setCurrentCounty("");
    setScraping(false);

    const successCount = results.filter((r) => r.result.success).length;
    const totalEnriched = results.reduce((sum, r) => sum + (r.result.enriched || 0), 0);
    const totalSales = results.reduce((sum, r) => sum + (r.result.salesAdded || 0), 0);

    if (successCount > 0) {
      toast.success(
        `Scraped ${successCount}/${totalCounties} counties, enriched ${totalEnriched} parcels, added ${totalSales} sales`
      );
      if (action === "enrich") {
        fetchParcelsNeedingEnrichment();
      }
    } else {
      toast.error("All scrape attempts failed");
    }
  };

  const handleClose = () => {
    if (!scraping) {
      onOpenChange(false);
      setBatchResults([]);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-tf-elevated border-tf-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-tf-cyan" />
            Scrape Assessor Websites
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 flex-1 overflow-hidden flex flex-col">
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

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Left: County Selector */}
            <div className="space-y-2 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  Counties
                  <Badge variant="secondary" className="ml-1">
                    {selectedCounties.length}
                  </Badge>
                </Label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-6 px-2 text-xs"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-6 px-2 text-xs"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 rounded-md border border-tf-border bg-tf-substrate p-2">
                <div className="grid grid-cols-1 gap-1">
                  {WA_COUNTY_ASSESSORS.map((c) => (
                    <div
                      key={c.county}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-tf-elevated/50 rounded p-1.5"
                      onClick={() => toggleCounty(c.county)}
                    >
                      <Checkbox
                        id={c.county}
                        checked={selectedCounties.includes(c.county)}
                        onCheckedChange={() => toggleCounty(c.county)}
                      />
                      <label
                        htmlFor={c.county}
                        className="text-xs cursor-pointer flex-1"
                      >
                        {c.county}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Filters & Batch Settings */}
            <div className="space-y-3 flex flex-col overflow-hidden">
              {/* Parcel Filters */}
              {action === "enrich" && (
                <>
                  <ParcelFiltersPanel
                    filters={filters}
                    onChange={setFilters}
                    onApply={fetchParcelsNeedingEnrichment}
                    parcelCount={totalMatchingParcels}
                    loading={loadingParcels}
                  />

                  {/* Batch Size */}
                  <div className="glass-card rounded-lg p-3">
                    <BatchSizeSelector
                      value={batchSize}
                      onChange={setBatchSize}
                      max={totalMatchingParcels}
                    />
                  </div>

                  {/* Parcel Summary */}
                  <div className="glass-card rounded-lg p-3 flex items-start gap-3">
                    <Database className="w-5 h-5 text-tf-cyan flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground text-sm">
                          {loadingParcels
                            ? "Finding parcels..."
                            : `${parcelsToEnrich.length} parcels ready`}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchParcelsNeedingEnrichment}
                          disabled={loadingParcels}
                          className="h-6 px-2"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${loadingParcels ? "animate-spin" : ""}`}
                          />
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {totalMatchingParcels > batchSize
                          ? `${totalMatchingParcels} total match filters (batch limited to ${batchSize})`
                          : "All matching parcels will be enriched"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Info for non-enrich modes */}
              {action !== "enrich" && (
                <div className="glass-card rounded-lg p-4 flex items-start gap-3">
                  <Globe className="w-5 h-5 text-tf-cyan flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {action === "validate" ? "Validation Mode" : "Import Mode"}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {action === "validate"
                        ? "Compares your data against the public record and flags discrepancies."
                        : "Discovers and imports new parcels from the assessor website."}
                    </p>
                  </div>
                </div>
              )}

              {/* Batch Results */}
              {batchResults.length > 0 && (
                <ScrollArea className="flex-1 rounded-lg border border-tf-border bg-tf-substrate p-2">
                  <div className="space-y-1">
                    {batchResults.map(({ county, result }) => (
                      <div
                        key={county}
                        className={`flex items-center gap-2 text-xs p-2 rounded ${
                          result.success
                            ? "bg-tf-optimized-green/10"
                            : "bg-destructive/10"
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle className="w-3 h-3 text-tf-optimized-green flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">{county}</span>
                        {result.success ? (
                          <span className="text-muted-foreground ml-auto text-[10px]">
                            +{result.enriched} / {result.salesAdded} sales
                          </span>
                        ) : (
                          <span className="text-destructive ml-auto truncate max-w-[120px] text-[10px]">
                            {result.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Progress */}
          {scraping && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Scraping {currentCounty} County...
                </span>
                <span className="text-tf-cyan">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Scrape Button */}
          <Button
            onClick={handleScrape}
            className="w-full gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
            disabled={
              scraping ||
              selectedCounties.length === 0 ||
              (action === "enrich" && parcelsToEnrich.length === 0)
            }
          >
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping {currentCounty}...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                {action === "enrich"
                  ? `Enrich ${parcelsToEnrich.length} Parcels from ${selectedCounties.length} Counties`
                  : action === "validate"
                  ? `Validate ${selectedCounties.length} Counties`
                  : `Import from ${selectedCounties.length} Counties`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
