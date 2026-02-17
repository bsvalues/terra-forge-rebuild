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
import { FileCheck, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createPermitRecord } from "@/services/suites/daisService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateWorkflows } from "@/lib/queryInvalidation";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const permitSchema = z.object({
  parcel_id: z.string().min(1, "Please select a parcel"),
  permit_number: z.string().min(1, "Permit number is required").max(50, "Permit number too long"),
  permit_type: z.enum(["building", "electrical", "plumbing", "mechanical", "demolition", "renovation"]),
  description: z.string().max(500, "Description too long").optional(),
  estimated_value: z.coerce.number().min(0, "Value must be positive").optional(),
});

type PermitFormData = z.infer<typeof permitSchema>;

interface NewPermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPermitDialog({ open, onOpenChange }: NewPermitDialogProps) {
  const queryClient = useQueryClient();
  const [parcelSearch, setParcelSearch] = useState("");

  const form = useForm<PermitFormData>({
    resolver: zodResolver(permitSchema),
    defaultValues: {
      parcel_id: "",
      permit_number: "",
      permit_type: "building",
      description: "",
      estimated_value: undefined,
    },
  });

  // Search parcels
  const { data: parcels = [], isLoading: parcelsLoading } = useQuery({
    queryKey: ["parcels-search", parcelSearch],
    queryFn: async () => {
      if (!parcelSearch || parcelSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, city")
        .or(`parcel_number.ilike.%${parcelSearch}%,address.ilike.%${parcelSearch}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: parcelSearch.length >= 2,
  });

  const createPermit = useMutation({
    mutationFn: async (data: PermitFormData) => {
      return createPermitRecord({
        parcel_id: data.parcel_id,
        permit_number: data.permit_number,
        permit_type: data.permit_type,
        description: data.description,
        estimated_value: data.estimated_value,
      });
    },
    onSuccess: () => {
      invalidateWorkflows(queryClient);
      toast({
        title: "Permit Created",
        description: "The new permit application has been submitted.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create permit",
        variant: "destructive",
      });
    },
  });

  const selectedParcel = parcels.find((p) => p.id === form.watch("parcel_id"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="material-bento border-tf-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-tf-green" />
            New Permit Application
          </DialogTitle>
          <DialogDescription>
            Submit a new building permit for review
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createPermit.mutate(data))} className="space-y-4">
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
                        <div className="font-medium text-sm">{parcel.parcel_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {parcel.address}{parcel.city ? `, ${parcel.city}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {selectedParcel && (
                <div className="p-3 rounded-lg bg-tf-green/10 border border-tf-green/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{selectedParcel.parcel_number}</div>
                      <div className="text-xs text-muted-foreground">{selectedParcel.address}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => form.setValue("parcel_id", "")}
                    >
                      Change
                    </Button>
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
                name="permit_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permit Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BP-2026-001" {...field} className="bg-tf-substrate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permit Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-tf-substrate">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="building">Building</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="mechanical">Mechanical</SelectItem>
                        <SelectItem value="demolition">Demolition</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimated_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Project Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the work to be done..."
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
                disabled={createPermit.isPending}
                className="bg-tf-green hover:bg-tf-green/90"
              >
                {createPermit.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Permit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
