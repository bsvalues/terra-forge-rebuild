// TerraFusion OS — Phase 29: NoticesPanel (DB-Persisted)
// Constitutional owner: TerraDais (notices)

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { generateNotice } from "@/services/suites/daisService";
import { invokeDraftNotice } from "@/services/ingestService";
import { useNotices, useCreateNotice, useUpdateNoticeStatus } from "@/hooks/useNotices";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, FileText, Send, Download, Loader2, Home, Scale,
  ClipboardCheck, Calendar, Sparkles, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { toast } from "sonner";
import { format } from "date-fns";

const NOTICE_TEMPLATES = [
  { id: "assessment_change", label: "Assessment Change Notice", icon: Home, description: "Notify property owner of value change", color: "text-chart-1" },
  { id: "hearing_notice", label: "Appeal Hearing Notice", icon: Scale, description: "Schedule and notify appeal hearing date", color: "text-chart-4" },
  { id: "exemption_decision", label: "Exemption Decision Notice", icon: ClipboardCheck, description: "Communicate exemption approval/denial", color: "text-chart-2" },
  { id: "general_correspondence", label: "General Correspondence", icon: FileText, description: "Custom letter to property owner", color: "text-muted-foreground" },
];

export function NoticesPanel() {
  const { parcel } = useWorkbench();
  const { data: county } = useCountyMeta();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // DB-backed notices
  const { data: notices = [], isLoading } = useNotices(parcel.id || null, statusFilter);
  const createNotice = useCreateNotice();
  const updateStatus = useUpdateNoticeStatus();

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Select a notice type");
      if (!parcel.id || !county?.id) throw new Error("No parcel selected");

      let noticeContent: string;
      let aiDrafted = false;

      if (selectedTemplate === "assessment_change" && parcel.id) {
        try {
          const data = await invokeDraftNotice({
            parcelNumber: parcel.parcelNumber || "N/A",
            address: parcel.address || "N/A",
            previousValue: parcel.assessedValue || 0,
            newValue: parcel.assessedValue || 0,
            neighborhoodCode: parcel.neighborhoodCode || "N/A",
            rSquared: "N/A",
            method: "Manual Review",
            noticeType: "assessment_change",
            recipientName: recipientName || "Property Owner",
          });
          noticeContent = data?.notice || "";
          aiDrafted = true;
        } catch {
          noticeContent = generateTemplateContent(selectedTemplate);
        }
      } else {
        noticeContent = selectedTemplate === "general_correspondence" && customBody
          ? customBody
          : generateTemplateContent(selectedTemplate);
      }

      // Record in TerraTrace
      await generateNotice(parcel.id, selectedTemplate, {
        parcelNumber: parcel.parcelNumber,
        address: parcel.address,
        recipient: recipientName || "Property Owner",
        aiDrafted,
      });

      const subjects: Record<string, string> = {
        assessment_change: `Notice of Assessment Change — ${parcel.parcelNumber || "N/A"}`,
        hearing_notice: `Board of Equalization Hearing Notice — ${parcel.parcelNumber || "N/A"}`,
        exemption_decision: `Exemption Application Decision — ${parcel.parcelNumber || "N/A"}`,
        general_correspondence: customSubject || `Correspondence — ${parcel.parcelNumber || "N/A"}`,
      };

      // Persist to DB
      return createNotice.mutateAsync({
        parcel_id: parcel.id,
        county_id: county.id,
        notice_type: selectedTemplate,
        recipient_name: recipientName || "Property Owner",
        recipient_address: recipientAddress || undefined,
        subject: subjects[selectedTemplate] || "Notice",
        body: noticeContent,
        ai_drafted: aiDrafted,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setSelectedTemplate(null);
      setRecipientName("");
      setRecipientAddress("");
      setCustomSubject("");
      setCustomBody("");
      toast.success("Notice generated and saved");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function generateTemplateContent(type: string): string {
    const name = recipientName || "Property Owner";
    const addr = parcel.address || "[Address]";
    const pin = parcel.parcelNumber || "[PIN]";
    const val = (parcel.assessedValue || 0).toLocaleString();

    const templates: Record<string, string> = {
      assessment_change: `Dear ${name},\n\nThis notice is to inform you that the assessed value of your property located at ${addr} (Parcel ${pin}) has been adjusted for the current tax year.\n\nPrevious Assessed Value: $${val}\nRevised Assessed Value: [To be determined]\n\nYou have the right to appeal this assessment within 30 days of this notice.\n\nSincerely,\nCounty Assessor's Office`,
      hearing_notice: `Dear ${name},\n\nYou are hereby notified that a hearing has been scheduled for your appeal regarding property at ${addr} (Parcel ${pin}).\n\nHearing Date: [Scheduled Date]\nLocation: County Board of Equalization\n\nPlease bring all supporting documentation.\n\nSincerely,\nBoard of Equalization`,
      exemption_decision: `Dear ${name},\n\nThis letter is regarding your exemption application for the property located at ${addr} (Parcel ${pin}).\n\nDecision: [Approved/Denied]\nEffective Date: [Date]\n\nSincerely,\nCounty Assessor's Office`,
      general_correspondence: "No content provided.",
    };
    return templates[type] || "";
  }

  const handleDownload = (notice: typeof notices[0]) => {
    const content = `${notice.subject}\n${"=".repeat(notice.subject.length)}\n\nDate: ${format(new Date(notice.created_at), "MMMM d, yyyy")}\nRecipient: ${notice.recipient_name || "Property Owner"}\n\n---\n\n${notice.body}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notice-${notice.notice_type}-${notice.parcel?.parcel_number || "unknown"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notice downloaded");
  };

  const markSent = (id: string) => {
    updateStatus.mutate(
      { noticeId: id, status: "sent" },
      { onSuccess: () => toast.success("Notice marked as sent") }
    );
  };

  const statusCounts = {
    all: notices.length,
    draft: notices.filter((n) => n.status === "draft").length,
    sent: notices.filter((n) => n.status === "sent").length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="material-bento rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-chart-3" />
            Official Notices
          </h3>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                <SelectItem value="draft">Drafts ({statusCounts.draft})</SelectItem>
                <SelectItem value="sent">Sent ({statusCounts.sent})</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  Generate Notice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-chart-3" />
                    Generate Notice
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Template Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notice Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {NOTICE_TEMPLATES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTemplate(t.id)}
                            className={cn(
                              "p-3 rounded-lg border text-left transition-all",
                              selectedTemplate === t.id
                                ? "border-primary bg-primary/10"
                                : "border-border/50 hover:bg-muted/40"
                            )}
                          >
                            <Icon className={cn("w-4 h-4 mb-1", t.color)} />
                            <p className="text-xs font-medium">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedTemplate === "assessment_change" && parcel.id && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--tf-sacred-gold)/0.1)] border border-[hsl(var(--tf-sacred-gold)/0.2)]">
                      <Sparkles className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
                      <span className="text-[10px] text-[hsl(var(--tf-sacred-gold))]">AI-powered drafting via TerraPilot Muse</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Recipient Name</Label>
                      <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Property Owner" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mailing Address</Label>
                      <Input value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="123 Main St" className="h-8 text-xs" />
                    </div>
                  </div>

                  {selectedTemplate === "general_correspondence" && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Subject</Label>
                        <Input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder="Subject line" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Body</Label>
                        <Textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} placeholder="Notice content..." rows={4} className="text-xs" />
                      </div>
                    </>
                  )}

                  {parcel.id && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <div className="text-xs">
                        <span className="font-medium">{parcel.parcelNumber}</span>
                        <span className="text-muted-foreground ml-2">{parcel.address}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={!selectedTemplate || generateMutation.isPending || !parcel.id}
                    className="w-full gap-2"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {selectedTemplate === "assessment_change" && parcel.id ? "AI Drafting…" : "Generating…"}
                      </>
                    ) : (
                      <>
                        {selectedTemplate === "assessment_change" && parcel.id ? <Sparkles className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        Generate Notice
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notices list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No notices {statusFilter !== "all" ? `with status "${statusFilter}"` : "generated yet"}</p>
            <p className="text-sm mt-1">
              {parcel.id
                ? 'Click "Generate Notice" to create assessment notices'
                : "Select a parcel first to generate notices"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {notices.map((notice) => {
                  const template = NOTICE_TEMPLATES.find((t) => t.id === notice.notice_type);
                  const Icon = template?.icon || FileText;
                  return (
                    <motion.div
                      key={notice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="border border-border/30 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", template?.color)} />
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              {notice.subject}
                              {notice.ai_drafted && <Sparkles className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))]" />}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">To: {notice.recipient_name || "Property Owner"}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {format(new Date(notice.created_at), "MMM d, yyyy h:mm a")}
                              </span>
                              {notice.parcel && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">•</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{notice.parcel.parcel_number}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={
                            notice.status === "sent"
                              ? "text-[9px] bg-chart-2/20 text-chart-2 border-chart-2/30"
                              : "text-[9px] bg-muted text-muted-foreground"
                          }
                        >
                          {notice.status}
                        </Badge>
                      </div>

                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/20 rounded p-3 max-h-[120px] overflow-auto font-sans">
                        {notice.body}
                      </pre>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => handleDownload(notice)}>
                          <Download className="w-3 h-3" /> Download
                        </Button>
                        {notice.status === "draft" && (
                          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => markSent(notice.id)}>
                            <Send className="w-3 h-3" /> Mark Sent
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>
    </motion.div>
  );
}
