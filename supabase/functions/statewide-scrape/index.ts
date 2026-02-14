import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Washington State County Assessor URLs
const WA_COUNTY_ASSESSORS: Record<string, string> = {
  "Adams": "https://propertysearch.adamscountywa.gov",
  "Asotin": "https://taxsifter.co.asotin.wa.us",
  "Benton": "https://propertyaccess.trueautomation.com/ClientDB/BentonWA",
  "Chelan": "https://propertyaccess.trueautomation.com/ClientDB/ChelanWA",
  "Clallam": "https://propertyaccess.trueautomation.com/ClientDB/ClallamWA",
  "Clark": "https://gis.clark.wa.gov/gishome/property",
  "Columbia": "https://taxsifter.co.columbia.wa.us",
  "Cowlitz": "https://www.cowlitzinfo.net/epic",
  "Douglas": "https://taxsifter.co.douglas.wa.us",
  "Ferry": "https://taxsifter.co.ferry.wa.us",
  "Franklin": "https://taxsifter.co.franklin.wa.us",
  "Garfield": "https://www.co.garfield.wa.us/assessor",
  "Grant": "https://taxsifter.co.grant.wa.us",
  "Grays Harbor": "https://taxsifter.co.grays-harbor.wa.us",
  "Island": "https://propertyaccess.islandcountywa.gov",
  "Jefferson": "https://propertysearch.co.jefferson.wa.us",
  "King": "https://blue.kingcounty.com/Assessor/eRealProperty",
  "Kitsap": "https://psearch.kitsapgov.com",
  "Kittitas": "https://taxsifter.co.kittitas.wa.us",
  "Klickitat": "https://propertysearch.klickitatcounty.org",
  "Lewis": "https://lewiscountywa.gov/assessor/property-search",
  "Lincoln": "https://taxsifter.co.lincoln.wa.us",
  "Mason": "https://parcels.co.mason.wa.us",
  "Okanogan": "https://taxsifter.okanogancounty.org",
  "Pacific": "https://taxsifter.co.pacific.wa.us",
  "Pend Oreille": "https://propertysearch.pendoreille.org",
  "Pierce": "https://atip.piercecountywa.gov",
  "San Juan": "https://parcelsearch.sanjuanco.com",
  "Skagit": "https://www.skagitcounty.net/Search/Property",
  "Skamania": "https://mapsifter.skamania.net",
  "Snohomish": "https://scopi.snoco.org",
  "Spokane": "https://cp.spokanecounty.org/scout",
  "Stevens": "https://propertysearch.co.stevens.wa.us",
  "Thurston": "https://tcproperty.co.thurston.wa.us",
  "Wahkiakum": "https://taxsifter.co.wahkiakum.wa.us",
  "Walla Walla": "https://propertysearch.co.walla-walla.wa.us",
  "Whatcom": "https://property.whatcomcounty.us",
  "Whitman": "https://taxsifter.whitmancounty.net",
  "Yakima": "https://propertysearch.co.yakima.wa.us",
};

