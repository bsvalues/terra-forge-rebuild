// TerraFusion OS — Realtime Notification Bridge
// Subscribes to trace_events and pushes notifications for important events.

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationStore } from "./useNotificationStore";

const EVENT_LABELS: Record<string, { title: string; type: "success" | "info" | "warning" | "error" }> = {
  value_override_created: { title: "Value Override Applied", type: "info" },
  workflow_state_changed: { title: "Workflow Updated", type: "info" },
  notice_generated: { title: "Notice Generated", type: "success" },
  model_run_completed: { title: "Model Run Complete", type: "success" },
  document_added: { title: "Document Added", type: "info" },
  saga_completed: { title: "Workflow Completed", type: "success" },
  saga_failed: { title: "Workflow Failed", type: "error" },
  saga_compensated: { title: "Workflow Rolled Back", type: "warning" },
  batch_apply_completed: { title: "Batch Apply Complete", type: "success" },
  review_completed: { title: "Review Completed", type: "success" },
};

export function useRealtimeNotifications() {
  const { addNotification } = useNotificationStore();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trace_events",
        },
        (payload) => {
          const event = payload.new as {
            event_type: string;
            source_module: string;
            event_data: Record<string, unknown>;
            parcel_id?: string;
          };

          const label = EVENT_LABELS[event.event_type];
          if (!label) return; // Skip unimportant events like parcel_viewed

          const eventData = event.event_data || {};
          const message = typeof eventData.reason === "string"
            ? eventData.reason
            : `${event.source_module} → ${event.event_type.replace(/_/g, " ")}`;

          addNotification({
            type: label.type,
            title: label.title,
            message: String(message),
            metadata: {
              eventType: event.event_type,
              sourceModule: event.source_module,
              parcelId: event.parcel_id,
            },
          });
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [addNotification]);
}
