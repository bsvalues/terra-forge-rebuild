import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  counties_completed: number;
  counties_total: number;
  parcels_enriched: number;
  sales_added: number;
}

export function useScrapeJobNotifications() {
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const notificationPermissionRef = useRef<NotificationPermission>("default");

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      notificationPermissionRef.current = permission;
    } else {
      notificationPermissionRef.current = Notification.permission;
    }
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (document.hasFocus()) return; // Only notify if tab is not focused

    try {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: "scrape-job-notification",
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  }, []);

  // Handle job status change
  const handleJobChange = useCallback((job: ScrapeJob) => {
    const previousStatus = previousStatusRef.current.get(job.id);
    
    // Skip if status hasn't changed
    if (previousStatus === job.status) return;
    
    // Update previous status
    previousStatusRef.current.set(job.id, job.status);
    
    // Skip initial load (no previous status)
    if (!previousStatus) return;

    const jobTypeName = job.job_type === "statewide" ? "Statewide scrape" : 
                        job.job_type === "scheduled" ? "Scheduled sync" : 
                        `${job.job_type} job`;

    switch (job.status) {
      case "completed":
        toast.success(`${jobTypeName} completed!`, {
          description: `Enriched ${job.parcels_enriched} parcels, added ${job.sales_added} sales across ${job.counties_total} counties.`,
          duration: 10000,
          action: {
            label: "View",
            onClick: () => {
              // Could navigate to jobs tab
            },
          },
        });
        sendBrowserNotification(
          `${jobTypeName} Complete`,
          `Enriched ${job.parcels_enriched} parcels across ${job.counties_total} counties`
        );
        break;

      case "failed":
        toast.error(`${jobTypeName} failed`, {
          description: `Processed ${job.counties_completed}/${job.counties_total} counties before failure.`,
          duration: 15000,
        });
        sendBrowserNotification(
          `${jobTypeName} Failed`,
          `Job failed after processing ${job.counties_completed} counties`
        );
        break;

      case "cancelled":
        toast.warning(`${jobTypeName} cancelled`, {
          description: `Stopped at ${job.counties_completed}/${job.counties_total} counties.`,
          duration: 5000,
        });
        break;

      case "running":
        if (previousStatus === "pending") {
          toast.info(`${jobTypeName} started`, {
            description: `Processing ${job.counties_total} counties...`,
            duration: 3000,
          });
        }
        break;
    }
  }, [sendBrowserNotification]);

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();

    // Subscribe to realtime changes on scrape_jobs table
    const channel = supabase
      .channel("scrape-jobs-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scrape_jobs",
        },
        (payload) => {
          const job = payload.new as ScrapeJob;
          handleJobChange(job);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scrape_jobs",
        },
        (payload) => {
          const job = payload.new as ScrapeJob;
          // Track new jobs
          previousStatusRef.current.set(job.id, job.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleJobChange, requestNotificationPermission]);

  return {
    requestNotificationPermission,
    notificationPermission: notificationPermissionRef.current,
  };
}
