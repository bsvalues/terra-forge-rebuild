// TerraFusion OS — Parcel Comparison Panel
// Side-by-side parcel comparison with delta highlighting

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompareArrows, Plus, X, Search, Trash2, ArrowUpDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useParcelComparison, COMPARISON_FIELDS } from "@/hooks/useParcelComparison";
import { useParcelLookup } from "@/hooks/useParcelLookup";

function formatValue(value: unknown, format: string): string {
  if (value === null || value === undefined) return "—";
  switch (format) {
    case "currency":
      return `$${Number(value).toLocaleString()}`;
    case "sqft":
      return `${Number(value).toLocaleString()} sf`;
    case "number":
      return Number(value).toLocaleString();
    default:
      return String(value);
  }
}

function getDeltaClass(values: (number | null)[], idx: number): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return "";
  const val = values[idx];
  if (val === null) return "";
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (val === max && max !== min) return "text-primary font-semibold";
  if (val === min && max !== min) return "text-destructive";
  return "";
}

export function ParcelComparisonPanel() {
  const { parcels, loading, addParcel, removeParcel, clearAll } = useParcelComparison();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchResults = useParcelLookup(showSearch ? searchQuery : "");

  const handleSelectParcel = (id: string) => {
    addParcel(id);
    setSearchQuery("");
    setShowSearch(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitCompareArrows className="w-6 h-6 text-primary" />
            Parcel Comparison
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare up to 4 parcels side-by-side
          </p>
        </div>
        <div className="flex gap-2">
          {parcels.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="gap-1.5 text-xs">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          )}
          {parcels.length < 4 && (
            <Button size="sm" onClick={() => setShowSearch(!showSearch)} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Parcel
            </Button>
          )}
        </div>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by parcel number or address…"
                    className="pl-9"
                    autoFocus
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectParcel(r.id)}
                        disabled={parcels.some((p) => p.id === r.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors disabled:opacity-40"
                      >
                        <div>
                          <p className="font-medium">{r.parcel_number}</p>
                          <p className="text-xs text-muted-foreground">{r.address}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          ${r.assessed_value.toLocaleString()}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No parcels found</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {parcels.length === 0 && !showSearch && (
        <Card className="border-border/40">
          <CardContent className="py-16 text-center">
            <GitCompareArrows className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No parcels selected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Add Parcel" to start comparing properties
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowSearch(true)}>
              <Plus className="w-3.5 h-3.5" /> Add First Parcel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comparison Grid */}
      {parcels.length > 0 && (
        <Card className="border-border/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Parcel Headers */}
              <thead>
                <tr className="border-b border-border/40">
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground w-40 min-w-[10rem]">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      Property
                    </div>
                  </th>
                  {parcels.map((p) => (
                    <th key={p.id} className="p-3 text-left min-w-[12rem]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{p.parcel_number}</p>
                          <p className="text-[10px] text-muted-foreground font-normal truncate max-w-[10rem]">
                            {p.address}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeParcel(p.id)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </th>
                  ))}
                  {parcels.length < 4 && (
                    <th className="p-3 min-w-[10rem]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1 border-dashed"
                        onClick={() => setShowSearch(true)}
                      >
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </th>
                  )}
                </tr>
              </thead>

              {/* Comparison Rows */}
              <tbody>
                {COMPARISON_FIELDS.map((field) => {
                  const values = parcels.map((p) => (p as unknown as Record<string, unknown>)[field.key] as number | null);
                  const isNumeric = ["currency", "sqft", "number"].includes(field.format);

                  return (
                    <tr key={field.key} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-xs font-medium text-muted-foreground">{field.label}</td>
                      {parcels.map((p, i) => {
                        const val = (p as unknown as Record<string, unknown>)[field.key];
                        const deltaClass = isNumeric ? getDeltaClass(values, i) : "";
                        return (
                          <td key={p.id} className={`p-3 text-sm ${deltaClass}`}>
                            {formatValue(val, field.format)}
                          </td>
                        );
                      })}
                      {parcels.length < 4 && <td />}
                    </tr>
                  );
                })}

                {/* Value per sqft derived row */}
                {parcels.some((p) => p.building_area && p.building_area > 0) && (
                  <tr className="border-b border-border/20 hover:bg-muted/20 bg-muted/10">
                    <td className="p-3 text-xs font-medium text-primary">$/sqft</td>
                    {parcels.map((p) => {
                      const perSqft = p.building_area && p.building_area > 0
                        ? p.assessed_value / p.building_area
                        : null;
                      return (
                        <td key={p.id} className="p-3 text-sm font-medium text-primary">
                          {perSqft !== null ? `$${perSqft.toFixed(2)}` : "—"}
                        </td>
                      );
                    })}
                    {parcels.length < 4 && <td />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
