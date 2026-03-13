import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Filter, X } from "lucide-react";
import { useParcelFilterDistincts } from "@/hooks/useParcelSearchFilters";

export interface ParcelFilters {
  neighborhood?: string;
  minSqft?: number;
  maxSqft?: number;
  minYear?: number;
  maxYear?: number;
  minBeds?: number;
  maxBeds?: number;
  propertyClass?: string;
  city?: string;
}

interface ParcelFiltersProps {
  filters: ParcelFilters;
  onChange: (filters: ParcelFilters) => void;
  onApply: () => void;
  parcelCount: number;
  loading: boolean;
}

export function ParcelFiltersPanel({
  filters,
  onChange,
  onApply,
  parcelCount,
  loading,
}: ParcelFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: distincts } = useParcelFilterDistincts();
  const neighborhoods = distincts?.neighborhoods || [];
  const propertyClasses = distincts?.propertyClasses || [];
  const cities = distincts?.cities || [];

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  const clearFilters = () => {
    onChange({});
  };

  const updateFilter = <K extends keyof ParcelFilters>(key: K, value: ParcelFilters[K]) => {
    if (value === "" || value === undefined) {
      const newFilters = { ...filters };
      delete newFilters[key];
      onChange(newFilters);
    } else {
      onChange({ ...filters, [key]: value });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-9 px-3 bg-tf-substrate border border-tf-border"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Parcel Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-3">
        {/* Row 1: Location filters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Neighborhood</Label>
            <Select
              value={filters.neighborhood || ""}
              onValueChange={(v) => updateFilter("neighborhood", v || undefined)}
            >
              <SelectTrigger className="h-8 text-xs bg-tf-substrate">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {neighborhoods.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Select
              value={filters.city || ""}
              onValueChange={(v) => updateFilter("city", v || undefined)}
            >
              <SelectTrigger className="h-8 text-xs bg-tf-substrate">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Property Class</Label>
            <Select
              value={filters.propertyClass || ""}
              onValueChange={(v) => updateFilter("propertyClass", v || undefined)}
            >
              <SelectTrigger className="h-8 text-xs bg-tf-substrate">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {propertyClasses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Numeric ranges */}
        <div className="grid grid-cols-3 gap-2">
          {/* Sqft Range */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sq Ft Range</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minSqft || ""}
                onChange={(e) => updateFilter("minSqft", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs bg-tf-substrate"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxSqft || ""}
                onChange={(e) => updateFilter("maxSqft", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs bg-tf-substrate"
              />
            </div>
          </div>

          {/* Year Built Range */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Year Built</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minYear || ""}
                onChange={(e) => updateFilter("minYear", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs bg-tf-substrate"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxYear || ""}
                onChange={(e) => updateFilter("maxYear", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs bg-tf-substrate"
              />
            </div>
          </div>

          {/* Bedrooms Range */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bedrooms</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minBeds || ""}
                onChange={(e) => updateFilter("minBeds", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs bg-tf-substrate"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxBeds || ""}
                onChange={(e) => updateFilter("maxBeds", e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs bg-tf-substrate"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            {loading ? "Loading..." : `${parcelCount} parcels match filters`}
          </div>
          <div className="flex gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={onApply}
              className="h-7 px-3 text-xs bg-tf-cyan hover:bg-tf-cyan/90"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
