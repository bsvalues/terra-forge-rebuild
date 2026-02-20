// TerraFusion OS — ExplainThisPanel (X-Ray Vision 2.0)
// "Explain this number" — Source · Freshness · What to do next
//
// Architecture notes:
// - METRIC_CATALOG lives in src/lib/metrics/metricCatalog.ts (single source of truth)
// - History is per-instance via useRef (capped at 20, never module-global)
// - fetchedAtByKey allows per-metric freshness accuracy during history navigation
// - Trust Mode surfaces calculation formulas and technical terms for power users

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info, X, Database, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, TrendingUp, BookOpen, Zap, ChevronLeft,
  ChevronRight, Shield, ExternalLink, Eye, Activity,
  ChevronDown, ChevronUp, FlaskConical, MessageSquare, BarChart2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { METRIC_CATALOG, type MetricExplanation } from "@/lib/metrics/metricCatalog";
import { useTrustMode } from "@/contexts/TrustModeContext";

// Re-export for backward compat
export type { MetricExplanation };
export { METRIC_CATALOG };

const MAX_HISTORY = 20;

// ─── Types ───────────────────────────────────────────────────────

interface ExplainThisPanelProps {
  metricKey: string;
  fetchedAt?: string | null;
  fetchedAtByKey?: Record<string, string | null | undefined>;
  lastChangeLabel?: string | null;
  override?: Partial<MetricExplanation>;
  onNavigate?: (target: string) => void;
  /**
   * Called when the user clicks "Ask Why" — receives a pre-filled prompt string
   * that the caller should inject into TerraPilot.
   */
  onAskWhy?: (prompt: string) => void;
  className?: string;
  children?: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────

export function ExplainThisPanel({
  metricKey,
  fetchedAt,
  fetchedAtByKey,
  lastChangeLabel,
  override,
  onNavigate,
  onAskWhy,
  className,
  children,
}: ExplainThisPanelProps) {
  // ── All hooks BEFORE any conditional returns ─────────────────
  const [open, setOpen] = useState(false);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [deeperOpen, setDeeperOpen] = useState(false);
  const historyRef = useRef<string[]>([metricKey]);
  const { trustMode } = useTrustMode();

  const handleOpen = useCallback(() => {
    const current = historyRef.current;
    if (current[current.length - 1] !== metricKey) {
      historyRef.current = [...current.slice(-(MAX_HISTORY - 1)), metricKey];
      setHistoryIdx(historyRef.current.length - 1);
    } else {
      setHistoryIdx(historyRef.current.length - 1);
    }
    setDeeperOpen(false);
    setOpen(true);
  }, [metricKey]);

  const handleBack = useCallback(() => {
    setHistoryIdx(i => Math.max(0, i - 1));
    setDeeperOpen(false);
  }, []);

  const handleForward = useCallback(() => {
    setHistoryIdx(i => Math.min(historyRef.current.length - 1, i + 1));
    setDeeperOpen(false);
  }, []);

  // Derived values (safe after hooks)
  const activeKey = historyRef.current[historyIdx] ?? metricKey;
  const entry = METRIC_CATALOG[activeKey];

  // Guard: unknown metric key — render children without wrapping
  if (!entry) return <>{children}</>;

  const merged: MetricExplanation = { ...entry, ...override };

  const resolvedFetchedAt = fetchedAtByKey?.[activeKey] ?? fetchedAt ?? null;
  const timeLabel = resolvedFetchedAt
    ? format(new Date(resolvedFetchedAt), "MMM d 'at' h:mm a")
    : null;
  const ageLabel = resolvedFetchedAt
    ? formatDistanceToNow(new Date(resolvedFetchedAt), { addSuffix: true })
    : null;

  const canGoBack = historyIdx > 0;
  const canGoForward = historyIdx < historyRef.current.length - 1;
  const lastViewedKey = canGoBack ? historyRef.current[historyIdx - 1] : null;
  const lastViewedLabel = lastViewedKey ? METRIC_CATALOG[lastViewedKey]?.label : null;

  return (
    <span className="relative inline-block">
      {/* Trigger */}
      <span
        className={cn("cursor-pointer group inline-flex items-center gap-1", className)}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        aria-label={`Explain ${merged.label}`}
      >
        {children}
        <Info
          className={cn(
            "w-3 h-3 shrink-0 transition-colors",
            open
              ? "text-[hsl(var(--tf-transcend-cyan))]"
              : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
          )}
        />
      </span>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute z-50 left-0 top-full mt-2 rounded-xl border border-[hsl(var(--tf-transcend-cyan)/0.2)] bg-card shadow-xl overflow-hidden"
              style={{ width: "22rem" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-[hsl(var(--tf-transcend-cyan)/0.05)]">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-tf-cyan" />
                  <span className="text-xs font-semibold text-tf-cyan">Explain this number</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[hsl(var(--tf-transcend-cyan)/0.12)] text-[9px] font-bold uppercase tracking-wider text-tf-cyan border border-[hsl(var(--tf-transcend-cyan)/0.2)]">
                    <Zap className="w-2 h-2" />
                    X-Ray
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleBack}
                    disabled={!canGoBack}
                    title="Previous metric"
                    className={cn(
                      "p-1 rounded transition-colors",
                      canGoBack ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-not-allowed"
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleForward}
                    disabled={!canGoForward}
                    title="Next metric"
                    className={cn(
                      "p-1 rounded transition-colors",
                      canGoForward ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-not-allowed"
                    )}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-header */}
              <div className="px-4 py-1.5 border-b border-border/30 bg-[hsl(var(--tf-substrate)/0.3)]">
                <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase">
                  Source · Freshness · What to do next
                </p>
              </div>

              {/* Last viewed hint */}
              {lastViewedLabel && (
                <button
                  onClick={handleBack}
                  className="w-full px-4 py-1.5 border-b border-border/20 bg-[hsl(var(--tf-substrate)/0.2)] text-left hover:bg-[hsl(var(--tf-substrate)/0.4)] transition-colors"
                >
                  <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                    <ChevronLeft className="w-2.5 h-2.5" />
                    Last viewed: <span className="text-muted-foreground/70 ml-1">{lastViewedLabel}</span>
                  </p>
                </button>
              )}

              {/* Body */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-foreground">{merged.label}</h3>

                {/* What it means + So what */}
                <Section icon={BookOpen} label="What it means">
                  <p className="text-xs text-foreground/80 leading-relaxed">{merged.whatItMeans}</p>
                  <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-[hsl(var(--tf-transcend-cyan)/0.06)] border border-[hsl(var(--tf-transcend-cyan)/0.15)]">
                    <TrendingUp className="w-3 h-3 text-tf-cyan shrink-0 mt-0.5" />
                    <p className="text-[11px] text-foreground/70 leading-relaxed italic">{merged.soWhat}</p>
                  </div>
                </Section>

                {/* Source */}
                <Section icon={Database} label="Source">
                  <p className="text-xs text-muted-foreground leading-relaxed">{merged.whereItCameFrom}</p>
                </Section>

                {/* Freshness — follows activeKey via fetchedAtByKey */}
                {timeLabel && (
                  <Section icon={Clock} label="Freshness">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-foreground">{timeLabel}</span>
                      <span className="text-[10px] text-muted-foreground/50">({ageLabel})</span>
                    </div>
                  </Section>
                )}

                {/* Updated because */}
                <Section icon={Activity} label="Updated because">
                  {lastChangeLabel ? (
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      <span className="font-medium text-tf-cyan">Last change: </span>
                      {lastChangeLabel}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">{merged.whatChangesIt}</p>
                  )}
                </Section>

                {/* Health note */}
                {merged.healthNote && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-sacred-gold)/0.07)] border border-[hsl(var(--tf-sacred-gold)/0.2)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-tf-gold shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{merged.healthNote}</p>
                  </div>
                )}

                {/* If it looks wrong */}
                {merged.ifItLooksWrong.length > 0 && (
                  <Section icon={CheckCircle2} label="If it looks wrong">
                    <div className="space-y-1.5">
                      {merged.ifItLooksWrong.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => { onNavigate?.(action.target); setOpen(false); }}
                          className="w-full flex items-start justify-between px-3 py-2 rounded-lg bg-[hsl(var(--tf-surface)/0.5)] hover:bg-[hsl(var(--tf-surface))] border border-border/40 hover:border-[hsl(var(--tf-transcend-cyan)/0.3)] transition-all text-left group"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-foreground">{action.label}</span>
                            {action.safe !== false && (
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" />
                                Nothing changes until you confirm
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-tf-cyan transition-colors shrink-0 mt-0.5" />
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Prove it */}
                {merged.proofLinks && merged.proofLinks.length > 0 && (
                  <Section icon={ExternalLink} label="Prove it">
                    <div className="space-y-0.5">
                      {merged.proofLinks.map((link, i) => (
                        <button
                          key={i}
                          onClick={() => { onNavigate?.(link.target); setOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--tf-surface)/0.5)] transition-colors text-left group"
                        >
                          <span className="text-[11px] text-tf-cyan group-hover:underline">{link.label}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/50 group-hover:text-tf-cyan transition-colors" />
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Confidence (only shown when Trust Mode is OFF) */}
                {merged.confidence && !trustMode && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-optimized-green)/0.06)] border border-[hsl(var(--tf-optimized-green)/0.2)]">
                    <BarChart2 className="w-3.5 h-3.5 text-[hsl(var(--tf-optimized-green))] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{merged.confidence}</p>
                  </div>
                )}

                {/* Ask Why — pre-fills TerraPilot with metric context */}
                {onAskWhy && (
                  <div className="border-t border-border/30 pt-3">
                    <button
                      onClick={() => {
                        const prompt = lastChangeLabel
                          ? `Why did "${merged.label}" change? Last change: ${lastChangeLabel}. Metric key: ${activeKey}.`
                          : `Explain why "${merged.label}" is at its current value and what I should do next. Metric key: ${activeKey}.`;
                        onAskWhy(prompt);
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.06)] hover:bg-[hsl(var(--tf-transcend-cyan)/0.12)] border border-[hsl(var(--tf-transcend-cyan)/0.2)] hover:border-[hsl(var(--tf-transcend-cyan)/0.4)] transition-all text-left group"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-tf-cyan shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-tf-cyan font-medium">Ask Why in TerraPilot</span>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Opens a pre-filled conversation with full context attached
                        </p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-tf-cyan/50 group-hover:text-tf-cyan transition-colors shrink-0" />
                    </button>
                  </div>
                )}

                {/* Go deeper — collapsed by default */}

                <div className="border-t border-border/30 pt-3">
                  <button
                    onClick={() => setDeeperOpen(v => !v)}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <span className="text-[11px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                      Want to go deeper?
                    </span>
                    {deeperOpen
                      ? <ChevronUp className="w-3 h-3 text-muted-foreground/40" />
                      : <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
                    }
                  </button>

                  <AnimatePresence>
                    {deeperOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-3">
                          {merged.technicalTerm && (
                            <div className="px-3 py-2 rounded-lg bg-[hsl(var(--tf-substrate)/0.5)] border border-border/30">
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">Technical term</p>
                              <p className="text-xs font-mono text-muted-foreground">{merged.technicalTerm}</p>
                            </div>
                          )}

                          {merged.calculation && trustMode && (
                            <div className="px-3 py-2 rounded-lg bg-[hsl(var(--tf-sacred-gold)/0.05)] border border-[hsl(var(--tf-sacred-gold)/0.2)]">
                              <div className="flex items-center gap-1.5 mb-1">
                                <FlaskConical className="w-3 h-3 text-tf-gold" />
                                <p className="text-[10px] uppercase tracking-widest text-tf-gold/70">Calculation (Trust Mode)</p>
                              </div>
                              <p className="text-xs font-mono text-muted-foreground/80 leading-relaxed">{merged.calculation}</p>
                            </div>
                          )}

                          {merged.calculation && !trustMode && (
                            <p className="text-[10px] text-muted-foreground/40 text-center">
                              Enable Trust Mode (⚙ Control Center) to see the calculation formula.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── Section helper ──────────────────────────────────────────────

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
