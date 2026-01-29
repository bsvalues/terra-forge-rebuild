import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertTriangle } from "lucide-react";

interface CoefficientRow {
  variable: string;
  coefficient: number;
  stdError: number;
  tStatistic: number;
  pValue: number;
  vif: number;
  significant: boolean;
}

const coefficients: CoefficientRow[] = [
  { variable: "(Intercept)", coefficient: 45230.5, stdError: 8234.2, tStatistic: 5.49, pValue: 0.0001, vif: 1.0, significant: true },
  { variable: "Living_Area", coefficient: 125.45, stdError: 4.23, tStatistic: 29.66, pValue: 0.0001, vif: 1.82, significant: true },
  { variable: "Lot_Size", coefficient: 15420.3, stdError: 2145.6, tStatistic: 7.19, pValue: 0.0001, vif: 1.45, significant: true },
  { variable: "Year_Built", coefficient: 892.4, stdError: 125.3, tStatistic: 7.12, pValue: 0.0001, vif: 2.34, significant: true },
  { variable: "Bedrooms", coefficient: 8456.2, stdError: 1234.5, tStatistic: 6.85, pValue: 0.0001, vif: 3.12, significant: true },
  { variable: "Bathrooms", coefficient: 12340.8, stdError: 1567.3, tStatistic: 7.87, pValue: 0.0001, vif: 2.89, significant: true },
  { variable: "Garage_Spaces", coefficient: 6234.5, stdError: 987.2, tStatistic: 6.31, pValue: 0.0001, vif: 1.67, significant: true },
  { variable: "Pool", coefficient: 18234.6, stdError: 2345.7, tStatistic: 7.77, pValue: 0.0001, vif: 1.23, significant: true },
  { variable: "Distance_CBD", coefficient: -2345.8, stdError: 456.2, tStatistic: -5.14, pValue: 0.0001, vif: 1.56, significant: true },
  { variable: "School_Rating", coefficient: 4567.3, stdError: 2890.4, tStatistic: 1.58, pValue: 0.1145, vif: 1.34, significant: false },
];

export function MultipleRegressionPanel() {
  return (
    <div className="space-y-6">
      {/* Model Equation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-5"
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Regression Equation</h3>
        <div className="p-4 bg-tf-elevated/50 rounded-lg font-mono text-sm overflow-x-auto">
          <span className="text-tf-transcend-cyan">ŷ</span>
          <span className="text-muted-foreground"> = </span>
          <span className="text-tf-sacred-gold">45,230.50</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-tf-optimized-green">125.45</span>
          <span className="text-foreground">(LivingArea)</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-tf-optimized-green">15,420.30</span>
          <span className="text-foreground">(LotSize)</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-tf-optimized-green">892.40</span>
          <span className="text-foreground">(YearBuilt)</span>
          <span className="text-muted-foreground"> + ...</span>
        </div>
      </motion.div>

      {/* Coefficients Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Coefficient Estimates</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  n = 2,847
                </Badge>
                <Badge variant="outline" className="text-xs">
                  k = 9
                </Badge>
                <Badge className="bg-tf-optimized-green/20 text-tf-optimized-green text-xs">
                  α = 0.05
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Variable</TableHead>
                    <TableHead className="text-right text-muted-foreground">β̂</TableHead>
                    <TableHead className="text-right text-muted-foreground">Std. Error</TableHead>
                    <TableHead className="text-right text-muted-foreground">t-value</TableHead>
                    <TableHead className="text-right text-muted-foreground">p-value</TableHead>
                    <TableHead className="text-right text-muted-foreground">VIF</TableHead>
                    <TableHead className="text-center text-muted-foreground">Sig.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coefficients.map((row, index) => (
                    <TableRow 
                      key={row.variable} 
                      className={`border-border/30 ${!row.significant ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="font-medium">{row.variable}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.coefficient.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {row.stdError.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${Math.abs(row.tStatistic) > 2 ? 'text-tf-optimized-green' : 'text-muted-foreground'}`}>
                        {row.tStatistic.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${row.pValue < 0.05 ? 'text-tf-transcend-cyan' : 'text-tf-caution-amber'}`}>
                        {row.pValue < 0.0001 ? '< 0.0001' : row.pValue.toFixed(4)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${row.vif > 5 ? 'text-tf-alert-red' : row.vif > 2.5 ? 'text-tf-caution-amber' : 'text-muted-foreground'}`}>
                        {row.vif.toFixed(2)}
                        {row.vif > 5 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.significant ? (
                          <Check className="w-4 h-4 text-tf-optimized-green mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Model Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Goodness of Fit</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">R²</span>
              <span className="font-mono text-tf-transcend-cyan">0.9267</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Adjusted R²</span>
              <span className="font-mono text-tf-transcend-cyan">0.9234</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">RMSE</span>
              <span className="font-mono">$12,450</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">MAE</span>
              <span className="font-mono">$9,234</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">AIC</span>
              <span className="font-mono">45,234.6</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-lg p-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Hypothesis Tests</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">F-Statistic</span>
              <span className="font-mono text-tf-optimized-green">847.32</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">F p-value</span>
              <span className="font-mono text-tf-transcend-cyan">&lt; 2.2e-16</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">df (Regression)</span>
              <span className="font-mono">9</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">df (Residual)</span>
              <span className="font-mono">2,837</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Condition Number</span>
              <span className="font-mono">234.5</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
