import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, FileText, Brain, Plus, Loader2,
  Lock, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useDossierDocuments,
  useDossierNarratives,
  useDossierPackets,
  useAssemblePacket,
  useFinalizePacket,
  usePacketContents,
} from "@/hooks/useDossier";
import { useSaveNarrative } from "@/hooks/useDossier";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { invokeSynthesizeEvidence } from "@/services/ingestService";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  parcelId: string | null;
}

function PacketDetailView({ packet, parcelId }: { packet: any; parcelId: string }) {
  const { documents, narratives, isLoading } = usePacketContents(packet);
  const finalizeMut = useFinalizePacket(parcelId);
  const saveNarrative = useSaveNarrative(parcelId);
  const { parcel } = useWorkbench();
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    try {
      const result = await invokeSynthesizeEvidence({
        parcelNumber: parcel.parcelNumber || "",
        address: parcel.address || "",
        assessedValue: parcel.assessedValue || 0,
        documents: documents.map((d: any) => ({
          fileName: d.file_name,
          documentType: d.document_type,
        })),
        narratives: narratives.map((n: any) => ({
          title: n.title,
          contentPreview: n.content?.slice(0, 500) || "",
        })),
      });

      await saveNarrative.mutateAsync({
        title: `Evidence Synthesis — ${packet.title}`,
        content: result.narrative,
        narrativeType: "evidence_synthesis",
        aiGenerated: true,
        modelUsed: "gemini-3-flash-preview",
      });

      toast.success("Evidence synthesized and saved as narrative");
    } catch (err: any) {
      toast.error(err.message || "Synthesis failed");
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground text-center py-4">Loading contents…</p>;
  }

  return (
    <div className="px-3 pb-3 border-t border-border/20 space-y-3 mt-2">
      {/* Documents in packet */}
      {documents.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Documents ({documents.length})</p>
          <div className="space-y-1">
            {documents.map((d: any) => (
              <div key={d.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/20">
                <FileText className="w-3 h-3 text-suite-dossier shrink-0" />
                <span className="truncate flex-1">{d.file_name}</span>
                <Badge variant="outline" className="text-[9px]">{d.document_type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narratives in packet */}
      {narratives.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Narratives ({narratives.length})</p>
          <div className="space-y-1">
            {narratives.map((n: any) => (
              <div key={n.id} className="p-2 rounded bg-muted/20">
                <div className="flex items-center gap-2 text-xs">
                  <Brain className="w-3 h-3 text-suite-dossier shrink-0" />
                  <span className="truncate flex-1 font-medium">{n.title}</span>
                  {n.ai_generated && (
                    <Badge className="text-[9px] bg-suite-dossier/20 text-suite-dossier border-suite-dossier/30">AI</Badge>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  {n.content?.slice(0, 150)}…
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7 gap-1.5"
          onClick={handleSynthesize}
          disabled={isSynthesizing || (documents.length === 0 && narratives.length === 0)}
        >
          {isSynthesizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Synthesize
        </Button>
        {packet.status === "draft" && (
          <Button
            size="sm"
            className="flex-1 text-xs h-7 gap-1.5 bg-tf-green hover:bg-tf-green/90"
            onClick={() => finalizeMut.mutate(packet.id)}
            disabled={finalizeMut.isPending}
          >
            {finalizeMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
            Finalize
          </Button>
        )}
      </div>
    </div>
  );
}

export function PacketAssemblyPanel({ parcelId }: Props) {
  const { parcel } = useWorkbench();
  const { data: docs } = useDossierDocuments(parcelId);
  const { data: narratives } = useDossierNarratives(parcelId);
  const { data: packets, isLoading } = useDossierPackets(parcelId);
  const assemblePacket = useAssemblePacket(parcelId);

  const [isAssembling, setIsAssembling] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [selectedNarratives, setSelectedNarratives] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleNarrative = (id: string) => {
    setSelectedNarratives(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAssemble = async () => {
    const packetTitle = title.trim() || `BOE Defense — ${parcel.parcelNumber || "Unknown"}`;
    await assemblePacket.mutateAsync({
      title: packetTitle,
      packetType: "boe_defense",
      documentIds: Array.from(selectedDocs),
      narrativeIds: Array.from(selectedNarratives),
    });
    setTitle("");
    setSelectedDocs(new Set());
    setSelectedNarratives(new Set());
    setIsAssembling(false);
  };

  if (!parcelId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Select a parcel to assemble packets</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Assembly mode */}
      {isAssembling ? (
        <div className="material-bento rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-suite-dossier" />
            Assemble Packet
          </h4>

          <div className="space-y-1">
            <Label className="text-xs">Packet Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`BOE Defense — ${parcel.parcelNumber || ""}`}
              className="h-8 text-xs"
            />
          </div>

          {/* Select Documents */}
          <div>
            <Label className="text-xs text-muted-foreground">Documents ({docs?.length || 0})</Label>
            {docs?.length ? (
              <div className="mt-1 space-y-1 max-h-[120px] overflow-y-auto">
                {docs.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selectedDocs.has(d.id)} onCheckedChange={() => toggleDoc(d.id)} />
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs truncate flex-1">{d.file_name}</span>
                    <Badge variant="outline" className="text-[9px]">{d.document_type}</Badge>
                  </label>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground mt-1">No documents uploaded</p>}
          </div>

          {/* Select Narratives */}
          <div>
            <Label className="text-xs text-muted-foreground">Narratives ({narratives?.length || 0})</Label>
            {narratives?.length ? (
              <div className="mt-1 space-y-1 max-h-[120px] overflow-y-auto">
                {narratives.map((n: any) => (
                  <label key={n.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selectedNarratives.has(n.id)} onCheckedChange={() => toggleNarrative(n.id)} />
                    <Brain className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs truncate flex-1">{n.title}</span>
                    {n.ai_generated && <Badge className="text-[9px] bg-suite-dossier/20 text-suite-dossier border-suite-dossier/30">AI</Badge>}
                  </label>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground mt-1">No narratives created</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setIsAssembling(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-8 gap-1.5 bg-suite-dossier hover:bg-suite-dossier/90"
              disabled={assemblePacket.isPending || (selectedDocs.size === 0 && selectedNarratives.size === 0)}
              onClick={handleAssemble}
            >
              {assemblePacket.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
              Assemble
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsAssembling(true)}
          className="w-full gap-2 bg-suite-dossier hover:bg-suite-dossier/90 text-xs h-8"
        >
          <Plus className="w-3.5 h-3.5" />
          New Packet
        </Button>
      )}

      {/* Existing packets */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Assembled Packets ({packets?.length || 0})
        </h4>
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : !packets?.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">No packets assembled yet</p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {packets.map((p: any) => {
                const isExpanded = expandedId === p.id;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-border/30 rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors text-left"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      <Package className="w-4 h-4 text-suite-dossier shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px]">{p.packet_type}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {(p.document_ids?.length || 0)} docs · {(p.narrative_ids?.length || 0)} narratives
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(p.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={p.status === "finalized"
                          ? "text-[9px] bg-tf-green/20 text-tf-green border-tf-green/30"
                          : "text-[9px] bg-muted text-muted-foreground"
                        }
                      >
                        {p.status === "finalized" && <Lock className="w-2.5 h-2.5 mr-1" />}
                        {p.status}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <PacketDetailView packet={p} parcelId={parcelId!} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
