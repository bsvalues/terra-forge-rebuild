import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createExemptionRecord } from "@/services/suites/daisService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const exemptionSchema = z.object({
  parcel_id: z.string().min(1, "Please select a parcel"),
  exemption_type: z.enum(["homestead", "senior", "veteran", "disabled", "agricultural", "religious", "charitable"]),
  applicant_name: z.string().min(1, "Applicant name is required").max(100, "Name too long"),
  exemption_amount: z.coerce.number().min(0, "Amount must be positive").optional(),
  exemption_percentage: z.coerce.number().min(0).max(100, "Percentage must be 0-100").optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

type ExemptionFormData = z.infer<typeof exemptionSchema>;

interface NewExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewExemptionDialog({ open, onOpenChange }: NewExemptionDialogProps) {
  const queryClient = useQueryClient();
  const [parcelSearch, setParcelSearch] = useState("");

  const form = useForm<ExemptionFormData>({
    resolver: zodResolver(exemptionSchema),
    defaultValues: {
      parcel_id: "",
      exemption_type: "homestead",
      applicant_name: "",
      exemption_amount: undefined,
      exemption_percentage: undefined,
      notes: "",
    },
  });

  // Search parcels
  const { data: parcels = [], isLoading: parcelsLoading } = useQuery({
    queryKey: ["parcels-search-exemption", parcelSearch],
    queryFn: async () => {
      if (!parcelSearch || parcelSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, city, assessed_value")
        .or(`parcel_number.ilike.%${parcelSearch}%,address.ilike.%${parcelSearch}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: parcelSearch.length >= 2,
  });

  const createExemption = useMutation({
    mutationFn: async (data: ExemptionFormData) => {
      return createExemptionRecord({
        parcel_id: data.parcel_id,
        exemption_type: data.exemption_type,
        applicant_name: data.applicant_name,
        exemption_amount: data.exemption_amount,
        exemption_percentage: data.exemption_percentage,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exemptions-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["exemptions-stats"] });
      toast({
        title: "Exemption Application Submitted",
        description: "The exemption application is now pending review.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit exemption",
        variant: "destructive",
      });
    },
  });

  const selectedParcel = parcels.find((p) => p.id === form.watch("parcel_id"));

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="material-bento border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-tf-gold" />
            New Exemption Application
          </DialogTitle>
          <DialogDescription>
            Apply for a property tax exemption
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createExemption.mutate(data))} className="space-y-4">
            {/* Parcel Search */}
            <div className="space-y-2">
              <FormLabel>Property</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by parcel # or address..."
                  value={parcelSearch}
                  onChange={(e) => setParcelSearch(e.target.value)}
                  className="pl-10 bg-tf-substrate border-border/50"
                />
              </div>
              {parcelsLoading && (
                <div className="text-sm text-muted-foreground">Searching...</div>
              )}
              {parcels.length > 0 && !selectedParcel && (
                <ScrollArea className="h-[120px] rounded-md border border-border/50 bg-tf-substrate">
                  <div className="p-1">
                    {parcels.map((parcel) => (
                      <button
                        key={parcel.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-tf-elevated rounded-md transition-colors"
                        onClick={() => {
                          form.setValue("parcel_id", parcel.id);
                          setParcelSearch("");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{parcel.parcel_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(parcel.assessed_value)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {parcel.address}{parcel.city ? `, ${parcel.city}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {selectedParcel && (
                <div className="p-3 rounded-lg bg-tf-gold/10 border border-tf-gold/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{selectedParcel.parcel_number}</div>
                      <div className="text-xs text-muted-foreground">{selectedParcel.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(selectedParcel.assessed_value)}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => form.setValue("parcel_id", "")}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {form.formState.errors.parcel_id && (
                <p className="text-sm text-destructive">{form.formState.errors.parcel_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exemption_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exemption Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-tf-substrate">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="homestead">Homestead</SelectItem>
                        <SelectItem value="senior">Senior Citizen</SelectItem>
                        <SelectItem value="veteran">Veteran</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="agricultural">Agricultural</SelectItem>
                        <SelectItem value="religious">Religious</SelectItem>
                        <SelectItem value="charitable">Charitable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full legal name" {...field} className="bg-tf-substrate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exemption_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exemption Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Fixed amount"
                        {...field}
                        className="bg-tf-substrate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exemption_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exemption Percentage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0-100"
                        {...field}
                        className="bg-tf-substrate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Supporting documentation, special circumstances..."
                      className="bg-tf-substrate resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createExemption.isPending}
                className="bg-tf-gold hover:bg-tf-gold/90 text-black"
              >
                {createExemption.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
