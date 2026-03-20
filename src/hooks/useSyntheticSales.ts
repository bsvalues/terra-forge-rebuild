// TerraFusion OS — Synthetic Sales Generator Hook
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyntheticSalesConfig {
  totalTarget?: number;
  samplesPerNeighborhood?: number;
  monthsBack?: number;
  ratioMean?: number;
  ratioStdDev?: number;
  seed?: number;
  dryRun?: boolean;
}

export interface SyntheticSalesResult {
  ok: boolean;
  dryRun?: boolean;
  inserted?: number;
  totalGenerated: number;
  neighborhoodsCovered: number;
  totalNeighborhoods: number;
  dateRange: { earliest: string | null; latest: string | null };
  priceRange: { min: number; max: number; avg: number };
  batchTag: string;
  seed: number;
  ratioMean: number;
  ratioStdDev: number;
}

async function invoke(config: SyntheticSalesConfig): Promise<SyntheticSalesResult> {
  const { data, error } = await supabase.functions.invoke("synthetic-sales-gen", { body: config });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as SyntheticSalesResult;
}

export function useSyntheticSalesPreview() {
  return useMutation({
    mutationFn: (config: Omit<SyntheticSalesConfig, "dryRun">) =>
      invoke({ ...config, dryRun: true }),
    onError: (err: any) => toast.error("Preview failed", { description: err.message }),
  });
}

export function useSyntheticSalesCommit() {
  return useMutation({
    mutationFn: (config: Omit<SyntheticSalesConfig, "dryRun">) =>
      invoke({ ...config, dryRun: false }),
    onSuccess: (data) =>
      toast.success(`Generated ${data.inserted} synthetic sales`, {
        description: `${data.neighborhoodsCovered} neighborhoods, avg $${data.priceRange.avg.toLocaleString()}`,
      }),
    onError: (err: any) => toast.error("Generation failed", { description: err.message }),
  });
}
