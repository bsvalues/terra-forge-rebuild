import { motion } from "framer-motion";
import { 
  MapPin, Calendar, Building2, DollarSign, ChevronDown,
  Search, X, Loader2, Check, FileText, Navigation, Link2
} from "lucide-react";
import { useWorkbench } from "./WorkbenchContext";
import { WorkModeSelector } from "./WorkModeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect, useCallback } from "react";
import { useRibbonParcelSearch, useRibbonStudyPeriods, type RibbonParcelResult, type RibbonStudyPeriod } from "@/hooks/useRibbonSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationBell } from "@/components/geoequity/NotificationBell";
import { useToast } from "@/hooks/use-toast";

export function ContextRibbon() {
  const { parcel, studyPeriod, setParcel, setStudyPeriod, clearParcel, setActiveTab } = useWorkbench();
  const { toast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const hasParcel = parcel.id !== null;
  const hasStudyPeriod = studyPeriod.id !== null;

  const { data: searchResults = [], isLoading: isSearching } = useRibbonParcelSearch(debouncedQuery);
  const { data: studyPeriods = [], isLoading: isLoadingPeriods } = useRibbonStudyPeriods();

  // Auto-select active period if none selected
  useEffect(() => {
    if (!hasStudyPeriod && studyPeriods.length > 0) {
      const activePeriod = studyPeriods.find((p) => p.status === "active");
      const periodToSelect = activePeriod || studyPeriods[0];
      if (periodToSelect) {
        setStudyPeriod({
          id: periodToSelect.id,
          name: periodToSelect.name,
          status: periodToSelect.status,
          startDate: periodToSelect.start_date,
          endDate: periodToSelect.end_date,
        });
      }
    }
  }, [studyPeriods, hasStudyPeriod, setStudyPeriod]);

  const handleSelectParcel = useCallback((result: RibbonParcelResult) => {
    setParcel({
      id: result.id,
      parcelNumber: result.parcel_number,
      address: result.address,
      city: result.city,
      propertyClass: result.property_class,
      assessedValue: result.assessed_value,
      latitude: result.latitude,
      longitude: result.longitude,
      neighborhoodCode: result.neighborhood_code,
    });
    setSearchOpen(false);
    setSearchQuery("");
  }, [setParcel]);

  const handleSelectPeriod = useCallback((period: RibbonStudyPeriod) => {
    setStudyPeriod({
      id: period.id,
      name: period.name,
      status: period.status,
      startDate: period.start_date,
      endDate: period.end_date,
    });
    setPeriodOpen(false);
  }, [setStudyPeriod]);

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} — ${endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  };

  const handleCopyParcelLink = useCallback(() => {
    if (!parcel.id) return;
    const url = `${window.location.origin}/property/${parcel.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      toast({ title: "Link copied", description: `Parcel ${parcel.parcelNumber} link copied to clipboard` });
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [parcel.id, parcel.parcelNumber, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-tf-green/20 text-tf-green border-tf-green/30 text-[10px] px-1.5">Active</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-[10px] px-1.5">Draft</Badge>;
      case "completed":
        return <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <header className="context-ribbon sticky top-0 z-40 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Logo + Parcel Context */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center">
              <span className="text-tf-substrate font-bold text-sm">TF</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">TerraFusion</span>
          </div>

          <div className="h-6 w-px bg-border/50" />

          {hasParcel ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle">
                <MapPin className="w-3.5 h-3.5 text-tf-cyan" />
                <span className="text-sm font-medium">{parcel.parcelNumber}</span>
              </div>
              
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="max-w-[200px] truncate">{parcel.address}</span>
                {parcel.city && (<><span>•</span><span>{parcel.city}</span></>)}
              </div>

              <div className="hidden lg:flex items-center gap-3">
                {parcel.assessedValue && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <DollarSign className="w-3 h-3 text-tf-green" />
                    <span className="text-tf-green font-medium">{formatCurrency(parcel.assessedValue)}</span>
                  </div>
                )}
                {parcel.propertyClass && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{parcel.propertyClass}</span>
                  </div>
                )}
              </div>

              {parcel.latitude && parcel.longitude && (
                <Button variant="ghost" size="sm" className="h-6 gap-1.5 text-xs text-tf-cyan hover:text-tf-cyan hover:bg-tf-cyan/10" onClick={() => setActiveTab("atlas")}>
                  <Navigation className="w-3 h-3" />
                  <span className="hidden sm:inline">Locate</span>
                </Button>
              )}

              <Button variant="ghost" size="sm" className="h-6 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={handleCopyParcelLink}>
                {linkCopied ? <Check className="w-3 h-3 text-tf-green" /> : <Link2 className="w-3 h-3" />}
                <span className="hidden sm:inline">{linkCopied ? "Copied" : "Link"}</span>
              </Button>

              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={clearParcel}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : (
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                  <Search className="w-3.5 h-3.5" />
                  <span className="text-xs">Search Parcels</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 material-bento border-tf-border" align="start" sideOffset={8}>
                <div className="p-3 border-b border-border/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Search by PIN or address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-8 h-9 bg-tf-substrate border-border/50"
                    />
                    {searchQuery && (
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery("")}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-tf-cyan" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectParcel(result)}
                          className="w-full px-3 py-2.5 text-left hover:bg-tf-cyan/10 transition-colors flex items-start gap-3"
                        >
                          <MapPin className="w-4 h-4 text-tf-cyan mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{result.address}</span>
                              {result.property_class && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{result.property_class}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{result.parcel_number}</span>
                              {result.city && (<><span>•</span><span>{result.city}</span></>)}
                              <span>•</span>
                              <span className="text-tf-green">{formatCurrency(result.assessed_value)}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : debouncedQuery.length >= 2 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No parcels found</p>
                      <p className="text-xs">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Enter PIN or address</p>
                      <p className="text-xs">Minimum 2 characters</p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Center: Work Mode Selector */}
        <div className="hidden md:block">
          <WorkModeSelector />
        </div>

        {/* Right: Study Period + Actions */}
        <div className="flex items-center gap-3">
          <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs hover:bg-tf-gold/10">
                <Calendar className="w-3.5 h-3.5 text-tf-gold" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {hasStudyPeriod ? studyPeriod.name : "Select Period"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 material-bento border-tf-border" align="end" sideOffset={8}>
              <div className="p-3 border-b border-border/50">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-tf-gold" />
                  Study Periods
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select a period for analysis</p>
              </div>

              <ScrollArea className="max-h-[300px]">
                {isLoadingPeriods ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-tf-gold" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : studyPeriods.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No study periods</p>
                    <p className="text-xs">Create one in Administration</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {studyPeriods.map((period) => {
                      const isSelected = studyPeriod.id === period.id;
                      return (
                        <button
                          key={period.id}
                          onClick={() => handleSelectPeriod(period)}
                          className={cn(
                            "w-full px-3 py-3 text-left transition-colors flex items-start gap-3",
                            isSelected ? "bg-tf-gold/10 border-l-2 border-tf-gold" : "hover:bg-muted/30"
                          )}
                        >
                          <Calendar className={cn("w-4 h-4 mt-0.5 shrink-0", isSelected ? "text-tf-gold" : "text-muted-foreground")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm font-medium truncate", isSelected && "text-tf-gold")}>{period.name}</span>
                              {getStatusBadge(period.status)}
                            </div>
                            <span className="text-xs text-muted-foreground mt-0.5 block">
                              {formatDateRange(period.start_date, period.end_date)}
                            </span>
                            {period.description && (
                              <span className="text-xs text-muted-foreground/70 mt-0.5 block truncate">{period.description}</span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-tf-gold shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
