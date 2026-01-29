import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeRequest {
  parcelId?: string;
  assessorUrl: string;
  parcelIds?: string[];
  action: "enrich" | "validate" | "import";
}

interface ParcelData {
  parcel_number: string;
  address?: string;
  assessed_value?: number;
  land_value?: number;
  improvement_value?: number;
  land_area?: number;
  building_area?: number;
  year_built?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_class?: string;
  neighborhood_code?: string;
  sales?: Array<{
    sale_date: string;
    sale_price: number;
    grantor?: string;
    grantee?: string;
    deed_type?: string;
    instrument_number?: string;
  }>;
}

// JSON schema for AI-powered extraction
const PARCEL_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string", description: "Full property address" },
    assessed_value: { type: "number", description: "Total assessed/appraised value in dollars" },
    land_value: { type: "number", description: "Land value portion in dollars" },
    improvement_value: { type: "number", description: "Building/improvement value in dollars" },
    year_built: { type: "integer", description: "Year the building was constructed" },
    building_area: { type: "number", description: "Living/heated square footage" },
    land_area: { type: "number", description: "Lot size in square feet" },
    bedrooms: { type: "integer", description: "Number of bedrooms" },
    bathrooms: { type: "number", description: "Number of bathrooms" },
    property_class: { type: "string", description: "Property classification code" },
    sales: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sale_date: { type: "string", description: "Sale date in YYYY-MM-DD format" },
          sale_price: { type: "number", description: "Sale price in dollars" },
          grantor: { type: "string", description: "Seller name" },
          grantee: { type: "string", description: "Buyer name" },
          deed_type: { type: "string", description: "Type of deed" },
        },
      },
      description: "Historical sales transactions",
    },
  },
  required: [],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      throw new Error("FIRECRAWL_API_KEY not configured. Please connect Firecrawl in Settings.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { parcelId, assessorUrl, parcelIds, action }: ScrapeRequest = await req.json();

    if (!assessorUrl) {
      throw new Error("assessorUrl is required");
    }

    const idsToProcess = parcelIds || (parcelId ? [parcelId] : []);

    if (idsToProcess.length === 0) {
      throw new Error("At least one parcelId is required");
    }

    console.log(`Scraping ${idsToProcess.length} parcels from: ${assessorUrl}`);

    const results = {
      success: [] as string[],
      failed: [] as string[],
      enriched: 0,
      salesAdded: 0,
    };

    // Process each parcel (limit to 20 for AI extraction to avoid timeouts)
    for (const pid of idsToProcess.slice(0, 20)) {
      try {
        const searchUrl = buildParcelUrl(assessorUrl, pid);
        console.log(`Scraping parcel ${pid}: ${searchUrl}`);

        // Use Firecrawl with extract format for AI-powered extraction
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: searchUrl,
            formats: ["extract"],
            extract: {
              schema: PARCEL_EXTRACTION_SCHEMA,
              prompt: "Extract all property assessment data including values, building details, and sales history. Convert all monetary values to numbers without currency symbols. Convert dates to YYYY-MM-DD format."
            },
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (!scrapeResponse.ok) {
          const errText = await scrapeResponse.text();
          console.error(`Scrape failed for ${pid}:`, errText);
          results.failed.push(pid);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const extracted = scrapeData.data?.extract || scrapeData.extract;

        if (!extracted || Object.keys(extracted).length === 0) {
          console.log(`No structured data extracted for ${pid}`);
          results.failed.push(pid);
          continue;
        }

        console.log(`Extracted data for ${pid}:`, JSON.stringify(extracted).substring(0, 200));

        // Update parcel in database
        if (action === "enrich" || action === "import") {
          const updateData: Record<string, unknown> = {};

          if (extracted.assessed_value && extracted.assessed_value > 0) {
            updateData.assessed_value = extracted.assessed_value;
          }
          if (extracted.land_value && extracted.land_value > 0) {
            updateData.land_value = extracted.land_value;
          }
          if (extracted.improvement_value && extracted.improvement_value > 0) {
            updateData.improvement_value = extracted.improvement_value;
          }
          if (extracted.land_area && extracted.land_area > 0) {
            updateData.land_area = extracted.land_area;
          }
          if (extracted.building_area && extracted.building_area > 0) {
            updateData.building_area = extracted.building_area;
          }
          if (extracted.year_built && extracted.year_built >= 1800 && extracted.year_built <= new Date().getFullYear()) {
            updateData.year_built = extracted.year_built;
          }
          if (extracted.bedrooms && extracted.bedrooms > 0) {
            updateData.bedrooms = extracted.bedrooms;
          }
          if (extracted.bathrooms && extracted.bathrooms > 0) {
            updateData.bathrooms = extracted.bathrooms;
          }
          if (extracted.address) {
            updateData.address = extracted.address;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("parcels")
              .update(updateData)
              .eq("parcel_number", pid);

            if (!updateError) {
              results.enriched++;
              console.log(`Enriched parcel ${pid} with ${Object.keys(updateData).length} fields`);
            } else {
              console.error(`Failed to update ${pid}:`, updateError);
            }
          }

          // Add sales records
          if (extracted.sales && Array.isArray(extracted.sales) && extracted.sales.length > 0) {
            const { data: parcelRecord } = await supabase
              .from("parcels")
              .select("id")
              .eq("parcel_number", pid)
              .maybeSingle();

            if (parcelRecord) {
              for (const sale of extracted.sales) {
                if (!sale.sale_date || !sale.sale_price) continue;

                const { data: existingSale } = await supabase
                  .from("sales")
                  .select("id")
                  .eq("parcel_id", parcelRecord.id)
                  .eq("sale_date", sale.sale_date)
                  .eq("sale_price", sale.sale_price)
                  .maybeSingle();

                if (!existingSale) {
                  const { error: saleError } = await supabase.from("sales").insert({
                    parcel_id: parcelRecord.id,
                    sale_date: sale.sale_date,
                    sale_price: sale.sale_price,
                    grantor: sale.grantor,
                    grantee: sale.grantee,
                    deed_type: sale.deed_type,
                    is_qualified: true,
                  });

                  if (!saleError) {
                    results.salesAdded++;
                  }
                }
              }
            }
          }
        }

        results.success.push(pid);

        // Rate limit: 1 second between requests for AI extraction
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error processing ${pid}:`, err);
        results.failed.push(pid);
      }
    }

    const response = {
      success: true,
      processed: results.success.length + results.failed.length,
      successful: results.success.length,
      failed: results.failed.length,
      enriched: results.enriched,
      salesAdded: results.salesAdded,
      failedIds: results.failed,
    };

    console.log("Scrape complete:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Assessor scrape error:", errorMessage);

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Build URL for parcel lookup based on common assessor website patterns
function buildParcelUrl(baseUrl: string, parcelId: string): string {
  const cleanBase = baseUrl.replace(/\/$/, "");

  // TrueAutomation pattern (common in WA)
  if (cleanBase.includes("propertyaccess.trueautomation.com") || cleanBase.includes("ClientDB")) {
    const clientMatch = cleanBase.match(/ClientDB[=/]([^&/]+)/i);
    const clientId = clientMatch ? clientMatch[1] : "";
    const baseUrlClean = cleanBase.split("?")[0].replace(/\/ClientDB.*$/i, "");
    return `${baseUrlClean}/ClientDB/${clientId}/Property/Index?cid=1&p=${encodeURIComponent(parcelId)}`;
  }

  // Beacon/Schneider pattern
  if (cleanBase.includes("beacon.schneidercorp.com")) {
    return `${cleanBase}/Parcel/Details/${encodeURIComponent(parcelId)}`;
  }

  // QPublic pattern
  if (cleanBase.includes("qpublic.net")) {
    return `${cleanBase}/search.php?parcel=${encodeURIComponent(parcelId)}`;
  }

  // TaxSifter pattern
  if (cleanBase.includes("taxsifter")) {
    return `${cleanBase}/Search/Results?parcel=${encodeURIComponent(parcelId)}`;
  }

  // King County pattern
  if (cleanBase.includes("kingcounty.com")) {
    return `${cleanBase}/Detail.aspx?ParcelNbr=${encodeURIComponent(parcelId)}`;
  }

  // Pierce County pattern
  if (cleanBase.includes("piercecountywa.gov")) {
    return `${cleanBase}/Property/Details/${encodeURIComponent(parcelId)}`;
  }

  // Default: append as query parameter
  const separator = cleanBase.includes("?") ? "&" : "?";
  return `${cleanBase}${separator}parcel=${encodeURIComponent(parcelId)}`;
}
