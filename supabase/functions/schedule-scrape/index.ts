import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRequest {
  action: "create" | "pause" | "resume" | "delete" | "trigger";
  scheduleId: string;
  cronExpression?: string;
  counties?: string[];
  batchSize?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin role for schedule management
    let auth;
    try {
      auth = await requireAdmin(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createServiceClient();

    const { action, scheduleId, cronExpression, counties, batchSize }: ScheduleRequest = await req.json();

    // Input validation
    if (!["create", "pause", "resume", "delete", "trigger"].includes(action)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!scheduleId || typeof scheduleId !== "string") {
      return new Response(JSON.stringify({ success: false, error: "scheduleId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cronExpression && !/^[\d\s\*\/\-\,]+$/.test(cronExpression)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid cron expression format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[schedule-scrape] Admin ${auth.userId} Action: ${action}, Schedule ID: ${scheduleId}`);

    switch (action) {
      case "create": {
        const jobName = `scrape_${scheduleId.slice(0, 8)}`;
        const functionUrl = `${supabaseUrl}/functions/v1/statewide-scrape`;
        const requestBody = JSON.stringify({
          counties: counties || [],
          batchSize: batchSize || 10,
          scheduledJobId: scheduleId,
        });

        const { data: cronResult, error: cronError } = await supabase.rpc("schedule_scrape_job", {
          p_job_name: jobName,
          p_cron_expression: cronExpression || "0 2 * * *",
          p_function_url: functionUrl,
          p_anon_key: supabaseAnonKey,
          p_request_body: requestBody,
        });

        if (cronError) {
          console.error("[schedule-scrape] Failed to create cron job:", cronError);
          console.log("[schedule-scrape] Cron scheduling not available, schedule saved for manual runs");
        } else {
          await supabase.from("scheduled_scrapes").update({ cron_job_id: cronResult }).eq("id", scheduleId);
        }

        return new Response(JSON.stringify({ success: true, message: "Schedule created" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "pause": {
        const { data: schedule } = await supabase.from("scheduled_scrapes").select("cron_job_id").eq("id", scheduleId).single();
        if (schedule?.cron_job_id) {
          await supabase.rpc("pause_scrape_job", { p_job_id: schedule.cron_job_id });
        }
        return new Response(JSON.stringify({ success: true, message: "Schedule paused" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resume": {
        const { data: schedule } = await supabase.from("scheduled_scrapes").select("cron_job_id").eq("id", scheduleId).single();
        if (schedule?.cron_job_id) {
          await supabase.rpc("resume_scrape_job", { p_job_id: schedule.cron_job_id });
        }
        return new Response(JSON.stringify({ success: true, message: "Schedule resumed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { data: schedule } = await supabase.from("scheduled_scrapes").select("cron_job_id").eq("id", scheduleId).single();
        if (schedule?.cron_job_id) {
          await supabase.rpc("unschedule_scrape_job", { p_job_id: schedule.cron_job_id });
        }
        return new Response(JSON.stringify({ success: true, message: "Schedule deleted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "trigger": {
        const { data: schedule } = await supabase.from("scheduled_scrapes").select("*").eq("id", scheduleId).single();
        if (!schedule) throw new Error("Schedule not found");

        const response = await fetch(`${supabaseUrl}/functions/v1/statewide-scrape`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ action: "start", counties: schedule.counties, batchSize: schedule.batch_size }),
        });

        if (!response.ok) throw new Error(`Failed to trigger scrape: ${response.statusText}`);

        await supabase.from("scheduled_scrapes").update({ last_run_at: new Date().toISOString() }).eq("id", scheduleId);

        return new Response(JSON.stringify({ success: true, message: "Scrape triggered" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("[schedule-scrape] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
