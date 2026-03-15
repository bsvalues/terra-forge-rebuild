// TerraFusion OS — Reporting Dashboard
// Report templates gallery, run reports, view results & history

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChart, BarChart3, Map, TrendingUp, ShieldCheck, DollarSign, FileText,
  Play, Clock, CheckCircle2, Loader2, Trash2, ChevronRight, Scale, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useReportTemplates,
  useReportRuns,
  useRunReport,
  useDeleteReportTemplate,
  REPORT_TYPE_META,
  type ReportTemplate,
  type ReportRun,
} from "@/hooks/useReporting";

// Icon resolver
const ICON_MAP: Record<string, typeof BarChart3> = {
  BarChart3, Map, TrendingUp, ShieldCheck, DollarSign, FileText, Scale,
};

function getReportIcon(reportType: string) {
  const meta = REPORT_TYPE_META[reportType] ?? REPORT_TYPE_META.summary;
  return ICON_MAP[meta.icon] ?? FileText;
}

export function ReportingDashboard() {
  const { data: templates = [], isLoading: loadingTemplates } = useReportTemplates();
  const { data: runs = [], isLoading: loadingRuns } = useReportRuns();
  const runReport = useRunReport();
  const deleteTemplate = useDeleteReportTemplate();

  const [activeTab, setActiveTab] = useState("templates");
  const [resultDialog, setResultDialog] = useState<{ run: ReportRun; result: any } | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleRun = async (template: ReportTemplate) => {
    setRunningId(template.id);
    try {
      const res = await runReport.mutateAsync({ template });
      setResultDialog(res);
      toast.success(`Report "${template.name}" completed`, {
        description: `${res.result.rowCount} rows analyzed`,
      });
    } catch (err: any) {
      toast.error("Report failed", { description: err.message });
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template deleted");
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" />
            Advanced Reporting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run pre-built or custom report templates against live county data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {templates.length} templates
          </Badge>
          <Badge variant="outline" className="text-xs">
            {runs.length} runs
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{templates.filter((t) => t.is_system).length}</p>
            <p className="text-xs text-muted-foreground">System Reports</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{templates.filter((t) => !t.is_system).length}</p>
            <p className="text-xs text-muted-foreground">Custom Reports</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {runs.reduce((acc, r) => acc + (r.row_count ?? 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Rows Analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="templates" className="text-xs sm:text-sm">
            <FileBarChart className="w-3.5 h-3.5 mr-1" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Run History ({runs.length})
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileBarChart className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No report templates available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {templates.map((t) => {
                  const Icon = getReportIcon(t.report_type);
                  const meta = REPORT_TYPE_META[t.report_type] ?? REPORT_TYPE_META.summary;
                  const isRunning = runningId === t.id;

                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="border-border/50 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
                              <Icon className={`w-5 h-5 ${meta.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-foreground truncate">{t.name}</p>
                                {t.is_system && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                                    System
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {t.description || "No description"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-[10px]">
                                  {t.dataset}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {meta.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                            <Button
                              size="sm"
                              className="flex-1 gap-1.5"
                              onClick={() => handleRun(t)}
                              disabled={isRunning}
                            >
                              {isRunning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              {isRunning ? "Running…" : "Run Report"}
                            </Button>
                            {!t.is_system && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(t.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4 space-y-2">
          {loadingRuns ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No reports have been run yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {runs.map((r) => {
                const Icon = getReportIcon(r.report_type);
                const meta = REPORT_TYPE_META[r.report_type] ?? REPORT_TYPE_META.summary;

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setResultDialog({ run: r, result: { summary: r.result_summary, rowCount: r.row_count } })}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{r.report_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.row_count.toLocaleString()} rows · {new Date(r.executed_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-0.5 text-primary" />
                          {r.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>

      {/* Result Dialog */}
      <Dialog open={!!resultDialog} onOpenChange={() => setResultDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {resultDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileBarChart className="w-5 h-5 text-primary" />
                  {resultDialog.run.report_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Meta */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{resultDialog.result.rowCount?.toLocaleString() ?? 0} rows</span>
                  <span>·</span>
                  <span>{new Date(resultDialog.run.executed_at).toLocaleString()}</span>
                </div>

                {/* Groups Table */}
                {resultDialog.result.summary?.groups?.length > 0 ? (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/40">
                          <th className="text-left px-3 py-2 font-medium text-xs">Group</th>
                          <th className="text-right px-3 py-2 font-medium text-xs">Count</th>
                          <th className="text-right px-3 py-2 font-medium text-xs">Total</th>
                          <th className="text-right px-3 py-2 font-medium text-xs">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultDialog.result.summary.groups.map((g: any, i: number) => (
                          <tr key={i} className="border-b border-border/20 last:border-0">
                            <td className="px-3 py-2 font-medium">{g.label}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{g.count.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">${g.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              ${g.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Card className="border-border/50">
                    <CardContent className="p-4 text-center text-sm text-muted-foreground">
                      <p>Total: {resultDialog.result.summary?.totalRows ?? 0} rows</p>
                      {resultDialog.result.summary?.totalValue != null && (
                        <p className="text-lg font-bold text-foreground mt-1">
                          ${Number(resultDialog.result.summary.totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setResultDialog(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
