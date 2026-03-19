// TerraFusion OS — Mapping Studio (ColumnMapper v3)
// "Fix this column mapping" — AI suggestions with confidence + profile save/load.
// "Use this next time" promotion + Transform palette + Test Mode.
// Constitutional: no direct DB writes; all profile saves routed through useMappingProfiles.

import { useState, useMemo } from "react";
import {
  Check, X, ChevronDown, BookOpen, Zap, Save, Star,
  Info, AlertTriangle, ArrowRight, Trash2, RefreshCw,
  Sparkles, FlaskConical, Undo2, Scissors, Type, Calendar, Hash,
  LayoutGrid, FileSearch, Link,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useMappingProfiles, autoDetectMapping, type MappingProfile } from "@/hooks/useMappingProfiles";
import { useTrustMode } from "@/contexts/TrustModeContext";

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
  onProfileLoaded?: (profileName: string) => void;
  /** Sample rows for Test Mode preview */
  sampleRows?: Record<string, string | number | null>[];
}

// ─── Transform Palette ──────────────────────────────────────────

const TRANSFORM_OPTIONS = [
  { id: "trim", label: "Trim spaces", icon: Scissors, description: "Remove leading/trailing whitespace", tier: 1 },
  { id: "uppercase", label: "UPPERCASE", icon: Type, description: "Convert to uppercase", tier: 1 },
  { id: "lowercase", label: "lowercase", icon: Type, description: "Convert to lowercase", tier: 1 },
  { id: "date_mdy", label: "Date MM/DD/YYYY → ISO", icon: Calendar, description: "Parse US date format", tier: 1 },
  { id: "strip_currency", label: "Strip $, commas", icon: Hash, description: "Remove currency symbols", tier: 1 },
  { id: "strip_dashes", label: "Strip dashes", icon: Hash, description: "Remove dashes (APN normalize)", tier: 1 },
  { id: "lookup_map", label: "Replace codes → names", icon: LayoutGrid, description: "Map codes to labels (e.g. R → Residential)", tier: 2 },
  { id: "regex_replace", label: "Advanced replace", icon: FileSearch, description: "Regex pattern replacement (Trust Mode)", tier: 3 },
  { id: "concat", label: "Combine columns", icon: Link, description: "Merge multiple columns", tier: 2 },
] as const;

type TransformId = typeof TRANSFORM_OPTIONS[number]["id"];

