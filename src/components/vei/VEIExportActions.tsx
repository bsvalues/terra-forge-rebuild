// TerraFusion OS — VEI Export Actions
// "I exported the packet. It said 'you're welcome.'" — Ralph, Export Diplomat

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Table, FileSpreadsheet, Gavel } from "lucide-react";
import { exportCSV, exportXLSX, buildRatioStudyDataset } from "@/components/export/ExportEngine";

interface TierMedian {
  tier: string;
  median: number;
  count: number;
  color: string;
}

interface TrendData {
  current: number;
  trend: number[];
  years: number[];
  target: number;
  tolerance?: number;
  upperLimit?: number;
}

interface AppealTierData {
  tier: string;
  rate: number;
}

interface VEIExportData {
  currentYear: number;
  studyPeriod: string;
  propertyClass: string;
  sampleSize: number;
  medianRatio: number;
  prb: number;
  prd: TrendData;
  cod: TrendData;
  tierMedians: TierMedian[];
  appeals: { byTier: AppealTierData[] };
}

interface VEIExportActionsProps {
  data: VEIExportData;
}

export function VEIExportActions({ data }: VEIExportActionsProps) {
  const buildDataset = () => buildRatioStudyDataset({
    taxYear: data.currentYear,
    salesWindow: data.studyPeriod,
    sampleSize: data.sampleSize,
    medianRatio: data.medianRatio ?? 1,
    cod: data.cod?.current ?? 0,
    prd: data.prd?.current ?? 1,
    prb: data.prb ?? 0,
    tierSlope: (data.tierMedians?.[3]?.median ?? 1) - (data.tierMedians?.[0]?.median ?? 1),
    lowTierMedian: data.tierMedians?.[0]?.median ?? 1,
    midTierMedian: data.tierMedians?.[1]?.median ?? 1,
    highTierMedian: data.tierMedians?.[3]?.median ?? 1,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="btn-sovereign gap-2">
          <Download className="w-4 h-4" />
          Export Packet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuItem onClick={() => exportXLSX(buildDataset())} className="gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <div>
            <p className="font-medium">VEI-MVS Annual Packet</p>
            <p className="text-xs text-muted-foreground">Excel (.xlsx)</p>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => exportCSV(buildDataset())} className="gap-2">
          <Table className="w-4 h-4 text-primary" />
          <div>
            <p className="font-medium">Data Tables</p>
            <p className="text-xs text-muted-foreground">CSV export</p>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => exportXLSX(buildDataset())} className="gap-2">
          <Gavel className="w-4 h-4 text-primary" />
          <div>
            <p className="font-medium">Equity Findings Packet</p>
            <p className="text-xs text-muted-foreground">Court-ready Excel</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
