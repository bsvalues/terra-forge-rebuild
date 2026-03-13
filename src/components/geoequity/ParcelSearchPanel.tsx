import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  MapPin,
  DollarSign,
  Home,
  Building2,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ParcelDetailSheet } from "./ParcelDetailSheet";

const PROPERTY_CLASSES = [
  { value: "Residential", label: "Residential", icon: Home },
  { value: "Commercial", label: "Commercial", icon: Building2 },
  { value: "Industrial", label: "Industrial", icon: Building2 },
  { value: "Agricultural", label: "Agricultural", icon: MapPin },
  { value: "Vacant Land", label: "Vacant Land", icon: MapPin },
];

interface ParcelSearchFilters {
  address: string;
  minValue: number;
  maxValue: number;
  propertyClasses: string[];
  city: string;
  neighborhoods: string[];
}

interface Parcel {
  id: string;
  parcel_number: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  property_class: string | null;
  assessed_value: number;
  land_value: number | null;
  improvement_value: number | null;
  land_area: number | null;
  building_area: number | null;
  year_built: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  neighborhood_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ParcelSearchPanelProps {
  initialNeighborhood?: string | null;
}

export function ParcelSearchPanel({ initialNeighborhood }: ParcelSearchPanelProps = {}) {
  const [filters, setFilters] = useState<ParcelSearchFilters>({
    address: "",
    minValue: 0,
    maxValue: 5000000,
    propertyClasses: [],
    city: "",
    neighborhoods: initialNeighborhood ? [initialNeighborhood] : [],
  });

  // Sync neighborhood from heatmap cross-filter
  useEffect(() => {
    if (initialNeighborhood) {
      setFilters((prev) => ({ ...prev, neighborhoods: [initialNeighborhood] }));
    }
  }, [initialNeighborhood]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 5000000]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleParcelClick = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setDetailSheetOpen(true);
  };

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  // Fetch parcels with filters and pagination
  const { data: parcelsResult, isLoading } = useQuery({
    queryKey: ["parcels-search", filters, page],
    queryFn: async () => {
      let query = supabase
        .from("parcels")
        .select("*", { count: "exact" })
        .order("assessed_value", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.address.trim()) {
        query = query.ilike("address", `%${filters.address}%`);
      }
      if (filters.city.trim()) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.minValue > 0) {
        query = query.gte("assessed_value", filters.minValue);
      }
      if (filters.maxValue < 5000000) {
        query = query.lte("assessed_value", filters.maxValue);
      }
      if (filters.propertyClasses.length > 0) {
        query = query.in("property_class", filters.propertyClasses);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { parcels: (data || []) as Parcel[], totalCount: count || 0 };
    },
    staleTime: 30000,
  });

  const parcels = parcelsResult?.parcels || [];
  const totalCount = parcelsResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Get unique cities and neighborhoods for filter options
  const { data: filterOptions } = useQuery({
    queryKey: ["parcel-filter-options"],
    queryFn: async () => {
      const { data: cityData } = await supabase
        .from("parcels")
        .select("city")
        .not("city", "is", null)
        .limit(1000);

      const cities = [...new Set((cityData || []).map((p) => p.city).filter(Boolean))];
      return { cities };
    },
    staleTime: 60000,
  });

