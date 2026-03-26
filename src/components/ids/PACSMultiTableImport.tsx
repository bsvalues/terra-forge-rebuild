import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Database,
  Merge,
  Rocket,
  AlertTriangle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { upsertParcels, upsertPermits, upsertAssessments, upsertExemptions, resolveParcelIds, backfillAssessments } from "@/services/ingestService";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  type PACSParsedTable,
  type PACSJoinResult,
  type PACSTableType,
  parsePACSFile,
  joinPACSTables,
} from "@/lib/pacsETL";

type Step = "upload" | "review" | "publishing" | "complete";

const TABLE_LABELS: Record<PACSTableType, { label: string; icon: string; required: boolean }> = {
  situs: { label: "Situs (Addresses)", icon: "📍", required: true },
  imprv: { label: "Improvements", icon: "🏠", required: false },
  imprv_items: { label: "Improvement Items", icon: "🛏️", required: false },
  imprv_details: { label: "Improvement Details", icon: "📐", required: false },
  land_detail: { label: "Land Detail", icon: "🌿", required: false },
  owner: { label: "Owner Links", icon: "👤", required: false },
  account: { label: "Accounts (Names)", icon: "📋", required: false },
  permits: { label: "Permits", icon: "📄", required: false },
  address: { label: "Mailing Addresses", icon: "✉️", required: false },
  roll_value_history: { label: "Roll Value History", icon: "📊", required: false },
  exempt: { label: "Exemptions", icon: "🛡️", required: false },
  linked_owners: { label: "Linked Owners", icon: "👥", required: false },
  sketches: { label: "Sketches", icon: "✏️", required: false },
  images: { label: "Property Images", icon: "📸", required: false },
  prop_val: { label: "Property Valuation", icon: "💰", required: false },
  unknown: { label: "Unknown", icon: "❓", required: false },
};

interface PACSMultiTableImportProps {
  onBack: () => void;
}

