// TerraFusion OS — Redfin Sales CSV Ingest Panel
// "I downloaded the houses. They live in my computer now." — Ralph Wiggum

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { useRedfinPreview, useRedfinCommit, type RedfIngestResult } from "@/hooks/useRedfinSalesIngest";

export function RedfinSalesIngest() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<RedfIngestResult | null>(null);

  const previewMutation = useRedfinPreview();
  const commitMutation = useRedfinCommit();

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      previewMutation.mutate(text, {
        onSuccess: (data) => setPreview(data),
      });
    };
    reader.readAsText(file);
  }, [previewMutation]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleCommit = useCallback(() => {
    if (!csvText) return;
    commitMutation.mutate(csvText, {
      onSuccess: (data) => {
        setPreview({ ...data, dryRun: false });
      },
    });
  }, [csvText, commitMutation]);

  const handleReset = useCallback(() => {
    setCsvText(null);
    setFileName("");
    setPreview(null);
  }, []);

  const isLoading = previewMutation.isPending || commitMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">How to get Redfin sales data:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 text-xs">
                <li>
                  Visit{" "}
                  <a
                    href="https://www.redfin.com/county/2911/UT/Salt-Lake-County/recently-sold"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:underline"
                  >
                    Redfin → Salt Lake County → Recently Sold
                  </a>
                </li>
                <li>Filter by date range and property type</li>
                <li>Click <strong>"Download All"</strong> (≤350 per download — segment by ZIP for more)</li>
                <li>Drop the CSV here</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone */}
      {!csvText && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-emerald-500/50 transition-colors cursor-pointer"
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">
            Drop a Redfin CSV here, or click to browse
          </p>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleInputChange}
            className="hidden"
            id="redfin-csv-input"
          />
          <label htmlFor="redfin-csv-input">
            <Button variant="outline" size="sm" asChild>
              <span>
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                Browse Files
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Preview results */}
      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {fileName}
              </CardTitle>
              <div className="flex items-center gap-2">
                {preview.dryRun !== false && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                    Preview
                  </Badge>
                )}
                {preview.dryRun === false && (
                  <Badge className="bg-emerald-600 text-white">Imported</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Rows" value={preview.totalRows} />
              <StatCard
                label="Matched"
                value={preview.matched}
                accent={preview.matchRate >= 50 ? "emerald" : "amber"}
              />
              <StatCard label="Match Rate" value={`${preview.matchRate}%`} accent={preview.matchRate >= 50 ? "emerald" : "amber"} />
              <StatCard label="Unmatched" value={preview.unmatched} accent={preview.unmatched > 0 ? "red" : undefined} />
              {preview.inserted !== undefined && (
                <>
                  <StatCard label="Inserted" value={preview.inserted} accent="emerald" />
                  <StatCard label="Duplicates Skipped" value={preview.duplicates || 0} />
                </>
              )}
              <StatCard label="Skipped" value={preview.skipped} />
              <StatCard label="Parcels Indexed" value={preview.parcelsIndexed.toLocaleString()} />
            </div>

            {/* Sample unmatched */}
            {preview.sampleUnmatched && preview.sampleUnmatched.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  Sample Unmatched ({preview.unmatched} total)
                </p>
                <ScrollArea className="h-32 border rounded-md">
                  <div className="p-2 space-y-1">
                    {preview.sampleUnmatched.map((u, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate flex-1">{u.address}</span>
                        <span className="ml-2 text-muted-foreground/60">{u.zip}</span>
                        <span className="ml-2 font-mono">{u.price}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Sample skipped */}
            {preview.sampleSkipped && preview.sampleSkipped.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Sample Skipped
                </p>
                <div className="space-y-0.5">
                  {preview.sampleSkipped.map((s, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      {s.address} — <span className="text-amber-400">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {preview.dryRun !== false && preview.matched > 0 && (
                <Button
                  onClick={handleCommit}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {commitMutation.isPending
                    ? "Importing..."
                    : `Import ${preview.matched} Sales`}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
                {preview.dryRun === false ? "Upload Another" : "Cancel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && !preview && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {previewMutation.isPending
                ? "Parsing CSV & matching addresses to parcels..."
                : "Inserting sales records..."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "emerald" | "amber" | "red";
}) {
  const colorMap = {
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-red-400",
  };

  return (
    <div className="rounded-md border border-border/50 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
        {label}
      </p>
      <p className={`text-lg font-semibold ${accent ? colorMap[accent] : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