function applyTransformPreview(value: string | number | null, transforms: TransformId[]): string {
  let v = String(value ?? "");
  for (const t of transforms) {
    switch (t) {
      case "trim": v = v.trim(); break;
      case "uppercase": v = v.toUpperCase(); break;
      case "lowercase": v = v.toLowerCase(); break;
      case "date_mdy": {
        const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) v = `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        break;
      }
      case "strip_currency": v = v.replace(/[$,]/g, ""); break;
      case "strip_dashes": v = v.replace(/-/g, ""); break;
      case "lookup_map": v = `[lookup: ${v}]`; break;
      case "regex_replace": break; // requires config, preview only
      case "concat": break; // requires multi-column, preview only
    }
  }
  return v;
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
              placeholder="e.g. Salt Lake Co. sales export, annual refresh"
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

// ─── Test Mode Dialog ────────────────────────────────────────────

function TestModeDialog({
  open,
  onOpenChange,
  profile,
  sourceColumns,
  sampleRows,
  targetSchema,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: MappingProfile;
  sourceColumns: string[];
  sampleRows: Record<string, string | number | null>[];
  targetSchema: { fields: TargetField[]; required: string[] };
}) {
  const results = useMemo(() => {
    const mapped: string[] = [];
    const unmapped: string[] = [];
    const conflicts: string[] = [];

    for (const col of sourceColumns) {
      const norm = col.toLowerCase().replace(/[\s_\-\.]+/g, "").replace(/[^a-z0-9]/g, "");
      const rule = profile.rules.find((r) => r.source_header === norm);
      if (rule) {
        const valid = targetSchema.fields.some((f) => f.name === rule.target_field);
        if (valid) mapped.push(`${col} → ${rule.target_field}`);
        else conflicts.push(`${col} → ${rule.target_field} (target not found)`);
      } else {
        unmapped.push(col);
      }
    }
    return { mapped, unmapped, conflicts };
  }, [profile, sourceColumns, targetSchema]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-tf-cyan" />
            Test Profile: {profile.name}
          </DialogTitle>
          <DialogDescription>
            Dry run — no data will be imported or changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {results.mapped.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--tf-optimized-green))] uppercase tracking-wider mb-1">
                ✅ Mapped ({results.mapped.length})
              </p>
              <div className="space-y-0.5">
                {results.mapped.map((m, i) => (
                  <p key={i} className="text-xs text-foreground/80 font-mono pl-2">{m}</p>
                ))}
              </div>
            </div>
          )}
          {results.unmapped.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--tf-sacred-gold))] uppercase tracking-wider mb-1">
                ⚠ Unmapped ({results.unmapped.length})
              </p>
              <div className="space-y-0.5">
                {results.unmapped.map((m, i) => (
                  <p key={i} className="text-xs text-muted-foreground font-mono pl-2">{m}</p>
                ))}
              </div>
            </div>
          )}
          {results.conflicts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--tf-sovereignty-red))] uppercase tracking-wider mb-1">
                ❌ Conflicts ({results.conflicts.length})
              </p>
              <div className="space-y-0.5">
                {results.conflicts.map((m, i) => (
                  <p key={i} className="text-xs text-[hsl(var(--tf-sovereignty-red)/0.8)] font-mono pl-2">{m}</p>
                ))}
              </div>
            </div>
          )}

          {/* Sample row preview */}
          {sampleRows.length > 0 && results.mapped.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sample Row Preview (row 1)
              </p>
              <div className="grid grid-cols-2 gap-1">
                {results.mapped.slice(0, 6).map((m, i) => {
                  const [src, tgt] = m.split(" → ");
                  const val = sampleRows[0]?.[src] ?? "—";
                  return (
                    <div key={i} className="text-[11px] bg-muted/30 rounded px-2 py-1">
                      <span className="text-muted-foreground">{tgt}:</span>{" "}
                      <span className="font-mono text-foreground">{String(val).slice(0, 30)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transform Popover ───────────────────────────────────────────

function TransformPopover({
  transforms,
  onToggle,
  sampleValue,
}: {
  transforms: TransformId[];
  onToggle: (id: TransformId) => void;
  sampleValue?: string | number | null;
}) {
  const { trustMode } = useTrustMode();
  const preview = transforms.length > 0 && sampleValue != null
    ? applyTransformPreview(sampleValue, transforms)
    : null;

  // Filter: hide regex_replace unless Trust Mode is on
  const visibleTransforms = TRANSFORM_OPTIONS.filter(
    (opt) => opt.tier <= 2 || (opt.id === "regex_replace" && trustMode)
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-0.5 rounded transition-colors",
            transforms.length > 0
              ? "text-tf-cyan hover:bg-[hsl(var(--tf-transcend-cyan)/0.1)]"
              : "text-muted-foreground/30 hover:text-muted-foreground/60"
          )}
          title="Add transforms"
        >
          <Sparkles className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="end">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Transforms
        </p>
        <div className="space-y-1">
          {visibleTransforms.map((opt) => {
            const active = transforms.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => onToggle(opt.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                  active
                    ? "bg-[hsl(var(--tf-transcend-cyan)/0.1)] text-tf-cyan"
                    : "hover:bg-muted/60 text-foreground/70"
                )}
              >
                <opt.icon className="w-3 h-3 shrink-0" />
                <span className="flex-1">{opt.label}</span>
                {opt.tier === 2 && <Badge variant="outline" className="text-[8px] py-0 px-1">Tier 2</Badge>}
                {opt.tier === 3 && <Badge variant="outline" className="text-[8px] py-0 px-1 border-[hsl(var(--tf-sacred-gold)/0.4)] text-[hsl(var(--tf-sacred-gold))]">Advanced</Badge>}
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
        {preview !== null && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground">Preview:</p>
            <p className="text-xs font-mono text-foreground truncate">
              {String(sampleValue)} → <span className="text-tf-cyan">{preview}</span>
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
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
  sampleRows = [],
}: ColumnMapperProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [testProfile, setTestProfile] = useState<MappingProfile | null>(null);
  // "Use this next time" promotions — source columns user wants to persist
  const [promotions, setPromotions] = useState<Set<string>>(new Set());
  // Per-column transforms
  const [transforms, setTransforms] = useState<Record<string, TransformId[]>>({});

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
      // Remove promotion if skipped
      setPromotions((prev) => { const n = new Set(prev); n.delete(sourceCol); return n; });
    } else {
      next[sourceCol] = targetCol;
      // Auto-check "use next time" when user manually changes a low/medium confidence mapping
      const detected = detectedMap[sourceCol];
      if (!detected || detected.target !== targetCol || detected.confidence !== "high") {
        setPromotions((prev) => new Set(prev).add(sourceCol));
      }
    }
    onMappingChange(next);
  };

  const toggleTransform = (col: string, transformId: TransformId) => {
    setTransforms((prev) => {
      const existing = prev[col] ?? [];
      const next = existing.includes(transformId)
        ? existing.filter((t) => t !== transformId)
        : [...existing, transformId];
      return { ...prev, [col]: next };
    });
  };

  const loadProfile = (profile: MappingProfile) => {
    const next: Record<string, string> = { ...mapping };
    for (const rule of profile.rules) {
      const matched = sourceColumns.find(
        (col) => col.toLowerCase().replace(/[\s_\-\.]+/g, "").replace(/[^a-z0-9]/g, "") === rule.source_header
      );
      if (matched) {
        next[matched] = rule.target_field;
        // Load transforms from profile
        if (rule.transform) {
          setTransforms((prev) => ({
            ...prev,
            [matched]: rule.transform!.split(",") as TransformId[],
          }));
        }
      }
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

  // Count of user corrections (manual or changed mappings)
  const correctedCount = sourceColumns.filter((c) => {
    const confidence = getRowConfidence(c);
    return confidence === "manual";
  }).length;

  const handleSaveWithPromotions = (name: string, description?: string) => {
    // Build mapping that includes transforms
    const mappingWithTransforms: Record<string, string> = {};
    for (const [source, target] of Object.entries(mapping)) {
      if (target && target !== "__skip__") {
        mappingWithTransforms[source] = target;
      }
    }
    saveProfile({
      name,
      description,
      mapping: mappingWithTransforms,
      transforms,
    });
  };

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
                        onClick={(e) => { e.stopPropagation(); setTestProfile(profile); }}
                        className="p-0.5 hover:text-tf-cyan transition-colors"
                        title="Test profile"
                      >
                        <FlaskConical className="w-3 h-3" />
                      </button>
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

      {/* ── "Use this next time" promotion banner ─────────── */}
      {correctedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-sacred-gold)/0.06)] border border-[hsl(var(--tf-sacred-gold)/0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--tf-sacred-gold))] shrink-0" />
          <p className="text-xs text-foreground/80">
            You corrected {correctedCount} mapping{correctedCount !== 1 ? "s" : ""}.
            {promotions.size > 0 && (
              <span className="text-[hsl(var(--tf-sacred-gold))] font-semibold">
                {" "}{promotions.size} will be saved to your profile.
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Column list ──────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_20px_200px_60px_28px_60px] items-center gap-1.5 px-3 py-2 bg-muted/40 border-b border-border/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">💾</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Column</span>
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Maps To</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Conf.</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Fx</span>
          <span />
        </div>

        <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
          {visibleColumns.map((sourceCol) => {
            const targetCol = mapping[sourceCol];
            const confidence = getRowConfidence(sourceCol);
            const targetField = targetSchema.fields.find((f) => f.name === targetCol);
            const isRequired = targetCol && targetSchema.required.includes(targetCol);
            const aiSuggestion = detectedMap[sourceCol];
            const colTransforms = transforms[sourceCol] ?? [];
            const isPromoted = promotions.has(sourceCol);

            return (
              <div
                key={sourceCol}
                className={cn(
                  "grid grid-cols-[24px_1fr_20px_200px_60px_28px_60px] items-center gap-1.5 px-3 py-2 transition-colors",
                  confidence === "high" && "bg-[hsl(var(--tf-optimized-green)/0.03)]",
                  confidence === "medium" && "bg-[hsl(var(--tf-sacred-gold)/0.03)]",
                  confidence === "low" && "bg-[hsl(var(--tf-sovereignty-red)/0.03)]",
                )}
              >
                {/* "Use next time" checkbox */}
                <div className="flex items-center justify-center">
                  {confidence !== "ignored" && (
                    <Checkbox
                      checked={isPromoted}
                      onCheckedChange={(checked) => {
                        setPromotions((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(sourceCol);
                          else next.delete(sourceCol);
                          return next;
                        });
                      }}
                      className="w-3.5 h-3.5"
                      title="Save this mapping for next time"
                    />
                  )}
                </div>

                {/* Source */}
                <div className="min-w-0">
                  <p className="font-mono text-xs truncate text-foreground">{sourceCol}</p>
                  {aiSuggestion && aiSuggestion.target !== targetCol && (
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      AI suggested: <span className="text-tf-cyan/70">{targetSchema.fields.find(f => f.name === aiSuggestion.target)?.label ?? aiSuggestion.target}</span>
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

                {/* Confidence */}
                <div className="flex items-center justify-center">
                  <ConfidenceBadge level={confidence} />
                </div>

                {/* Transform */}
                <div className="flex items-center justify-center">
                  <TransformPopover
                    transforms={colTransforms}
                    onToggle={(id) => toggleTransform(sourceCol, id)}
                    sampleValue={sampleRows[0]?.[sourceCol]}
                  />
                </div>

                {/* Info tooltip */}
                <div className="flex items-center justify-end">
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
                          {colTransforms.length > 0 && (
                            <p className="text-tf-cyan text-xs mt-0.5">
                              Transforms: {colTransforms.join(", ")}
                            </p>
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
        onSave={handleSaveWithPromotions}
      />

      {/* ── Test mode dialog ──────────────────────────────── */}
      {testProfile && (
        <TestModeDialog
          open={!!testProfile}
          onOpenChange={(v) => !v && setTestProfile(null)}
          profile={testProfile}
          sourceColumns={sourceColumns}
          sampleRows={sampleRows}
          targetSchema={targetSchema}
        />
      )}
    </div>
  );
}
