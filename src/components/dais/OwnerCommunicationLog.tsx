/**
 * TerraFusion OS — Phase 127: Owner Communication Log
 * Constitutional owner: TerraDais (workflow)
 *
 * Tracks owner communications (notices sent, calls, emails, hearings)
 * with a chronological timeline view per parcel.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Calendar,
  Plus,
  Loader2,
  User,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { toast } from "sonner";

type CommType = "notice" | "call" | "email" | "hearing" | "letter" | "visit";

interface CommEntry {
  id: string;
  type: CommType;
  date: Date;
  summary: string;
  direction: "inbound" | "outbound";
  status: "completed" | "pending" | "no-response";
}

const COMM_ICONS: Record<CommType, React.ElementType> = {
  notice: FileText,
  call: Phone,
  email: Mail,
  hearing: Calendar,
  letter: FileText,
  visit: User,
};

const COMM_COLORS: Record<CommType, string> = {
  notice: "text-tf-cyan",
  call: "text-tf-green",
  email: "text-tf-gold",
  hearing: "text-tf-amber",
  letter: "text-suite-dossier",
  visit: "text-primary",
};

/**
 * Simulates communication log entries.
 * In production, this would query a communications table.
 */
function useMockComms(parcelId: string | null): CommEntry[] {
  return useMemo(() => {
    if (!parcelId) return [];
    // Generate deterministic mock entries based on parcel ID
    const seed = parcelId.charCodeAt(0) + parcelId.charCodeAt(1);
    const types: CommType[] = ["notice", "call", "email", "hearing", "letter", "visit"];
    const entries: CommEntry[] = [];
    const now = Date.now();

    for (let i = 0; i < Math.min(seed % 5 + 2, 7); i++) {
      entries.push({
        id: `comm-${i}`,
        type: types[i % types.length],
        date: new Date(now - (i * 7 + seed % 10) * 86400000),
        summary: [
          "Assessment change notice mailed to property owner",
          "Owner called regarding value increase — referred to informal review",
          "Email response sent with comparable sales data",
          "Formal hearing scheduled with Board of Equalization",
          "Appeal decision letter mailed — value upheld",
          "On-site inspection completed with owner present",
          "Informal review notice sent — 15-day response window",
        ][i % 7],
        direction: i % 3 === 0 ? "inbound" : "outbound",
        status: i === 0 ? "pending" : "completed",
      });
    }
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [parcelId]);
}

export function OwnerCommunicationLog() {
  const { parcel } = useWorkbench();
  const comms = useMockComms(parcel.id);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<CommType>("call");
  const [newNote, setNewNote] = useState("");

  if (!parcel.id) {
    return (
      <div className="p-6 text-center">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a parcel to view communication log</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newNote.trim()) return;
    toast.success(`${newType} logged for ${parcel.parcelNumber}`);
    setNewNote("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-suite-dais" />
              Owner Communications
              <Badge variant="outline" className="text-[10px]">{comms.length} entries</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="w-3 h-3" />
              Log Entry
            </Button>
          </div>
        </CardHeader>

        {/* Add New Entry */}
        {showAdd && (
          <CardContent className="pt-0 pb-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as CommType)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="hearing">Hearing</SelectItem>
                      <SelectItem value="visit">Site Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                placeholder="Communication summary…"
                className="text-xs min-h-[60px]"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="text-xs h-7" onClick={handleAdd}>
                  Save Entry
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeline */}
      <Card className="material-bento border-border/50">
        <CardContent className="p-4">
          <ScrollArea className="h-[350px]">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border/50" />

              <div className="space-y-4">
                {comms.map((entry) => {
                  const Icon = COMM_ICONS[entry.type];
                  const color = COMM_COLORS[entry.type];
                  return (
                    <div key={entry.id} className="flex gap-3 pl-1">
                      <div className={`relative z-10 w-7 h-7 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium capitalize ${color}`}>
                            {entry.type}
                          </span>
                          <Badge variant="outline" className="text-[8px] px-1 py-0">
                            {entry.direction}
                          </Badge>
                          {entry.status === "pending" && (
                            <Badge className="bg-tf-amber/20 text-tf-amber border-tf-amber/30 text-[8px] px-1 py-0">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{entry.summary}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.date.toLocaleDateString()} at {entry.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {comms.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No communication history
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
