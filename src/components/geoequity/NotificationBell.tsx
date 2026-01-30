import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Check, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useNotificationStore, AppNotification } from "@/hooks/useNotificationStore";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotificationStore();
  const { isSoundEnabled, setSoundEnabled } = useNotificationSound();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
    setSoundEnabledState(isSoundEnabled());
  }, [isSoundEnabled]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const typeStyles: Record<AppNotification["type"], { dot: string; bg: string }> = {
    success: {
      dot: "bg-tf-optimized-green",
      bg: "border-l-tf-optimized-green",
    },
    error: {
      dot: "bg-destructive",
      bg: "border-l-destructive",
    },
    warning: {
      dot: "bg-tf-sacred-gold",
      bg: "border-l-tf-sacred-gold",
    },
    info: {
      dot: "bg-tf-cyan",
      bg: "border-l-tf-cyan",
    },
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-tf-cyan animate-pulse" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-tf-cyan text-xs font-bold"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-tf-elevated border-tf-border" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-tf-border">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 px-2 text-xs text-muted-foreground gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs mt-1 opacity-70">Job status updates will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-tf-border/50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-3 border-l-2 transition-all cursor-pointer hover:bg-tf-substrate/50
                    ${typeStyles[notification.type].bg}
                    ${notification.read ? "opacity-60" : "bg-tf-substrate/30"}
                  `}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeStyles[notification.type].dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-tight">{notification.title}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(notification.timestamp)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Settings Footer */}
        <div className="p-3 border-t border-tf-border bg-tf-substrate/30 space-y-2">
          {/* Sound toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              Notification sounds
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
              className="scale-75"
            />
          </div>

          {/* Browser notification status */}
          <div className="flex items-center justify-between">
            {permissionStatus === "granted" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bell className="w-3.5 h-3.5 text-tf-optimized-green" />
                Desktop notifications enabled
              </div>
            ) : permissionStatus === "denied" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BellOff className="w-3.5 h-3.5 text-destructive" />
                Desktop notifications blocked
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={requestPermission}
                className="w-full text-xs h-7"
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                Enable desktop notifications
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
