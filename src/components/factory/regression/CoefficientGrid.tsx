import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CoefficientResult } from "@/hooks/useCalibration";

interface CoefficientGridProps {
  coefficients: CoefficientResult[];
}

function significanceBadge(pValue: number) {
  if (pValue < 0.001) return <Badge className="bg-[hsl(var(--tf-optimized-green)/0.15)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)] text-[10px]">***</Badge>;
  if (pValue < 0.01) return <Badge className="bg-[hsl(var(--tf-optimized-green)/0.1)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.2)] text-[10px]">**</Badge>;
  if (pValue < 0.05) return <Badge className="bg-[hsl(var(--tf-sacred-gold)/0.1)] text-tf-gold border-[hsl(var(--tf-sacred-gold)/0.2)] text-[10px]">*</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">ns</Badge>;
}

export function CoefficientGrid({ coefficients }: CoefficientGridProps) {
  return (
    <div className="material-bento overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Coefficients</h3>
        <p className="text-xs text-muted-foreground">OLS regression parameter estimates</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Variable</TableHead>
            <TableHead className="text-xs text-right">β</TableHead>
            <TableHead className="text-xs text-right">Std Error</TableHead>
            <TableHead className="text-xs text-right">t-stat</TableHead>
            <TableHead className="text-xs text-right">p-value</TableHead>
            <TableHead className="text-xs text-center">Sig</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coefficients.map((c) => (
            <TableRow key={c.variable}>
              <TableCell className="text-sm font-mono">{c.variable}</TableCell>
              <TableCell className="text-sm text-right font-mono">
                {c.coefficient.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-sm text-right font-mono text-muted-foreground">
                {c.std_error.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-sm text-right font-mono">
                {c.t_stat.toFixed(3)}
              </TableCell>
              <TableCell className="text-sm text-right font-mono text-muted-foreground">
                {c.p_value < 0.001 ? "<0.001" : c.p_value.toFixed(4)}
              </TableCell>
              <TableCell className="text-center">
                {significanceBadge(c.p_value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
