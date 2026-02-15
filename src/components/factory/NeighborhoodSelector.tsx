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
}

export function NeighborhoodSelector({ value, onChange }: NeighborhoodSelectorProps) {
  const { data: neighborhoods = [], isLoading } = useQuery({
    queryKey: ["factory-neighborhoods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcels")
        .select("neighborhood_code")
        .not("neighborhood_code", "is", null)
        .order("neighborhood_code");

      const unique = [...new Set((data || []).map((p) => p.neighborhood_code!))];
      return unique;
    },
    staleTime: 120_000,
  });

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
        {neighborhoods.map((code) => (
          <SelectItem key={code} value={code}>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
