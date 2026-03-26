// TerraFusion OS — County Compatibility Score (Phase 189)
// Composite onboarding readiness score per county:
//   coverage_pct × 0.4 + parcel_count_ratio × 0.3 + key_fields_present × 0.3
// Key fields: parcel_id, owner_name, market_value, situs_address, hood_cd

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, MapPin, Database } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountySchemaDiff } from "@/hooks/useCountySchemaDiff";

// ── Key fields that drive the score ──────────────────────────────────────────
const KEY_FIELDS = ["parcel_id", "owner_name", "market_value", "situs_address", "hood_cd"] as const;

// ── Score computation (pure, no hooks) ───────────────────────────────────────
function computeScore(coveragePct: number, matchedKeys: string[], parcelCount: number): {
  score: number;
  verdict: "ready" | "partial" | "stub";
  keyFieldsPresent: number;
} {
  const keyFieldsPresent = KEY_FIELDS.filter((k) => matchedKeys.includes(k)).length;
  const keyFieldRatio = keyFieldsPresent / KEY_FIELDS.length;
  // parcel_count_ratio: 0 → 0, 50K → 0.5, 100K → 1.0 (cap at 1)
  const parcelCountRatio = Math.min(parcelCount / 100_000, 1);
  const score = Math.round(
    coveragePct * 0.4 + parcelCountRatio * 100 * 0.3 + keyFieldRatio * 100 * 0.3
  );
  const verdict: "ready" | "partial" | "stub" =
    score >= 65 ? "ready" : score >= 35 ? "partial" : "stub";
  return { score, verdict, keyFieldsPresent };
}

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }: { verdict: "ready" | "partial" | "stub" }) {
  if (verdict === "ready") {
    return (
      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />Ready
      </Badge>
    );
  }
  if (verdict === "partial") {
    return (
      <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />Partial
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30">
      <XCircle className="w-3 h-3 mr-1" />Stub
    </Badge>
  );
}

// ── Single county card ────────────────────────────────────────────────────────
function CountyScoreCard({ slug, name }: { slug: string; name: string }) {
  const { data, isLoading } = useCountySchemaDiff(slug);

  if (isLoading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!data) {
    return (
      <Card className="material-bento border-border/50 opacity-50">
        <CardContent className="p-4 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground/40" />
          <div>
            <p className="text-xs font-medium text-foreground">{name}</p>
            <p className="text-[10px] text-muted-foreground">No schema data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matchedKeys = Object.keys(data.matched);
  const { score, verdict, keyFieldsPresent } = computeScore(
    data.coverage_pct,
    matchedKeys,
    data.parcel_count ?? 0,
  );

  const scoreColor =
    score >= 65 ? "text-emerald-400" :
    score >= 35 ? "text-amber-400" :
    "text-rose-400";

  return (
    <Card className="material-bento border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{data.vendor}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xl font-semibold tabular-nums ${scoreColor}`}>{score}</span>
            <VerdictBadge verdict={verdict} />
          </div>
        </div>

        <Progress value={score} className="h-1.5" />

        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>
            <span className="text-foreground/70">{data.coverage_pct}%</span> schema
          </span>
          <span>
            <span className="text-foreground/70">{keyFieldsPresent}/{KEY_FIELDS.length}</span> key fields
          </span>
          {data.parcel_count != null && (
            <span>
              <span className="text-foreground/70">
                {data.parcel_count >= 1000
                  ? `${Math.round(data.parcel_count / 1000)}K`
                  : data.parcel_count}
              </span> parcels
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const OPEN_DATA_COUNTIES = [
  { slug: "franklin",  name: "Franklin County"  },
  { slug: "yakima",    name: "Yakima County"     },
  { slug: "thurston",  name: "Thurston County"   },
  { slug: "clark",     name: "Clark County"      },
  { slug: "king",      name: "King County"       },
  { slug: "snohomish", name: "Snohomish County"  },
];

export function CountyCompatibilityScore() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-medium text-foreground">County Compatibility Scores</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Composite onboarding readiness — schema coverage · key fields · parcel count
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />Ready ≥65
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />Partial 35–64
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />Stub &lt;35
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {OPEN_DATA_COUNTIES.map(({ slug, name }) => (
          <CountyScoreCard key={slug} slug={slug} name={name} />
        ))}
      </div>

      <Card className="material-bento border-border/50 bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Database className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/60">Score formula</p>
              <p>Score = Schema coverage × 0.4 + Parcel count ratio × 0.3 + Key fields present × 0.3</p>
              <p>Key fields: {KEY_FIELDS.join(", ")}.  Parcel count ratio caps at 100K parcels.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
