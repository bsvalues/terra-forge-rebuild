// TerraFusion OS — Phase 104: Parcel Comparison View
// Side-by-side comparison of two parcels' assessments, characteristics, and sales.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight, Search, Building2, DollarSign, MapPin,
  TrendingUp, TrendingDown, Minus, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useParcel360 } from "@/hooks/useParcel360";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CompareSlotProps {
  parcelId: string | null;
  onClear: () => void;
  onSearch: (query: string) => void;
  searching: boolean;
}

function CompareSlot({ parcelId, onClear, onSearch, searching }: CompareSlotProps) {
  const [query, setQuery] = useState("");
  const snapshot = useParcel360(parcelId);

  if (!parcelId) {
    return (
      <Card className="border-border/30 flex-1">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Search className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Search for a parcel</p>
          <div className="flex gap-2 w-full max-w-xs">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Parcel # or address"
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && onSearch(query)}
            />
            <Button size="sm" onClick={() => onSearch(query)} disabled={searching}>
              {searching ? "…" : "Find"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-border/30 flex-1">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const fmt = (v: number | null | undefined) =>
    v != null ? `$${v.toLocaleString()}` : "—";

  return (
    <Card className="border-border/30 flex-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {snapshot.identity.parcelNumber}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Address</p>
          <p className="text-sm font-medium text-foreground">{snapshot.identity.address || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Class / Neighborhood</p>
          <p className="text-sm text-foreground">
            {snapshot.identity.propertyClass || "—"} · {snapshot.identity.neighborhoodCode || "—"}
          </p>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-sm font-bold text-foreground">{fmt(snapshot.valuation.assessedValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Land</p>
            <p className="text-sm text-muted-foreground">{fmt(snapshot.valuation.landValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Impr</p>
            <p className="text-sm text-muted-foreground">{fmt(snapshot.valuation.improvementValue)}</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Assessments:</span>{" "}
            <span className="text-foreground">{snapshot.valuation.history.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sales:</span>{" "}
            <span className="text-foreground">{snapshot.sales.qualifiedCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Appeals:</span>{" "}
            <span className="text-foreground">{snapshot.workflows.pendingAppeals.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Permits:</span>{" "}
            <span className="text-foreground">{snapshot.workflows.openPermits.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ParcelComparisonView() {
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const { profile } = useAuthContext();

  const searchParcel = async (query: string, side: "left" | "right") => {
    if (!query.trim() || !profile?.county_id) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("parcels")
        .select("id")
        .eq("county_id", profile.county_id)
        .or(`parcel_number.ilike.%${query}%,situs_address.ilike.%${query}%`)
        .limit(1)
        .maybeSingle();

      if (data) {
        side === "left" ? setLeftId(data.id) : setRightId(data.id);
      }
    } finally {
      setSearching(false);
    }
  };

  // Compute delta if both loaded
  const leftSnapshot = useParcel360(leftId);
  const rightSnapshot = useParcel360(rightId);
  const bothLoaded = leftSnapshot && rightSnapshot;

  const valueDelta = bothLoaded
    ? (leftSnapshot.valuation.assessedValue ?? 0) - (rightSnapshot.valuation.assessedValue ?? 0)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-medium text-foreground">Parcel Comparison</h3>
      </div>

      <div className="flex gap-4">
        <CompareSlot
          parcelId={leftId}
          onClear={() => setLeftId(null)}
          onSearch={(q) => searchParcel(q, "left")}
          searching={searching}
        />

        {/* Delta indicator */}
        <div className="flex flex-col items-center justify-center gap-2 min-w-[60px]">
          {bothLoaded && valueDelta !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              {valueDelta > 0 ? (
                <TrendingUp className="w-5 h-5 text-chart-5 mx-auto" />
              ) : valueDelta < 0 ? (
                <TrendingDown className="w-5 h-5 text-destructive mx-auto" />
              ) : (
                <Minus className="w-5 h-5 text-muted-foreground mx-auto" />
              )}
              <Badge variant="outline" className="text-[9px] mt-1">
                {valueDelta > 0 ? "+" : ""}${valueDelta.toLocaleString()}
              </Badge>
            </motion.div>
          )}
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground/30" />
        </div>

        <CompareSlot
          parcelId={rightId}
          onClear={() => setRightId(null)}
          onSearch={(q) => searchParcel(q, "right")}
          searching={searching}
        />
      </div>
    </div>
  );
}
