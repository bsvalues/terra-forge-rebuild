// TerraFusion OS — Phase 97: Owner Portal — Full Enhancement
// Zero supabase.from() calls — all DB ops in useOwnerPortal hook.
// Realtime appeal status, evidence upload, mobile-first, print summary.

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, FileText, Send, CheckCircle2, AlertTriangle,
  Building2, ArrowRight, Shield, Home, Paperclip, X,
  Loader2, Calendar, Download, Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useOwnerPortalLookup,
  useSubmitAppeal,
  useAppealStatus,
  useEvidenceUpload,
  type OwnerParcelResult,
} from "@/hooks/useOwnerPortal";

type PortalStep = "search" | "review" | "appeal" | "submitted";

export default function OwnerPortal() {
  const [step, setStep] = useState<PortalStep>("search");
  const [searchType, setSearchType] = useState<"parcel_number" | "address">("parcel_number");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParcel, setSelectedParcel] = useState<OwnerParcelResult | null>(null);
  const [caseNumber, setCaseNumber] = useState("");
  const [appealId, setAppealId] = useState<string | null>(null);

  // Appeal form state
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading, searched, search, clear } = useOwnerPortalLookup();
  const { submit, isSubmitting } = useSubmitAppeal();
  const appealStatus = useAppealStatus(appealId);
  const evidence = useEvidenceUpload(selectedParcel?.parcelNumber ?? null);

  const handleSearch = () => search(searchType, searchQuery);

  const handleSelectParcel = (parcel: OwnerParcelResult) => {
    setSelectedParcel(parcel);
    setStep("review");
  };

  const latestAssessment = selectedParcel?.assessments?.[0];

  const handleSubmitAppeal = async () => {
    if (!ownerName.trim() || !ownerEmail.trim() || !reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!selectedParcel || !latestAssessment) return;

    const result = await submit({
      parcelNumber: selectedParcel.parcelNumber,
      ownerName,
      ownerEmail,
      requestedValue,
      reason,
      taxYear: latestAssessment.tax_year,
      landValue: latestAssessment.land_value,
      improvementValue: latestAssessment.improvement_value,
    });

    if (result) {
      setCaseNumber(result.caseNumber);
      setAppealId(result.id);
      setStep("submitted");
    }
  };

  const handlePrintSummary = () => window.print();

  const resetPortal = () => {
    setStep("search");
    setSelectedParcel(null);
    setSearchQuery("");
    setAppealId(null);
    evidence.reset();
    clear();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Print-only styles */}
      <style>{`
        @media print {
          header, footer, button, .no-print { display: none !important; }
          .print-only { display: block !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Property Owner Portal</h1>
            <p className="text-xs text-muted-foreground">County Assessor's Office</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            Secure
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Step Indicator */}
        <div className="flex items-center gap-1 sm:gap-2 mb-6 sm:mb-8">
          {(["search", "review", "appeal", "submitted"] as PortalStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && <div className="w-4 sm:w-8 h-px bg-border" />}
              <div className={`w-7 h-7 min-w-[1.75rem] rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : (["search", "review", "appeal", "submitted"].indexOf(step) > i)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Search */}
          {step === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Look Up Your Property
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your parcel number or property address to view your current assessment.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[44px]"
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value as any)}
                    >
                      <option value="parcel_number">Parcel #</option>
                      <option value="address">Address</option>
                    </select>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchType === "parcel_number" ? "e.g. 16-05-230-001" : "e.g. 1234 Main St"}
                      className="flex-1 min-h-[44px]"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isLoading} className="gap-1.5 min-h-[44px]">
                      {isLoading ? "Searching…" : "Search"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Results list */}
                  {searched && results.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-muted-foreground">{results.length} result(s)</Label>
                      {results.map((r) => {
                        const latest = r.assessments?.[0];
                        return (
                          <button
                            key={r.parcelNumber}
                            onClick={() => handleSelectParcel(r)}
                            className="w-full text-left p-3 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          >
                            <p className="text-sm font-medium font-mono text-foreground">{r.parcelNumber}</p>
                            <p className="text-xs text-muted-foreground">{r.address || "No address"}, {r.city}</p>
                            {latest && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Assessed: ${(latest.land_value + latest.improvement_value).toLocaleString()} ({latest.tax_year})
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {searched && results.length === 0 && !isLoading && (
                    <p className="text-sm text-muted-foreground text-center py-4">No properties found.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Review */}
          {step === "review" && selectedParcel && (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Your Property Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Parcel Number</Label>
                      <p className="text-sm font-medium font-mono">{selectedParcel.parcelNumber}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <p className="text-sm font-medium">{selectedParcel.address}, {selectedParcel.city}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Property Class</Label>
                      <p className="text-sm font-medium">{selectedParcel.propertyClass || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tax Year</Label>
                      <p className="text-sm font-medium">{latestAssessment?.tax_year ?? "—"}</p>
                    </div>
                  </div>

                  <Separator />

                  {latestAssessment && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="bg-muted/20 border-border/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Value</p>
                          <p className="text-lg font-bold text-foreground">
                            ${(latestAssessment.land_value + latestAssessment.improvement_value).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20 border-border/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Land</p>
                          <p className="text-lg font-bold text-muted-foreground">${latestAssessment.land_value.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20 border-border/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Improvements</p>
                          <p className="text-lg font-bold text-muted-foreground">${latestAssessment.improvement_value.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Prior appeals with hearing date */}
                  {selectedParcel.appeals.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Prior Appeals</Label>
                      {selectedParcel.appeals.map((a, i) => (
                        <div key={i} className="text-xs flex items-center gap-2 text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{a.status}</Badge>
                          {a.tax_year} · Original ${a.original_value.toLocaleString()}
                          {a.final_value != null && ` → Final $${a.final_value.toLocaleString()}`}
                          {a.hearing_date && (
                            <span className="flex items-center gap-1 text-primary">
                              <Calendar className="w-3 h-3" />
                              Hearing: {a.hearing_date}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button variant="outline" onClick={resetPortal} className="min-h-[44px]">Back</Button>
                    <Button variant="outline" onClick={handlePrintSummary} className="gap-1.5 min-h-[44px] no-print">
                      <Printer className="w-4 h-4" />
                      Download Summary
                    </Button>
                    <Button onClick={() => setStep("appeal")} className="flex-1 gap-1.5 min-h-[44px]">
                      <FileText className="w-4 h-4" />
                      File an Appeal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Appeal Form */}
          {step === "appeal" && selectedParcel && (
            <motion.div key="appeal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Appeal Application — {selectedParcel.parcelNumber}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-accent/30 border border-accent/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-accent-foreground">
                      Appeals must be filed within 45 days of the notice date. Supporting documentation (recent appraisals, comparable sales) strengthens your case.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full Name *</Label>
                      <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="John Smith" className="min-h-[44px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email Address *</Label>
                      <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="john@example.com" className="min-h-[44px]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Requested Value (optional)</Label>
                    <Input
                      type="number"
                      value={requestedValue}
                      onChange={(e) => setRequestedValue(e.target.value)}
                      placeholder="Enter the value you believe is fair"
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Reason for Appeal *</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why you believe the assessed value is incorrect…"
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Evidence upload */}
                  <div className="space-y-2">
                    <Label className="text-xs">Supporting Documents (optional)</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.zip"
                      className="hidden"
                      onChange={(e) => e.target.files && evidence.upload(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={evidence.uploading || evidence.files.length >= evidence.maxFiles}
                      className="gap-1.5 min-h-[44px] w-full sm:w-auto"
                    >
                      {evidence.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      Attach Evidence Files
                    </Button>
                    {evidence.files.length > 0 && (
                      <div className="space-y-1">
                        {evidence.files.map((f) => (
                          <div key={f.path} className="flex items-center gap-2 text-xs p-2 rounded-lg border border-border/30 bg-muted/10">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1">{f.name}</span>
                            <span className="text-muted-foreground shrink-0">
                              {f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                            <button onClick={() => evidence.remove(f.path)} className="p-1 hover:bg-destructive/10 rounded min-w-[28px] min-h-[28px] flex items-center justify-center">
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Max {evidence.maxFiles} files, 10 MB each · PDF, JPG, PNG, ZIP
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep("review")} className="min-h-[44px]">Back</Button>
                    <Button onClick={handleSubmitAppeal} disabled={isSubmitting} className="flex-1 gap-1.5 min-h-[44px]">
                      {isSubmitting ? <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting…
                      </> : <>
                        <Send className="w-4 h-4" />
                        Submit Appeal
                      </>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === "submitted" && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-chart-5/20 bg-chart-5/5">
                <CardContent className="py-8 sm:py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-chart-5/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-chart-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Appeal Submitted</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your appeal has been received and assigned a case number. You will receive a confirmation email with next steps.
                  </p>
                  <Badge className="bg-chart-5/20 text-chart-5 border-chart-5/30 text-sm px-3 py-1">
                    Case #{caseNumber}
                  </Badge>

                  {/* Realtime appeal status */}
                  {appealStatus && (
                    <div className="max-w-sm mx-auto space-y-2 pt-2">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="capitalize">{appealStatus.status.replace(/_/g, " ")}</Badge>
                      </div>
                      {appealStatus.hearing_date && (
                        <div className="flex items-center justify-center gap-2 text-sm p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-foreground font-medium">
                            Hearing scheduled: {new Date(appealStatus.hearing_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4">
                    <Button variant="outline" onClick={resetPortal} className="min-h-[44px]">
                      Look Up Another Property
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/30 mt-20 py-6 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          © 2026 County Assessor's Office · Powered by TerraFusion OS
        </div>
      </footer>
    </div>
  );
}
