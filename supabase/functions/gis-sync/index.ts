import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  sourceId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sourceId }: SyncRequest = await req.json();

    if (!sourceId) {
      throw new Error("sourceId is required");
    }

    // Get data source
    const { data: source, error: sourceError } = await supabase
      .from("gis_data_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error("Data source not found");
    }

    // Update status to syncing
    await supabase
      .from("gis_data_sources")
      .update({ sync_status: "syncing", sync_error: null })
      .eq("id", sourceId);

    let result;

    try {
      switch (source.source_type) {
        case "ftp":
          result = await syncFTPSource(supabase, source);
          break;
        case "arcgis":
          result = await syncArcGISSource(supabase, source);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.source_type}`);
      }

      // Update status to success
      await supabase
        .from("gis_data_sources")
        .update({
          sync_status: "success",
          last_sync_at: new Date().toISOString(),
          metadata: { ...source.metadata, lastSyncResult: result },
        })
        .eq("id", sourceId);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (syncError: any) {
      // Update status to error
      await supabase
        .from("gis_data_sources")
        .update({
          sync_status: "error",
          sync_error: syncError.message,
        })
        .eq("id", sourceId);

      throw syncError;
    }
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncFTPSource(supabase: any, source: any) {
  const url = source.connection_url;
  if (!url) throw new Error("FTP URL not configured");

  // Parse FTP URL to determine what to fetch
  // For now, we'll simulate FTP file listing and provide guidance
  // Real FTP implementation would use a Deno FTP client

  console.log(`Syncing FTP source: ${url}`);

  // Simulate FTP directory listing
  // In production, you would:
  // 1. Connect to FTP server
  // 2. List directory contents
  // 3. Download new/updated files
  // 4. Store in Supabase storage
  // 5. Parse and import to database

  const simulatedFiles = [
    { name: "parcels_2024.shp", size: 15000000, modified: new Date().toISOString() },
    { name: "parcels_2024.dbf", size: 8000000, modified: new Date().toISOString() },
    { name: "parcels_2024.shx", size: 500000, modified: new Date().toISOString() },
    { name: "boundaries.geojson", size: 2000000, modified: new Date().toISOString() },
  ];

  // Create a layer record for discovered files
  const shapefileGroups = new Map<string, string[]>();
  simulatedFiles.forEach((file) => {
    const baseName = file.name.replace(/\.(shp|shx|dbf|prj)$/i, "");
    if (!shapefileGroups.has(baseName)) {
      shapefileGroups.set(baseName, []);
    }
    shapefileGroups.get(baseName)!.push(file.name);
  });

  return {
    filesDiscovered: simulatedFiles.length,
    layersIdentified: shapefileGroups.size,
    message: "FTP sync simulation complete. Configure FTP credentials for live sync.",
  };
}

async function syncArcGISSource(supabase: any, source: any) {
  const url = source.connection_url;
  if (!url) throw new Error("ArcGIS endpoint not configured");

  console.log(`Syncing ArcGIS source: ${url}`);

  // Fetch service metadata
  const metadataUrl = url.endsWith("/") ? `${url}?f=json` : `${url}?f=json`;
  
  try {
    const metaResponse = await fetch(metadataUrl);
    if (!metaResponse.ok) {
      throw new Error(`Failed to fetch ArcGIS metadata: ${metaResponse.status}`);
    }

    const metadata = await metaResponse.json();

    // Handle FeatureServer
    if (metadata.layers && Array.isArray(metadata.layers)) {
      const layerResults = [];

      for (const layer of metadata.layers) {
        // Create or update layer record
        const { data: existingLayer } = await supabase
          .from("gis_layers")
          .select("id")
          .eq("data_source_id", source.id)
          .eq("name", layer.name)
          .single();

        const layerRecord = {
          data_source_id: source.id,
          name: layer.name,
          layer_type: getLayerType(layer.geometryType),
          file_format: "arcgis" as any, // Would need to add to enum
          properties_schema: { arcgisId: layer.id },
        };

        if (existingLayer) {
          await supabase
            .from("gis_layers")
            .update(layerRecord)
            .eq("id", existingLayer.id);
        } else {
          await supabase.from("gis_layers").insert(layerRecord);
        }

        // Fetch features (first 1000)
        const featuresUrl = `${url}/${layer.id}/query?where=1=1&outFields=*&f=geojson&resultRecordCount=1000`;
        const featuresResponse = await fetch(featuresUrl);

        if (featuresResponse.ok) {
          const geojson = await featuresResponse.json();
          
          if (geojson.features) {
            // Get layer ID for feature insert
            const { data: layerData } = await supabase
              .from("gis_layers")
              .select("id")
              .eq("data_source_id", source.id)
              .eq("name", layer.name)
              .single();

            if (layerData) {
              // Clear existing features
              await supabase
                .from("gis_features")
                .delete()
                .eq("layer_id", layerData.id);

              // Insert new features in batches
              const features = geojson.features.map((f: any) => ({
                layer_id: layerData.id,
                geometry_type: f.geometry?.type || "Point",
                coordinates: f.geometry?.coordinates || [],
                properties: f.properties || {},
                centroid_lat: getCentroidLat(f.geometry),
                centroid_lng: getCentroidLng(f.geometry),
              }));

              // Insert in batches of 100
              for (let i = 0; i < features.length; i += 100) {
                const batch = features.slice(i, i + 100);
                await supabase.from("gis_features").insert(batch);
              }

              // Update feature count
              await supabase
                .from("gis_layers")
                .update({ feature_count: features.length })
                .eq("id", layerData.id);

              layerResults.push({
                name: layer.name,
                featuresImported: features.length,
              });
            }
          }
        }
      }

      return {
        serviceName: metadata.name || "ArcGIS Service",
        layersProcessed: layerResults.length,
        layers: layerResults,
      };
    }

    return { message: "ArcGIS service metadata retrieved", metadata };
  } catch (error: any) {
    console.error("ArcGIS sync error:", error);
    throw new Error(`ArcGIS sync failed: ${error.message}`);
  }
}

function getLayerType(geometryType: string): "point" | "line" | "polygon" | "parcel" | "boundary" {
  switch (geometryType) {
    case "esriGeometryPoint":
    case "esriGeometryMultipoint":
      return "point";
    case "esriGeometryPolyline":
      return "line";
    case "esriGeometryPolygon":
      return "polygon";
    default:
      return "polygon";
  }
}

function getCentroidLat(geometry: any): number | null {
  if (!geometry || !geometry.coordinates) return null;

  switch (geometry.type) {
    case "Point":
      return geometry.coordinates[1];
    case "Polygon":
    case "MultiPolygon":
      // Simple centroid approximation - average of all coordinates
      const coords = flattenCoords(geometry.coordinates);
      if (coords.length === 0) return null;
      return coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    default:
      return null;
  }
}

function getCentroidLng(geometry: any): number | null {
  if (!geometry || !geometry.coordinates) return null;

  switch (geometry.type) {
    case "Point":
      return geometry.coordinates[0];
    case "Polygon":
    case "MultiPolygon":
      const coords = flattenCoords(geometry.coordinates);
      if (coords.length === 0) return null;
      return coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    default:
      return null;
  }
}

function flattenCoords(coords: any, result: number[][] = []): number[][] {
  if (!Array.isArray(coords)) return result;
  if (typeof coords[0] === "number") {
    result.push(coords as number[]);
  } else {
    for (const c of coords) {
      flattenCoords(c, result);
    }
  }
  return result;
}
