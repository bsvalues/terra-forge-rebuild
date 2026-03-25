import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote, Plus, Tag, Clock, User, Filter,
  Pin, AlertTriangle, Info, CheckCircle2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useParcelAnnotations,
  useAddAnnotation,
  useTogglePinAnnotation,
  useDeleteAnnotation,
  type Annotation,
} from "@/hooks/useParcelAnnotations";

interface ParcelAnnotationsProps {
  parcelId: string | null;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  general: { icon: StickyNote, color: "text-muted-foreground", label: "General" },
  valuation: { icon: Tag, color: "text-suite-forge", label: "Valuation" },
  legal: { icon: AlertTriangle, color: "text-tf-amber", label: "Legal" },
  inspection: { icon: CheckCircle2, color: "text-tf-green", label: "Inspection" },
  flag: { icon: AlertTriangle, color: "text-destructive", label: "Flag" },
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-tf-gold/20 text-tf-gold",
  high: "bg-destructive/20 text-destructive",
};

export function ParcelAnnotations({ parcelId }: ParcelAnnotationsProps) {
  const { data: annotations = [], isLoading } = useParcelAnnotations(parcelId);
  const addAnnotationMutation = useAddAnnotation(parcelId);
  const togglePinMutation = useTogglePinAnnotation();
  const deleteAnnotationMutation = useDeleteAnnotation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general");
  const [newPriority, setNewPriority] = useState<string>("low");

  if (!parcelId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <Info className="w-4 h-4 mr-2" />
        Select a parcel to view annotations
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const filtered = annotations
    .filter((a) => filterCategory === "all" || a.category === filterCategory)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleAdd = () => {
    if (!newNote.trim()) return;
    addAnnotationMutation.mutate({
      content: newNote,
      category: newCategory as Annotation["category"],
      priority: newPriority as Annotation["priority"],
      tags: [],
    });
    setNewNote("");
    setShowAddForm(false);
  };

  const togglePin = (id: string) => {
    const current = annotations.find((a) => a.id === id);
    if (!current) return;
    togglePinMutation.mutate({ id, pinned: !current.pinned });
  };

  const removeAnnotation = (id: string) => {
    deleteAnnotationMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-suite-dossier" />
          <h3 className="text-sm font-medium text-foreground">Annotations</h3>
          <Badge variant="outline" className="text-[10px]">{annotations.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-7 text-xs w-28">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.entries(categoryConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={showAddForm ? "secondary" : "default"}
            className="h-7 text-xs gap-1"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddForm ? "Cancel" : "Add Note"}
          </Button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="material-bento rounded-lg p-4 space-y-3 border border-suite-dossier/30"
          >
            <Textarea
              placeholder="Enter annotation..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-sm min-h-[80px] bg-background/50"
            />
            <div className="flex items-center gap-3">
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="h-7 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs ml-auto" onClick={handleAdd}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotations List */}
      <div className="space-y-2">
        {filtered.map((annotation) => {
          const cfg = categoryConfig[annotation.category];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={annotation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "material-bento rounded-lg p-3 space-y-2 group",
                annotation.pinned && "border border-tf-gold/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 shrink-0">
                  <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                  <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                  <Badge className={cn("text-[10px]", priorityColors[annotation.priority])}>
                    {annotation.priority}
                  </Badge>
                  {annotation.pinned && <Pin className="w-3 h-3 text-tf-gold" />}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => togglePin(annotation.id)}
                  >
                    <Pin className={cn("w-3 h-3", annotation.pinned ? "text-tf-gold" : "text-muted-foreground")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeAnnotation(annotation.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{annotation.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {annotation.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {annotation.createdBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(annotation.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
