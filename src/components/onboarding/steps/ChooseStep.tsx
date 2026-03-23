// TerraFusion OS — Onboarding: Choose create or join
import { Building2, Plus, Users, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ChooseStepProps {
  availableCount: number;
  isLoadingCounties?: boolean;
  onCreateNew: () => void;
  onJoinExisting: () => void;
}

export function ChooseStep({ availableCount, isLoadingCounties, onCreateNew, onJoinExisting }: ChooseStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="w-10 h-10 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">Set Up Your County</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new county or join an existing one
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card
          className="cursor-pointer border-border/50 hover:border-primary/40 transition-colors bg-card/80"
          onClick={onCreateNew}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Create New County</p>
              <p className="text-xs text-muted-foreground">You'll be the administrator</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-border/50 hover:border-chart-5/40 transition-colors bg-card/80"
          onClick={onJoinExisting}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-chart-5/10">
              <Users className="w-5 h-5 text-chart-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Join Existing County</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingCounties ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading counties…
                  </span>
                ) : availableCount > 0 ? (
                  `${availableCount} ${availableCount === 1 ? "county" : "counties"} available`
                ) : (
                  "Browse available counties"
                )}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
