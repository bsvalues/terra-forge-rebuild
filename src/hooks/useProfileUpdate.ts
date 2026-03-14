// TerraFusion OS — Profile Update Hook
// Governed mutation for updating user display_name and avatar_url

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitTraceEvent } from "@/services/terraTrace";
import { toast } from "sonner";

export function useProfileUpdate() {
  const [updating, setUpdating] = useState(false);

  const updateDisplayName = useCallback(async (userId: string, displayName: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", userId);

      if (error) throw error;

      await emitTraceEvent({
        eventType: "parcel_updated", // reusing generic event type
        sourceModule: "os",
        eventData: { action: "profile_display_name_updated", displayName },
      }).catch(() => {});

      toast.success("Display name updated");
      return true;
    } catch (err: any) {
      toast.error("Failed to update name", { description: err.message });
      return false;
    } finally {
      setUpdating(false);
    }
  }, []);

  return { updateDisplayName, updating };
}
