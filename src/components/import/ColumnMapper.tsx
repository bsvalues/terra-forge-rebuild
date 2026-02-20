// TerraFusion OS — Mapping Studio (ColumnMapper v2)
// "Fix this column mapping" — AI suggestions with confidence + profile save/load.
// Constitutional: no direct DB writes; all profile saves routed through useMappingProfiles.

import { useState } from "react";
import {
  Check, X, ChevronDown, BookOpen, Zap, Save, Star,
  Info, AlertTriangle, ArrowRight, Trash2, RefreshCw,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMappingProfiles, autoDetectMapping, type MappingProfile } from "@/hooks/useMappingProfiles";

// ─── Types ─────────────────────────────────────────────────────

export interface TargetField {
  name: string;
  label: string;
  type: string;
}

export interface MappingEntry {
  target: string;
  confidence: "high" | "medium" | "low" | "manual" | "ignored";
}

interface ColumnMapperProps {
  sourceColumns: string[];
  targetSchema: {
    fields: TargetField[];
    required: string[];
  };
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  datasetType: string;
  /** Called when user loads a saved profile */
  onProfileLoaded?: (profileName: string) => void;
}

// ─── Confidence Badge ───────────────────────────────────────────

function ConfidenceBadge({ level }: { level: MappingEntry["confidence"] }) {
  const map: Record<MappingEntry["confidence"], { label: string; cls: string }> = {
    high:    { label: "High", cls: "bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))] border-[hsl(var(--tf-optimized-green)/0.3)]" },
    medium:  { label: "Medium", cls: "bg-[hsl(var(--tf-sacred-gold)/0.12)] text-[hsl(var(--tf-sacred-gold))] border-[hsl(var(--tf-sacred-gold)/0.3)]" },
    low:     { label: "Low", cls: "bg-[hsl(var(--tf-sovereignty-red)/0.12)] text-[hsl(var(--tf-sovereignty-red))] border-[hsl(var(--tf-sovereignty-red)/0.3)]" },
    manual:  { label: "Manual", cls: "bg-[hsl(var(--tf-transcend-cyan)/0.12)] text-tf-cyan border-[hsl(var(--tf-transcend-cyan)/0.2)]" },
    ignored: { label: "Ignored", cls: "bg-muted text-muted-foreground border-border/50" },
  };
  const { label, cls } = map[level];
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border", cls)}>
      {label}
    </span>
  );
}

// ─── Save Profile Dialog ─────────────────────────────────────────

function SaveProfileDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (name: string, description?: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), desc.trim() || undefined);
    setName("");
    setDesc("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-4 h-4 text-tf-cyan" />
            Save Mapping Profile
          </DialogTitle>
          <DialogDescription>
            Name this mapping so TerraFusion can recognise it next time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
              Profile Name *
            </label>
            <Input
              placeholder="e.g. Tyler CAMA Export v3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
              Description (optional)
            </label>
            <Input
              placeholder="e.g. Benton Co. sales export, annual refresh"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function ColumnMapper({
  sourceColumns,
  targetSchema,
  mapping,
  onMappingChange,
  datasetType,
  onProfileLoaded,
}: ColumnMapperProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);

  const { profiles, isLoading, saveProfile, isSaving, deleteProfile, setDefault } =
    useMappingProfiles(datasetType);

  // Derive confidence map from AI auto-detect (used for display only)
  const detectedMap = autoDetectMapping(
    sourceColumns,
    targetSchema.fields.map((f) => f.name)
  );

  const mappedTargets = new Set(Object.values(mapping).filter((v) => v && v !== "__skip__"));
  const requiredMapped = targetSchema.required.filter((r) => mappedTargets.has(r));
  const allRequiredMapped = requiredMapped.length === targetSchema.required.length;

  const handleMappingChange = (sourceCol: string, targetCol: string) => {
    const next = { ...mapping };
    if (targetCol === "__skip__") {
      delete next[sourceCol];
    } else {
      next[sourceCol] = targetCol;
    }
    onMappingChange(next);
  };

  const loadProfile = (profile: MappingProfile) => {
    const next: Record<string, string> = { ...mapping };
    for (const rule of profile.rules) {
      // Match normalized rule header against source column
      const matched = sourceColumns.find(
        (col) => col.toLowerCase().replace(/[\s_\-\.]+/g, "").replace(/[^a-z0-9]/g, "") === rule.source_header
      );
      if (matched) next[matched] = rule.target_field;
    }
    onMappingChange(next);
    onProfileLoaded?.(profile.name);
  };

  const getRowConfidence = (col: string): MappingEntry["confidence"] => {
    if (!mapping[col] || mapping[col] === "__skip__") return "ignored";
    const detected = detectedMap[col];
    if (!detected) return "manual";
    if (detected.target === mapping[col]) return detected.confidence;
    return "manual";
  };

  const ignoredCount = sourceColumns.filter(
    (c) => !mapping[c] || mapping[c] === "__skip__"
  ).length;

  const visibleColumns = showIgnored
    ? sourceColumns
    : sourceColumns.filter((c) => mapping[c] && mapping[c] !== "__skip__");

  const hiddenColumns = sourceColumns.filter(
    (c) => !mapping[c] || mapping[c] === "__skip__"
  );

  return (
    <div className="space-y-4">
      {/* ── Header bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Mapping Studio</h3>
          {allRequiredMapped ? (
            <Badge className="bg-[hsl(var(--tf-optimized-green)/0.15)] text-[hsl(var(--tf-optimized-green))] border border-[hsl(var(--tf-optimized-green)/0.3)] px-2 py-0.5 text-[10px] font-semibold">
              <Check className="w-3 h-3 mr-1" />
              All required fields mapped
            </Badge>
          ) : (
            <Badge className="bg-[hsl(var(--tf-sovereignty-red)/0.12)] text-[hsl(var(--tf-sovereignty-red))] border border-[hsl(var(--tf-sovereignty-red)/0.25)] px-2 py-0.5 text-[10px] font-semibold">
              <X className="w-3 h-3 mr-1" />
              {targetSchema.required.length - requiredMapped.length} required missing
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Saved profiles dropdown */}
          {!isLoading && profiles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <BookOpen className="w-3 h-3" />
                  Saved Profiles
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {profiles.map((profile) => (
                  <DropdownMenuItem
                    key={profile.id}
                    className="flex items-center justify-between group"
                    onSelect={(e) => { e.preventDefault(); loadProfile(profile); }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {profile.is_default && <Star className="w-3 h-3 text-[hsl(var(--tf-sacred-gold))] shrink-0" />}
                      <span className="truncate text-xs">{profile.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDefault(profile.id); }}
                        className="p-0.5 hover:text-[hsl(var(--tf-sacred-gold))] transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                        className="p-0.5 hover:text-[hsl(var(--tf-sovereignty-red))] transition-colors"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSaveDialogOpen(true)} className="text-xs text-tf-cyan">
                  <Save className="w-3 h-3 mr-2" />
                  Save current mapping…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-[hsl(var(--tf-transcend-cyan)/0.3)] text-tf-cyan hover:bg-[hsl(var(--tf-transcend-cyan)/0.08)]"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="w-3 h-3" />
            Save Profile
          </Button>
        </div>
      </div>

      {/* ── AI recognition banner ────────────────────────── */}
      {profiles.find((p) => p.is_default) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.06)] border border-[hsl(var(--tf-transcend-cyan)/0.2)]">
          <Zap className="w-3.5 h-3.5 text-tf-cyan shrink-0" />
          <p className="text-xs text-foreground/80">
            <span className="font-semibold text-tf-cyan">Recognized: </span>
            {profiles.find((p) => p.is_default)?.name} — default mapping applied.
          </p>
        </div>
      )}

      {/* ── Column list ──────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {/* Column header row */}
        <div className="grid grid-cols-[1fr_20px_220px_80px] items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Column</span>
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Maps To</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Confidence</span>
        </div>

        <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
          {visibleColumns.map((sourceCol) => {
            const targetCol = mapping[sourceCol];
            const confidence = getRowConfidence(sourceCol);
            const targetField = targetSchema.fields.find((f) => f.name === targetCol);
            const isRequired = targetCol && targetSchema.required.includes(targetCol);
            const aiSuggestion = detectedMap[sourceCol];

            return (
              <div
                key={sourceCol}
                className={cn(
                  "grid grid-cols-[1fr_20px_220px_80px] items-center gap-2 px-3 py-2 transition-colors",
                  confidence === "high" && "bg-[hsl(var(--tf-optimized-green)/0.03)]",
                  confidence === "medium" && "bg-[hsl(var(--tf-sacred-gold)/0.03)]",
                  confidence === "low" && "bg-[hsl(var(--tf-sovereignty-red)/0.03)]",
                )}
              >
                {/* Source */}
                <div className="min-w-0">
                  <p className="font-mono text-xs truncate text-foreground">{sourceCol}</p>
                  {aiSuggestion && aiSuggestion.target !== targetCol && (
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      AI suggested: <span className="text-tf-cyan/70">{targetField?.label ?? aiSuggestion.target}</span>
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />

                {/* Target */}
                <Select
                  value={targetCol || "__skip__"}
                  onValueChange={(value) => handleMappingChange(sourceCol, value)}
                >
                  <SelectTrigger
                    className={cn(
                      "h-7 text-xs",
                      confidence === "high" && "border-[hsl(var(--tf-optimized-green)/0.4)] bg-[hsl(var(--tf-optimized-green)/0.05)]",
                      confidence === "medium" && "border-[hsl(var(--tf-sacred-gold)/0.4)] bg-[hsl(var(--tf-sacred-gold)/0.04)]",
                      confidence === "low" && "border-[hsl(var(--tf-sovereignty-red)/0.4)] bg-[hsl(var(--tf-sovereignty-red)/0.03)]",
                      confidence === "manual" && "border-[hsl(var(--tf-transcend-cyan)/0.4)] bg-[hsl(var(--tf-transcend-cyan)/0.04)]",
                    )}
                  >
                    <SelectValue placeholder="Skip this column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__skip__">
                      <span className="text-muted-foreground text-xs">⊘ Skip / Ignore</span>
                    </SelectItem>
                    {targetSchema.fields.map((field) => {
                      const alreadyMapped = mappedTargets.has(field.name) && mapping[sourceCol] !== field.name;
                      const req = targetSchema.required.includes(field.name);
                      return (
                        <SelectItem key={field.name} value={field.name} disabled={alreadyMapped}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{field.label}</span>
                            {req && <span className="text-[9px] text-[hsl(var(--tf-sovereignty-red))] font-bold">REQ</span>}
                            {alreadyMapped && <span className="text-[9px] text-muted-foreground">(in use)</span>}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Confidence + tooltip */}
                <div className="flex items-center justify-end gap-1">
                  <ConfidenceBadge level={confidence} />
                  {(isRequired || targetField) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[180px]">
                          <p className="text-xs">Type: <span className="font-mono">{targetField?.type ?? "—"}</span></p>
                          {isRequired && <p className="text-[hsl(var(--tf-sovereignty-red))] text-xs mt-0.5">Required field</p>}
                          {confidence === "low" && (
                            <p className="text-[hsl(var(--tf-sacred-gold))] text-xs mt-0.5">Low confidence — please verify this mapping.</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            );
          })}

          {/* Ignored columns toggle */}
          {ignoredCount > 0 && (
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
              <span className="text-[11px] text-muted-foreground/60">
                {showIgnored ? "Hide" : "Show"} {ignoredCount} ignored column{ignoredCount !== 1 ? "s" : ""}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/40 transition-transform", showIgnored && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {/* ── Required fields warning ──────────────────────── */}
      {!allRequiredMapped && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-sovereignty-red)/0.07)] border border-[hsl(var(--tf-sovereignty-red)/0.2)]">
          <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--tf-sovereignty-red))] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-[hsl(var(--tf-sovereignty-red))]">Missing required mappings</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {targetSchema.required
                .filter((r) => !mappedTargets.has(r))
                .map((r) => targetSchema.fields.find((f) => f.name === r)?.label ?? r)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Safety note ───────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
        <Check className="w-3 h-3 shrink-0" />
        Nothing changes until you confirm on the next step
      </div>

      {/* ── Save dialog ───────────────────────────────────── */}
      <SaveProfileDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        isSaving={isSaving}
        onSave={(name, description) => {
          saveProfile({ name, description, mapping });
        }}
      />
    </div>
  );
}
