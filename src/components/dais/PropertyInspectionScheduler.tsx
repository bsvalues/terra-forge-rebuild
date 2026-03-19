/**
 * TerraFusion OS — Phase 131: Property Inspection Scheduler
 * Constitutional owner: TerraDais (workflow)
 *
 * Manages scheduled and completed property inspections per parcel
 * with type classification, priority, and status tracking.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Loader2,
  Eye,
  Camera,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { toast } from "sonner";
import { format, addDays, isPast, isToday } from "date-fns";

type InspectionType = "exterior" | "interior" | "new-construction" | "appeal" | "permit" | "recheck";
type InspectionStatus = "scheduled" | "completed" | "missed" | "cancelled";
type InspectionPriority = "high" | "normal" | "low";

interface Inspection {
  id: string;
  type: InspectionType;
  scheduledDate: Date;
  status: InspectionStatus;
  priority: InspectionPriority;
  notes: string;
  inspector: string;
}

const TYPE_META: Record<InspectionType, { label: string; icon: React.ElementType; color: string }> = {
  exterior: { label: "Exterior", icon: Eye, color: "text-tf-cyan" },
  interior: { label: "Interior", icon: Eye, color: "text-tf-green" },
  "new-construction": { label: "New Construction", icon: Camera, color: "text-tf-amber" },
  appeal: { label: "Appeal Review", icon: AlertTriangle, color: "text-destructive" },
  permit: { label: "Permit Verify", icon: ClipboardList, color: "text-tf-gold" },
  recheck: { label: "Re-check", icon: Clock, color: "text-muted-foreground" },
};

const STATUS_BADGES: Record<InspectionStatus, string> = {
  scheduled: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30",
  completed: "bg-tf-green/20 text-tf-green border-tf-green/30",
  missed: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted/50 text-muted-foreground border-border/30",
};

function useMockInspections(parcelId: string | null): Inspection[] {
  return useMemo(() => {
    if (!parcelId) return [];
    const now = new Date();
    const seed = parcelId.charCodeAt(0) % 5 + 1;
    const types: InspectionType[] = ["exterior", "interior", "new-construction", "appeal", "permit", "recheck"];

    return Array.from({ length: seed }, (_, i): Inspection => ({
      id: `insp-${i}`,
      type: types[i % types.length],
      scheduledDate: i === 0 ? addDays(now, 3) : addDays(now, -(i * 15 + 5)),
      status: i === 0 ? "scheduled" : i === seed - 1 ? "missed" : "completed",
      priority: i === 0 ? "high" : "normal",
      notes: [
        "Verify new addition matches permit specifications",
        "Annual exterior review — condition rating update",
        "Interior walkthrough for appeal evidence",
        "Post-renovation inspection required",
        "Permit compliance check — garage conversion",
      ][i % 5],
      inspector: ["J. Martinez", "K. Thompson", "R. Chen", "S. Patel"][i % 4],
    })).sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }, [parcelId]);
}

export function PropertyInspectionScheduler() {
  const { parcel } = useWorkbench();
  const inspections = useMockInspections(parcel.id);
  const [showSchedule, setShowSchedule] = useState(false);
  const [newType, setNewType] = useState<InspectionType>("exterior");
  const [newDate, setNewDate] = useState("");

  if (!parcel.id) {
    return (
      <div className="p-6 text-center">
        <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a parcel to manage inspections</p>
      </div>
    );
  }

  const upcoming = inspections.filter((i) => i.status === "scheduled");
  const completed = inspections.filter((i) => i.status === "completed");
  const missed = inspections.filter((i) => i.status === "missed");

  const handleSchedule = () => {
    if (!newDate) return;
    toast.success(`${TYPE_META[newType].label} inspection scheduled for ${newDate}`);
    setShowSchedule(false);
    setNewDate("");
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-tf-cyan" />
            <div className="text-xl font-medium text-tf-cyan">{upcoming.length}</div>
            <div className="text-[10px] text-muted-foreground">Upcoming</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-tf-green" />
            <div className="text-xl font-medium text-tf-green">{completed.length}</div>
            <div className="text-[10px] text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card className="material-bento border-border/50">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <div className="text-xl font-medium text-destructive">{missed.length}</div>
            <div className="text-[10px] text-muted-foreground">Missed</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule New */}
      <Card className="material-bento border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-suite-dais" />
              Inspection Schedule
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setShowSchedule(!showSchedule)}>
              <Plus className="w-3 h-3" />
              Schedule
            </Button>
          </div>
        </CardHeader>

        {showSchedule && (
          <CardContent className="pt-0 pb-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as InspectionType)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_META).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                  <Input type="date" className="h-8 text-xs" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowSchedule(false)}>Cancel</Button>
                <Button size="sm" className="text-xs h-7" onClick={handleSchedule}>Confirm</Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className={showSchedule ? "pt-0" : ""}>
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {inspections.map((insp) => {
                const meta = TYPE_META[insp.type];
                const Icon = meta.icon;
                return (
                  <div key={insp.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/20">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-foreground">{meta.label}</span>
                        <Badge className={`text-[8px] px-1.5 py-0 ${STATUS_BADGES[insp.status]}`}>
                          {insp.status}
                        </Badge>
                        {insp.priority === "high" && (
                          <Badge variant="destructive" className="text-[8px] px-1 py-0">Priority</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{insp.notes}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-foreground">{format(insp.scheduledDate, "MMM d")}</div>
                      <div className="text-[10px] text-muted-foreground">{insp.inspector}</div>
                    </div>
                  </div>
                );
              })}
              {inspections.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">No inspections scheduled</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
