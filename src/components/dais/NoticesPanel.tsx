import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Bell,
  FileText,
  Send,
  Download,
  Loader2,
  CheckCircle,
  Home,
  Scale,
  ClipboardCheck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { toast } from "sonner";
import { format } from "date-fns";

const NOTICE_TEMPLATES = [
  {
    id: "assessment_change",
    label: "Assessment Change Notice",
    icon: Home,
    description: "Notify property owner of value change",
    color: "text-chart-1",
  },
  {
    id: "hearing_notice",
    label: "Appeal Hearing Notice",
    icon: Scale,
    description: "Schedule and notify appeal hearing date",
    color: "text-chart-4",
  },
  {
    id: "exemption_decision",
    label: "Exemption Decision Notice",
    icon: ClipboardCheck,
    description: "Communicate exemption approval/denial",
    color: "text-chart-2",
  },
  {
    id: "general_correspondence",
    label: "General Correspondence",
    icon: FileText,
    description: "Custom letter to property owner",
    color: "text-muted-foreground",
  },
];

interface GeneratedNotice {
  id: string;
  type: string;
  parcelNumber: string;
  recipient: string;
  subject: string;
  body: string;
  generatedAt: string;
  status: "draft" | "sent";
}

export function NoticesPanel() {
  const { parcel } = useWorkbench();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notices, setNotices] = useState<GeneratedNotice[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);

    const template = NOTICE_TEMPLATES.find((t) => t.id === selectedTemplate);

    // Simulate AI notice generation
    await new Promise((r) => setTimeout(r, 1200));

    const subjects: Record<string, string> = {
      assessment_change: `Notice of Assessment Change — ${parcel.parcelNumber || "N/A"}`,
      hearing_notice: `Board of Equalization Hearing Notice — ${parcel.parcelNumber || "N/A"}`,
      exemption_decision: `Exemption Application Decision — ${parcel.parcelNumber || "N/A"}`,
      general_correspondence: customSubject || `Correspondence — ${parcel.parcelNumber || "N/A"}`,
    };

    const bodies: Record<string, string> = {
      assessment_change: `Dear ${recipientName || "Property Owner"},\n\nThis notice is to inform you that the assessed value of your property located at ${parcel.address || "[Address]"} (Parcel ${parcel.parcelNumber || "[PIN]"}) has been adjusted for the current tax year.\n\nPrevious Assessed Value: $${(parcel.assessedValue || 0).toLocaleString()}\nRevised Assessed Value: [To be determined]\n\nYou have the right to appeal this assessment within 30 days of this notice. Please contact our office for further information.\n\nSincerely,\nCounty Assessor's Office`,
      hearing_notice: `Dear ${recipientName || "Property Owner"},\n\nYou are hereby notified that a hearing has been scheduled for your appeal regarding property at ${parcel.address || "[Address]"} (Parcel ${parcel.parcelNumber || "[PIN]"}).\n\nHearing Date: [Scheduled Date]\nLocation: County Board of Equalization\nTime: [Scheduled Time]\n\nPlease bring all supporting documentation to your hearing.\n\nSincerely,\nBoard of Equalization`,
      exemption_decision: `Dear ${recipientName || "Applicant"},\n\nThis letter is regarding your exemption application for the property located at ${parcel.address || "[Address]"} (Parcel ${parcel.parcelNumber || "[PIN]"}).\n\nDecision: [Approved/Denied]\nEffective Date: [Date]\n\nIf you have questions regarding this decision, please contact our office.\n\nSincerely,\nCounty Assessor's Office`,
      general_correspondence: customBody || "No content provided.",
    };

    const newNotice: GeneratedNotice = {
      id: crypto.randomUUID(),
      type: selectedTemplate,
      parcelNumber: parcel.parcelNumber || "Unknown",
      recipient: recipientName || "Property Owner",
      subject: subjects[selectedTemplate] || "Notice",
      body: bodies[selectedTemplate] || "",
      generatedAt: new Date().toISOString(),
      status: "draft",
    };

    setNotices((prev) => [newNotice, ...prev]);
    setGenerating(false);
    setCreateOpen(false);
    setSelectedTemplate(null);
    setRecipientName("");
    setRecipientAddress("");
    setCustomSubject("");
    setCustomBody("");
    toast.success(`${template?.label} generated`);
  };

  const handleDownload = (notice: GeneratedNotice) => {
    const content = `${notice.subject}\n${"=".repeat(notice.subject.length)}\n\nDate: ${format(new Date(notice.generatedAt), "MMMM d, yyyy")}\nParcel: ${notice.parcelNumber}\nRecipient: ${notice.recipient}\n\n---\n\n${notice.body}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notice-${notice.type}-${notice.parcelNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notice downloaded");
  };

  const markSent = (id: string) => {
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "sent" as const } : n))
    );
    toast.success("Notice marked as sent");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="material-bento rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-chart-3" />
            Official Notices
          </h3>
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
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {t.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Recipient Name</Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Property Owner"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mailing Address</Label>
                    <Input
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="123 Main St"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Custom fields for general correspondence */}
                {selectedTemplate === "general_correspondence" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Subject</Label>
                      <Input
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Subject line"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Body</Label>
                      <Textarea
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        placeholder="Notice content..."
                        rows={4}
                        className="text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Parcel Context */}
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
                  onClick={handleGenerate}
                  disabled={!selectedTemplate || generating}
                  className="w-full gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate Notice
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Generated notices list */}
        {notices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No notices generated yet</p>
            <p className="text-sm mt-1">
              Click "Generate Notice" to create assessment notices, hearing notifications, or correspondence
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {notices.map((notice) => {
                const template = NOTICE_TEMPLATES.find((t) => t.id === notice.type);
                const Icon = template?.icon || FileText;
                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border/30 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", template?.color)} />
                        <div>
                          <p className="text-sm font-medium">{notice.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              To: {notice.recipient}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {format(new Date(notice.generatedAt), "MMM d, yyyy h:mm a")}
                            </span>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={() => handleDownload(notice)}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                      {notice.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => markSent(notice.id)}
                        >
                          <Send className="w-3 h-3" />
                          Mark Sent
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </motion.div>
  );
}
