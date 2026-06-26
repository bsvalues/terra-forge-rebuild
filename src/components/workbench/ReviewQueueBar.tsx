import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  SkipForward,
  ListChecks,
  X,
  Plus,
  Play,
  ClipboardList,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkbench } from "./WorkbenchContext";
import { useReviewQueueContext } from "./ReviewQueueContext";
import { useCreateReviewQueue } from "@/hooks/useReviewQueue";

export function ReviewQueueBar() {
  const { setParcel } = useWorkbench();
  const {
    activeQueueId,
    setActiveQueueId,
    queues,
    nav,
    markReviewed,
    skipItem,
    createQueue,
    sidebarOpen,
    setSidebarOpen,
  } = useReviewQueueContext();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  // Sync current queue item to workbench parcel context
  useEffect(() => {
    if (nav.currentItem?.parcels) {
      const p = nav.currentItem.parcels;
      setParcel({
        id: p.id,
        parcelNumber: p.parcel_number,
        address: p.address,
        assessedValue: p.assessed_value,
        city: p.city,
        propertyClass: p.property_class,
        neighborhoodCode: p.neighborhood_code,
        latitude: p.latitude,
        longitude: p.longitude,
      });
    }
  }, [nav.currentItem, setParcel]);

  const handleMarkReviewed = useCallback(() => {
    if (!nav.currentItem) return;
    markReviewed.mutate({ itemId: nav.currentItem.id }, {
      onSuccess: () => nav.jumpToNextPending(),
    });
  }, [nav, markReviewed]);

  const handleSkip = useCallback(() => {
    if (!nav.currentItem) return;
    skipItem.mutate({ itemId: nav.currentItem.id }, {
      onSuccess: () => nav.goNext(),
    });
  }, [nav, skipItem]);

  const handleCloseQueue = useCallback(() => {
    setActiveQueueId(null);
    setSidebarOpen(false);
  }, [setActiveQueueId, setSidebarOpen]);

  // Keyboard shortcuts for rapid review cycling
  useEffect(() => {
    if (!activeQueueId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "ArrowRight":
        case "j":
          e.preventDefault();
          nav.goNext();
          break;
        case "ArrowLeft":
        case "k":
          e.preventDefault();
          nav.goPrev();
          break;
        case "c":
          e.preventDefault();
          handleMarkReviewed();
          break;
        case "s":
          e.preventDefault();
          handleSkip();
          break;
        case "n":
          e.preventDefault();
          nav.jumpToNextPending();
          break;
        case "Escape":
          e.preventDefault();
          handleCloseQueue();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeQueueId, nav, handleMarkReviewed, handleSkip, handleCloseQueue]);

  // No active queue — show launch buttons
  if (!activeQueueId) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/30">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Review Queue</span>

        {queues && queues.length > 0 && (
          <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Play className="w-3 h-3" />
                Resume Queue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select Review Queue</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-60 overflow-auto">
                {queues.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveQueueId(q.id);
                      setSidebarOpen(true);
                      setSelectOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="font-medium text-sm">{q.name}</div>
                    {q.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{q.description}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Created {new Date(q.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <CreateQueueDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(queueId) => {
            setActiveQueueId(queueId);
            setSidebarOpen(true);
            setCreateOpen(false);
          }}
          createQueue={createQueue}
        />
      </div>
    );
  }

  // Active queue — show navigation bar
  const activeQueue = queues?.find((q) => q.id === activeQueueId);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20"
    >
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </Button>

      {/* Queue name + close */}
      <div className="flex items-center gap-2 min-w-0">
        <ListChecks className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-primary truncate max-w-[140px]">
          {activeQueue?.name || "Queue"}
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCloseQueue}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Progress value={nav.progress} className="h-1.5 flex-1 max-w-[200px]" />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {nav.reviewed}/{nav.total} reviewed
        </span>
      </div>

      {/* Position indicator */}
      <Badge variant="outline" className="text-[10px] tabular-nums shrink-0">
        {nav.currentIndex + 1} / {nav.total}
      </Badge>

      {/* Current item status */}
      {nav.currentItem && (
        <Badge
          variant={nav.currentItem.status === "reviewed" ? "default" : "outline"}
          className={`text-[10px] shrink-0 ${
            nav.currentItem.status === "reviewed"
              ? "bg-tf-green/20 text-tf-green border-tf-green/30"
              : nav.currentItem.status === "skipped"
              ? "bg-tf-amber/20 text-tf-amber border-tf-amber/30"
              : ""
          }`}
        >
          {nav.currentItem.status}
        </Badge>
      )}

      {/* Navigation controls + keyboard hints */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[9px] text-muted-foreground mr-1 hidden md:inline" title="Keyboard: ←/→ navigate, C complete, S skip, N next pending, Esc close">
          ⌨️
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.goPrev} disabled={!nav.hasPrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost" size="sm" className="h-7 text-xs gap-1"
          onClick={handleSkip}
          disabled={!nav.currentItem || nav.currentItem.status !== "pending"}
        >
          <SkipForward className="w-3 h-3" />
          Skip
        </Button>

        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-tf-green hover:bg-tf-green/90 text-background"
          onClick={handleMarkReviewed}
          disabled={!nav.currentItem || nav.currentItem.status === "reviewed" || markReviewed.isPending}
        >
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.goNext} disabled={!nav.hasNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function CreateQueueDialog({
  open,
  onOpenChange,
  onCreated,
  createQueue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (queueId: string) => void;
  createQueue: ReturnType<typeof useCreateReviewQueue>;
}) {
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [propertyClass, setPropertyClass] = useState("");
  const [limit, setLimit] = useState("50");

  const handleSubmit = () => {
    if (!name.trim()) return;
    createQueue.mutate(
      {
        name: name.trim(),
        neighborhoodCode: neighborhood || undefined,
        propertyClass: propertyClass || undefined,
        limit: parseInt(limit) || 50,
      },
      {
        onSuccess: ({ queue }) => {
          onCreated(queue.id);
          setName("");
          setNeighborhood("");
          setPropertyClass("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <Plus className="w-3 h-3" />
          New Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Review Queue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Queue Name</Label>
            <Input
              placeholder="e.g., Neighborhood 101 Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Neighborhood Code (optional)</Label>
              <Input placeholder="e.g., 101" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Property Class (optional)</Label>
              <Input placeholder="e.g., Residential" value={propertyClass} onChange={(e) => setPropertyClass(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Parcels</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 parcels</SelectItem>
                <SelectItem value="50">50 parcels</SelectItem>
                <SelectItem value="100">100 parcels</SelectItem>
                <SelectItem value="200">200 parcels</SelectItem>
                <SelectItem value="500">500 parcels</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim() || createQueue.isPending} className="w-full bg-primary text-primary-foreground">
            {createQueue.isPending ? "Creating..." : "Create & Start Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
