// TerraFusion OS — Phase 85.2: Notification Center Dropdown
// Bell icon with badge + dropdown panel.
// Merges DB-backed persistent notifications (Phase 85) with
// in-memory transient toasts (useNotificationStore).

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, CheckCheck, Trash2, X, Info, AlertTriangle,
  CheckCircle2, XCircle, Clock, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationStore, type AppNotification } from "@/hooks/useNotificationStore";
import { useDBNotifications, type DBNotification } from "@/hooks/useDBNotifications";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "text-chart-5", bg: "bg-chart-5/10" },
  error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-chart-4", bg: "bg-chart-4/10" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10" },
  critical: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  deadline: { icon: Calendar, color: "text-chart-4", bg: "bg-chart-4/10" },
  dq_alert: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  assignment: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  blocker: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  system: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/20" },
};

// ── In-memory (transient) notification row ────────────────────────
function NotificationItem({
  notification,
  onRead,
  onRemove,
}: {
  notification: AppNotification;
  onRead: () => void;
  onRemove: () => void;
}) {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 border-b border-border/20 last:border-0 transition-colors cursor-pointer",
        notification.read ? "opacity-60" : "bg-muted/10"
      )}
      onClick={onRead}
    >
      <div className={cn("p-1 rounded-md mt-0.5 shrink-0", config.bg)}>
        <Icon className={cn("w-3 h-3", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{notification.title}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
        <span className="text-[9px] text-muted-foreground/60 mt-1 block">
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ── DB-backed (persistent) notification row ───────────────────────
function DBNotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: DBNotification;
  onRead: () => void;
  onDelete: () => void;
}) {
  const config = TYPE_CONFIG[notification.notification_type] ?? TYPE_CONFIG[notification.severity] ?? TYPE_CONFIG.info;
  const Icon = config.icon;
  const isUnread = !notification.read_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 border-b border-border/20 last:border-0 transition-colors cursor-pointer",
        isUnread ? "bg-muted/10" : "opacity-60"
      )}
      onClick={onRead}
    >
      <div className={cn("p-1 rounded-md mt-0.5 shrink-0", config.bg)}>
        <Icon className={cn("w-3 h-3", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-medium text-foreground truncate">{notification.title}</p>
          {notification.notification_type !== "system" && (
            <Badge variant="outline" className="text-[8px] px-1 shrink-0 capitalize">
              {notification.notification_type}
            </Badge>
          )}
        </div>
        {notification.body && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
        )}
        <span className="text-[9px] text-muted-foreground/60 mt-1 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);

  // In-memory transient toasts
  const {
    notifications: toastNotifications,
    unreadCount: toastUnread,
    markAsRead: markToastRead,
    markAllAsRead: markAllToastsRead,
    clearAll: clearAllToasts,
    removeNotification,
  } = useNotificationStore();

  // DB-backed persistent notifications
  const {
    notifications: dbNotifications,
    unreadCount: dbUnread,
    markAsRead: markDBRead,
    markAllAsRead: markAllDBRead,
    deleteNotification,
    clearAll: clearAllDB,
  } = useDBNotifications();

  const totalUnread = toastUnread + dbUnread;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-muted/40 transition-colors"
          aria-label={`Notifications${totalUnread > 0 ? ` (${totalUnread} unread)` : ""}`}
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {totalUnread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <Tabs defaultValue="alerts">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-border/30">
            <span className="text-xs font-medium text-foreground">Notifications</span>
            <div className="flex items-center gap-1">
              {totalUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { markAllToastsRead(); markAllDBRead(); }}
                  className="h-6 text-[10px] gap-1 px-2"
                >
                  <CheckCheck className="w-3 h-3" />
                  Read all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { clearAllToasts(); clearAllDB(); }}
                className="h-6 text-[10px] gap-1 px-2 text-destructive/60 hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <TabsList className="h-7 mx-3 mt-1.5 mb-0 gap-0 bg-muted/30 rounded-md w-[calc(100%-1.5rem)]">
            <TabsTrigger value="alerts" className="flex-1 text-[10px] h-6 gap-1">
              Alerts
              {dbUnread > 0 && (
                <span className="min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5">
                  {dbUnread}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-[10px] h-6 gap-1">
              Activity
              {toastUnread > 0 && (
                <span className="min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold px-0.5">
                  {toastUnread}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* DB-backed alerts tab */}
          <TabsContent value="alerts" className="m-0">
            {dbNotifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs">No alerts</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <AnimatePresence>
                  {dbNotifications.map((n) => (
                    <DBNotificationItem
                      key={n.id}
                      notification={n}
                      onRead={() => markDBRead(n.id)}
                      onDelete={() => deleteNotification(n.id)}
                    />
                  ))}
                </AnimatePresence>
              </ScrollArea>
            )}
          </TabsContent>

          {/* In-memory activity tab */}
          <TabsContent value="activity" className="m-0">
            {toastNotifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs">No activity yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <AnimatePresence>
                  {toastNotifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={() => markToastRead(n.id)}
                      onRemove={() => removeNotification(n.id)}
                    />
                  ))}
                </AnimatePresence>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
