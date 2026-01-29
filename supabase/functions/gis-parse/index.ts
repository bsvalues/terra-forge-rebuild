import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  fileName: string;
  layerName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileName, layerName }: ParseRequest = await req.json();

    if (!fileName || !layerName) {
      throw new Error("fileName and layerName are required");
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("gis-files")
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Determine file type and parse
    const extension = fileName.split(".").pop()?.toLowerCase();
    let features: any[] = [];
    let layerType: "point" | "line" | "polygon" | "parcel" | "boundary" = "polygon";
    let bounds: any = null;

    switch (extension) {
      case "geojson":
      case "json":
        const geojsonResult = await parseGeoJSON(fileData);
        features = geojsonResult.features;
        layerType = geojsonResult.layerType;
        bounds = geojsonResult.bounds;
        break;

      case "csv":
        const csvResult = await parseCSV(fileData);
        features = csvResult.features;
        layerType = "point";
        bounds = csvResult.bounds;
        break;

      case "kml":
        // KML parsing would require additional library
        throw new Error("KML parsing not yet implemented. Please convert to GeoJSON.");

      case "shp":
        // Shapefile parsing would require shapefile library
        throw new Error("Shapefile parsing requires .shp, .dbf, and .shx files together. Please convert to GeoJSON or use FTP sync.");

      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }

    // Create a file_upload data source if not exists
    let { data: existingSource } = await supabase
      .from("gis_data_sources")
      .select("id")
      .eq("source_type", "file_upload")
      .single();

    if (!existingSource) {
      const { data: newSource } = await supabase
        .from("gis_data_sources")
        .insert({
          name: "File Uploads",
          source_type: "file_upload",
          sync_status: "success",
        })
        .select()
        .single();
      existingSource = newSource;
    }

    // Create layer
    const { data: layer, error: layerError } = await supabase
      .from("gis_layers")
      .insert({
        data_source_id: existingSource?.id,
        name: layerName,
        layer_type: layerType,
        file_format: extension === "json" ? "geojson" : extension,
        feature_count: features.length,
        bounds,
        srid: 4326,
      })
      .select()
      .single();

    if (layerError) {
      throw new Error(`Failed to create layer: ${layerError.message}`);
    }

    // Insert features in batches
    const featureRecords = features.map((f) => ({
      layer_id: layer.id,
      geometry_type: f.geometry?.type || "Point",
      coordinates: f.geometry?.coordinates || [],
      properties: f.properties || {},
      centroid_lat: f.centroid_lat,
      centroid_lng: f.centroid_lng,
    }));

    for (let i = 0; i < featureRecords.length; i += 100) {
      const batch = featureRecords.slice(i, i + 100);
      const { error: insertError } = await supabase
        .from("gis_features")
        .insert(batch);

      if (insertError) {
        console.error("Feature insert error:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        layerId: layer.id,
        featuresImported: features.length,
        bounds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Parse error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function parseGeoJSON(fileData: Blob) {
  const text = await fileData.text();
  const geojson = JSON.parse(text);

  let features: any[] = [];

  if (geojson.type === "FeatureCollection") {
    features = geojson.features || [];
  } else if (geojson.type === "Feature") {
    features = [geojson];
  } else if (geojson.features) {
    features = geojson.features;
  }

  // Calculate bounds and centroids
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  features = features.map((f) => {
    const centroid = calculateCentroid(f.geometry);
    
    if (centroid) {
      minLat = Math.min(minLat, centroid.lat);
      maxLat = Math.max(maxLat, centroid.lat);
      minLng = Math.min(minLng, centroid.lng);
      maxLng = Math.max(maxLng, centroid.lng);
    }

    return {
      ...f,
      centroid_lat: centroid?.lat || null,
      centroid_lng: centroid?.lng || null,
    };
  });

  // Determine layer type from first feature
  const firstGeomType = features[0]?.geometry?.type || "Polygon";
  let layerType: "point" | "line" | "polygon" = "polygon";
  if (firstGeomType.includes("Point")) layerType = "point";
  else if (firstGeomType.includes("Line")) layerType = "line";

  return {
    features,
    layerType,
    bounds: features.length > 0 ? { minLat, maxLat, minLng, maxLng } : null,
  };
}

async function parseCSV(fileData: Blob) {
  const text = await fileData.text();
  const lines = text.split("\n").filter((l) => l.trim());
  
  if (lines.length < 2) {
    throw new Error("CSV file is empty or has no data rows");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  
  // Find lat/lng columns
  const latCol = headers.findIndex((h) => 
    ["lat", "latitude", "y", "lat_coord"].includes(h)
  );
  const lngCol = headers.findIndex((h) => 
    ["lng", "lon", "longitude", "x", "lng_coord", "lon_coord"].includes(h)
  );

  if (latCol === -1 || lngCol === -1) {
    throw new Error("CSV must have latitude and longitude columns");
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  const features = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const lat = parseFloat(values[latCol]);
    const lng = parseFloat(values[lngCol]);

    if (isNaN(lat) || isNaN(lng)) continue;

    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);

    // Build properties from other columns
    const properties: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (idx !== latCol && idx !== lngCol) {
        properties[h] = values[idx];
      }
    });

    features.push({
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties,
      centroid_lat: lat,
      centroid_lng: lng,
    });
  }

  return {
    features,
    bounds: features.length > 0 ? { minLat, maxLat, minLng, maxLng } : null,
  };
}

function calculateCentroid(geometry: any): { lat: number; lng: number } | null {
  if (!geometry || !geometry.coordinates) return null;

  switch (geometry.type) {
    case "Point":
      return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };

    case "LineString":
      const lineCoords = geometry.coordinates;
      const midIdx = Math.floor(lineCoords.length / 2);
      return { lng: lineCoords[midIdx][0], lat: lineCoords[midIdx][1] };

    case "Polygon":
      return calculatePolygonCentroid(geometry.coordinates[0]);

    case "MultiPolygon":
      // Use first polygon
      if (geometry.coordinates.length > 0) {
        return calculatePolygonCentroid(geometry.coordinates[0][0]);
      }
      return null;

    default:
      return null;
  }
}

function calculatePolygonCentroid(ring: number[][]): { lat: number; lng: number } | null {
  if (!ring || ring.length === 0) return null;

  let sumLat = 0, sumLng = 0;
  for (const coord of ring) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  return {
    lng: sumLng / ring.length,
    lat: sumLat / ring.length,
  };
}
