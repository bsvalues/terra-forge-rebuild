import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Subscribe to job changes for in-app notifications
  useEffect(() => {
    const channel = supabase
      .channel("notification-bell")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scrape_jobs",
        },
        (payload) => {
          const job = payload.new as {
            id: string;
            job_type: string;
            status: string;
            counties_completed: number;
            counties_total: number;
            parcels_enriched: number;
            sales_added: number;
          };
          const oldJob = payload.old as { status: string };

          // Only notify on status change to terminal states
          if (oldJob.status === job.status) return;

          const jobName = job.job_type === "statewide" ? "Statewide scrape" : job.job_type;

          let notification: Notification | null = null;

          if (job.status === "completed") {
            notification = {
              id: `${job.id}-completed`,
              type: "success",
              title: `${jobName} completed`,
              message: `Enriched ${job.parcels_enriched} parcels, added ${job.sales_added} sales`,
              timestamp: new Date(),
              read: false,
            };
          } else if (job.status === "failed") {
            notification = {
              id: `${job.id}-failed`,
              type: "error",
              title: `${jobName} failed`,
              message: `Stopped at ${job.counties_completed}/${job.counties_total} counties`,
              timestamp: new Date(),
              read: false,
            };
          } else if (job.status === "cancelled") {
            notification = {
              id: `${job.id}-cancelled`,
              type: "warning",
              title: `${jobName} cancelled`,
              message: `Processed ${job.counties_completed}/${job.counties_total} counties`,
              timestamp: new Date(),
              read: false,
            };
          }

          if (notification) {
            setNotifications((prev) => [notification!, ...prev.slice(0, 19)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser notifications not supported");
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === "granted") {
      toast.success("Browser notifications enabled");
    } else if (permission === "denied") {
      toast.error("Notification permission denied");
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const typeColors: Record<string, string> = {
    success: "bg-tf-optimized-green/20 border-tf-optimized-green/30 text-tf-optimized-green",
    error: "bg-destructive/20 border-destructive/30 text-destructive",
    warning: "bg-tf-sacred-gold/20 border-tf-sacred-gold/30 text-tf-sacred-gold",
    info: "bg-tf-cyan/20 border-tf-cyan/30 text-tf-cyan",
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
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-tf-cyan text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-tf-elevated border-tf-border" align="end">
        <div className="flex items-center justify-between p-3 border-b border-tf-border">
          <span className="font-medium text-sm">Notifications</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 px-2 text-xs">
                Mark read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2 text-xs text-muted-foreground">
                Clear
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">Job status updates will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-tf-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 ${notification.read ? "opacity-60" : ""} hover:bg-tf-substrate/50 transition-colors`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[notification.type]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{notification.title}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Browser notification permission */}
        <div className="p-3 border-t border-tf-border bg-tf-substrate/50">
          {permissionStatus === "granted" ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="w-3.5 h-3.5 text-tf-optimized-green" />
              Browser notifications enabled
            </div>
          ) : permissionStatus === "denied" ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BellOff className="w-3.5 h-3.5 text-destructive" />
              Browser notifications blocked
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={requestPermission}
              className="w-full text-xs h-7"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Enable browser notifications
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
