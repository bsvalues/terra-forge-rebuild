import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, TrendingUp, TrendingDown, AlertTriangle, Check } from "lucide-react";
import { NeighborhoodEffect } from "@/hooks/useRegressionAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface NeighborhoodEffectsPanelProps {
  effects: NeighborhoodEffect[] | undefined;
  isLoading: boolean;
}

export function NeighborhoodEffectsPanel({ effects, isLoading }: NeighborhoodEffectsPanelProps) {
  if (isLoading) {
    return <NeighborhoodSkeleton />;
  }

  if (!effects || effects.length === 0) {
    return (
      <div className="material-bento rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">
          No neighborhood effects available. Run regression analysis to see geographic equity assessment.
        </p>
      </div>
    );
  }

  // Prepare chart data (exclude reference neighborhood for cleaner viz)
  const chartData = effects
    .filter(e => e.coefficient !== 0)
    .map(e => ({
      neighborhood: e.code.length > 10 ? e.code.slice(0, 10) + "..." : e.code,
      fullName: e.code,
      coefficient: e.coefficient * 100, // Convert to percentage
      significant: e.significant,
      count: e.count,
    }))
    .sort((a, b) => b.coefficient - a.coefficient);

  const significantCount = effects.filter(e => e.significant && e.coefficient !== 0).length;
  const referenceNbhd = effects.find(e => e.coefficient === 0);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="material-bento rounded-lg p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-tf-transcend-cyan/10">
              <MapPin className="w-5 h-5 text-tf-transcend-cyan" />
            </div>
            <div>
              <h3 className="text-base font-medium">Geographic Equity Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Neighborhood effects on assessment ratios (controlling for property characteristics)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {effects.length} Neighborhoods
            </Badge>
            {significantCount > 0 && (
              <Badge className="bg-tf-caution-amber/20 text-tf-caution-amber text-xs">
                {significantCount} Significant
              </Badge>
            )}
          </div>
        </div>

        {referenceNbhd && (
          <div className="p-3 bg-tf-elevated/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Reference neighborhood: </span>
            <span className="font-medium text-tf-transcend-cyan">{referenceNbhd.code}</span>
            <span className="text-muted-foreground"> ({referenceNbhd.count} observations) — all other neighborhoods compared against this baseline</span>
          </div>
        )}
      </motion.div>

      {/* Coefficient Chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="material-bento rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Neighborhood Deviation from Baseline (%)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <YAxis
                  type="category"
                  dataKey="neighborhood"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={75}
                />
                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--tf-elevated))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
                    `Effect (n=${props.payload.count})`
                  ]}
                  labelFormatter={(label) => chartData.find(d => d.neighborhood === label)?.fullName || label}
                />
                <Bar dataKey="coefficient" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        !entry.significant
                          ? "hsl(var(--muted-foreground) / 0.5)"
                          : entry.coefficient > 5
                          ? "hsl(var(--tf-alert-red))"
                          : entry.coefficient > 0
                          ? "hsl(var(--tf-caution-amber))"
                          : entry.coefficient < -5
                          ? "hsl(var(--tf-optimized-green))"
                          : "hsl(var(--tf-transcend-cyan))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-tf-alert-red" />
              <span className="text-xs text-muted-foreground">Over-assessed (&gt;5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-tf-optimized-green" />
              <span className="text-xs text-muted-foreground">Under-assessed (&lt;-5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">Not significant</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detailed Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="material-bento">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Neighborhood Coefficient Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Neighborhood</TableHead>
                    <TableHead className="text-right text-muted-foreground">n</TableHead>
                    <TableHead className="text-right text-muted-foreground">β̂</TableHead>
                    <TableHead className="text-right text-muted-foreground">Std. Error</TableHead>
                    <TableHead className="text-right text-muted-foreground">t-value</TableHead>
                    <TableHead className="text-right text-muted-foreground">p-value</TableHead>
                    <TableHead className="text-muted-foreground">Interpretation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {effects.map((effect) => (
                    <TableRow 
                      key={effect.code} 
                      className={`border-border/30 ${!effect.significant ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {effect.coefficient === 0 ? (
                            <Badge variant="outline" className="text-[10px]">REF</Badge>
                          ) : effect.coefficient > 0 ? (
                            <TrendingUp className="w-3 h-3 text-tf-caution-amber" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-tf-transcend-cyan" />
                          )}
                          {effect.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {effect.count}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${
                        effect.coefficient > 0.05 ? 'text-tf-alert-red' : 
                        effect.coefficient < -0.05 ? 'text-tf-optimized-green' : ''
                      }`}>
                        {effect.coefficient === 0 ? '—' : (effect.coefficient > 0 ? '+' : '') + (effect.coefficient * 100).toFixed(2) + '%'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {effect.stdError === 0 ? '—' : effect.stdError.toFixed(4)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${Math.abs(effect.tStatistic) > 2 ? 'text-tf-optimized-green' : 'text-muted-foreground'}`}>
                        {effect.tStatistic === 0 ? '—' : effect.tStatistic.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${effect.pValue < 0.05 ? 'text-tf-transcend-cyan' : 'text-muted-foreground'}`}>
                        {effect.pValue === 1 ? '—' : effect.pValue < 0.0001 ? '< 0.0001' : effect.pValue.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">
                        {effect.interpretation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Equity Implications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="material-bento rounded-lg p-5"
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Geographic Equity Implications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EquityImplication
            type="over"
            neighborhoods={effects.filter(e => e.significant && e.coefficient > 0.03)}
          />
          <EquityImplication
            type="under"
            neighborhoods={effects.filter(e => e.significant && e.coefficient < -0.03)}
          />
        </div>
      </motion.div>
    </div>
  );
}

function EquityImplication({ 
  type, 
  neighborhoods 
}: { 
  type: 'over' | 'under'; 
  neighborhoods: NeighborhoodEffect[] 
}) {
  const isOver = type === 'over';
  
  return (
    <div className={`p-4 rounded-lg ${
      isOver ? 'bg-tf-alert-red/10 border border-tf-alert-red/30' : 'bg-tf-optimized-green/10 border border-tf-optimized-green/30'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {isOver ? (
          <AlertTriangle className="w-4 h-4 text-tf-alert-red" />
        ) : (
          <Check className="w-4 h-4 text-tf-optimized-green" />
        )}
        <span className={`text-sm font-medium ${isOver ? 'text-tf-alert-red' : 'text-tf-optimized-green'}`}>
          {isOver ? 'Potential Regressivity' : 'Potential Progressivity'}
        </span>
      </div>
      {neighborhoods.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            {neighborhoods.length} neighborhood{neighborhoods.length > 1 ? 's' : ''} {isOver ? 'over' : 'under'}-assessed relative to baseline:
          </p>
          <div className="flex flex-wrap gap-1">
            {neighborhoods.slice(0, 5).map(n => (
              <Badge key={n.code} variant="outline" className="text-[10px]">
                {n.code} ({(n.coefficient * 100).toFixed(1)}%)
              </Badge>
            ))}
            {neighborhoods.length > 5 && (
              <Badge variant="outline" className="text-[10px]">
                +{neighborhoods.length - 5} more
              </Badge>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          No significant {isOver ? 'over' : 'under'}-assessment patterns detected
        </p>
      )}
    </div>
  );
}

function NeighborhoodSkeleton() {
  return (
    <div className="space-y-6">
      <div className="material-bento rounded-lg p-5">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="material-bento rounded-lg p-5">
        <Skeleton className="h-72 w-full" />
      </div>
      <Card className="material-bento">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
