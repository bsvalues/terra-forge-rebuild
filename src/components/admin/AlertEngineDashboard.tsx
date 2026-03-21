// TerraFusion OS — Phase 91: Alert Engine Dashboard
// Admin panel for the notification-alerts rule engine.
// Lets administrators trigger alert checks manually, see last-run results,
// and browse recent notifications by type and severity.

import { motion } from "framer-motion";
import {
  Bell,
  Play,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CalendarClock,
  BarChart2,
  Workflow,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRunAlerts } from "@/hooks/useRunAlerts";
import { useCountyNotifications } from "@/hooks/useCountyNotifications";
import type { DBNotification, NotificationType, NotificationSeverity } from "@/hooks/useDBNotifications";

// ── Rule descriptor cards ─────────────────────────────────────────

interface AlertRule {
  type: NotificationType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  dedupWindow: string;
  severity: NotificationSeverity;
  color: string;
}

const ALERT_RULES: AlertRule[] = [
  {
    type: "deadline",
    label: "Appeal Hearing Deadlines",
    Icon: CalendarClock,
    description:
      "Scans scheduled appeals with hearing dates within the next 7 days. Notifies all county analysts and admins. Critical if hearing is ≤1 day away.",
    dedupWindow: "22 hours",
    severity: "warning",
    color: "text-orange-400",
  },
  {
    type: "dq_alert",
    label: "DQ Score Regression",
    Icon: BarChart2,
    description:
      "Compares the two most recent dq_score_computed trace events for the county. Fires if quality score dropped ≥5%. Critical if drop is ≥15%.",
    dedupWindow: "1 hour",
    severity: "critical",
    color: "text-red-400",
  },
  {
    type: "assignment",
    label: "Workflow Assignments",
    Icon: Workflow,
    description:
      "Identifies active workflow instances assigned to the current user, created in the last 24 hours. Sends a one-time notification per unique assignment.",
    dedupWindow: "per assignment",
    severity: "info",
    color: "text-blue-400",
  },
];

// ── Severity helpers ──────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: NotificationSeverity }) {
  if (severity === "critical")
    return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  if (severity === "warning")
    return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
  return <Info className="w-3.5 h-3.5 text-blue-400" />;
}

function severityBadgeClass(severity: NotificationSeverity): string {
  if (severity === "critical") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (severity === "warning") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

function typeLabel(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    deadline: "Deadline",
    dq_alert: "DQ Alert",
    assignment: "Assignment",
    blocker: "Blocker",
    system: "System",
  };
  return map[type] ?? type;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Notification row ──────────────────────────────────────────────

function NotificationRow({ n }: { n: DBNotification }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5">
        <SeverityIcon severity={n.severity} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{n.title}</span>
          <Badge className={`text-[10px] px-1.5 py-0 border ${severityBadgeClass(n.severity)}`}>
            {typeLabel(n.notification_type)}
          </Badge>
          {!n.read_at && (
            <span className="w-1.5 h-1.5 rounded-full bg-tf-cyan flex-shrink-0" />
          )}
        </div>
        {n.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
        {relativeTime(n.created_at)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export function AlertEngineDashboard() {
  const { mutate: runAlerts, isPending, isSuccess, isError, error, lastRun } = useRunAlerts();
  const { data: notifications = [], isLoading: notifsLoading, refetch } = useCountyNotifications();

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="material-bento rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Alert Engine</h3>
              <p className="text-sm text-muted-foreground">
                Run the 3-rule notification check for this county
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastRun && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Last run {relativeTime(lastRun.ran_at)}</span>
              </div>
            )}
            <Button
              onClick={() => runAlerts()}
              disabled={isPending}
              className={`gap-2 ${
                isPending
                  ? "bg-violet-500/20 text-violet-400"
                  : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-400"
              }`}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Alert Checks
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Last-run result banner */}
        {isSuccess && lastRun && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-400">
              Alert check complete —{" "}
              <strong>{lastRun.result.notifications_created}</strong>{" "}
              {lastRun.result.notifications_created === 1
                ? "notification"
                : "notifications"}{" "}
              created
            </span>
          </motion.div>
        )}

        {isError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">
              {error?.message ?? "Alert run failed. Check edge function logs."}
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Rule Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ALERT_RULES.map((rule, i) => {
          const count = notifications.filter((n) => n.notification_type === rule.type).length;
          return (
            <motion.div
              key={rule.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="material-bento rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <rule.Icon className={`w-4 h-4 ${rule.color}`} />
                  <span className="text-sm font-medium text-foreground">{rule.label}</span>
                </div>
                <Badge className="bg-tf-elevated text-muted-foreground border-border text-[10px] px-1.5 py-0">
                  {count} alerts
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>

              <div className="flex items-center gap-1.5 pt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Dedup window: {rule.dedupWindow}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Recent Notifications ────────────────────────────────── */}
      <div className="material-bento rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground">Recent Notifications</h4>
            {unread > 0 && (
              <Badge className="bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30 text-[10px] px-1.5 py-0">
                {unread} unread
              </Badge>
            )}
          </div>
          <Button
            onClick={() => refetch()}
            className="h-7 px-2 gap-1 bg-transparent hover:bg-tf-elevated text-muted-foreground text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>

        <Separator className="bg-border/50" />

        {notifsLoading ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Loading notifications…
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
            <Bell className="w-8 h-8 mx-auto opacity-20" />
            <p>No notifications yet. Run an alert check to generate them.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="divide-y divide-border/40">
              {notifications.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </motion.div>
  );
}
