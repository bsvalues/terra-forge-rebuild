import { usePacsQualityGateRunner, type GateRunResult } from "@/hooks/usePacsQualityGateRunner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { QualityGateResult, GateStatus } from "@/config/pacsQualityGates";
import { useQueryClient } from "@tanstack/react-query";

function statusColor(status: GateStatus): "default" | "secondary" | "destructive" {
  if (status === "pass") return "default";
  if (status === "warn") return "secondary";
  return "destructive";
}

function overallBanner(results: GateRunResult[]) {
  const hasFailure = results.some((r) => r.report?.overallStatus === "fail");
  const hasWarn = results.some((r) => r.report?.overallStatus === "warn");
  const hasError = results.some((r) => r.error);

  if (hasFailure || hasError) {
    return { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-950/30", label: "Quality Issues Detected" };
  }
  if (hasWarn) {
    return { icon: ShieldAlert, color: "text-yellow-400", bg: "bg-yellow-950/30", label: "Warnings Present" };
  }
  return { icon: ShieldCheck, color: "text-green-400", bg: "bg-green-950/30", label: "All Gates Passing" };
}

function ProductCard({ result }: { result: GateRunResult }) {
  const [open, setOpen] = useState(false);
  const status = result.report?.overallStatus ?? "fail";
  const Icon = status === "pass" ? ShieldCheck : ShieldAlert;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Icon className={`w-4 h-4 ${status === "pass" ? "text-green-400" : status === "warn" ? "text-yellow-400" : "text-red-400"}`} />
              {result.productId.replace("pacs_", "").replace(/_/g, " ")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={statusColor(status)}>{status.toUpperCase()}</Badge>
              <span className="text-xs text-muted-foreground">{result.rowCount} rows</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {result.error ? (
              <p className="text-sm text-red-400">{result.error}</p>
            ) : result.report ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gate</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.report.gates.map((g: QualityGateResult) => (
                    <TableRow key={g.gateId}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell><Badge variant="outline">{g.severity}</Badge></TableCell>
                      <TableCell><Badge variant={statusColor(g.status)}>{g.status}</Badge></TableCell>
                      <TableCell className="text-right">{g.actual.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{g.threshold.toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{g.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No gate results available</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function QualityGateDashboard() {
  const { data: results, isLoading, error } = usePacsQualityGateRunner();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-400 p-4">Failed to run quality gates: {String(error)}</div>;
  }

  const banner = overallBanner(results ?? []);
  const BannerIcon = banner.icon;

  return (
    <div className="space-y-4">
      {/* Overall Status Banner */}
      <div className={`rounded-2xl p-4 flex items-center justify-between ${banner.bg}`}>
        <div className="flex items-center gap-3">
          <BannerIcon className={`w-6 h-6 ${banner.color}`} />
          <div>
            <h2 className="text-lg font-semibold">{banner.label}</h2>
            <p className="text-sm text-muted-foreground">{results?.length ?? 0} products evaluated</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["pacs-quality-gates-run"] })}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Re-run Gates
        </Button>
      </div>

      {/* Per-product cards */}
      {results?.map((r) => (
        <ProductCard key={r.productId} result={r} />
      ))}
    </div>
  );
}
