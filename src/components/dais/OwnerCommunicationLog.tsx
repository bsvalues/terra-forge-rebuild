/**
 * TerraFusion OS — Phase 127: Owner Communication Log
 * Constitutional owner: TerraDais (workflow)
 *
 * Tracks owner communications (notices sent, calls, emails, hearings)
 * with a chronological timeline view per parcel.
 * Write-lane: owner_communications → Dais
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Link2,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { toast } from "sonner";
import {
  useOwnerCommunications,
  useAddCommunication,
  type ContactMethod,
  type CommDirection,
  type CommFilters,
} from "@/hooks/useOwnerCommunications";

const COMM_ICONS: Record<ContactMethod, React.ElementType> = {
  notice: FileText,
  phone: Phone,
  email: Mail,
  hearing: Calendar,
  letter: FileText,
  "in-person": User,
};

const COMM_COLORS: Record<ContactMethod, string> = {
  notice: "text-tf-cyan",
  phone: "text-tf-green",
  email: "text-tf-gold",
  hearing: "text-tf-amber",
  letter: "text-suite-dossier",
  "in-person": "text-primary",
};

export function OwnerCommunicationLog() {
  const { parcel } = useWorkbench();
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<ContactMethod>("phone");
  const [newDirection, setNewDirection] = useState<CommDirection>("outbound");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newAppealId, setNewAppealId] = useState("");

  // Search/filter state
  const [ownerSearch, setOwnerSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<ContactMethod | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<CommDirection | "all">("all");

  const filters: CommFilters = {
    ownerSearch: ownerSearch || undefined,
    contactMethod: methodFilter,
    direction: directionFilter,
  };

  const { data: comms = [], isLoading } = useOwnerCommunications(parcel.id, filters);
  const addComm = useAddCommunication();

  if (!parcel.id) {
    return (
      <div className="p-6 text-center">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a parcel to view communication log</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newSubject.trim() || !newOwnerName.trim()) {
      toast.error("Owner name and subject are required");
      return;
    }
    addComm.mutate(
      {
        parcel_id: parcel.id!,
        owner_name: newOwnerName,
        contact_method: newType,
        direction: newDirection,
        subject: newSubject,
        body: newBody || undefined,
        appeal_id: newAppealId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${newType} logged for ${parcel.parcelNumber}`);
          setNewSubject("");
          setNewBody("");
          setNewOwnerName("");
          setNewAppealId("");
          setShowAdd(false);
        },
        onError: (err) => toast.error(`Failed to log: ${err.message}`),
      },
    );
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
              <Badge variant="outline" className="text-[10px]">
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${comms.length} entries`}
              </Badge>
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="w-3 h-3" />
              Log Entry
            </Button>
          </div>
        </CardHeader>

        {/* Search / Filter Bar */}
        <CardContent className="pt-0 pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search owner…"
                className="h-7 text-xs pl-7"
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as ContactMethod | "all")}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
                <SelectItem value="notice">Notice</SelectItem>
                <SelectItem value="hearing">Hearing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as CommDirection | "all")}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        {/* Add New Entry */}
        {showAdd && (
          <CardContent className="pt-0 pb-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Owner Name</label>
                  <Input className="h-8 text-xs" placeholder="Property owner name" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as ContactMethod)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="hearing">Hearing</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Direction</label>
                  <Select value={newDirection} onValueChange={(v) => setNewDirection(v as CommDirection)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Link to Appeal (optional)</label>
                  <Input className="h-8 text-xs" placeholder="Appeal ID" value={newAppealId} onChange={(e) => setNewAppealId(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                <Input className="h-8 text-xs" placeholder="Communication subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              </div>
              <Textarea
                placeholder="Communication details…"
                className="text-xs min-h-[60px]"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="text-xs h-7" onClick={handleAdd} disabled={addComm.isPending}>
                  {addComm.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border/50" />

                <div className="space-y-4">
                  {comms.map((entry) => {
                    const Icon = COMM_ICONS[entry.contact_method] || MessageSquare;
                    const color = COMM_COLORS[entry.contact_method] || "text-muted-foreground";
                    const date = new Date(entry.created_at);
                    return (
                      <div key={entry.id} className="flex gap-3 pl-1">
                        <div className="relative z-10 w-7 h-7 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center flex-shrink-0">
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-xs font-medium capitalize ${color}`}>
                              {entry.contact_method}
                            </span>
                            <Badge variant="outline" className="text-[8px] px-1 py-0 gap-0.5">
                              {entry.direction === "inbound" ? (
                                <ArrowDownLeft className="w-2 h-2" />
                              ) : (
                                <ArrowUpRight className="w-2 h-2" />
                              )}
                              {entry.direction}
                            </Badge>
                            {entry.appeal_id && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 gap-0.5 text-tf-amber">
                                <Link2 className="w-2 h-2" />
                                Appeal
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-medium text-foreground">{entry.subject}</p>
                          {entry.body && (
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{entry.body}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              · {entry.owner_name}
                            </span>
                            {entry.created_by && (
                              <span className="text-[10px] text-muted-foreground">
                                · by {entry.created_by}
                              </span>
                            )}
                          </div>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
