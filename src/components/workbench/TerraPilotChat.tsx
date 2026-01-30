import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkbench } from "./WorkbenchContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TerraPilotChatProps {
  fullscreen?: boolean;
}

export function TerraPilotChat({ fullscreen = false }: TerraPilotChatProps) {
  const { pilotMode, parcel, studyPeriod, setSystemState } = useWorkbench();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setSystemState("processing");

    try {
      const context = {
        mode: pilotMode,
        parcel: parcel.id ? parcel : null,
        studyPeriod: studyPeriod.id ? studyPeriod : null,
      };

      const { data, error } = await supabase.functions.invoke("terrapilot-chat", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          context,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message || "I apologize, but I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSystemState("success");
      
      // Reset to idle after brief success state
      setTimeout(() => setSystemState("idle"), 2000);
    } catch (error) {
      console.error("TerraPilot error:", error);
      setSystemState("alert");
      toast({
        title: "TerraPilot Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      setTimeout(() => setSystemState("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const placeholders = {
    pilot: "Ask TerraPilot to execute tasks, find comps, run models...",
    muse: "Ask TerraPilot to draft documents, explain valuations...",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <Sparkles className={`w-12 h-12 mx-auto mb-4 ${
                pilotMode === "pilot" ? "text-tf-cyan" : "text-tf-purple"
              } opacity-50`} />
              <p className="text-muted-foreground text-sm">
                {pilotMode === "pilot" 
                  ? "Ready to execute. What would you like to do?"
                  : "Ready to create. What would you like me to draft?"}
              </p>
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
                      pilotMode === "pilot" 
                        ? "bg-tf-cyan/20 text-tf-cyan" 
                        : "bg-tf-purple/20 text-tf-purple"
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-tf-elevated text-foreground"
                      : "glass-subtle text-foreground"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                pilotMode === "pilot" 
                  ? "bg-tf-cyan/20 text-tf-cyan" 
                  : "bg-tf-purple/20 text-tf-purple"
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

      {/* Input Area */}
      <div className="p-3 border-t border-border/50">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
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
              pilotMode === "pilot"
                ? "bg-tf-cyan hover:bg-tf-cyan/90"
                : "bg-tf-purple hover:bg-tf-purple/90"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
