import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Brain,
  ShieldCheck,
  Eye,
  Rocket,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  Fingerprint,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useIngestPipeline, type IngestStep, type TargetTable, type FieldMapping } from "@/hooks/useIngestPipeline";

const PIPELINE_STEPS: { id: IngestStep; label: string; icon: React.ReactNode }[] = [
  { id: "upload", label: "Upload", icon: <Upload className="w-4 h-4" /> },
  { id: "mapping", label: "Map", icon: <Brain className="w-4 h-4" /> },
  { id: "validate", label: "Validate", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "preview", label: "Preview", icon: <Eye className="w-4 h-4" /> },
  { id: "publish", label: "Publish", icon: <Rocket className="w-4 h-4" /> },
];

const STEP_ORDER: IngestStep[] = ["select", "upload", "mapping", "validate", "preview", "publish", "complete"];

export function IngestWizard() {
  const pipeline = useIngestPipeline();
  const [isDragging, setIsDragging] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(pipeline.step);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt") || file.name.endsWith(".xlsx"))) {
      pipeline.handleFileUpload(file);
    }
  }, [pipeline]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pipeline.handleFileUpload(file);
  };

  // Step: Select target table
  if (pipeline.step === "select") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <Card className="bg-gradient-to-br from-tf-cyan/10 to-tf-bright-cyan/5 border-tf-cyan/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-tf-cyan/20">
                <Fingerprint className="w-6 h-6 text-tf-cyan" />
              </div>
              <div>
                <h3 className="text-lg font-medium">The Three-Click Promise</h3>
                <p className="text-sm text-muted-foreground">
                  AI handles 40+ field mappings. You confirm only the{" "}
                  <span className="text-tf-gold font-medium">Holy Trinity</span>:{" "}
                  <span className="text-tf-cyan">Parcel ID</span>,{" "}
                  <span className="text-tf-green">Total Value</span>,{" "}
                  <span className="text-purple-400">Situs Address</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-lg font-medium">What are you importing?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { id: "parcels" as TargetTable, label: "County Roll / Parcels", desc: "Property records, values, and characteristics", icon: "🏠" },
            { id: "sales" as TargetTable, label: "Sales Stream", desc: "Arms-length transaction history for ratio studies", icon: "💰" },
            { id: "assessments" as TargetTable, label: "Assessments", desc: "Assessment values by tax year", icon: "📋" },
          ]).map((item) => (
            <Card
              key={item.id}
              className="bg-tf-elevated/50 border-tf-border hover:border-tf-cyan/50 cursor-pointer transition-all"
              onClick={() => {
                pipeline.setTargetTable(item.id);
                pipeline.setStep("upload");
              }}
            >
              <CardContent className="p-6 text-center">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h4 className="font-medium mb-1">{item.label}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Pipeline Progress Bar */}
      <div className="flex items-center justify-between">
        {PIPELINE_STEPS.map((s, i) => {
          const si = STEP_ORDER.indexOf(s.id);
          const isActive = pipeline.step === s.id;
          const isComplete = stepIndex > si;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isComplete ? "bg-tf-green/20 border-tf-green" :
                  isActive ? "bg-tf-cyan/20 border-tf-cyan animate-pulse" :
                  "bg-tf-elevated border-tf-border"
                )}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5 text-tf-green" /> :
                    <span className={isActive ? "text-tf-cyan" : "text-muted-foreground"}>{s.icon}</span>}
                </div>
                <span className={cn("text-xs mt-1", isActive ? "text-tf-cyan font-medium" : "text-muted-foreground")}>{s.label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-2", isComplete ? "bg-tf-green" : "bg-tf-border")} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Upload Step */}
        {pipeline.step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="bg-tf-elevated/50 border-tf-border">
              <CardContent className="p-8">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-12 text-center transition-all",
                    isDragging ? "border-tf-cyan bg-tf-cyan/5" : "border-tf-border hover:border-tf-cyan/50"
                  )}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Drop your {pipeline.targetTable} file here</h3>
                  <p className="text-sm text-muted-foreground mb-4">CSV or TXT files • UTF-8 encoding</p>
                  <input type="file" accept=".csv,.txt,.xlsx" onChange={handleFileInput} className="hidden" id="ingest-file" />
                  <label htmlFor="ingest-file">
                    <Button variant="outline" asChild><span><FileSpreadsheet className="w-4 h-4 mr-2" />Browse Files</span></Button>
                  </label>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={pipeline.reset}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <div />
            </div>
          </motion.div>
        )}

        {/* Mapping Step */}
        {pipeline.step === "mapping" && pipeline.parsedFile && (
          <motion.div key="mapping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card className="bg-tf-elevated/50 border-tf-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-4 h-4 text-tf-cyan" />
                    AI Field Mapping
                    <Badge className="bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30">{pipeline.parsedFile.rowCount.toLocaleString()} rows</Badge>
                  </CardTitle>
                  <Badge variant="outline">
                    {pipeline.mappings.filter(m => m.targetColumn).length} / {pipeline.schema.length} mapped
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Holy Trinity highlight */}
                <div className="mb-4 p-3 rounded-lg bg-tf-gold/10 border border-tf-gold/30">
                  <p className="text-sm text-tf-gold font-medium mb-1">🔱 Holy Trinity — Please confirm these critical fields:</p>
                  <div className="flex gap-2 flex-wrap">
                    {pipeline.holyTrinity.map(ht => {
                      const mapped = pipeline.mappings.find(m => m.targetColumn === ht);
                      return (
                        <Badge key={ht} variant="outline" className={mapped ? "bg-tf-green/10 text-tf-green border-tf-green/30" : "bg-destructive/10 text-destructive border-destructive/30"}>
                          {mapped ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                          {pipeline.schema.find(s => s.name === ht)?.label || ht}
                          {mapped && <span className="ml-1 opacity-70">← {mapped.sourceColumn}</span>}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Mapping table */}
                <div className="max-h-96 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Column</TableHead>
                        <TableHead>→</TableHead>
                        <TableHead>Target Field</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipeline.mappings.map((mapping, idx) => (
                        <TableRow key={mapping.sourceColumn} className={mapping.isHolyTrinity ? "bg-tf-gold/5" : ""}>
                          <TableCell className="font-mono text-sm">{mapping.sourceColumn}</TableCell>
                          <TableCell><ArrowRight className="w-3 h-3 text-muted-foreground" /></TableCell>
                          <TableCell>
                            <Select
                              value={mapping.targetColumn || "__skip__"}
                              onValueChange={(val) => {
                                const updated = [...pipeline.mappings];
                                updated[idx] = {
                                  ...mapping,
                                  targetColumn: val === "__skip__" ? "" : val,
                                  confidence: val === "__skip__" ? 0 : 1,
                                  isHolyTrinity: pipeline.holyTrinity.includes(val),
                                };
                                pipeline.setMappings(updated);
                              }}
                            >
                              <SelectTrigger className={cn("w-56", mapping.targetColumn && "border-tf-green/50")}>
                                <SelectValue placeholder="Skip" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__skip__"><span className="text-muted-foreground">Skip this column</span></SelectItem>
                                {pipeline.schema.map(f => {
                                  const taken = pipeline.mappings.some(m => m.targetColumn === f.name && m.sourceColumn !== mapping.sourceColumn);
                                  return (
                                    <SelectItem key={f.name} value={f.name} disabled={taken}>
                                      {f.label} {taken && "(mapped)"} {pipeline.holyTrinity.includes(f.name) && "🔱"}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {mapping.confidence > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-tf-border rounded-full overflow-hidden">
                                  <div className="h-full bg-tf-cyan rounded-full" style={{ width: `${mapping.confidence * 100}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{(mapping.confidence * 100).toFixed(0)}%</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => pipeline.setStep("upload")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button
                onClick={pipeline.validateData}
                disabled={!pipeline.holyTrinity.every(ht => pipeline.mappings.some(m => m.targetColumn === ht))}
                className="bg-tf-cyan hover:bg-tf-cyan/80"
              >
                Validate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Validate Step */}
        {pipeline.step === "validate" && pipeline.validation && (
          <motion.div key="validate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-tf-green/10 border-tf-green/30">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-tf-green">{pipeline.validation.validRows.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Valid Rows</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-destructive">{pipeline.validation.invalidRows.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Invalid Rows</p>
                </CardContent>
              </Card>
              <Card className="bg-tf-cyan/10 border-tf-cyan/30">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-tf-cyan">{((pipeline.validation.validRows / pipeline.validation.totalRows) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Field completeness */}
            <Card className="bg-tf-elevated/50 border-tf-border">
              <CardHeader><CardTitle className="text-base">Field Completeness</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(pipeline.validation.fieldCompleteness).map(([field, pct]) => (
                  <div key={field} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{pipeline.schema.find(s => s.name === field)?.label || field}</span>
                      <span className={pct >= 90 ? "text-tf-green" : pct >= 70 ? "text-tf-gold" : "text-destructive"}>{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Issues */}
            {pipeline.validation.issues.length > 0 && (
              <Card className="bg-tf-elevated/50 border-tf-border">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-tf-gold" />Validation Issues ({pipeline.validation.issues.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Issue</TableHead>
                          <TableHead>Severity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pipeline.validation.issues.slice(0, 20).map((issue, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{issue.row}</TableCell>
                            <TableCell className="text-xs">{issue.field}</TableCell>
                            <TableCell className="text-xs">{issue.message}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={issue.severity === "error" ? "text-destructive" : "text-tf-gold"}>
                                {issue.severity}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => pipeline.setStep("mapping")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button onClick={() => pipeline.setStep("preview")} className="bg-tf-cyan hover:bg-tf-cyan/80">
                Preview <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Preview Step */}
        {pipeline.step === "preview" && pipeline.parsedFile && (
          <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card className="bg-tf-elevated/50 border-tf-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-tf-cyan" />
                  Data Preview (first 20 rows as they will be imported)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        {pipeline.mappings.filter(m => m.targetColumn).map(m => (
                          <TableHead key={m.targetColumn}>
                            {pipeline.schema.find(s => s.name === m.targetColumn)?.label || m.targetColumn}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipeline.parsedFile.rows.slice(0, 20).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                          {pipeline.mappings.filter(m => m.targetColumn).map(m => (
                            <TableCell key={m.targetColumn} className="text-sm">
                              {row[m.sourceColumn] || <span className="text-muted-foreground/30">—</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-tf-gold/10 border-tf-gold/30">
              <CardContent className="p-4">
                <p className="text-sm text-tf-gold">
                  <strong>⚠ Publish is permanent.</strong> This will upsert {pipeline.parsedFile.rowCount.toLocaleString()} records into the <code>{pipeline.targetTable}</code> table. Existing records with matching parcel numbers will be updated.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => pipeline.setStep("validate")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <Button onClick={pipeline.publishData} className="bg-tf-green hover:bg-tf-green/80 text-background">
                <Rocket className="w-4 h-4 mr-2" />
                Publish {pipeline.parsedFile.rowCount.toLocaleString()} Records
              </Button>
            </div>
          </motion.div>
        )}

        {/* Publishing Step */}
        {pipeline.step === "publish" && (
          <motion.div key="publish" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="bg-tf-elevated/50 border-tf-border">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-tf-cyan animate-spin" />
                <h3 className="text-lg font-medium mb-2">Publishing to {pipeline.targetTable}...</h3>
                <p className="text-sm text-muted-foreground mb-6">Writing records to the database</p>
                <Progress value={pipeline.publishProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">{pipeline.publishProgress}%</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Complete Step */}
        {pipeline.step === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-tf-elevated/50 border-tf-border">
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-tf-green" />
                <h3 className="text-xl font-medium mb-2">Import Complete!</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Your data has been published and is now available across the TerraFusion ecosystem.
                </p>
                <Button onClick={pipeline.reset} className="bg-tf-cyan hover:bg-tf-cyan/80">
                  Import More Data
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