interface ScrapeJobRequest {
  action: "start" | "cancel" | "status" | "queue";
  jobId?: string;
  counties?: string[];
  regions?: string[];
  jobType?: string;
  batchSize?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin role for statewide scrape operations
    let auth;
    try {
      auth = await requireAdmin(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const supabase = createServiceClient();
    const { action, jobId, counties, jobType, batchSize = 20 }: ScrapeJobRequest = await req.json();

    // Input validation
    if (!["start", "cancel", "status", "queue"].includes(action)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (batchSize < 1 || batchSize > 100) {
      return new Response(JSON.stringify({ success: false, error: "batchSize must be 1-100" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[statewide-scrape] Admin ${auth.userId} action: ${action}`);

    // Handle status check
    if (action === "status") {
      if (!jobId) {
        const { data, error } = await supabase
          .from("scrape_jobs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, job: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, job: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle cancel
    if (action === "cancel") {
      if (!jobId) {
        return new Response(JSON.stringify({ success: false, error: "jobId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("scrape_jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .in("status", ["running", "pending"]);

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      EdgeRuntime.waitUntil(processNextQueuedJob(supabase, batchSize));

      return new Response(JSON.stringify({ success: true, message: "Job cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle start/queue
    if (action === "start" || action === "queue") {
      const { data: runningJob } = await supabase
        .from("scrape_jobs")
        .select("id")
        .eq("status", "running")
        .maybeSingle();

      const countiesToScrape = counties || Object.keys(WA_COUNTY_ASSESSORS);
      const estimatedSeconds = countiesToScrape.length * 30;
      const estimatedCompletion = new Date(Date.now() + estimatedSeconds * 1000).toISOString();
      const initialStatus = runningJob ? "queued" : "pending";

      const { data: job, error: createError } = await supabase
        .from("scrape_jobs")
        .insert({
          job_type: jobType || "statewide",
          status: initialStatus,
          counties: countiesToScrape,
          counties_total: countiesToScrape.length,
          estimated_completion: estimatedCompletion,
          created_by: auth.userId,
        })
        .select()
        .single();

      if (createError) {
        return new Response(JSON.stringify({ success: false, error: createError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!runningJob) {
        EdgeRuntime.waitUntil(processStatewideJob(supabase, job.id, countiesToScrape, batchSize));
      }

      return new Response(
        JSON.stringify({
          success: true,
          jobId: job.id,
          queued: !!runningJob,
          message: runningJob 
            ? `Job queued. Will start automatically when current job completes.`
            : `Started ${jobType || "statewide"} scrape for ${countiesToScrape.length} counties`,
          estimatedCompletion,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Statewide scrape error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Process the next queued job
async function processNextQueuedJob(
  supabase: ReturnType<typeof createClient>,
  batchSize: number
) {
  console.log("Checking for queued jobs...");
  const { data: nextJob, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) { console.error("Error fetching queued job:", error); return; }
  if (!nextJob) { console.log("No queued jobs found"); return; }

  console.log(`Starting queued job ${nextJob.id} (${nextJob.job_type})`);
  const counties = Array.isArray(nextJob.counties) ? nextJob.counties as string[] : Object.keys(WA_COUNTY_ASSESSORS);
  await processStatewideJob(supabase, nextJob.id, counties, batchSize);
}

// Background processing function
async function processStatewideJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  counties: string[],
  batchSize: number
) {
  console.log(`Background job ${jobId}: Starting processing of ${counties.length} counties`);
  try {
    await supabase.from("scrape_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);

    let totalEnriched = 0;
    let totalSales = 0;
    const errors: Array<{ county: string; error: string }> = [];

    for (let i = 0; i < counties.length; i++) {
      const { data: jobCheck } = await supabase.from("scrape_jobs").select("status").eq("id", jobId).single();
      if (jobCheck?.status === "cancelled") { console.log(`Job ${jobId} was cancelled`); break; }

      const county = counties[i];
      const assessorUrl = WA_COUNTY_ASSESSORS[county];
      if (!assessorUrl) continue;

      console.log(`Processing county ${i + 1}/${counties.length}: ${county}`);
      await supabase.from("scrape_jobs").update({ current_county: county, counties_completed: i }).eq("id", jobId);

      try {
        const { data: parcels } = await supabase.from("parcels").select("parcel_number").or("building_area.is.null,year_built.is.null,bedrooms.is.null").limit(batchSize);
        const parcelIds = parcels?.map((p) => p.parcel_number) || [];
        if (parcelIds.length === 0) continue;

        const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke("assessor-scrape", {
          body: { assessorUrl, parcelIds, action: "enrich" },
        });

        if (scrapeError) {
          errors.push({ county, error: scrapeError.message });
        } else if (scrapeResult) {
          totalEnriched += scrapeResult.enriched || 0;
          totalSales += scrapeResult.salesAdded || 0;
        }
      } catch (err) {
        errors.push({ county, error: err instanceof Error ? err.message : "Unknown error" });
      }

      await supabase.from("scrape_jobs").update({ counties_completed: i + 1, parcels_enriched: totalEnriched, sales_added: totalSales, errors }).eq("id", jobId);
      await new Promise((r) => setTimeout(r, 2000));
    }

    const finalStatus = errors.length === counties.length ? "failed" : "completed";
    await supabase.from("scrape_jobs").update({ status: finalStatus, completed_at: new Date().toISOString(), current_county: null, counties_completed: counties.length, parcels_enriched: totalEnriched, sales_added: totalSales, errors }).eq("id", jobId);
    await processNextQueuedJob(supabase, batchSize);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await supabase.from("scrape_jobs").update({ status: "failed", completed_at: new Date().toISOString(), errors: [{ county: "system", error: error instanceof Error ? error.message : "Unknown error" }] }).eq("id", jobId);
    await processNextQueuedJob(supabase, batchSize);
  }
}
