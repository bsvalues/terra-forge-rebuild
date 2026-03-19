import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight, TrendingUp, TrendingDown, Minus,
  Home, MapPin, DollarSign, Ruler, Calendar, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ParcelSnapshot {
  parcelNumber: string;
  address: string;
  neighborhood: string;
  propertyClass: string;
  yearBuilt: number;
  sqft: number;
  lotSize: number;
  bedrooms: number;
  bathrooms: number;
  condition: string;
  landValue: number;
  improvementValue: number;
  totalValue: number;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  ratio: number | null;
}

const mockParcelA: ParcelSnapshot = {
  parcelNumber: "R-1001-234",
  address: "123 Oak Street",
  neighborhood: "NB-204",
  propertyClass: "Residential",
  yearBuilt: 1998,
  sqft: 2450,
  lotSize: 8500,
  bedrooms: 4,
  bathrooms: 2.5,
  condition: "Good",
  landValue: 85000,
  improvementValue: 200000,
  totalValue: 285000,
  lastSalePrice: 295000,
  lastSaleDate: "2024-06-15",
  ratio: 0.966,
};

const mockParcelB: ParcelSnapshot = {
  parcelNumber: "R-1001-567",
  address: "456 Elm Avenue",
  neighborhood: "NB-204",
  propertyClass: "Residential",
  yearBuilt: 2005,
  sqft: 2680,
  lotSize: 9200,
  bedrooms: 4,
  bathrooms: 3,
  condition: "Very Good",
  landValue: 92000,
  improvementValue: 228000,
  totalValue: 320000,
  lastSalePrice: 310000,
  lastSaleDate: "2025-01-20",
  ratio: 1.032,
};

interface DiffField {
  label: string;
  icon: React.ElementType;
  valueA: string | number;
  valueB: string | number;
  format?: "currency" | "number" | "text" | "ratio";
  higherIsBetter?: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export function ParcelComparisonDiff() {
  const [parcelA] = useState<ParcelSnapshot>(mockParcelA);
  const [parcelB] = useState<ParcelSnapshot>(mockParcelB);

  const fields: DiffField[] = useMemo(() => [
    { label: "Neighborhood", icon: MapPin, valueA: parcelA.neighborhood, valueB: parcelB.neighborhood, format: "text" },
    { label: "Property Class", icon: Home, valueA: parcelA.propertyClass, valueB: parcelB.propertyClass, format: "text" },
    { label: "Year Built", icon: Calendar, valueA: parcelA.yearBuilt, valueB: parcelB.yearBuilt, format: "number" },
    { label: "Living Area (sqft)", icon: Ruler, valueA: parcelA.sqft, valueB: parcelB.sqft, format: "number" },
    { label: "Lot Size (sqft)", icon: Ruler, valueA: parcelA.lotSize, valueB: parcelB.lotSize, format: "number" },
    { label: "Bedrooms", icon: Home, valueA: parcelA.bedrooms, valueB: parcelB.bedrooms, format: "number" },
    { label: "Bathrooms", icon: Home, valueA: parcelA.bathrooms, valueB: parcelB.bathrooms, format: "number" },
    { label: "Condition", icon: Info, valueA: parcelA.condition, valueB: parcelB.condition, format: "text" },
    { label: "Land Value", icon: DollarSign, valueA: parcelA.landValue, valueB: parcelB.landValue, format: "currency" },
    { label: "Improvement Value", icon: DollarSign, valueA: parcelA.improvementValue, valueB: parcelB.improvementValue, format: "currency" },
    { label: "Total Value", icon: DollarSign, valueA: parcelA.totalValue, valueB: parcelB.totalValue, format: "currency" },
    { label: "Last Sale Price", icon: TrendingUp, valueA: parcelA.lastSalePrice ?? 0, valueB: parcelB.lastSalePrice ?? 0, format: "currency" },
    { label: "Assessment Ratio", icon: TrendingUp, valueA: parcelA.ratio ?? 0, valueB: parcelB.ratio ?? 0, format: "ratio" },
  ], [parcelA, parcelB]);

  const formatValue = (v: string | number, format?: string) => {
    if (format === "currency" && typeof v === "number") return fmt(v);
    if (format === "ratio" && typeof v === "number") return v.toFixed(3);
    if (format === "number" && typeof v === "number") return v.toLocaleString();
    return String(v);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-suite-forge" />
        <h3 className="text-sm font-medium text-foreground">Parcel Comparison Diff</h3>
        <Badge variant="outline" className="text-[10px]">Side-by-Side</Badge>
      </div>

      {/* Parcel Headers */}
      <div className="grid grid-cols-[200px_1fr_40px_1fr] gap-2 items-end">
        <div />
        <div className="material-bento rounded-lg p-3 text-center">
          <div className="text-xs font-medium text-foreground">{parcelA.parcelNumber}</div>
          <div className="text-[10px] text-muted-foreground truncate">{parcelA.address}</div>
        </div>
        <div className="flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="material-bento rounded-lg p-3 text-center">
          <div className="text-xs font-medium text-foreground">{parcelB.parcelNumber}</div>
          <div className="text-[10px] text-muted-foreground truncate">{parcelB.address}</div>
        </div>
      </div>

      {/* Diff Rows */}
      <div className="space-y-1">
        {fields.map((field, idx) => {
          const Icon = field.icon;
          const isDifferent = String(field.valueA) !== String(field.valueB);
          const numA = typeof field.valueA === "number" ? field.valueA : 0;
          const numB = typeof field.valueB === "number" ? field.valueB : 0;
          const delta = field.format !== "text" ? numB - numA : 0;

          return (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "grid grid-cols-[200px_1fr_40px_1fr] gap-2 items-center py-2 px-2 rounded",
                isDifferent ? "bg-tf-gold/5 border border-tf-gold/20" : "hover:bg-muted/20"
              )}
            >
              {/* Label */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {field.label}
              </div>

              {/* Value A */}
              <div className="text-xs font-medium text-foreground text-center">
                {formatValue(field.valueA, field.format)}
              </div>

              {/* Delta */}
              <div className="flex items-center justify-center">
                {isDifferent && field.format !== "text" && delta !== 0 ? (
                  delta > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-tf-green" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  )
                ) : isDifferent ? (
                  <span className="w-2 h-2 rounded-full bg-tf-gold" />
                ) : (
                  <Minus className="w-3 h-3 text-muted-foreground/30" />
                )}
              </div>

              {/* Value B */}
              <div className="text-xs font-medium text-foreground text-center">
                {formatValue(field.valueB, field.format)}
                {isDifferent && field.format === "currency" && delta !== 0 && (
                  <span className={cn(
                    "ml-2 text-[10px]",
                    delta > 0 ? "text-tf-green" : "text-destructive"
                  )}>
                    ({delta > 0 ? "+" : ""}{fmt(delta)})
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="material-bento rounded-lg p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {fields.filter((f) => String(f.valueA) !== String(f.valueB)).length} of {fields.length} fields differ
          </span>
          <span className="text-muted-foreground">
            Value delta: <span className={cn("font-medium", parcelB.totalValue - parcelA.totalValue > 0 ? "text-tf-green" : "text-destructive")}>
              {fmt(parcelB.totalValue - parcelA.totalValue)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
