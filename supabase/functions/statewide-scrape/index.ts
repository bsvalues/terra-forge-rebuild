import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

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
  action: "start" | "cancel" | "status";
  jobId?: string;
  counties?: string[];
  jobType?: "statewide" | "region" | "county" | "scheduled";
  batchSize?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, jobId, counties, jobType, batchSize = 20 }: ScrapeJobRequest = await req.json();

    // Handle status check
    if (action === "status") {
      if (!jobId) {
        // Return most recent job
        const { data, error } = await supabase
          .from("scrape_jobs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          return new Response(JSON.stringify({ success: false, error: "No jobs found" }), {
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
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("scrape_jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "running");

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Job cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle start
    if (action === "start") {
      // Determine counties to scrape
      const countiesToScrape = counties || Object.keys(WA_COUNTY_ASSESSORS);
      const estimatedSeconds = countiesToScrape.length * 30; // ~30 sec per county
      const estimatedCompletion = new Date(Date.now() + estimatedSeconds * 1000).toISOString();

      // Create job record
      const { data: job, error: createError } = await supabase
        .from("scrape_jobs")
        .insert({
          job_type: jobType || "statewide",
          status: "pending",
          counties: countiesToScrape,
          counties_total: countiesToScrape.length,
          estimated_completion: estimatedCompletion,
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create job:", createError);
        return new Response(JSON.stringify({ success: false, error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Created scrape job ${job.id} for ${countiesToScrape.length} counties`);

      // Start background processing
      EdgeRuntime.waitUntil(processStatewideJob(supabase, job.id, countiesToScrape, batchSize));

      return new Response(
        JSON.stringify({
          success: true,
          jobId: job.id,
          message: `Started ${jobType || "statewide"} scrape for ${countiesToScrape.length} counties`,
          estimatedCompletion,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Statewide scrape error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Background processing function
async function processStatewideJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  counties: string[],
  batchSize: number
) {
  console.log(`Background job ${jobId}: Starting processing of ${counties.length} counties`);

  try {
    // Mark job as running
    await supabase
      .from("scrape_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);

    let totalEnriched = 0;
    let totalSales = 0;
    const errors: Array<{ county: string; error: string }> = [];

    for (let i = 0; i < counties.length; i++) {
      // Check if job was cancelled
      const { data: jobCheck } = await supabase
        .from("scrape_jobs")
        .select("status")
        .eq("id", jobId)
        .single();

      if (jobCheck?.status === "cancelled") {
        console.log(`Job ${jobId} was cancelled`);
        break;
      }

      const county = counties[i];
      const assessorUrl = WA_COUNTY_ASSESSORS[county];

      if (!assessorUrl) {
        console.log(`No URL for county ${county}, skipping`);
        continue;
      }

      console.log(`Processing county ${i + 1}/${counties.length}: ${county}`);

      // Update current progress
      await supabase
        .from("scrape_jobs")
        .update({
          current_county: county,
          counties_completed: i,
        })
        .eq("id", jobId);

      try {
        // Fetch parcels needing enrichment for this county (if county-specific data exists)
        const { data: parcels } = await supabase
          .from("parcels")
          .select("parcel_number")
          .or("building_area.is.null,year_built.is.null,bedrooms.is.null")
          .limit(batchSize);

        const parcelIds = parcels?.map((p) => p.parcel_number) || [];

        if (parcelIds.length === 0) {
          console.log(`No parcels need enrichment for ${county}`);
          continue;
        }

        // Call the assessor-scrape function
        const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke(
          "assessor-scrape",
          {
            body: {
              assessorUrl,
              parcelIds,
              action: "enrich",
            },
          }
        );

        if (scrapeError) {
          console.error(`Error scraping ${county}:`, scrapeError);
          errors.push({ county, error: scrapeError.message });
        } else if (scrapeResult) {
          totalEnriched += scrapeResult.enriched || 0;
          totalSales += scrapeResult.salesAdded || 0;
          console.log(
            `${county}: enriched ${scrapeResult.enriched || 0}, sales ${scrapeResult.salesAdded || 0}`
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Exception scraping ${county}:`, errorMsg);
        errors.push({ county, error: errorMsg });
      }

      // Update totals after each county
      await supabase
        .from("scrape_jobs")
        .update({
          counties_completed: i + 1,
          parcels_enriched: totalEnriched,
          sales_added: totalSales,
          errors: errors,
        })
        .eq("id", jobId);

      // Rate limit: 2 seconds between counties
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Mark job as completed
    const finalStatus = errors.length === counties.length ? "failed" : "completed";
    await supabase
      .from("scrape_jobs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        current_county: null,
        counties_completed: counties.length,
        parcels_enriched: totalEnriched,
        sales_added: totalSales,
        errors: errors,
      })
      .eq("id", jobId);

    console.log(
      `Job ${jobId} ${finalStatus}: enriched ${totalEnriched} parcels, ${totalSales} sales, ${errors.length} errors`
    );
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await supabase
      .from("scrape_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        errors: [{ county: "system", error: error instanceof Error ? error.message : "Unknown error" }],
      })
      .eq("id", jobId);
  }
}
