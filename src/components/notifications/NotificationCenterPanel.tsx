// TerraFusion OS — Phase 50: Notification Center & Activity Feed

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Activity,
  CheckCheck,
  Trash2,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Zap,
  Database,
  FileText,
  Map,
  Brain,
  Shield,
} from "lucide-react";
import { useNotificationStore, type AppNotification } from "@/hooks/useNotificationStore";
import {
  useActivityFeed,
  useActivityStats,
  getEventDisplay,
  MODULE_COLORS,
  type ActivityModuleFilter,
} from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";

// ── Notification type icons ─────────────────────────────────────
function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  switch (type) {
    case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case "error": return <XCircle className="w-4 h-4 text-destructive" />;
    default: return <Info className="w-4 h-4 text-primary" />;
  }
}

// ── Module icons ────────────────────────────────────────────────
function ModuleIcon({ module }: { module: string }) {
  switch (module) {
    case "forge": return <Zap className="w-3.5 h-3.5" />;
    case "dais": return <Shield className="w-3.5 h-3.5" />;
    case "dossier": return <FileText className="w-3.5 h-3.5" />;
    case "atlas": return <Map className="w-3.5 h-3.5" />;
    case "pilot": return <Brain className="w-3.5 h-3.5" />;
    default: return <Database className="w-3.5 h-3.5" />;
  }
}

function timeAgo(ts: number | string) {
  const diff = Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const MODULE_FILTERS: { value: ActivityModuleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "forge", label: "Forge" },
  { value: "dais", label: "Dais" },
  { value: "atlas", label: "Atlas" },
  { value: "dossier", label: "Dossier" },
  { value: "os", label: "OS" },
  { value: "pilot", label: "Pilot" },
];

export function NotificationCenterPanel() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  } = useNotificationStore();

  const [moduleFilter, setModuleFilter] = useState<ActivityModuleFilter>("all");
  const { data: events = [], isLoading: feedLoading } = useActivityFeed({ moduleFilter, limit: 100 });
  const { data: stats } = useActivityStats();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-[hsl(var(--tf-transcend-cyan))] tracking-tight">
          Notification Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System notifications and activity feed across all modules
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Unread", value: unreadCount, icon: Bell, color: "text-primary" },
          { label: "Total Alerts", value: notifications.length, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Events 24h", value: stats?.events24h ?? 0, icon: Activity, color: "text-tf-cyan" },
          { label: "Events 7d", value: stats?.events7d ?? 0, icon: Clock, color: "text-tf-green" },
        ].map((s) => (
          <Card key={s.label} className="bg-[hsl(var(--tf-elevated)/0.5)] border-border/30">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn("w-5 h-5", s.color)} />
              <div>
                <div className="text-xl font-semibold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="bg-[hsl(var(--tf-elevated)/0.5)]">
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Activity Feed
          </TabsTrigger>
        </TabsList>

        {/* ── Notifications Tab ───────────────────────────────── */}
        <TabsContent value="notifications">
          <Card className="bg-[hsl(var(--tf-elevated)/0.3)] border-border/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">System Notifications</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark All Read
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1 text-destructive"
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Bell className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs mt-1 opacity-60">System events will appear here in real time</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    <AnimatePresence>
                      {notifications.map((n) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer",
                            !n.read && "bg-primary/5 border-l-2 border-l-primary"
                          )}
                          onClick={() => markAsRead(n.id)}
                        >
                          <NotificationIcon type={n.type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{n.title}</span>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.timestamp)}</span>
                              {n.metadata?.sourceModule && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                  {String(n.metadata.sourceModule)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity Feed Tab ───────────────────────────────── */}
        <TabsContent value="activity">
          <Card className="bg-[hsl(var(--tf-elevated)/0.3)] border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Trace Events (Last 7 days)</CardTitle>
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                  {MODULE_FILTERS.map((f) => (
                    <Button
                      key={f.value}
                      size="sm"
                      variant={moduleFilter === f.value ? "secondary" : "ghost"}
                      className="text-[10px] h-6 px-2"
                      onClick={() => setModuleFilter(f.value)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {feedLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Activity className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No activity recorded</p>
                    <p className="text-xs mt-1 opacity-60">Trace events will appear as actions occur</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {events.map((ev) => {
                      const display = getEventDisplay(ev.event_type);
                      const moduleColor = MODULE_COLORS[ev.source_module] ?? "text-muted-foreground";
                      return (
                        <div
                          key={ev.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                        >
                          <div className={cn("mt-0.5", moduleColor)}>
                            <ModuleIcon module={ev.source_module} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{display.label}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1 py-0 h-4",
                                  display.category === "action" && "border-primary/40 text-primary",
                                  display.category === "system" && "border-tf-cyan/40 text-tf-cyan",
                                  display.category === "audit" && "border-muted-foreground/40"
                                )}
                              >
                                {display.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {ev.source_module}
                              {ev.parcel_id && ` • Parcel ${ev.parcel_id.slice(0, 8)}…`}
                              {ev.event_data?.reason && ` — ${String(ev.event_data.reason)}`}
                              {ev.event_data?.action && ` — ${String(ev.event_data.action).replace(/_/g, " ")}`}
                            </p>
                            <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                              {timeAgo(ev.created_at)} • Actor {ev.actor_id.slice(0, 8)}…
                            </span>
                          </div>
                          {ev.artifact_type && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                              {ev.artifact_type}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
