import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Save, Loader2, FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDossierNarratives, useSaveNarrative, useDeleteNarrative } from "@/hooks/useDossier";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { invokeDefenseNarrative } from "@/services/ingestService";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

const NARRATIVE_TYPES = [
  { value: "defense", label: "BOE Defense" },
  { value: "value_change", label: "Value Change Explanation" },
  { value: "appeal_response", label: "Appeal Response" },
  { value: "exemption_letter", label: "Exemption Decision" },
  { value: "general", label: "General Narrative" },
];

interface Props {
  parcelId: string | null;
}

export function NarrativeDraftingPanel({ parcelId }: Props) {
  const { parcel, studyPeriod } = useWorkbench();
  const { data: narratives, isLoading } = useDossierNarratives(parcelId);
  const saveNarrative = useSaveNarrative(parcelId);
  const deleteNarrative = useDeleteNarrative(parcelId);

  const [narrativeType, setNarrativeType] = useState("defense");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAIGenerate = async () => {
    if (!parcelId) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("defense-narrative", {
        body: {
          parcelNumber: parcel.parcelNumber,
          address: parcel.address,
          assessedValue: parcel.assessedValue,
          ratioStats: { studyPeriod: studyPeriod.name },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const typeLabel = NARRATIVE_TYPES.find(t => t.value === narrativeType)?.label || narrativeType;
      setTitle(`${typeLabel} — ${parcel.parcelNumber || "Unknown"}`);
      setContent(data.narrative);
      toast.success("AI narrative drafted — review and save");
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    await saveNarrative.mutateAsync({
      title,
      content,
      narrativeType,
      aiGenerated: true,
      modelUsed: "gemini-3-flash-preview",
    });
    setTitle("");
    setContent("");
  };

  if (!parcelId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Select a parcel to draft narratives</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Draft composer */}
      <div className="material-bento rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-suite-dossier" />
          <h4 className="text-sm font-medium text-foreground">Draft Narrative</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={narrativeType} onValueChange={setNarrativeType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NARRATIVE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className="w-full h-8 text-xs gap-1.5"
              variant="outline"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              {isGenerating ? "Drafting…" : "AI Draft"}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Narrative title…" className="h-8 text-xs" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Content</Label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write or generate narrative content…"
            rows={6}
            className="text-xs"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={!title.trim() || !content.trim() || saveNarrative.isPending}
          className="w-full gap-2 bg-suite-dossier hover:bg-suite-dossier/90 h-8 text-xs"
        >
          {saveNarrative.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Narrative
        </Button>
      </div>

      {/* Saved narratives */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Saved Narratives ({narratives?.length || 0})
        </h4>
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : !narratives?.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">No narratives yet</p>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {narratives.map((n: any) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-border/30 rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                  >
                    <FileText className="w-3.5 h-3.5 text-suite-dossier shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate flex-1">{n.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {n.ai_generated && (
                        <Badge className="text-[9px] bg-suite-dossier/20 text-suite-dossier border-suite-dossier/30">AI</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(n.created_at), "MMM d")}
                      </span>
                      {expandedId === n.id ? (
                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {expandedId === n.id && (
                    <div className="px-3 pb-3 border-t border-border/20">
                      <ScrollArea className="h-[200px] mt-2">
                        <div className="prose prose-invert prose-xs max-w-none text-xs">
                          <ReactMarkdown>{n.content}</ReactMarkdown>
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive text-xs h-6 gap-1"
                          onClick={() => deleteNarrative.mutate(n.id)}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
