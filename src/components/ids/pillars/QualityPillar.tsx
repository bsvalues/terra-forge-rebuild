import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileWarning,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { useQualityParcels, useQualityPipelineEvents, useQualityIngestJobs, useQualityMetrics } from "@/hooks/useQualityPillarData";

export function QualityPillar() {
  const { data: parcels } = useQualityParcels();
  const { data: qualityEvents } = useQualityPipelineEvents();
  const { data: ingestJobs } = useQualityIngestJobs();
  const qualityMetrics = useQualityMetrics(parcels);

  // Extract real mismatch patterns from ingest job validation results
  const mismatchPatterns = (ingestJobs || [])
    .filter(j => j.validation_results && typeof j.validation_results === "object")
    .flatMap(j => {
      const vr = j.validation_results as Record<string, unknown>;
      const issueCount = (vr.issueCount as number) || 0;
      if (issueCount === 0) return [];
      return [{
        file: j.file_name,
        issueCount,
        validRows: (vr.validRows as number) || j.rows_imported || 0,
        invalidRows: (vr.invalidRows as number) || j.rows_failed || 0,
        createdAt: j.created_at,
      }];
    });

  // Latest quality score from pipeline events
  const latestQualityEvent = qualityEvents?.[0];
  const latestScore = latestQualityEvent?.details
    ? (latestQualityEvent.details as Record<string, unknown>).validationScore as number
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Join Quality Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-tf-green/10 to-tf-green/5 border-tf-green/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Match Rate</p>
                <p className="text-3xl font-bold text-tf-green">
                  {qualityMetrics.matchRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-tf-green/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {qualityMetrics.matchedRecords.toLocaleString()} of {qualityMetrics.totalRecords.toLocaleString()} geocoded
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-tf-gold/10 to-tf-gold/5 border-tf-gold/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unmatched</p>
                <p className="text-3xl font-bold text-tf-gold">
                  {qualityMetrics.unmatchedRecords.toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-tf-gold/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Records without spatial join
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missing Values</p>
                <p className="text-3xl font-bold text-destructive">
                  {qualityMetrics.valuesMissing.toLocaleString()}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-destructive/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              $0 or null assessed values
            </p>
          </CardContent>
        </Card>

        {latestScore !== null && (
          <Card className="bg-gradient-to-br from-tf-cyan/10 to-tf-cyan/5 border-tf-cyan/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality Score</p>
                  <p className="text-3xl font-bold text-tf-cyan">
                    {latestScore}%
                  </p>
                </div>
                <Activity className="w-10 h-10 text-tf-cyan/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Last scored {latestQualityEvent?.created_at ? formatDistanceToNow(new Date(latestQualityEvent.created_at), { addSuffix: true }) : "—"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Field Completeness */}
      <Card className="bg-tf-elevated/50 border-tf-border">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tf-cyan" />
            Field Completeness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "Parcel Number", complete: qualityMetrics.totalRecords, total: qualityMetrics.totalRecords },
            { name: "Address", complete: qualityMetrics.totalRecords - qualityMetrics.addressMissing, total: qualityMetrics.totalRecords },
            { name: "Assessed Value", complete: qualityMetrics.totalRecords - qualityMetrics.valuesMissing, total: qualityMetrics.totalRecords },
            { name: "Coordinates", complete: qualityMetrics.matchedRecords, total: qualityMetrics.totalRecords },
            { name: "Year Built", complete: qualityMetrics.totalRecords - qualityMetrics.yearBuiltMissing, total: qualityMetrics.totalRecords },
            { name: "Building Area", complete: qualityMetrics.totalRecords - qualityMetrics.buildingAreaMissing, total: qualityMetrics.totalRecords },
            { name: "Neighborhood", complete: qualityMetrics.totalRecords - qualityMetrics.neighborhoodMissing, total: qualityMetrics.totalRecords },
          ].map((field) => {
            const percentage = field.total > 0 ? (field.complete / field.total) * 100 : 0;
            return (
              <div key={field.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{field.name}</span>
                  <span className={percentage >= 90 ? "text-tf-green" : percentage >= 70 ? "text-tf-gold" : "text-destructive"}>
                    {percentage.toFixed(0)}% ({field.complete.toLocaleString()})
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={`h-2 ${
                    percentage >= 90 ? "[&>div]:bg-tf-green" :
                    percentage >= 70 ? "[&>div]:bg-tf-gold" :
                    "[&>div]:bg-destructive"
                  }`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Ingest Quality Results */}
      <Card className="bg-tf-elevated/50 border-tf-border">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-tf-gold" />
            Ingest Quality History
            <Badge variant="outline" className="ml-2">From Real Jobs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ingestJobs && ingestJobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingestJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{job.file_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{job.target_table}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{(job.row_count || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-tf-green">{(job.rows_imported || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{(job.rows_failed || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        job.status === "complete" ? "bg-tf-green/10 text-tf-green border-tf-green/30" :
                        job.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-tf-gold/10 text-tf-gold border-tf-gold/30"
                      }>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-tf-green opacity-50" />
              <p className="text-sm">No ingest jobs recorded yet</p>
              <p className="text-xs mt-1">Import data via the Ingest pillar to see quality metrics</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Pipeline Events */}
      {qualityEvents && qualityEvents.length > 0 && (
        <Card className="bg-tf-elevated/50 border-tf-border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-tf-cyan" />
              Quality Scoring History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qualityEvents.map((event) => {
                const details = event.details as Record<string, unknown>;
                const score = (details?.validationScore as number) ?? 0;
                const fieldScore = (details?.fieldCoverageScore as number) ?? 0;
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-tf-surface border border-tf-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.status === "success" ? "bg-tf-green" :
                        event.status === "warning" ? "bg-tf-gold" : "bg-destructive"
                      }`} />
                      <div>
                        <p className="text-sm font-medium">
                          Validation: {score}% • Coverage: {fieldScore}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.artifact_ref || "—"} • {event.rows_affected?.toLocaleString()} rows
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