  const togglePropertyClass = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      propertyClasses: prev.propertyClasses.includes(value)
        ? prev.propertyClasses.filter((c) => c !== value)
        : [...prev.propertyClasses, value],
    }));
  };

  const handleValueRangeChange = (values: number[]) => {
    setValueRange([values[0], values[1]]);
  };

  const applyValueRange = () => {
    setFilters((prev) => ({
      ...prev,
      minValue: valueRange[0],
      maxValue: valueRange[1],
    }));
  };

  const clearFilters = () => {
    setFilters({
      address: "",
      minValue: 0,
      maxValue: 5000000,
      propertyClasses: [],
      city: "",
      neighborhoods: [],
    });
    setValueRange([0, 5000000]);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.address) count++;
    if (filters.city) count++;
    if (filters.minValue > 0 || filters.maxValue < 5000000) count++;
    if (filters.propertyClasses.length > 0) count++;
    return count;
  }, [filters]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-tf-cyan" />
          <h3 className="font-medium text-foreground">Parcel Search</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-tf-cyan/20 text-tf-cyan">
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {totalCount.toLocaleString()} results
          </Badge>
        </div>
      </div>

      {/* Filters Panel */}
      <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
        <Card className="bg-tf-elevated border-tf-border">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </CardTitle>
                {filtersExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Address Search */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Address
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search address..."
                      value={filters.address}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, address: e.target.value }))
                      }
                      className="pl-9 bg-tf-substrate border-tf-border"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    City
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by city..."
                      value={filters.city}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, city: e.target.value }))
                      }
                      className="pl-9 bg-tf-substrate border-tf-border"
                      list="cities-list"
                    />
                    <datalist id="cities-list">
                      {filterOptions?.cities?.map((city) => (
                        <option key={city} value={city || ""} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Value Range */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  Assessed Value Range
                </Label>
                <div className="px-2">
                  <Slider
                    value={valueRange}
                    onValueChange={handleValueRangeChange}
                    onValueCommit={applyValueRange}
                    min={0}
                    max={5000000}
                    step={50000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCurrency(valueRange[0])}</span>
                    <span>{formatCurrency(valueRange[1])}</span>
                  </div>
                </div>
              </div>

              {/* Property Class */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Property Class
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_CLASSES.map((cls) => {
                    const Icon = cls.icon;
                    const isSelected = filters.propertyClasses.includes(cls.value);
                    return (
                      <Badge
                        key={cls.value}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all",
                          isSelected
                            ? "bg-tf-cyan/20 border-tf-cyan text-tf-cyan"
                            : "hover:bg-muted"
                        )}
                        onClick={() => togglePropertyClass(cls.value)}
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {cls.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results Table */}
      <Card className="bg-tf-elevated border-tf-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-tf-cyan" />
              <span className="ml-2 text-muted-foreground">Searching parcels...</span>
            </div>
          ) : parcels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No parcels found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Address</th>
                    <th className="text-left p-3 font-medium">City</th>
                    <th className="text-left p-3 font-medium">Class</th>
                    <th className="text-right p-3 font-medium">Value</th>
                    <th className="text-right p-3 font-medium">Sq Ft</th>
                    <th className="text-right p-3 font-medium">Year</th>
                    <th className="text-center p-3 font-medium">Bed/Bath</th>
                  </tr>
                </thead>
                <tbody>
                  {parcels.map((parcel, idx) => (
                    <motion.tr
                      key={parcel.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border hover:bg-tf-cyan/10 transition-colors cursor-pointer group"
                      onClick={() => handleParcelClick(parcel)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-tf-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div>
                            <div className="font-medium">{parcel.address}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {parcel.parcel_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{parcel.city || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {parcel.state} {parcel.zip_code}
                        </div>
                      </td>
                      <td className="p-3">
                        {parcel.property_class ? (
                          <Badge variant="outline" className="text-xs">
                            {parcel.property_class}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-tf-optimized-green font-medium">
                          ${parcel.assessed_value.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {parcel.building_area?.toLocaleString() || "—"}
                      </td>
                      <td className="p-3 text-right">
                        {parcel.year_built || "—"}
                      </td>
                      <td className="p-3 text-center">
                        {parcel.bedrooms || parcel.bathrooms ? (
                          <span>
                            {parcel.bedrooms || 0} / {parcel.bathrooms || 0}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-border/30 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Page {page + 1} of {totalPages} ({totalCount.toLocaleString()} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Parcel Detail Sheet */}
      <ParcelDetailSheet
        parcel={selectedParcel}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}
