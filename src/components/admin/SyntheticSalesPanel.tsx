// TerraFusion OS — Synthetic Sales Generator Panel
// "I made up numbers and the computer believed me." — Ralph Wiggum

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Beaker, PlayCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSyntheticSalesPreview, useSyntheticSalesCommit, type SyntheticSalesResult } from "@/hooks/useSyntheticSales";

export function SyntheticSalesPanel() {
  const [totalTarget, setTotalTarget] = useState(2000);
  const [monthsBack, setMonthsBack] = useState(24);
  const [ratioMean, setRatioMean] = useState(1.0);
  const [ratioStdDev, setRatioStdDev] = useState(0.06);
  const [seed, setSeed] = useState(42);
  const [preview, setPreview] = useState<SyntheticSalesResult | null>(null);

  const previewMut = useSyntheticSalesPreview();
  const commitMut = useSyntheticSalesCommit();

  const config = { totalTarget, monthsBack, ratioMean, ratioStdDev, seed };

  const handlePreview = useCallback(() => {
    previewMut.mutate(config, { onSuccess: (d) => setPreview(d) });
  }, [config, previewMut]);

  const handleCommit = useCallback(() => {
    commitMut.mutate(config, { onSuccess: (d) => setPreview({ ...d, dryRun: false }) });
  }, [config, commitMut]);

  const isLoading = previewMut.isPending || commitMut.isPending;

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">Non-Disclosure State: Synthetic Sales</p>
              <p className="text-muted-foreground text-xs">
                Utah does not publicly disclose sale prices. This generator creates statistically realistic
                sales from assessed market values to unblock ratio studies, AVM training, and regression
                calibration. All records are tagged <code className="text-amber-500">synthetic_warranty</code> for
                audit clarity. Replace with real CAMA sales when available.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Generator Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Sales Count</Label>
              <Input
                type="number"
                value={totalTarget}
                onChange={(e) => setTotalTarget(parseInt(e.target.value) || 500)}
                min={100}
                max={10000}
                step={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Months Back</Label>
              <Input
                type="number"
                value={monthsBack}
                onChange={(e) => setMonthsBack(parseInt(e.target.value) || 12)}
                min={6}
                max={60}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Assessment Ratio Mean: <span className="font-mono text-foreground">{ratioMean.toFixed(2)}</span>
            </Label>
            <Slider
              value={[ratioMean]}
              onValueChange={([v]) => setRatioMean(v)}
              min={0.85}
              max={1.15}
              step={0.01}
            />
            <p className="text-[10px] text-muted-foreground">
              IAAO standard: 0.90–1.10. A ratio of 1.0 means assessed = sale price.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Ratio Std Deviation: <span className="font-mono text-foreground">{ratioStdDev.toFixed(3)}</span>
            </Label>
            <Slider
              value={[ratioStdDev]}
              onValueChange={([v]) => setRatioStdDev(v)}
              min={0.02}
              max={0.15}
              step={0.005}
            />
            <p className="text-[10px] text-muted-foreground">
              Higher = more variation in sale-to-assessed ratio. 0.06 = realistic COD ~8%.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Random Seed</Label>
            <Input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
              min={1}
              max={99999}
            />
            <p className="text-[10px] text-muted-foreground">
              Same seed = reproducible results. Change for different samples.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handlePreview} disabled={isLoading} variant="outline" size="sm">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              {previewMut.isPending ? "Previewing..." : "Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview results */}
      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {preview.dryRun !== false ? "Preview" : "Generated"}
              </CardTitle>
              <Badge
                variant={preview.dryRun !== false ? "outline" : "default"}
                className={preview.dryRun === false ? "bg-emerald-600 text-white" : "text-amber-500 border-amber-500/30"}
              >
                {preview.dryRun !== false ? "Dry Run" : `${preview.inserted} Inserted`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Sales" value={preview.totalGenerated.toLocaleString()} />
              <Stat label="Neighborhoods" value={`${preview.neighborhoodsCovered} / ${preview.totalNeighborhoods}`} />
              <Stat label="Avg Price" value={`$${preview.priceRange.avg.toLocaleString()}`} />
              <Stat label="Price Range" value={`$${(preview.priceRange.min / 1000).toFixed(0)}k – $${(preview.priceRange.max / 1000).toFixed(0)}k`} />
              <Stat label="Date Range" value={`${preview.dateRange.earliest || "–"} → ${preview.dateRange.latest || "–"}`} />
              <Stat label="Ratio μ" value={preview.ratioMean.toFixed(2)} />
              <Stat label="Ratio σ" value={preview.ratioStdDev.toFixed(3)} />
              <Stat label="Batch" value={preview.batchTag} />
            </div>

            {preview.dryRun !== false && (
              <div className="pt-2">
                <Button
                  onClick={handleCommit}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {commitMut.isPending
                    ? "Generating..."
                    : `Generate ${preview.totalGenerated.toLocaleString()} Sales`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && !preview && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sampling parcels across neighborhoods...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
