/**
 * TerraFusion OS — 3D Palette Constants
 * 
 * Central governance for all Three.js hex colors.
 * CSS vars don't work in WebGL/Three.js, so we maintain hex constants
 * that are semantically aligned with the --tf-* design tokens.
 * 
 * Token alignment:
 *   --tf-transcend-cyan   → TF3D.cyan
 *   --tf-optimized-green  → TF3D.green
 *   --tf-sacred-gold      → TF3D.gold
 *   --tf-anomaly-amber    → TF3D.amber
 *   --tf-warning-red      → TF3D.red
 *   --tf-muse-purple      → TF3D.purple
 *   --tf-substrate        → TF3D.substrate
 *   --tf-surface          → TF3D.surface
 *   --tf-elevated         → TF3D.elevated
 *   --muted-foreground    → TF3D.muted
 */

/** Core palette — hex values aligned to CSS token HSL equivalents */
export const TF3D = {
  // Energy spectrum
  cyan:       "#00E5E5",   // --tf-transcend-cyan  (180 90% 48%)
  brightCyan: "#00CCFF",   // --tf-bright-cyan
  green:      "#10B981",   // --tf-optimized-green  (155 80% 48%)
  gold:       "#D4AF37",   // --tf-sacred-gold      (45 92% 58%)
  amber:      "#F59E0B",   // --tf-anomaly-amber    (38 92% 58%)
  red:        "#EF4444",   // --tf-warning-red       (0 72% 58%)
  purple:     "#8B5CF6",   // --tf-muse-purple      (280 70% 65%)
  pink:       "#EC4899",   // pink accent            (330 81% 60%)

  // Surfaces
  substrate:  "#060A14",   // --tf-substrate        (220 50% 4%)
  surface:    "#0B1120",   // --tf-surface          (222 47% 7%)
  elevated:   "#1a2744",   // --tf-elevated         (220 35% 14%)
  deep:       "#0d1526",   // slightly darker than substrate

  // Neutrals
  muted:      "#6B7280",   // --muted-foreground
  mutedLight: "#9CA3AF",   // lighter muted for secondary labels
  white:      "#FFFFFF",

  // Lighting presets (semantic)
  lightPrimary:   "#00E5E5",
  lightSecondary: "#0080FF",
  lightAccent:    "#D4AF37",
} as const;

/** State color pairs for animated components (e.g. TerraSphere) */
export const TF3D_STATES = {
  idle:       { primary: TF3D.cyan,      secondary: TF3D.lightSecondary },
  boot:       { primary: TF3D.cyan,      secondary: TF3D.green },
  processing: { primary: TF3D.brightCyan, secondary: TF3D.cyan },
  alert:      { primary: TF3D.red,       secondary: TF3D.amber },
  success:    { primary: TF3D.green,     secondary: TF3D.cyan },
} as const;

/** File-type color mapping for AxiomFS lattice */
export const TF3D_FILE_TYPES = {
  folder:   TF3D.cyan,
  document: TF3D.green,
  image:    TF3D.amber,
  data:     TF3D.purple,
  config:   TF3D.gold,
  default:  TF3D.muted,
} as const;

/** Valuation feature category colors */
export const TF3D_FEATURE_CATEGORIES = {
  physical:   TF3D.cyan,
  location:   TF3D.gold,
  market:     TF3D.green,
  adjustment: TF3D.amber,
  default:    TF3D.muted,
} as const;

/** Ratio deviation color thresholds */
export function ratioDeviationColor(deviation: number): string {
  if (deviation < 0.03) return TF3D.green;
  if (deviation < 0.07) return TF3D.amber;
  return TF3D.red;
}

export type TF3DPalette = typeof TF3D;
