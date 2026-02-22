import { useNeighborhoodYear } from "@/hooks/useNeighborhoodYear";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NeighborhoodSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  /** Appraisal year to scope neighborhoods. Falls back to parcels table if no year-scoped data exists. */
  year?: number;
}

export function NeighborhoodSelector({ value, onChange, year }: NeighborhoodSelectorProps) {
  // Primary: year-scoped neighborhoods from the dimension table
  const { data: yearScoped = [], isLoading: loadingYear } = useNeighborhoodYear(year);

  // Fallback: distinct neighborhood_code from parcels (legacy behavior)
  const { data: legacyCodes = [], isLoading: loadingLegacy } = useQuery({
    queryKey: ["factory-neighborhoods-legacy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .order("neighborhood_code");
      return [...new Set((data || []).map((p) => p.neighborhood_code!))];
    },
    staleTime: 120_000,
    enabled: yearScoped.length === 0 && !loadingYear,
  });

  const hasYearData = yearScoped.length > 0;
  const isLoading = loadingYear || (loadingLegacy && !hasYearData);

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <SelectTrigger className="w-[200px] bg-[hsl(var(--tf-surface))] border-border">
        <SelectValue placeholder={isLoading ? "Loading…" : "All Neighborhoods"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Neighborhoods</SelectItem>
        {hasYearData
          ? yearScoped.map((n) => (
              <SelectItem key={n.hood_cd} value={n.hood_cd}>
                {n.hood_name ? `${n.hood_cd} — ${n.hood_name}` : n.hood_cd}
              </SelectItem>
            ))
          : legacyCodes.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  );
}
