// TerraFusion OS — Onboarding: Join Existing County
import { MapPin, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AvailableCounty } from "@/hooks/useOnboardingStatus";
import { cn } from "@/lib/utils";

interface JoinCountyStepProps {
  counties: AvailableCounty[];
  isLoading: boolean;
  selectedCounty: string;
  isPending: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function JoinCountyStep({
  counties, isLoading, selectedCounty, isPending,
  onSelect, onBack, onSubmit,
}: JoinCountyStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Join County</h2>
        <p className="text-sm text-muted-foreground mt-1">Select a county to join as a viewer</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {counties.map((c) => (
            <Card
              key={c.id}
              className={cn(
                "cursor-pointer border-border/50 transition-colors",
                selectedCounty === c.id ? "border-primary bg-primary/5" : "hover:border-primary/20 bg-card/80"
              )}
              onClick={() => onSelect(c.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <MapPin className={cn("w-4 h-4", selectedCounty === c.id ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.state} · FIPS {c.fips_code}</p>
                </div>
                {selectedCounty === c.id && <Check className="w-4 h-4 text-primary" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button
          onClick={onSubmit}
          disabled={!selectedCounty || isPending}
          className="flex-1 bg-primary text-primary-foreground"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Join County
        </Button>
      </div>
    </div>
  );
}
