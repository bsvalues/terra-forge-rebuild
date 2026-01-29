import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeRequest {
  parcelId?: string;
  assessorUrl: string;
  parcelIds?: string[]; // Batch mode
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

    const results: { success: string[]; failed: string[]; enriched: number; salesAdded: number } = {
      success: [],
      failed: [],
      enriched: 0,
      salesAdded: 0,
    };

    // Process each parcel
    for (const pid of idsToProcess.slice(0, 50)) { // Limit to 50 per request
      try {
        // Construct the parcel lookup URL (common patterns)
        const searchUrl = buildParcelUrl(assessorUrl, pid);
        
        console.log(`Scraping parcel ${pid}: ${searchUrl}`);

        // Scrape the page
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: searchUrl,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 2000, // Wait for dynamic content
          }),
        });

        if (!scrapeResponse.ok) {
          const errText = await scrapeResponse.text();
          console.error(`Scrape failed for ${pid}:`, errText);
          results.failed.push(pid);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

        if (!markdown) {
          console.log(`No content found for ${pid}`);
          results.failed.push(pid);
          continue;
        }

        // Extract structured data from markdown
        const extracted = extractParcelData(markdown, pid);
        
        if (!extracted) {
          results.failed.push(pid);
          continue;
        }

        // Update parcel in database
        if (action === "enrich" || action === "import") {
          const updateData: Record<string, unknown> = {};
          
          if (extracted.assessed_value) updateData.assessed_value = extracted.assessed_value;
          if (extracted.land_value) updateData.land_value = extracted.land_value;
          if (extracted.improvement_value) updateData.improvement_value = extracted.improvement_value;
          if (extracted.land_area) updateData.land_area = extracted.land_area;
          if (extracted.building_area) updateData.building_area = extracted.building_area;
          if (extracted.year_built) updateData.year_built = extracted.year_built;
          if (extracted.bedrooms) updateData.bedrooms = extracted.bedrooms;
          if (extracted.bathrooms) updateData.bathrooms = extracted.bathrooms;
          if (extracted.address) updateData.address = extracted.address;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("parcels")
              .update(updateData)
              .eq("parcel_number", pid);

            if (!updateError) {
              results.enriched++;
            }
          }

          // Add sales records
          if (extracted.sales && extracted.sales.length > 0) {
            // Get parcel ID from database
            const { data: parcelRecord } = await supabase
              .from("parcels")
              .select("id")
              .eq("parcel_number", pid)
              .single();

            if (parcelRecord) {
              for (const sale of extracted.sales) {
                // Check if sale already exists
                const { data: existingSale } = await supabase
                  .from("sales")
                  .select("id")
                  .eq("parcel_id", parcelRecord.id)
                  .eq("sale_date", sale.sale_date)
                  .eq("sale_price", sale.sale_price)
                  .maybeSingle();

                if (!existingSale) {
                  const { error: saleError } = await supabase
                    .from("sales")
                    .insert({
                      parcel_id: parcelRecord.id,
                      sale_date: sale.sale_date,
                      sale_price: sale.sale_price,
                      grantor: sale.grantor,
                      grantee: sale.grantee,
                      deed_type: sale.deed_type,
                      instrument_number: sale.instrument_number,
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
        
        // Rate limit protection
        await new Promise(r => setTimeout(r, 500));
        
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
  
  // Detect common patterns
  if (cleanBase.includes("propertyaccess.trueautomation.com")) {
    // TrueAutomation pattern (common in WA)
    const clientId = cleanBase.match(/ClientDB=([^&]+)/)?.[1] || "";
    return `${cleanBase.split("?")[0]}?cid=1&p=${encodeURIComponent(parcelId)}&ClientDB=${clientId}`;
  }
  
  if (cleanBase.includes("beacon.schneidercorp.com")) {
    // Beacon/Schneider pattern
    return `${cleanBase}/Parcel/Details/${encodeURIComponent(parcelId)}`;
  }
  
  if (cleanBase.includes("qpublic.net")) {
    // QPublic pattern
    return `${cleanBase}/search.php?parcel=${encodeURIComponent(parcelId)}`;
  }
  
  // Default: append as query parameter
  const separator = cleanBase.includes("?") ? "&" : "?";
  return `${cleanBase}${separator}parcel=${encodeURIComponent(parcelId)}`;
}

// Extract structured parcel data from scraped markdown
function extractParcelData(markdown: string, parcelId: string): ParcelData | null {
  const data: ParcelData = { parcel_number: parcelId };
  const text = markdown.toLowerCase();
  
  // Extract assessed/appraised value
  const valuePatterns = [
    /(?:total|appraised|assessed|market)\s*(?:value)?[:\s]*\$?([\d,]+)/gi,
    /\$\s*([\d,]+)\s*(?:total|appraised|assessed)/gi,
  ];
  for (const pattern of valuePatterns) {
    const match = pattern.exec(text);
    if (match) {
      const value = parseInt(match[1].replace(/,/g, ""), 10);
      if (value > 1000 && value < 100000000) {
        data.assessed_value = value;
        break;
      }
    }
  }

  // Extract land value
  const landValueMatch = /(?:land|lot)\s*(?:value)?[:\s]*\$?([\d,]+)/i.exec(text);
  if (landValueMatch) {
    data.land_value = parseInt(landValueMatch[1].replace(/,/g, ""), 10);
  }

  // Extract improvement value
  const impValueMatch = /(?:improvement|building|structure)\s*(?:value)?[:\s]*\$?([\d,]+)/i.exec(text);
  if (impValueMatch) {
    data.improvement_value = parseInt(impValueMatch[1].replace(/,/g, ""), 10);
  }

  // Extract year built
  const yearMatch = /(?:year\s*built|built|constructed)[:\s]*(\d{4})/i.exec(text);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1800 && year <= new Date().getFullYear()) {
      data.year_built = year;
    }
  }

  // Extract square footage
  const sqftMatch = /(?:living\s*area|heated\s*area|building\s*(?:area|size)|(?:sq\s*ft|square\s*feet?))[:\s]*([\d,]+)/i.exec(text);
  if (sqftMatch) {
    data.building_area = parseInt(sqftMatch[1].replace(/,/g, ""), 10);
  }

  // Extract land area (acres or sqft)
  const landAreaMatch = /(?:land\s*area|lot\s*size|acreage)[:\s]*([\d,.]+)\s*(?:acres?|ac)?/i.exec(text);
  if (landAreaMatch) {
    const area = parseFloat(landAreaMatch[1].replace(/,/g, ""));
    // If small number, assume acres
    data.land_area = area < 100 ? area * 43560 : area;
  }

  // Extract bedrooms
  const bedsMatch = /(?:bedrooms?|beds?|br)[:\s]*(\d+)/i.exec(text);
  if (bedsMatch) {
    data.bedrooms = parseInt(bedsMatch[1], 10);
  }

  // Extract bathrooms
  const bathsMatch = /(?:bathrooms?|baths?|ba)[:\s]*([\d.]+)/i.exec(text);
  if (bathsMatch) {
    data.bathrooms = parseFloat(bathsMatch[1]);
  }

  // Extract sales history
  const sales: ParcelData["sales"] = [];
  const salePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[:\s]*\$?([\d,]+)/g;
  let saleMatch;
  while ((saleMatch = salePattern.exec(text)) !== null) {
    const price = parseInt(saleMatch[2].replace(/,/g, ""), 10);
    if (price > 10000 && price < 100000000) {
      try {
        const dateParts = saleMatch[1].split(/[\/\-]/);
        let year = parseInt(dateParts[2], 10);
        if (year < 100) year += 2000;
        const month = dateParts[0].padStart(2, "0");
        const day = dateParts[1].padStart(2, "0");
        const saleDate = `${year}-${month}-${day}`;
        
        sales.push({
          sale_date: saleDate,
          sale_price: price,
        });
      } catch {
        // Skip invalid dates
      }
    }
  }
  
  if (sales.length > 0) {
    data.sales = sales;
  }

  // Only return if we found useful data
  if (data.assessed_value || data.year_built || data.building_area || sales.length > 0) {
    return data;
  }

  return null;
}
