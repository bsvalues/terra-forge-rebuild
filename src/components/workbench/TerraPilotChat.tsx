import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, User, Search, MapPin, BarChart3, Activity, Navigation, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWorkbench } from "./WorkbenchContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface ToolCallResult {
  tool_name: string;
  tool_call_id: string;
  result: Record<string, unknown>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallResult[];
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
};

const TOOL_LABELS: Record<string, string> = {
  search_parcels: "Searching parcels",
  fetch_comps: "Finding comparables",
  get_parcel_details: "Loading parcel details",
  get_neighborhood_stats: "Analyzing neighborhood",
  get_recent_activity: "Checking activity",
  navigate_to_parcel: "Navigating",
  get_workflow_summary: "Checking workflows",
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/terrapilot-chat`;

export function TerraPilotChat({ fullscreen = false }: TerraPilotChatProps) {
  const { pilotMode, parcel, studyPeriod, setSystemState, setParcel, setActiveTab } = useWorkbench();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTools]);

  // Handle navigation actions from tool results
  const handleNavigationAction = useCallback((result: Record<string, unknown>) => {
    if (result.action === "navigate" && result.parcel_id) {
      navigate(`/property/${result.parcel_id}`);
      if (result.tab) {
        setActiveTab(result.tab as any);
      }
    }
  }, [navigate, setActiveTab]);

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

      const upsertAssistant = (chunk: string, toolCalls?: ToolCallResult[]) => {
        assistantSoFar += chunk;
        const content = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content, toolCalls: toolCalls || m.toolCalls } : m));
          }
          return [...prev, { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date(), toolCalls }];
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
            
            // Check for tool call metadata event
            if (parsed.tool_calls) {
              capturedToolCalls = parsed.tool_calls as ToolCallResult[];
              setActiveTools(capturedToolCalls.map(tc => tc.tool_name));
              // Process navigation actions
              for (const tc of capturedToolCalls) {
                if (tc.tool_name === "navigate_to_parcel" && tc.result) {
                  handleNavigationAction(tc.result as Record<string, unknown>);
                }
              }
              // Set tools on the upcoming assistant message
              upsertAssistant("", capturedToolCalls);
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content, capturedToolCalls.length > 0 ? capturedToolCalls : undefined);
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
    pilot: "Search parcels, find comps, check workflows...",
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
                {pilotMode === "pilot" ? "Ready to execute. I can search, analyze, and navigate." : "Ready to create. What would you like me to draft?"}
              </p>
              {pilotMode === "pilot" && (
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {["Search parcels in 98225", "Show open appeals", "Find comps for active parcel", "Neighborhood stats"].map((suggestion) => (
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
                  <div className={`max-w-[85%] space-y-2`}>
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
