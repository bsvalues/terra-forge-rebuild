// TerraPilot Chat — the mouth of the swarm. It speaks in riddles and also databases.
// "I choo-choo-choose to execute your write tools." — Ralph, Senior DevOps

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, Sparkles, User, Search, MapPin, BarChart3, Activity,
  Navigation, Briefcase, FileText, MessageSquare, BookOpen, ScrollText,
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle,
  Gavel, Home, Award, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CommitmentButton } from "@/components/ui/commitment-button";
import { useWorkbench } from "./WorkbenchContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ToolCallResult {
  tool_name: string;
  tool_call_id: string;
  result: Record<string, unknown>;
}

interface ConfirmationPayload {
  requires_confirmation: boolean;
  confirmation_id: string;
  tool_name: string;
  risk_level: "medium" | "high";
  args: Record<string, unknown>;
  parcel_context: { parcel_number: string; address: string; assessed_value?: number };
  description: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallResult[];
  pendingConfirmation?: ConfirmationPayload;
  confirmationStatus?: "pending" | "approved" | "rejected";
}

interface TerraPilotChatProps {
  fullscreen?: boolean;
}

const TOOL_ICONS: Record<string, typeof Search> = {
  search_parcels: Search,
  fetch_comps: BarChart3,
  get_parcel_details: MapPin,
  get_neighborhood_stats: BarChart3,
  get_recent_activity: Activity,
  navigate_to_parcel: Navigation,
  get_workflow_summary: Briefcase,
  draft_notice: FileText,
  draft_appeal_response: MessageSquare,
  explain_value_change: BookOpen,
  summarize_parcel_history: ScrollText,
  create_exemption: Home,
  create_appeal: Gavel,
  certify_assessment: Award,
  update_parcel_class: Pencil,
  assign_task: Briefcase,
  create_workflow: Activity,
  escalate_task: AlertTriangle,
};