export function PACSMultiTableImport({ onBack }: PACSMultiTableImportProps) {
  const { profile } = useAuthContext();
  const [step, setStep] = useState<Step>("upload");
  const [tables, setTables] = useState<PACSParsedTable[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [joinResult, setJoinResult] = useState<PACSJoinResult | null>(null);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishPhase, setPublishPhase] = useState("");
  const [publishStats, setPublishStats] = useState<{ imported: number; failed: number } | null>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    setParsing(true);
    const newTables: PACSParsedTable[] = [...tables];
    
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) continue;
      try {
        const parsed = await parsePACSFile(file);
        const existingIdx = newTables.findIndex(t => t.type === parsed.type);
        if (existingIdx >= 0) {
          newTables[existingIdx] = parsed;
        } else {
          newTables.push(parsed);
        }
        toast.success(`${parsed.fileName} → Detected as ${TABLE_LABELS[parsed.type].label} (${parsed.rowCount.toLocaleString()} rows)`);
      } catch (err: any) {
        toast.error(`Failed to parse ${file.name}: ${err.message}`);
      }
    }
    
    setTables(newTables);
    setParsing(false);
  }, [tables]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  };

  const removeTable = (type: PACSTableType) => {
    setTables(tables.filter(t => t.type !== type));
  };

  const runJoin = useCallback(() => {
    const result = joinPACSTables(tables);
    setJoinResult(result);
    setStep("review");
    toast.success(`Joined ${result.stats.joinedParcels.toLocaleString()} parcels from ${tables.length} tables`);
  }, [tables]);

  const publish = useCallback(async () => {
    if (!joinResult || !profile?.county_id) return;
    
    setStep("publishing");
    setPublishProgress(0);
    let imported = 0;
    let failed = 0;

    // Determine progress allocation based on what data exists
    const hasPermits = joinResult.permits.length > 0;
    const hasAssessments = joinResult.assessments.length > 0;
    const hasExemptions = joinResult.exemptions.length > 0;
    const phases = 1 + (hasPermits ? 1 : 0) + (hasAssessments ? 1 : 0) + (hasExemptions ? 1 : 0) + 1;
    const phaseSize = Math.floor(95 / phases);
    let progressBase = 0;

    // Phase 1: Upsert parcels
    const parcelRecords = joinResult.parcels.map(p => ({
      ...p,
      county_id: profile.county_id,
    }));

    setPublishPhase(`Phase 1/${phases}: Publishing ${parcelRecords.length.toLocaleString()} parcels...`);
    const parcelResult = await upsertParcels(parcelRecords, 500, (pct) => {
      setPublishProgress(progressBase + Math.round(pct * phaseSize / 100));
    });
    imported += parcelResult.imported;
    failed += parcelResult.failed;
    progressBase += phaseSize;

    // Build parcel ID lookup for downstream phases
    setPublishPhase("Resolving parcel IDs...");
    const parcelLookup = await resolveParcelIds(profile.county_id);

    // Phase 2: Permits
    if (hasPermits) {
      setPublishPhase(`Phase 2/${phases}: Publishing ${joinResult.permits.length.toLocaleString()} permits...`);
      
      const permitRecords = joinResult.permits
        .map(p => {
          const parcelId = parcelLookup[p.parcel_number];
          if (!parcelId) return null;
          return {
            parcel_id: parcelId,
            permit_number: p.permit_number,
            permit_type: p.permit_type,
            status: p.status,
            description: p.description,
            application_date: p.application_date,
            estimated_value: p.estimated_value,
          };
        })
        .filter(Boolean) as Record<string, unknown>[];

      const permitResult = await upsertPermits(permitRecords, 500, (pct) => {
        setPublishProgress(progressBase + Math.round(pct * phaseSize / 100));
      });
      imported += permitResult.imported;
      failed += permitResult.failed;
      progressBase += phaseSize;
    }

    // Phase 3: Assessments
    if (hasAssessments) {
      setPublishPhase(`Publishing ${joinResult.assessments.length.toLocaleString()} assessment records...`);
      
      const assessmentRecords = joinResult.assessments
        .map(a => {
          const parcelId = parcelLookup[a.parcel_number];
          if (!parcelId) return null;
          return {
            parcel_id: parcelId,
            county_id: profile.county_id,
            tax_year: a.tax_year,
            improvement_value: a.improvement_value,
            land_value: a.land_value,
            total_value: a.total_value,
          };
        })
        .filter(Boolean) as Record<string, unknown>[];

      const assessResult = await upsertAssessments(assessmentRecords, 500, (pct) => {
        setPublishProgress(progressBase + Math.round(pct * phaseSize / 100));
      });
      imported += assessResult.imported;
      failed += assessResult.failed;
      progressBase += phaseSize;
    }

    // Phase 4: Exemptions
    if (hasExemptions) {
      setPublishPhase(`Publishing ${joinResult.exemptions.length.toLocaleString()} exemption records...`);
      
      const exemptionRecords = joinResult.exemptions
        .map(e => {
          const parcelId = parcelLookup[e.parcel_number];
          if (!parcelId) return null;
          return {
            parcel_id: parcelId,
            exemption_type: e.exemption_type,
            status: "active",
            tax_year: 2026,
            exemption_percentage: e.exemption_percentage,
          };
        })
        .filter(Boolean) as Record<string, unknown>[];

      const exResult = await upsertExemptions(exemptionRecords, 500, (pct) => {
        setPublishProgress(progressBase + Math.round(pct * phaseSize / 100));
      });
      imported += exResult.imported;
      failed += exResult.failed;
      progressBase += phaseSize;
    }

    // Final Phase: Backfill assessments
    setPublishPhase("Backfilling assessments for TY 2026...");
    await backfillAssessments(profile.county_id, 2026);

    setPublishProgress(100);
    setPublishPhase("Complete!");
    setPublishStats({ imported, failed });
    setStep("complete");
    toast.success(`PACS import complete! ${imported.toLocaleString()} records published.${failed > 0 ? ` ${failed} failed.` : ""}`);
  }, [joinResult, profile]);

  const hasSitus = tables.some(t => t.type === "situs");

  // ---- UPLOAD STEP ----
  if (step === "upload") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <Card className="bg-gradient-to-br from-amber-500/10 to-tf-cyan/10 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🏛️</span>
              <div>
                <h3 className="text-lg font-medium">PACS Multi-Table Import</h3>
                <p className="text-sm text-muted-foreground">
                  Drop all your True Automation CSV exports at once. The system auto-detects each table type, 
                  joins them on <span className="text-tf-cyan font-mono">prop_id</span>, and builds the unified parcel spine.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-tf-elevated/50 border-tf-border">
          <CardContent className="p-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all",
                isDragging ? "border-amber-500 bg-amber-500/5" : "border-tf-border hover:border-amber-500/50"
              )}
            >
              {parsing ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-amber-400 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <h3 className="text-lg font-medium mb-2">
                Drop all PACS CSV files here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                situs, imprv, imprv_items, imprv_details, land_detail, owner, account, permits, roll_value_history, exempt, prop_val, linked_owners, sketches, images
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                multiple
                onChange={handleFileInput}
                className="hidden"
                id="pacs-multi-file"
              />
              <label htmlFor="pacs-multi-file">
                <Button variant="outline" asChild>
                  <span><FileSpreadsheet className="w-4 h-4 mr-2" />Browse Files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {tables.length > 0 && (
          <Card className="bg-tf-elevated/50 border-tf-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-tf-cyan" />
                Detected Tables ({tables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables.map(t => {
                  const meta = TABLE_LABELS[t.type];
                  return (
                    <div key={t.type} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-tf-border">
                      <span className="text-xl">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.fileName} • {t.rowCount.toLocaleString()} rows
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-tf-green flex-shrink-0" />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeTable(t.type)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {!hasSitus && (
                <div className="flex items-center gap-2 mt-3 p-2 rounded bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-destructive">Situs table required — it provides the base address records</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <Button
            disabled={!hasSitus || parsing}
            className="bg-amber-500 hover:bg-amber-600 text-black"
            onClick={runJoin}
          >
            <Merge className="w-4 h-4 mr-2" />
            Join & Preview ({tables.length} tables)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // ---- REVIEW STEP ----
  if (step === "review" && joinResult) {
    const s = joinResult.stats;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <Card className="bg-gradient-to-br from-tf-green/10 to-tf-cyan/5 border-tf-green/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-tf-green" />
              Join Complete — {s.joinedParcels.toLocaleString()} Parcels Ready
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Merged from {tables.length} source tables via <span className="font-mono text-tf-cyan">prop_id</span> join key
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Parcels", value: s.joinedParcels, icon: "🏠" },
            { label: "Improvements", value: s.imprvCount > 0 ? s.imprvCount : "—", icon: "🔨" },
            { label: "Land Records", value: s.landCount > 0 ? s.landCount : "—", icon: "🌿" },
            { label: "Permits", value: s.joinedPermits > 0 ? s.joinedPermits : "—", icon: "📄" },
            { label: "Assessments", value: s.joinedAssessments > 0 ? s.joinedAssessments : "—", icon: "📊" },
            { label: "Exemptions", value: s.joinedExemptions > 0 ? s.joinedExemptions : "—", icon: "🛡️" },
          ].map(stat => (
            <Card key={stat.label} className="bg-tf-elevated/50 border-tf-border">
              <CardContent className="p-3 text-center">
                <span className="text-xl">{stat.icon}</span>
                <p className="text-base font-semibold mt-1">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Metadata tables (reference only) */}
        {(s.sketchCount > 0 || s.imageCount > 0 || s.linkedOwnerCount > 0) && (
          <Card className="bg-tf-elevated/50 border-tf-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2">📎 Reference data (cataloged, not published)</p>
              <div className="flex gap-4 text-xs">
                {s.sketchCount > 0 && <span>✏️ {s.sketchCount.toLocaleString()} sketches</span>}
                {s.imageCount > 0 && <span>📸 {s.imageCount.toLocaleString()} images</span>}
                {s.linkedOwnerCount > 0 && <span>👥 {s.linkedOwnerCount.toLocaleString()} linked owners</span>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-tf-elevated/50 border-tf-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sample Parcels (first 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-tf-border">
                    <th className="text-left p-2 text-muted-foreground">Parcel #</th>
                    <th className="text-left p-2 text-muted-foreground">Address</th>
                    <th className="text-left p-2 text-muted-foreground">City</th>
                    <th className="text-right p-2 text-muted-foreground">Value</th>
                    <th className="text-right p-2 text-muted-foreground">Sqft</th>
                    <th className="text-right p-2 text-muted-foreground">Year</th>
                    <th className="text-right p-2 text-muted-foreground">Bed/Bath</th>
                  </tr>
                </thead>
                <tbody>
                  {joinResult.parcels.slice(0, 5).map(p => (
                    <tr key={p.parcel_number} className="border-b border-tf-border/50">
                      <td className="p-2 font-mono">{p.parcel_number}</td>
                      <td className="p-2 truncate max-w-[200px]">{p.address}</td>
                      <td className="p-2">{p.city || "—"}</td>
                      <td className="p-2 text-right">{p.assessed_value ? `$${p.assessed_value.toLocaleString()}` : "—"}</td>
                      <td className="p-2 text-right">{p.building_area?.toLocaleString() || "—"}</td>
                      <td className="p-2 text-right">{p.year_built || "—"}</td>
                      <td className="p-2 text-right">{p.bedrooms || "—"}/{p.bathrooms || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep("upload")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Upload
          </Button>
          <Button className="bg-tf-green hover:bg-tf-green/80 text-black" onClick={publish}>
            <Rocket className="w-4 h-4 mr-2" />
            Publish {s.joinedParcels.toLocaleString()} Parcels
            {s.joinedAssessments > 0 && ` + ${s.joinedAssessments.toLocaleString()} Assessments`}
            {s.joinedPermits > 0 && ` + ${s.joinedPermits.toLocaleString()} Permits`}
            {s.joinedExemptions > 0 && ` + ${s.joinedExemptions.toLocaleString()} Exemptions`}
          </Button>
        </div>
      </motion.div>
    );
  }

  // ---- PUBLISHING STEP ----
  if (step === "publishing") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Card className="bg-tf-elevated/50 border-tf-border">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-amber-400 animate-spin" />
            <h3 className="text-xl font-medium mb-2">Publishing PACS Data...</h3>
            <p className="text-sm text-muted-foreground mb-6">{publishPhase}</p>
            <Progress value={publishProgress} className="max-w-md mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">{publishProgress}%</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ---- COMPLETE STEP ----
  if (step === "complete") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
        <Card className="bg-gradient-to-br from-tf-green/10 to-tf-cyan/5 border-tf-green/30">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-tf-green" />
            <h3 className="text-2xl font-medium mb-2">PACS Import Complete!</h3>
            <p className="text-lg text-muted-foreground">
              {publishStats?.imported.toLocaleString() || 0} records published
              {publishStats?.failed ? ` • ${publishStats.failed} failed` : ""}
            </p>
            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={() => { setStep("upload"); setTables([]); setJoinResult(null); setPublishStats(null); }}>
                Import More
              </Button>
              <Button className="bg-tf-cyan hover:bg-tf-cyan/80" onClick={onBack}>
                Back to IDS
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return null;
}
