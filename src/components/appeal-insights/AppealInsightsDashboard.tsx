// TerraFusion OS — Phase 57: Appeal Insights Dashboard
// County-wide appeal analytics: trends, resolution patterns, neighborhood hotspots

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Scale,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  AlertTriangle,
  MapPin,
  BarChart3,
} from "lucide-react";
import { useAppealAnalytics } from "@/hooks/useAppealAnalytics";

const fmt = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `$${(v / 1_000).toFixed(0)}K`
    : `$${v.toFixed(0)}`;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  settled: "bg-emerald-500/20 text-emerald-400",
  denied: "bg-destructive/20 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  hearing: "bg-purple-500/20 text-purple-400",
};

export function AppealInsightsDashboard() {
  const { data, isLoading } = useAppealAnalytics();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    let results = data.records;
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.parcelNumber.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      results = results.filter((r) => r.status === statusFilter);
    }
    return results;
  }, [data, search, statusFilter]);

  const stats = data?.stats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-suite-dais/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-suite-dais" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-foreground tracking-tight">
              Appeal Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              County-wide appeal analytics, resolution patterns & neighborhood hotspots
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BarChart3 className="w-4 h-4 text-primary" />}
            label="Total Appeals"
            value={stats.total.toString()}
            sub={`${stats.pending} pending`}
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.resolved} resolved`}
          />
          <StatCard
            icon={<TrendingDown className="w-4 h-4 text-amber-400" />}
            label="Total Reduction"
            value={fmt(stats.totalReduction)}
            sub={`Avg ${fmt(stats.avgReduction)}`}
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
            label="Value at Risk"
            value={fmt(stats.totalContested)}
            sub={`${stats.withdrawn} withdrawn`}
          />
        </div>
      )}

      {/* Monthly Trend + Hotspots */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="material-bento rounded-2xl p-5"
          >
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Monthly Filing Trend
            </h3>
            {stats.byMonth.length > 0 ? (
              <div className="space-y-2">
                {stats.byMonth.slice(-12).map((m) => {
                  const max = Math.max(...stats.byMonth.map((x) => x.count));
                  const pct = max > 0 ? (m.count / max) * 100 : 0;
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">
                        {m.month}
                      </span>
                      <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-suite-dais/60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">
                        {m.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No monthly data</p>
            )}
          </motion.div>

          {/* Neighborhood Hotspots */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="material-bento rounded-2xl p-5"
          >
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-destructive" />
              Neighborhood Hotspots
            </h3>
            {stats.hotspots.length > 0 ? (
              <div className="space-y-2">
                {stats.hotspots.map((h, i) => (
                  <div
                    key={h.neighborhood}
                    className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-foreground">{h.neighborhood}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {h.count} appeals
                      </Badge>
                      {h.avgReduction > 0 && (
                        <span className="text-xs text-destructive">
                          ↓ {fmt(h.avgReduction)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hotspot data</p>
            )}
          </motion.div>
        </div>
      )}

      {/* Resolution Breakdown */}
      {stats && Object.keys(stats.byResolution).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="material-bento rounded-2xl p-5"
        >
          <h3 className="text-sm font-medium text-foreground mb-3">Resolution Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byResolution).map(([type, count]) => (
              <Badge key={type} variant="outline" className="gap-1.5 text-xs">
                {type}
                <span className="text-muted-foreground">{count}</span>
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Appeal Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="material-bento rounded-2xl p-5"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-medium text-foreground">
            Appeal Records ({filtered.length})
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search parcel or address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-muted/30"
              />
            </div>
            {stats && (
              <div className="flex gap-1">
                {Object.keys(stats.byStatus).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                    className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium">Parcel</th>
                <th className="text-left py-2 pr-4 font-medium">Filed</th>
                <th className="text-right py-2 pr-4 font-medium">Original</th>
                <th className="text-right py-2 pr-4 font-medium">Requested</th>
                <th className="text-right py-2 pr-4 font-medium">Final</th>
                <th className="text-right py-2 pr-4 font-medium">Delta</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r) => {
                const delta =
                  r.finalValue != null ? r.finalValue - r.originalValue : null;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border/10 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2 pr-4">
                      <div className="font-mono text-foreground">{r.parcelNumber}</div>
                      <div className="text-muted-foreground truncate max-w-[200px]">
                        {r.address}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.appealDate}</td>
                    <td className="py-2 pr-4 text-right font-mono text-foreground">
                      {fmt(r.originalValue)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                      {r.requestedValue != null ? fmt(r.requestedValue) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-foreground">
                      {r.finalValue != null ? fmt(r.finalValue) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {delta != null ? (
                        <span
                          className={
                            delta < 0 ? "text-destructive" : "text-emerald-400"
                          }
                        >
                          {delta < 0 ? "↓" : "↑"} {fmt(Math.abs(delta))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      <Badge
                        className={`text-[10px] capitalize ${
                          STATUS_COLORS[r.status] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <XCircle className="w-5 h-5 mx-auto mb-2 opacity-40" />
                    No appeals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="material-bento rounded-xl p-4 flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xl font-light text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </motion.div>
  );
}
