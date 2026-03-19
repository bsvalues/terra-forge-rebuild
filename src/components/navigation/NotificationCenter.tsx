// TerraFusion OS — Phase 92: Notification Center Dropdown
// Bell icon with badge + dropdown panel for realtime notifications.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, CheckCheck, Trash2, X, Info, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationStore, type AppNotification } from "@/hooks/useNotificationStore";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "text-chart-5", bg: "bg-chart-5/10" },
  error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-chart-4", bg: "bg-chart-4/10" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10" },
};

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
        "flex items-start gap-2.5 px-3 py-2.5 border-b border-border/20 last:border-0 transition-colors",
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

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  } = useNotificationStore();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-muted/40 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <span className="text-xs font-medium text-foreground">Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 text-[10px] gap-1 px-2">
                <CheckCheck className="w-3 h-3" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-[10px] gap-1 px-2 text-destructive/60 hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <AnimatePresence>
              {notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => markAsRead(n.id)}
                  onRemove={() => removeNotification(n.id)}
                />
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
