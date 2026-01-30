import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationStore } from "./useNotificationStore";
import { useNotificationSound } from "./useNotificationSound";

interface ScrapeJob {
  id: string;
  job_type: string;
  status: string;
  counties_completed: number;
  counties_total: number;
  parcels_enriched: number;
  sales_added: number;
  current_county?: string;
  started_at?: string;
}

export function useScrapeJobNotifications() {
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const notificationPermissionRef = useRef<NotificationPermission>("default");
  const { addNotification } = useNotificationStore();
  const { playSound } = useNotificationSound();

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
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: "scrape-job-notification",
        requireInteraction: false,
        silent: true, // We play our own sound
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Focus window on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
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
      case "completed": {
        const message = `Enriched ${job.parcels_enriched.toLocaleString()} parcels, added ${job.sales_added.toLocaleString()} sales across ${job.counties_total} counties.`;
        
        // Add to persistent store
        addNotification({
          type: "success",
          title: `${jobTypeName} completed!`,
          message,
          jobId: job.id,
          metadata: {
            parcelsEnriched: job.parcels_enriched,
            salesAdded: job.sales_added,
            countiesTotal: job.counties_total,
          },
        });

        // Play success sound
        playSound("success");

        // Show toast
        toast.success(`${jobTypeName} completed!`, {
          description: message,
          duration: 10000,
          action: {
            label: "View",
            onClick: () => {
              // Could navigate to jobs tab
            },
          },
        });

        // Browser notification
        sendBrowserNotification(
          `${jobTypeName} Complete`,
          `Enriched ${job.parcels_enriched.toLocaleString()} parcels across ${job.counties_total} counties`
        );
        break;
      }

      case "failed": {
        const message = `Processed ${job.counties_completed}/${job.counties_total} counties before failure.`;
        
        addNotification({
          type: "error",
          title: `${jobTypeName} failed`,
          message,
          jobId: job.id,
        });

        playSound("error");

        toast.error(`${jobTypeName} failed`, {
          description: message,
          duration: 15000,
        });

        sendBrowserNotification(
          `${jobTypeName} Failed`,
          `Job failed after processing ${job.counties_completed} counties`
        );
        break;
      }

      case "cancelled": {
        const message = `Stopped at ${job.counties_completed}/${job.counties_total} counties.`;
        
        addNotification({
          type: "warning",
          title: `${jobTypeName} cancelled`,
          message,
          jobId: job.id,
        });

        playSound("warning");

        toast.warning(`${jobTypeName} cancelled`, {
          description: message,
          duration: 5000,
        });
        break;
      }

      case "running":
        if (previousStatus === "pending") {
          const message = `Processing ${job.counties_total} counties...`;
          
          addNotification({
            type: "info",
            title: `${jobTypeName} started`,
            message,
            jobId: job.id,
          });

          playSound("info");

          toast.info(`${jobTypeName} started`, {
            description: message,
            duration: 3000,
          });
        }
        break;
    }
  }, [addNotification, playSound, sendBrowserNotification]);

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
