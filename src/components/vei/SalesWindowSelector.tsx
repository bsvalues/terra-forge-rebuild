import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter } from "lucide-react";
import { format, subMonths } from "date-fns";

interface SalesWindowSelectorProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

export function SalesWindowSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: SalesWindowSelectorProps) {
  const presets = useMemo(() => [
    { label: "Last 12 months", months: 12 },
    { label: "Last 24 months", months: 24 },
    { label: "Last 36 months", months: 36 },
  ], []);

  const applyPreset = (months: number) => {
    const end = new Date();
    const start = subMonths(end, months);
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="bg-tf-elevated border-tf-border gap-2">
          <Filter className="w-4 h-4" />
          Sales Window
          <span className="text-muted-foreground text-xs">
            ({format(startDate, "MMM yy")} - {format(endDate, "MMM yy")})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end">
        <div className="space-y-4">
          <div className="flex gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.months}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.months)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && onStartDateChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && onEndDateChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
