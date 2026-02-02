import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface TaxYearSelectorProps {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
}

export function TaxYearSelector({ years, selectedYear, onSelect }: TaxYearSelectorProps) {
  return (
    <Select value={selectedYear.toString()} onValueChange={(v) => onSelect(parseInt(v))}>
      <SelectTrigger className="w-[160px] bg-tf-elevated border-tf-border">
        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select Year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            Tax Year {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
