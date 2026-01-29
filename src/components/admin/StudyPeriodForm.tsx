import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Calendar, Target, FileText, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { StudyPeriod } from "@/hooks/useVEIData";

const studyPeriodSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["draft", "active", "completed", "archived"]),
  target_cod: z.number().min(0).max(50),
  target_prd_low: z.number().min(0.8).max(1.0),
  target_prd_high: z.number().min(1.0).max(1.2),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"],
});

type FormValues = z.infer<typeof studyPeriodSchema>;

export type StudyPeriodFormValues = FormValues;

interface StudyPeriodFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => void;
  initialData?: StudyPeriod | null;
  isLoading?: boolean;
}

const statusOptions = [
  { value: "draft", label: "Draft", color: "text-muted-foreground" },
  { value: "active", label: "Active", color: "text-vei-good" },
  { value: "completed", label: "Completed", color: "text-tf-cyan" },
  { value: "archived", label: "Archived", color: "text-muted-foreground" },
];

export function StudyPeriodForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: StudyPeriodFormProps) {
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(studyPeriodSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      start_date: initialData?.start_date || "",
      end_date: initialData?.end_date || "",
      status: (initialData?.status as FormValues["status"]) || "draft",
      target_cod: initialData?.target_cod ?? 15,
      target_prd_low: initialData?.target_prd_low ?? 0.98,
      target_prd_high: initialData?.target_prd_high ?? 1.03,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-gradient-sovereign text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-tf-cyan" />
            {isEditing ? "Edit Study Period" : "Create Study Period"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="w-4 h-4" />
                Basic Information
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Period Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2024 Annual Study"
                        className="bg-tf-elevated border-border"
                        {...field}
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the study period..."
                        className="bg-tf-elevated border-border resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-tf-elevated border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-tf-elevated border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-tf-elevated border-border">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Target Configuration */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="w-4 h-4" />
                Target Configuration
              </div>

              <FormField
                control={form.control}
                name="target_cod"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between">
                      <FormLabel>Target COD (%)</FormLabel>
                      <span className="text-sm font-mono text-tf-cyan">{field.value}%</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={5}
                        max={25}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={([value]) => field.onChange(value)}
                        className="py-2"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      IAAO standard: ≤15% for residential, ≤20% for income-producing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_prd_low"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>PRD Lower Bound</FormLabel>
                        <span className="text-sm font-mono text-vei-good">{field.value.toFixed(2)}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0.90}
                          max={1.00}
                          step={0.01}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="py-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_prd_high"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>PRD Upper Bound</FormLabel>
                        <span className="text-sm font-mono text-vei-caution">{field.value.toFixed(2)}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1.00}
                          max={1.10}
                          step={0.01}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="py-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-tf-elevated/50 border border-border">
                <AlertCircle className="w-4 h-4 text-tf-cyan mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  PRD target range: Values within <span className="text-vei-good font-mono">{form.watch("target_prd_low").toFixed(2)}</span> to{" "}
                  <span className="text-vei-caution font-mono">{form.watch("target_prd_high").toFixed(2)}</span> indicate acceptable vertical equity.
                  Values outside this range suggest potential regressivity.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  />
                ) : isEditing ? (
                  "Update Study Period"
                ) : (
                  "Create Study Period"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
