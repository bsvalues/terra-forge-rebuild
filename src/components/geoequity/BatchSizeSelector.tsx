import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Layers } from "lucide-react";

interface BatchSizeSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
}

export function BatchSizeSelector({ value, onChange, max }: BatchSizeSelectorProps) {
  const effectiveMax = Math.min(max, 100); // Cap at 100 for rate limits
  const displayValue = Math.min(value, effectiveMax);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Layers className="w-3.5 h-3.5" />
          Batch Size
        </Label>
        <span className="text-xs font-medium text-tf-cyan">
          {displayValue} parcels
        </span>
      </div>
      <Slider
        value={[displayValue]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={effectiveMax}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>1</span>
        <span>Max: {effectiveMax}</span>
      </div>
    </div>
  );
}
