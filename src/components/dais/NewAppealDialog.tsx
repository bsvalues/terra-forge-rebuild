// TerraFusion OS — Phase 29: New Appeal Dialog
// Constitutional owner: TerraDais (workflow states)

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAppealRecord } from "@/services/suites/daisService";
import { invalidateWorkflows } from "@/lib/queryInvalidation";
import { useParcelSearch } from "@/hooks/useDaisQueries";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scale, Search, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewAppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAppealDialog({ open, onOpenChange }: NewAppealDialogProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: searchResults = [] } = useParcelSearch(debouncedSearch);

  const [selectedParcel, setSelectedParcel] = useState<{
    id: string;
    parcel_number: string;
    address: string;
    city: string | null;
  } | null>(null);

  const [originalValue, setOriginalValue] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParcel) throw new Error("Select a parcel");
      if (!originalValue) throw new Error("Original value is required");

      return createAppealRecord({
        parcel_id: selectedParcel.id,
        original_value: parseFloat(originalValue),
        requested_value: requestedValue ? parseFloat(requestedValue) : undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Appeal filed successfully");
      invalidateWorkflows(queryClient);
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to file appeal", { description: err.message });
    },
  });

  const resetForm = () => {
    setSearchTerm("");
    setSelectedParcel(null);
    setOriginalValue("");
    setRequestedValue("");
    setNotes("");
  };

  const handleSelectParcel = (parcel: typeof searchResults[0]) => {
    setSelectedParcel(parcel);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-suite-dais" />
            File New Appeal
          </DialogTitle>
          <DialogDescription>
            Create a property value appeal record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Parcel Search */}
          {!selectedParcel ? (
            <div className="space-y-2">
              <Label className="text-xs">Search Parcel</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by PIN or address..."
                  className="pl-10 h-9 text-sm"
                />
              </div>
              {searchResults.length > 0 && (
                <ScrollArea className="max-h-[160px] border border-border/50 rounded-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectParcel(p)}
                      className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/50 text-left transition-colors border-b border-border/20 last:border-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-sm font-mono font-medium">{p.parcel_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.address}</span>
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-mono font-medium">{selectedParcel.parcel_number}</span>
                  <span className="text-xs text-muted-foreground ml-2">{selectedParcel.address}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedParcel(null)}>
                Change
              </Button>
            </div>
          )}

          {/* Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Original Assessed Value</Label>
              <Input
                type="number"
                value={originalValue}
                onChange={(e) => setOriginalValue(e.target.value)}
                placeholder="e.g. 250000"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Requested Value</Label>
              <Input
                type="number"
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder="Optional"
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for appeal..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Reduction preview */}
          {originalValue && requestedValue && parseFloat(requestedValue) < parseFloat(originalValue) && (
            <div className={cn(
              "text-xs p-2.5 rounded-lg text-center",
              "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              Requested reduction: {((1 - parseFloat(requestedValue) / parseFloat(originalValue)) * 100).toFixed(1)}%
              (−${(parseFloat(originalValue) - parseFloat(requestedValue)).toLocaleString()})
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !selectedParcel || !originalValue}
            className="gap-2 bg-suite-dais hover:bg-suite-dais/90"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scale className="w-4 h-4" />
            )}
            File Appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