const TOOL_LABELS: Record<string, string> = {
  search_parcels: "Searching parcels",
  fetch_comps: "Finding comparables",
  get_parcel_details: "Loading parcel details",
  get_neighborhood_stats: "Analyzing neighborhood",
  get_recent_activity: "Checking activity",
  navigate_to_parcel: "Navigating",
  get_workflow_summary: "Checking workflows",
  draft_notice: "Drafting notice",
  draft_appeal_response: "Drafting appeal response",
  explain_value_change: "Explaining value change",
  summarize_parcel_history: "Summarizing history",
  create_exemption: "Creating exemption",
  create_appeal: "Filing appeal",
  certify_assessment: "Certifying assessment",
  update_parcel_class: "Updating parcel",
  assign_task: "Assigning task",
  create_workflow: "Creating workflow",
  escalate_task: "Escalating task",
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/terrapilot-chat`;

/** Get the current user's auth token for edge function calls */
async function getAuthToken(): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export function TerraPilotChat({ fullscreen = false }: TerraPilotChatProps) {
  const { pilotMode, parcel, studyPeriod, setSystemState, setParcel, setActiveTab } = useWorkbench();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTools]);

  const handleNavigationAction = useCallback((result: Record<string, unknown>) => {
    if (result.action === "navigate" && result.parcel_id) {
      navigate(`/property/${result.parcel_id}`);
      if (result.tab) setActiveTab(result.tab as any);
    }
  }, [navigate, setActiveTab]);

  // ── HitL Confirmation Handler ──
  const handleConfirmAction = useCallback(async (messageId: string, payload: ConfirmationPayload, approved: boolean) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, confirmationStatus: approved ? "approved" : "rejected" } : m
    ));

    if (!approved) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Action cancelled. No changes were made.",
        timestamp: new Date(),
      }]);
      return;
    }

    setConfirmingAction(true);
    setSystemState("processing");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [],
          confirm_action: {
            tool_name: payload.tool_name,
            args: payload.args,
            confirmation_id: payload.confirmation_id,
          },
        }),
      });

      const result = await resp.json();

      if (result.success) {
        toast({ title: "Action Completed", description: result.message || "Write operation executed successfully." });
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `✅ **Action completed**: ${result.message || payload.description}`,
          timestamp: new Date(),
        }]);
        setSystemState("success");
      } else {
        toast({ title: "Action Failed", description: result.error || "Unknown error", variant: "destructive" });
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ **Action failed**: ${result.error || "Unknown error"}`,
          timestamp: new Date(),
        }]);
        setSystemState("alert");
      }
    } catch (err) {
      toast({ title: "Network Error", description: "Failed to execute action.", variant: "destructive" });
      setSystemState("alert");
    } finally {
      setConfirmingAction(false);
      setTimeout(() => setSystemState("idle"), 2000);
    }
  }, [toast, setSystemState]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    setSystemState("processing");
    setActiveTools([]);

    abortRef.current = new AbortController();

    try {
      const context = {
        mode: pilotMode,
        parcel: parcel.id ? parcel : null,
        studyPeriod: studyPeriod.id ? studyPeriod : null,
      };

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: "Rate Limit", description: "Too many requests. Please wait.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Credits Exhausted", description: "Please add credits to continue.", variant: "destructive" });
        } else {
          toast({ title: "TerraPilot Error", description: errBody.error || "Failed to get response.", variant: "destructive" });
        }
        setSystemState("alert");
        setTimeout(() => setSystemState("idle"), 3000);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;
      let capturedToolCalls: ToolCallResult[] = [];
      let pendingConfirmation: ConfirmationPayload | undefined;

      const upsertAssistant = (chunk: string, toolCalls?: ToolCallResult[], confirmation?: ConfirmationPayload) => {
        assistantSoFar += chunk;
        const content = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? {
              ...m, content,
              toolCalls: toolCalls || m.toolCalls,
              pendingConfirmation: confirmation || m.pendingConfirmation,
              confirmationStatus: confirmation ? "pending" as const : m.confirmationStatus,
            } : m));
          }
          return [...prev, {
            id: crypto.randomUUID(), role: "assistant" as const, content, timestamp: new Date(),
            toolCalls, pendingConfirmation: confirmation, confirmationStatus: confirmation ? "pending" as const : undefined,
          }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.tool_calls) {
              capturedToolCalls = parsed.tool_calls as ToolCallResult[];
              setActiveTools(capturedToolCalls.map(tc => tc.tool_name));

              // Check for HitL confirmation cards in tool results
              for (const tc of capturedToolCalls) {
                const result = tc.result as Record<string, unknown>;
                if (result.requires_confirmation) {
                  pendingConfirmation = result as unknown as ConfirmationPayload;
                }
                if (tc.tool_name === "navigate_to_parcel" && result) {
                  handleNavigationAction(result);
                }
              }
              upsertAssistant("", capturedToolCalls, pendingConfirmation);
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content, capturedToolCalls.length > 0 ? capturedToolCalls : undefined, pendingConfirmation);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.tool_calls) continue;
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      setActiveTools([]);
      setSystemState("success");
      setTimeout(() => setSystemState("idle"), 2000);
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("TerraPilot error:", error);
      setSystemState("alert");
      toast({ title: "TerraPilot Error", description: "Failed to get response.", variant: "destructive" });
      setTimeout(() => setSystemState("idle"), 3000);
    } finally {
      setIsLoading(false);
      setActiveTools([]);
    }
  }, [input, isLoading, messages, pilotMode, parcel, studyPeriod, setSystemState, toast, handleNavigationAction, setActiveTab, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const placeholders = {
    pilot: "Search, analyze, create exemptions, file appeals...",
    muse: "Draft documents, explain valuations...",
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
              <Sparkles className={`w-12 h-12 mx-auto mb-4 ${pilotMode === "pilot" ? "text-tf-cyan" : "text-tf-purple"} opacity-50`} />
              <p className="text-muted-foreground text-sm mb-4">
                {pilotMode === "pilot" ? "Ready to execute. I can search, analyze, and take action." : "Ready to create. What would you like me to draft?"}
              </p>
              {pilotMode === "pilot" && (
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {[
                    "Search parcels in 98225",
                    "Show open appeals",
                    "Create exemption for active parcel",
                    "Certify current assessment",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-tf-cyan/50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {pilotMode === "muse" && (
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {[
                    "Draft assessment change notice",
                    "Explain the value change",
                    "Summarize parcel history",
                    "Draft appeal response",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-purple-500/50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      pilotMode === "pilot" ? "bg-tf-cyan/20 text-tf-cyan" : "bg-tf-purple/20 text-tf-purple"
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    {/* Tool call badges */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {message.toolCalls.map((tc) => {
                          const Icon = TOOL_ICONS[tc.tool_name] || Activity;
                          return (
                            <Badge key={tc.tool_call_id} variant="outline" className="text-[10px] gap-1 border-tf-cyan/30 text-tf-cyan">
                              <Icon className="w-3 h-3" />
                              {TOOL_LABELS[tc.tool_name] || tc.tool_name}
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Message content */}
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      message.role === "user" ? "bg-tf-elevated text-foreground" : "glass-subtle text-foreground"
                    }`}>
                      {message.role === "assistant" ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {/* ── HitL Confirmation Card ── */}
                    {message.pendingConfirmation && (
                      <ConfirmationCard
                        payload={message.pendingConfirmation}
                        status={message.confirmationStatus || "pending"}
                        onConfirm={(approved) => handleConfirmAction(message.id, message.pendingConfirmation!, approved)}
                        isExecuting={confirmingAction}
                      />
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-tf-elevated flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Active tool execution indicator */}
          {activeTools.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                pilotMode === "pilot" ? "bg-tf-cyan/20 text-tf-cyan" : "bg-tf-purple/20 text-tf-purple"
              }`}>
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="glass-subtle rounded-2xl px-4 py-2.5 space-y-1">
                {activeTools.map((tool) => {
                  const Icon = TOOL_ICONS[tool] || Activity;
                  return (
                    <div key={tool} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="w-3.5 h-3.5 text-tf-cyan" />
                      <span>{TOOL_LABELS[tool] || tool}</span>
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {isLoading && activeTools.length === 0 && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                pilotMode === "pilot" ? "bg-tf-cyan/20 text-tf-cyan" : "bg-tf-purple/20 text-tf-purple"
              }`}>
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="glass-subtle rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Thinking</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/50">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[pilotMode]}
            className="min-h-[44px] max-h-32 resize-none bg-tf-elevated border-border/50 text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={`h-11 w-11 flex-shrink-0 ${
              pilotMode === "pilot" ? "bg-tf-cyan hover:bg-tf-cyan/90" : "bg-tf-purple hover:bg-tf-purple/90"
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── HitL Confirmation Card Component ──
// "The confirmation button told me it's afraid of commitment." — Ralph, UX therapist
function ConfirmationCard({
  payload,
  status,
  onConfirm,
  isExecuting,
}: {
  payload: ConfirmationPayload;
  status: "pending" | "approved" | "rejected";
  onConfirm: (approved: boolean) => void;
  isExecuting: boolean;
}) {
  const isHigh = payload.risk_level === "high";
  const Icon = TOOL_ICONS[payload.tool_name] || ShieldAlert;

  const borderColor = isHigh
    ? "border-[hsl(var(--tf-warning-red)/0.4)]"
    : "border-[hsl(var(--tf-sacred-gold)/0.4)]";
  const bgColor = isHigh
    ? "bg-[hsl(var(--tf-warning-red)/0.06)]"
    : "bg-[hsl(var(--tf-sacred-gold)/0.06)]";
  const iconColor = isHigh ? "text-[hsl(var(--tf-warning-red))]" : "text-[hsl(var(--tf-sacred-gold))]";

  if (status === "approved") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-3 border border-[hsl(var(--tf-optimized-green)/0.3)] bg-[hsl(var(--tf-optimized-green)/0.06)]"
      >
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-[hsl(var(--tf-optimized-green))]" />
          <span className="text-[hsl(var(--tf-optimized-green))] font-medium">Approved</span>
          <span className="text-muted-foreground">— {payload.description}</span>
        </div>
      </motion.div>
    );
  }

  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-3 border border-border/30 bg-muted/30"
      >
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Cancelled — {payload.description}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("rounded-xl p-4 border-2", borderColor, bgColor)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", isHigh ? "bg-[hsl(var(--tf-warning-red)/0.15)]" : "bg-[hsl(var(--tf-sacred-gold)/0.15)]")}>
          {isHigh ? <ShieldAlert className={cn("w-3.5 h-3.5", iconColor)} /> : <ShieldCheck className={cn("w-3.5 h-3.5", iconColor)} />}
        </div>
        <span className={cn("text-xs font-semibold uppercase tracking-wider", iconColor)}>
          {isHigh ? "⚠ High-Impact Action" : "Confirmation Required"}
        </span>
      </div>

      {/* Description */}
      <div className="flex items-start gap-2 mb-3">
        <Icon className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">{payload.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parcel: {payload.parcel_context.parcel_number} — {payload.parcel_context.address}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <CommitmentButton
          variant={isHigh ? "destructive" : "primary"}
          onClick={() => onConfirm(true)}
          disabled={isExecuting}
          className="text-xs px-4 py-1.5"
        >
          {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
          {isExecuting ? "Executing..." : "Approve"}
        </CommitmentButton>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onConfirm(false)}
          disabled={isExecuting}
          className="text-xs"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Reject
        </Button>
      </div>

      {/* TerraTrace notice */}
      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" />
        This action will be recorded in TerraTrace and cannot be undone.
      </p>
    </motion.div>
  );
}
