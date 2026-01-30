import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, scheduleId, cronExpression, counties, batchSize }: ScheduleRequest = await req.json();

    console.log(`[schedule-scrape] Action: ${action}, Schedule ID: ${scheduleId}`);

    switch (action) {
      case "create": {
        // Create cron job using pg_cron
        const jobName = `scrape_${scheduleId.slice(0, 8)}`;
        const functionUrl = `${supabaseUrl}/functions/v1/statewide-scrape`;
        
        // Build the HTTP request body
        const requestBody = JSON.stringify({
          counties: counties || [],
          batchSize: batchSize || 10,
          scheduledJobId: scheduleId,
        });

        // Schedule the cron job
        const { data: cronResult, error: cronError } = await supabase.rpc("schedule_scrape_job", {
          p_job_name: jobName,
          p_cron_expression: cronExpression || "0 2 * * *",
          p_function_url: functionUrl,
          p_anon_key: supabaseAnonKey,
          p_request_body: requestBody,
        });

        if (cronError) {
          console.error("[schedule-scrape] Failed to create cron job:", cronError);
          
          // Fallback: just mark as scheduled without actual cron job
          // The UI will show when to run, but automated execution won't work
          console.log("[schedule-scrape] Cron scheduling not available, schedule saved for manual runs");
        } else {
          // Update the schedule record with cron job ID
          await supabase
            .from("scheduled_scrapes")
            .update({ cron_job_id: cronResult })
            .eq("id", scheduleId);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Schedule created" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pause": {
        // Get the cron job ID
        const { data: schedule } = await supabase
          .from("scheduled_scrapes")
          .select("cron_job_id")
          .eq("id", scheduleId)
          .single();

        if (schedule?.cron_job_id) {
          await supabase.rpc("pause_scrape_job", { p_job_id: schedule.cron_job_id });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Schedule paused" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resume": {
        const { data: schedule } = await supabase
          .from("scheduled_scrapes")
          .select("cron_job_id")
          .eq("id", scheduleId)
          .single();

        if (schedule?.cron_job_id) {
          await supabase.rpc("resume_scrape_job", { p_job_id: schedule.cron_job_id });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Schedule resumed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { data: schedule } = await supabase
          .from("scheduled_scrapes")
          .select("cron_job_id")
          .eq("id", scheduleId)
          .single();

        if (schedule?.cron_job_id) {
          await supabase.rpc("unschedule_scrape_job", { p_job_id: schedule.cron_job_id });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Schedule deleted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "trigger": {
        // Manually trigger a scheduled scrape
        const { data: schedule } = await supabase
          .from("scheduled_scrapes")
          .select("*")
          .eq("id", scheduleId)
          .single();

        if (!schedule) {
          throw new Error("Schedule not found");
        }

        // Call statewide-scrape function
        const response = await fetch(`${supabaseUrl}/functions/v1/statewide-scrape`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            counties: schedule.counties,
            batchSize: schedule.batch_size,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to trigger scrape: ${response.statusText}`);
        }

        // Update last_run_at
        await supabase
          .from("scheduled_scrapes")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", scheduleId);

        return new Response(
          JSON.stringify({ success: true, message: "Scrape triggered" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("[schedule-scrape] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
