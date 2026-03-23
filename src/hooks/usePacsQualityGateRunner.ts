import { useQuery } from "@tanstack/react-query";
import { runAllGates, type GateRunResult } from "@/services/qualityGateRunner";

export function usePacsQualityGateRunner(sampleSize = 1000) {
  return useQuery({
    queryKey: ["pacs-quality-gates-run", sampleSize],
    queryFn: () => runAllGates(sampleSize),
    staleTime: 300000, // 5 min — gates are expensive
  });
}

export type { GateRunResult };
