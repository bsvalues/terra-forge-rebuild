import { Check, ChevronsUpDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { StudyPeriod } from "@/hooks/useVEIData";

interface StudyPeriodSelectorProps {
  periods: StudyPeriod[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function StudyPeriodSelector({
  periods,
  selectedId,
  onSelect,
  isLoading,
}: StudyPeriodSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedPeriod = periods.find((p) => p.id === selectedId);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-vei-excellent/20 text-vei-excellent border-vei-excellent/30";
      case "completed":
        return "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30";
      case "draft":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[320px] justify-between glass-card border-border hover:border-tf-cyan/50 transition-colors"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4 text-tf-cyan shrink-0" />
            {selectedPeriod ? (
              <span className="truncate">{selectedPeriod.name}</span>
            ) : (
              <span className="text-muted-foreground">Select study period...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-background border-border z-50" align="start">
        <Command className="bg-background">
          <CommandInput placeholder="Search study periods..." className="border-none" />
          <CommandList>
            <CommandEmpty>No study periods found.</CommandEmpty>
            <CommandGroup>
              {periods.map((period) => (
                <CommandItem
                  key={period.id}
                  value={period.name}
                  onSelect={() => {
                    onSelect(period.id);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 text-tf-cyan",
                          selectedId === period.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{period.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs capitalize", getStatusColor(period.status))}
                    >
                      {period.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-6 text-xs text-muted-foreground">
                    <span>{formatDateRange(period.start_date, period.end_date)}</span>
                    {period.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[180px]">{period.description}</span>
                      </>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
