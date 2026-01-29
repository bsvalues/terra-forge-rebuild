import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ANOVARow {
  source: string;
  df: number;
  sumSq: number;
  meanSq: number;
  fValue: number | null;
  pValue: number | null;
  etaSq: number | null;
}

const anovaData: ANOVARow[] = [
  { source: "Living_Area", df: 1, sumSq: 8.45e12, meanSq: 8.45e12, fValue: 5456.32, pValue: 0.0001, etaSq: 0.412 },
  { source: "Lot_Size", df: 1, sumSq: 2.34e12, meanSq: 2.34e12, fValue: 1512.45, pValue: 0.0001, etaSq: 0.114 },
  { source: "Year_Built", df: 1, sumSq: 1.89e12, meanSq: 1.89e12, fValue: 1221.87, pValue: 0.0001, etaSq: 0.092 },
  { source: "Bedrooms", df: 1, sumSq: 1.23e12, meanSq: 1.23e12, fValue: 795.23, pValue: 0.0001, etaSq: 0.060 },
  { source: "Bathrooms", df: 1, sumSq: 1.67e12, meanSq: 1.67e12, fValue: 1078.45, pValue: 0.0001, etaSq: 0.081 },
  { source: "Garage_Spaces", df: 1, sumSq: 0.89e12, meanSq: 0.89e12, fValue: 574.56, pValue: 0.0001, etaSq: 0.043 },
  { source: "Pool", df: 1, sumSq: 1.12e12, meanSq: 1.12e12, fValue: 723.89, pValue: 0.0001, etaSq: 0.055 },
  { source: "Distance_CBD", df: 1, sumSq: 0.67e12, meanSq: 0.67e12, fValue: 432.78, pValue: 0.0001, etaSq: 0.033 },
  { source: "School_Rating", df: 1, sumSq: 0.12e12, meanSq: 0.12e12, fValue: 77.45, pValue: 0.0234, etaSq: 0.006 },
  { source: "Residuals", df: 2837, sumSq: 4.39e12, meanSq: 1.55e9, fValue: null, pValue: null, etaSq: null },
];

const effectSizeData = anovaData
  .filter(d => d.etaSq !== null)
  .map(d => ({
    variable: d.source.replace("_", " "),
    etaSq: (d.etaSq! * 100),
  }))
  .sort((a, b) => b.etaSq - a.etaSq);

const formatNumber = (num: number): string => {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}×10¹²`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}×10⁹`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}×10⁶`;
  return num.toLocaleString();
};

export function ANOVAPanel() {
  return (
    <div className="space-y-6">
      {/* Type III ANOVA Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Type III Sum of Squares ANOVA</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Sequential SS
                </Badge>
                <Badge className="bg-tf-transcend-cyan/20 text-tf-transcend-cyan text-xs">
                  F-test
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Source</TableHead>
                    <TableHead className="text-right text-muted-foreground">df</TableHead>
                    <TableHead className="text-right text-muted-foreground">Sum Sq</TableHead>
                    <TableHead className="text-right text-muted-foreground">Mean Sq</TableHead>
                    <TableHead className="text-right text-muted-foreground">F value</TableHead>
                    <TableHead className="text-right text-muted-foreground">Pr(&gt;F)</TableHead>
                    <TableHead className="text-right text-muted-foreground">η²</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anovaData.map((row) => (
                    <TableRow 
                      key={row.source} 
                      className={`border-border/30 ${row.source === 'Residuals' ? 'bg-tf-elevated/30' : ''}`}
                    >
                      <TableCell className="font-medium">
                        {row.source.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.df.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(row.sumSq)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatNumber(row.meanSq)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${row.fValue && row.fValue > 100 ? 'text-tf-optimized-green' : ''}`}>
                        {row.fValue ? row.fValue.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${row.pValue && row.pValue < 0.001 ? 'text-tf-transcend-cyan' : row.pValue && row.pValue < 0.05 ? 'text-tf-caution-amber' : ''}`}>
                        {row.pValue ? (row.pValue < 0.0001 ? '< 0.0001' : row.pValue.toFixed(4)) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.etaSq ? `${(row.etaSq * 100).toFixed(1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Effect Size Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Effect Size (η² Partial) — Variance Explained
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={effectSizeData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  type="number"
                  domain={[0, 50]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="variable"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--tf-elevated))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "η²"]}
                />
                <Bar dataKey="etaSq" radius={[0, 4, 4, 0]}>
                  {effectSizeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.etaSq > 20
                          ? "hsl(var(--tf-transcend-cyan))"
                          : entry.etaSq > 10
                          ? "hsl(var(--tf-optimized-green))"
                          : entry.etaSq > 5
                          ? "hsl(var(--tf-caution-amber))"
                          : "hsl(var(--muted-foreground))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-tf-transcend-cyan" />
              <span className="text-xs text-muted-foreground">Large (&gt;20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-tf-optimized-green" />
              <span className="text-xs text-muted-foreground">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-tf-caution-amber" />
              <span className="text-xs text-muted-foreground">Small</span>
            </div>
          </div>
        </motion.div>

        {/* Post-Hoc Tests */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Model Assumptions Check
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-tf-elevated/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-tf-optimized-green" />
                <div>
                  <p className="text-sm font-medium">Linearity</p>
                  <p className="text-xs text-muted-foreground">Rainbow test: p = 0.234</p>
                </div>
              </div>
              <Badge className="bg-tf-optimized-green/20 text-tf-optimized-green">Pass</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-tf-elevated/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-tf-optimized-green" />
                <div>
                  <p className="text-sm font-medium">Normality</p>
                  <p className="text-xs text-muted-foreground">Shapiro-Wilk: p = 0.087</p>
                </div>
              </div>
              <Badge className="bg-tf-optimized-green/20 text-tf-optimized-green">Pass</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-tf-elevated/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-tf-caution-amber" />
                <div>
                  <p className="text-sm font-medium">Homoscedasticity</p>
                  <p className="text-xs text-muted-foreground">Breusch-Pagan: p = 0.042</p>
                </div>
              </div>
              <Badge className="bg-tf-caution-amber/20 text-tf-caution-amber">Marginal</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-tf-elevated/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-tf-optimized-green" />
                <div>
                  <p className="text-sm font-medium">Independence</p>
                  <p className="text-xs text-muted-foreground">Durbin-Watson: 1.987</p>
                </div>
              </div>
              <Badge className="bg-tf-optimized-green/20 text-tf-optimized-green">Pass</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-tf-elevated/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-tf-optimized-green" />
                <div>
                  <p className="text-sm font-medium">No Multicollinearity</p>
                  <p className="text-xs text-muted-foreground">Max VIF: 3.12 (&lt; 5)</p>
                </div>
              </div>
              <Badge className="bg-tf-optimized-green/20 text-tf-optimized-green">Pass</Badge>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
