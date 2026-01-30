import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Building2, 
  DollarSign, 
  ChevronDown,
  Search,
  X,
  Loader2
} from "lucide-react";
import { useWorkbench } from "./WorkbenchContext";
import { WorkModeSelector } from "./WorkModeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  parcel_number: string;
  address: string;
  city: string | null;
  property_class: string | null;
  assessed_value: number;
}

export function ContextRibbon() {
  const { parcel, studyPeriod, setParcel, clearParcel } = useWorkbench();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const hasParcel = parcel.id !== null;
  const hasStudyPeriod = studyPeriod.id !== null;

  // Query parcels based on search
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["parcel-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, city, property_class, assessed_value")
        .or(`parcel_number.ilike.%${debouncedQuery}%,address.ilike.%${debouncedQuery}%`)
        .order("assessed_value", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as SearchResult[];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const handleSelectParcel = useCallback((result: SearchResult) => {
    setParcel({
      id: result.id,
      parcelNumber: result.parcel_number,
      address: result.address,
      city: result.city,
      propertyClass: result.property_class,
      assessedValue: result.assessed_value,
    });
    setSearchOpen(false);
    setSearchQuery("");
  }, [setParcel]);

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <header className="context-ribbon sticky top-0 z-40 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Logo + Parcel Context */}
        <div className="flex items-center gap-4">
          {/* TerraFusion Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center">
              <span className="text-tf-substrate font-bold text-sm">TF</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              TerraFusion
            </span>
          </div>

          <div className="h-6 w-px bg-border/50" />

          {/* Parcel Context or Search */}
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
                {parcel.city && (
                  <>
                    <span>•</span>
                    <span>{parcel.city}</span>
                  </>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-3">
                {parcel.assessedValue && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <DollarSign className="w-3 h-3 text-tf-green" />
                    <span className="text-tf-green font-medium">
                      {formatCurrency(parcel.assessedValue)}
                    </span>
                  </div>
                )}
                {parcel.propertyClass && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{parcel.propertyClass}</span>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={clearParcel}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : (
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="text-xs">Search Parcels</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[400px] p-0 glass-card border-tf-border" 
                align="start"
                sideOffset={8}
              >
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchQuery("")}
                      >
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
                              <span className="font-medium text-sm truncate">
                                {result.address}
                              </span>
                              {result.property_class && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                  {result.property_class}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{result.parcel_number}</span>
                              {result.city && (
                                <>
                                  <span>•</span>
                                  <span>{result.city}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="text-tf-green">
                                {formatCurrency(result.assessed_value)}
                              </span>
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
          {/* Study Period Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-2 text-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-tf-gold" />
                <span className="hidden sm:inline">
                  {hasStudyPeriod ? studyPeriod.name : "Select Period"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>2024 Annual Study</DropdownMenuItem>
              <DropdownMenuItem>2023 Annual Study</DropdownMenuItem>
              <DropdownMenuItem>2022 Annual Study</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-tf-green/10 border border-tf-green/20">
            <div className="w-1.5 h-1.5 rounded-full bg-tf-green animate-pulse" />
            <span className="text-xs font-medium text-tf-green">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
