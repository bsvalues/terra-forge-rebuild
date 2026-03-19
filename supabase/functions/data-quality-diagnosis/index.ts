// TerraFusion OS — Data Quality Diagnosis Engine (Phase 66)
// "The PostGIS told me my coordinates have feelings" — Ralph Wiggum, Spatial Therapist
//
// AI is the diagnostician. PostGIS is the surgical instrument.
// This function runs deterministic SQL analysis, then asks Lovable AI
// to generate a prioritized Treatment Plan with lane-specific policies.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Lane-specific fix policies ──────────────────────────────────
const LANE_POLICIES = {
  spatial_healing: {
    autoApplyWhen: "Fix is deterministic and reversible (SRID transform, axis swap, range correction)",
    neverAutoFix: "Parcels with multiple valid geometry sources without clear precedence",
    trustHierarchy: ["county_gis", "ugrc_geometry", "cama_certified", "geocode_result"],
  },
  address_normalization: {
    autoApplyWhen: "Canonical formatting only: street type dictionary, casing, directional cleanup",
    neverAutoFix: "Missing situs assembly, ambiguous address resolution",
    trustHierarchy: ["recorded_deed", "county_gis", "cama_certified", "usps_validation"],
  },
  orphan_duplicate: {
    autoApplyWhen: "Never — always requires human resolution",
    neverAutoFix: "All duplicate/orphan/split-merge cases",
    trustHierarchy: ["parcel_history", "recorded_deed", "cama_certified"],
  },
  cross_source_reconciliation: {
    autoApplyWhen: "Strong quorum: 2+ trusted sources agree, no recent deed/split activity",
    neverAutoFix: "Single-source conflicts, recent transaction parcels",
    trustHierarchy: ["recorded_deed", "county_gis", "cama_certified", "permit_history", "external_vendor"],
  },
  characteristic_inference: {
    autoApplyWhen: "Never — review-first only",
    neverAutoFix: "All characteristic inferences from comps or AI",
    trustHierarchy: ["permit_history", "cama_certified", "comparable_parcels", "ai_inference"],
  },
  value_anomaly: {
    autoApplyWhen: "Never — suggest only",
    neverAutoFix: "All valuation-driving field changes",
    trustHierarchy: ["cama_certified", "recorded_deed", "market_data", "ai_inference"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { action, county_id } = await req.json();

    if (!county_id) {
      return new Response(JSON.stringify({ error: "county_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════════════════════
    // ACTION: run_diagnosis
    // ══════════════════════════════════════════════════════════
    if (action === "run_diagnosis") {
      // Create diagnosis run record
      const { data: run, error: runErr } = await supabase
        .from("dq_diagnosis_runs")
        .insert({
          county_id,
          status: "running",
          lanes_analyzed: Object.keys(LANE_POLICIES),
        })
        .select()
        .single();

      if (runErr) throw runErr;

      try {
        // ── Step 1: PostGIS-powered deterministic analysis ────────
        const analysisResults = await runDeterministicAnalysis(supabase, county_id);

        // ── Step 2: Generate issues from analysis ─────────────────
        const issues = generateIssues(analysisResults, county_id, run.id);

        // ── Step 3: AI Treatment Plan generation ──────────────────
        let treatmentPlan = {};
        if (lovableKey && issues.length > 0) {
          treatmentPlan = await generateTreatmentPlan(lovableKey, analysisResults, issues);
        }

        // ── Step 4: Clear old open issues and insert new ones ─────
        await supabase
          .from("dq_issue_registry")
          .delete()
          .eq("county_id", county_id)
          .eq("status", "open");

        if (issues.length > 0) {
          // Batch insert in chunks of 50
          for (let i = 0; i < issues.length; i += 50) {
            const chunk = issues.slice(i, i + 50);
            await supabase.from("dq_issue_registry").insert(chunk);
          }
        }

        // ── Step 5: Update diagnosis run ──────────────────────────
        const hardBlockers = issues.filter((i) => i.is_hard_blocker).length;
        await supabase
          .from("dq_diagnosis_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            total_issues_found: issues.length,
            hard_blockers_found: hardBlockers,
            quality_snapshot: analysisResults,
            treatment_plan: treatmentPlan,
            model_used: lovableKey ? "google/gemini-2.5-flash" : "none",
          })
          .eq("id", run.id);

        return new Response(
          JSON.stringify({
            ok: true,
            run_id: run.id,
            issues_found: issues.length,
            hard_blockers: hardBlockers,
            lanes: analysisResults,
            treatment_plan: treatmentPlan,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        await supabase
          .from("dq_diagnosis_runs")
          .update({ status: "failed", error_message: String(err) })
          .eq("id", run.id);
        throw err;
      }
    }

    // ══════════════════════════════════════════════════════════
    // ACTION: get_status — fetch latest diagnosis results
    // ══════════════════════════════════════════════════════════
    if (action === "get_status") {
      // Latest completed run
      const { data: latestRun } = await supabase
        .from("dq_diagnosis_runs")
        .select("*")
        .eq("county_id", county_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Open issues by lane
      const { data: issues } = await supabase
        .from("dq_issue_registry")
        .select("*")
        .eq("county_id", county_id)
        .in("status", ["open", "in_progress"])
        .order("priority_score", { ascending: false });

      // Lane summaries
      const laneSummaries: Record<string, any> = {};
      for (const lane of Object.keys(LANE_POLICIES)) {
        const laneIssues = (issues || []).filter((i: any) => i.lane === lane);
        laneSummaries[lane] = {
          total_issues: laneIssues.length,
          hard_blockers: laneIssues.filter((i: any) => i.is_hard_blocker).length,
          affected_parcels: laneIssues.reduce((sum: number, i: any) => sum + (i.affected_count || 0), 0),
          avg_priority: laneIssues.length > 0
            ? Math.round(laneIssues.reduce((s: number, i: any) => s + Number(i.priority_score || 0), 0) / laneIssues.length)
            : 0,
          top_issues: laneIssues.slice(0, 3).map((i: any) => ({
            id: i.id,
            type: i.issue_type,
            title: i.issue_title,
            severity: i.severity,
            affected_count: i.affected_count,
            fix_tier: i.fix_tier,
            is_hard_blocker: i.is_hard_blocker,
          })),
          policy: (LANE_POLICIES as any)[lane],
        };
      }

      // Batch history
      const { data: batches } = await supabase
        .from("dq_remediation_batches")
        .select("*")
        .eq("county_id", county_id)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          ok: true,
          latest_run: latestRun,
          lanes: laneSummaries,
          all_issues: issues || [],
          batches: batches || [],
          total_issues: (issues || []).length,
          total_hard_blockers: (issues || []).filter((i: any) => i.is_hard_blocker).length,
          total_affected_parcels: (issues || []).reduce(
            (sum: number, i: any) => sum + (i.affected_count || 0), 0
          ),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("data-quality-diagnosis error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ══════════════════════════════════════════════════════════════════
// DETERMINISTIC ANALYSIS — PostGIS + SQL
// The instruments, not the doctor.
// ══════════════════════════════════════════════════════════════════

interface AnalysisResults {
  total_parcels: number;
  spatial: {
    missing_coords: number;
    missing_geometry: number;
    out_of_bounds: number;
    possible_srid_mismatch: number;
    invalid_geometry: number;
    zero_coords: number;
  };
  address: {
    missing_address: number;
    missing_city: number;
    missing_zip: number;
    non_standard_street_types: number;
  };
  characteristics: {
    missing_building_area: number;
    missing_year_built: number;
    missing_bedrooms: number;
    missing_bathrooms: number;
    missing_property_class: number;
    zero_assessed_value: number;
  };
  values: {
    zero_improvement_with_building: number;
    extreme_value_ratio: number;
    missing_land_value: number;
  };
  neighborhoods: {
    missing_neighborhood: number;
    total_neighborhoods: number;
  };
  duplicates: {
    duplicate_parcel_numbers: number;
    duplicate_addresses: number;
  };
}

async function runDeterministicAnalysis(
  supabase: any,
  countyId: string
): Promise<AnalysisResults> {
  // ── Single-pass RPC for all parcel counts (handles 400K+ in ~2s) ──
  const { data: counts, error: rpcErr } = await supabase.rpc("dq_parcel_counts", {
    p_county_id: countyId,
  });

  if (rpcErr) {
    console.error("dq_parcel_counts RPC failed, falling back to sequential:", rpcErr.message);
    return runDeterministicAnalysisFallback(supabase, countyId);
  }

  const c = counts || {};

  // Neighborhood count (separate table)
  const { count: neighborhoodCount } = await supabase
    .from("neighborhoods")
    .select("*", { count: "exact", head: true })
    .eq("county_id", countyId);

  // Duplicate detection RPCs
  const [{ data: dupParcels }, { data: dupAddresses }] = await Promise.all([
    supabase.rpc("count_duplicate_parcel_numbers", { p_county_id: countyId }).maybeSingle(),
    supabase.rpc("count_duplicate_addresses", { p_county_id: countyId }).maybeSingle(),
  ]);

  return {
    total_parcels: c.total_parcels || 0,
    spatial: {
      missing_coords: c.missing_coords || 0,
      missing_geometry: c.missing_geometry || 0,
      out_of_bounds: c.out_of_bounds || 0,
      possible_srid_mismatch: c.srid_mismatch || 0,
      invalid_geometry: 0,
      zero_coords: c.zero_coords || 0,
    },
    address: {
      missing_address: c.missing_address || 0,
      missing_city: c.missing_city || 0,
      missing_zip: c.missing_zip || 0,
      non_standard_street_types: 0,
    },
    characteristics: {
      missing_building_area: c.missing_building_area || 0,
      missing_year_built: c.missing_year_built || 0,
      missing_bedrooms: c.missing_bedrooms || 0,
      missing_bathrooms: c.missing_bathrooms || 0,
      missing_property_class: c.missing_property_class || 0,
      zero_assessed_value: c.zero_assessed_value || 0,
    },
    values: {
      zero_improvement_with_building: c.zero_improvement_with_building || 0,
      extreme_value_ratio: 0,
      missing_land_value: c.missing_land_value || 0,
    },
    neighborhoods: {
      missing_neighborhood: c.missing_neighborhood || 0,
      total_neighborhoods: neighborhoodCount || 0,
    },
    duplicates: {
      duplicate_parcel_numbers: dupParcels?.count || 0,
      duplicate_addresses: dupAddresses?.count || 0,
    },
  };
}

// Fallback: sequential queries if RPC not available
async function runDeterministicAnalysisFallback(
  supabase: any,
  countyId: string
): Promise<AnalysisResults> {
  const countQuery = async (filters: (q: any) => any) => {
    let q = supabase.from("parcels").select("*", { count: "exact", head: true }).eq("county_id", countyId);
    q = filters(q);
    const { count } = await q;
    return count || 0;
  };

  const [total, missingCoords, missingGeometry, missingNeighborhood, missingBuildingArea,
    missingYearBuilt, missingPropertyClass, zeroAssessed] = await Promise.all([
    countQuery((q: any) => q),
    countQuery((q: any) => q.is("latitude", null).is("longitude", null).is("latitude_wgs84", null)),
    countQuery((q: any) => q.is("parcel_geom_wgs84", null)),
    countQuery((q: any) => q.is("neighborhood_code", null)),
    countQuery((q: any) => q.is("building_area", null)),
    countQuery((q: any) => q.is("year_built", null)),
    countQuery((q: any) => q.is("property_class", null)),
    countQuery((q: any) => q.eq("assessed_value", 0)),
  ]);

  return {
    total_parcels: total,
    spatial: { missing_coords: missingCoords, missing_geometry: missingGeometry, out_of_bounds: 0, possible_srid_mismatch: 0, invalid_geometry: 0, zero_coords: 0 },
    address: { missing_address: 0, missing_city: 0, missing_zip: 0, non_standard_street_types: 0 },
    characteristics: { missing_building_area: missingBuildingArea, missing_year_built: missingYearBuilt, missing_bedrooms: 0, missing_bathrooms: 0, missing_property_class: missingPropertyClass, zero_assessed_value: zeroAssessed },
    values: { zero_improvement_with_building: 0, extreme_value_ratio: 0, missing_land_value: 0 },
    neighborhoods: { missing_neighborhood: missingNeighborhood, total_neighborhoods: 0 },
    duplicates: { duplicate_parcel_numbers: 0, duplicate_addresses: 0 },
  };
}

// ══════════════════════════════════════════════════════════════════
// ISSUE GENERATION — Turn analysis numbers into typed issues
// ══════════════════════════════════════════════════════════════════

function generateIssues(analysis: AnalysisResults, countyId: string, runId: string) {
  const issues: any[] = [];
  const total = analysis.total_parcels || 1;

  const pct = (n: number) => Math.round((n / total) * 100);
  const impactFromPct = (p: number) => Math.min(100, p * 1.5);

  // ── Spatial Healing Lane ─────────────────────────────────────
  if (analysis.spatial.possible_srid_mismatch > 0) {
    issues.push({
      county_id: countyId,
      lane: "spatial_healing",
      severity: "critical",
      fix_tier: "auto_apply",
      issue_type: "srid_mismatch",
      issue_title: `${analysis.spatial.possible_srid_mismatch.toLocaleString()} parcels with suspected SRID mismatch`,
      issue_description: `Coordinates with absolute values > 1,000 detected in lat/lng fields. These are likely State Plane coordinates (e.g., WKID 2927) stored in degree fields. Fix: deterministic ST_Transform reprojection.`,
      affected_count: analysis.spatial.possible_srid_mismatch,
      impact_score: impactFromPct(pct(analysis.spatial.possible_srid_mismatch)),
      confidence_score: 95,
      reversibility_score: 100,
      source_trust_level: "county_gis",
      is_hard_blocker: pct(analysis.spatial.possible_srid_mismatch) > 10,
      blocker_reason: pct(analysis.spatial.possible_srid_mismatch) > 10 ? "SRID mismatch affects >10% of parcels" : null,
      diagnosis_run_id: runId,
    });
  }

  if (analysis.spatial.missing_coords > 0) {
    issues.push({
      county_id: countyId,
      lane: "spatial_healing",
      severity: pct(analysis.spatial.missing_coords) > 20 ? "critical" : "high",
      fix_tier: "auto_apply",
      issue_type: "missing_coordinates",
      issue_title: `${analysis.spatial.missing_coords.toLocaleString()} parcels missing coordinates`,
      issue_description: `Parcels with no latitude/longitude or WGS84 coordinates. Fix: spatial join from UGRC polygon centroids via ST_Centroid on parcel_geom_wgs84.`,
      affected_count: analysis.spatial.missing_coords,
      impact_score: impactFromPct(pct(analysis.spatial.missing_coords)),
      confidence_score: 90,
      reversibility_score: 100,
      source_trust_level: "ugrc_geometry",
      is_hard_blocker: false,
      diagnosis_run_id: runId,
    });
  }

  if (analysis.spatial.missing_geometry > 0) {
    issues.push({
      county_id: countyId,
      lane: "spatial_healing",
      severity: pct(analysis.spatial.missing_geometry) > 30 ? "critical" : "high",
      fix_tier: "review_confirm",
      issue_type: "missing_parcel_geometry",
      issue_title: `${analysis.spatial.missing_geometry.toLocaleString()} parcels missing polygon geometry`,
      issue_description: `Parcels without parcel_geom_wgs84 polygons. These cannot be displayed on maps or used for spatial joins. Source: UGRC parcel geometry dataset.`,
      affected_count: analysis.spatial.missing_geometry,
      impact_score: impactFromPct(pct(analysis.spatial.missing_geometry)),
      confidence_score: 70,
      reversibility_score: 100,
      source_trust_level: "ugrc_geometry",
      is_hard_blocker: pct(analysis.spatial.missing_geometry) > 50,
      blocker_reason: pct(analysis.spatial.missing_geometry) > 50 ? "Majority of parcels lack geometry" : null,
      diagnosis_run_id: runId,
    });
  }

  if (analysis.spatial.out_of_bounds > 0) {
    issues.push({
      county_id: countyId,
      lane: "spatial_healing",
      severity: "high",
      fix_tier: "review_confirm",
      issue_type: "out_of_conus_bounds",
      issue_title: `${analysis.spatial.out_of_bounds.toLocaleString()} parcels outside CONUS bounds`,
      issue_description: `Coordinates outside continental US bounds (24-50°N, 66-125°W). These will plot incorrectly on maps.`,
      affected_count: analysis.spatial.out_of_bounds,
      impact_score: impactFromPct(pct(analysis.spatial.out_of_bounds)),
      confidence_score: 85,
      reversibility_score: 100,
      source_trust_level: "county_gis",
      is_hard_blocker: true,
      blocker_reason: "Parcels mapped outside county/state bounds",
      diagnosis_run_id: runId,
    });
  }

  if (analysis.spatial.zero_coords > 0) {
    issues.push({
      county_id: countyId,
      lane: "spatial_healing",
      severity: "medium",
      fix_tier: "auto_apply",
      issue_type: "zero_coordinates",
      issue_title: `${analysis.spatial.zero_coords.toLocaleString()} parcels with (0,0) coordinates`,
      issue_description: `Coordinates set to exactly (0,0) — these are placeholder values, not real locations.`,
      affected_count: analysis.spatial.zero_coords,
      impact_score: impactFromPct(pct(analysis.spatial.zero_coords)),
      confidence_score: 100,
      reversibility_score: 100,
      source_trust_level: "county_gis",
      is_hard_blocker: false,
      diagnosis_run_id: runId,
    });
  }

  // ── Address Normalization Lane ───────────────────────────────
  if (analysis.address.missing_address > 0) {
    issues.push({
      county_id: countyId,
      lane: "address_normalization",
      severity: pct(analysis.address.missing_address) > 5 ? "critical" : "high",
      fix_tier: "review_confirm",
      issue_type: "missing_situs_address",
      issue_title: `${analysis.address.missing_address.toLocaleString()} parcels missing situs address`,
      issue_description: `Taxable improved parcels require a situs address for notices and legal proceedings.`,
      affected_count: analysis.address.missing_address,
      impact_score: impactFromPct(pct(analysis.address.missing_address)),
      confidence_score: 50,
      reversibility_score: 100,
      source_trust_level: "cama_certified",
      is_hard_blocker: pct(analysis.address.missing_address) > 10,
      blocker_reason: pct(analysis.address.missing_address) > 10 ? "Missing situs for taxable improved parcels" : null,
      diagnosis_run_id: runId,
    });
  }

  if (analysis.address.missing_city > 0) {
    issues.push({
      county_id: countyId,
      lane: "address_normalization",
      severity: "medium",
      fix_tier: "auto_apply",
      issue_type: "missing_city",
      issue_title: `${analysis.address.missing_city.toLocaleString()} parcels missing city`,
      issue_description: `City field is null. Can be populated from spatial join to jurisdiction boundaries or address parsing.`,
      affected_count: analysis.address.missing_city,
      impact_score: impactFromPct(pct(analysis.address.missing_city)) * 0.5,
      confidence_score: 80,
      reversibility_score: 100,
      diagnosis_run_id: runId,
    });
  }

  if (analysis.address.missing_zip > 0) {
    issues.push({
      county_id: countyId,
      lane: "address_normalization",
      severity: "medium",
      fix_tier: "auto_apply",
      issue_type: "missing_zip_code",
      issue_title: `${analysis.address.missing_zip.toLocaleString()} parcels missing ZIP code`,
      issue_description: `ZIP code field is null. Can be populated from spatial join to ZCTA boundaries.`,
      affected_count: analysis.address.missing_zip,
      impact_score: impactFromPct(pct(analysis.address.missing_zip)) * 0.4,
      confidence_score: 85,
      reversibility_score: 100,
      diagnosis_run_id: runId,
    });
  }

  // ── Characteristic Inference Lane ───────────────────────────
  const charIssues = [
    { type: "missing_building_area", field: "building_area", count: analysis.characteristics.missing_building_area, sev: "high" as const },
    { type: "missing_year_built", field: "year_built", count: analysis.characteristics.missing_year_built, sev: "high" as const },
    { type: "missing_bedrooms", field: "bedrooms", count: analysis.characteristics.missing_bedrooms, sev: "medium" as const },
    { type: "missing_bathrooms", field: "bathrooms", count: analysis.characteristics.missing_bathrooms, sev: "medium" as const },
    { type: "missing_property_class", field: "property_class", count: analysis.characteristics.missing_property_class, sev: "high" as const },
  ];

  for (const ci of charIssues) {
    if (ci.count > 0) {
      issues.push({
        county_id: countyId,
        lane: "characteristic_inference",
        severity: ci.sev,
        fix_tier: "review_confirm",
        issue_type: ci.type,
        issue_title: `${ci.count.toLocaleString()} parcels missing ${ci.field.replace(/_/g, " ")}`,
        issue_description: `The ${ci.field.replace(/_/g, " ")} field is null. AI can suggest values from comparable parcels in the same neighborhood, but all suggestions require human review.`,
        affected_count: ci.count,
        impact_score: impactFromPct(pct(ci.count)) * (ci.sev === "high" ? 1 : 0.6),
        confidence_score: 40,
        reversibility_score: 100,
        source_trust_level: "ai_inference",
        is_hard_blocker: false,
        diagnosis_run_id: runId,
      });
    }
  }

  if (analysis.characteristics.zero_assessed_value > 0) {
    issues.push({
      county_id: countyId,
      lane: "value_anomaly",
      severity: "critical",
      fix_tier: "human_resolve",
      issue_type: "zero_assessed_value",
      issue_title: `${analysis.characteristics.zero_assessed_value.toLocaleString()} parcels with $0 assessed value`,
      issue_description: `Parcels with zero total assessed value. May be exempt, vacant, or data errors. Requires human classification.`,
      affected_count: analysis.characteristics.zero_assessed_value,
      impact_score: impactFromPct(pct(analysis.characteristics.zero_assessed_value)),
      confidence_score: 30,
      reversibility_score: 100,
      source_trust_level: "cama_certified",
      is_hard_blocker: pct(analysis.characteristics.zero_assessed_value) > 20,
      blocker_reason: pct(analysis.characteristics.zero_assessed_value) > 20 ? "Excessive $0 assessed values" : null,
      diagnosis_run_id: runId,
    });
  }

  // ── Value Anomaly Lane ──────────────────────────────────────
  if (analysis.values.zero_improvement_with_building > 0) {
    issues.push({
      county_id: countyId,
      lane: "value_anomaly",
      severity: "high",
      fix_tier: "human_resolve",
      issue_type: "zero_improvement_with_building",
      issue_title: `${analysis.values.zero_improvement_with_building.toLocaleString()} parcels with $0 improvement but building present`,
      issue_description: `Parcels with building_area > 0 but improvement_value = $0. This indicates a valuation gap — the building exists but has no assessed improvement value.`,
      affected_count: analysis.values.zero_improvement_with_building,
      impact_score: impactFromPct(pct(analysis.values.zero_improvement_with_building)) * 1.2,
      confidence_score: 85,
      reversibility_score: 80,
      source_trust_level: "cama_certified",
      is_hard_blocker: false,
      diagnosis_run_id: runId,
    });
  }

  // ── Neighborhoods ───────────────────────────────────────────
  if (analysis.neighborhoods.missing_neighborhood > 0) {
    issues.push({
      county_id: countyId,
      lane: "cross_source_reconciliation",
      severity: pct(analysis.neighborhoods.missing_neighborhood) > 20 ? "critical" : "high",
      fix_tier: "auto_apply",
      issue_type: "missing_neighborhood_code",
      issue_title: `${analysis.neighborhoods.missing_neighborhood.toLocaleString()} parcels missing neighborhood assignment`,
      issue_description: `Parcels without a neighborhood_code. Can be assigned via spatial join to neighborhood boundaries using ST_Covers.`,
      affected_count: analysis.neighborhoods.missing_neighborhood,
      impact_score: impactFromPct(pct(analysis.neighborhoods.missing_neighborhood)),
      confidence_score: 90,
      reversibility_score: 100,
      source_trust_level: "county_gis",
      is_hard_blocker: false,
      diagnosis_run_id: runId,
    });
  }

  // ── Duplicates ──────────────────────────────────────────────
  if (analysis.duplicates.duplicate_parcel_numbers > 0) {
    issues.push({
      county_id: countyId,
      lane: "orphan_duplicate",
      severity: "critical",
      fix_tier: "human_resolve",
      issue_type: "duplicate_parcel_numbers",
      issue_title: `${analysis.duplicates.duplicate_parcel_numbers.toLocaleString()} duplicate parcel numbers detected`,
      issue_description: `Multiple active records share the same parcel number. This indicates split/merge data artifacts or ingest errors. Must be resolved manually.`,
      affected_count: analysis.duplicates.duplicate_parcel_numbers,
      impact_score: 95,
      confidence_score: 100,
      reversibility_score: 50,
      source_trust_level: "parcel_history",
      is_hard_blocker: true,
      blocker_reason: "Duplicate active parcel IDs",
      diagnosis_run_id: runId,
    });
  }

  return issues;
}

// ══════════════════════════════════════════════════════════════════
// AI TREATMENT PLAN — Lovable AI generates the doctor's report
// ══════════════════════════════════════════════════════════════════

async function generateTreatmentPlan(
  apiKey: string,
  analysis: AnalysisResults,
  issues: any[]
): Promise<Record<string, any>> {
  const total = analysis.total_parcels;
  const hardBlockers = issues.filter((i) => i.is_hard_blocker);
  const laneGroups: Record<string, any[]> = {};
  for (const issue of issues) {
    if (!laneGroups[issue.lane]) laneGroups[issue.lane] = [];
    laneGroups[issue.lane].push(issue);
  }

  const prompt = `You are a county assessor data quality analyst. Analyze this parcel dataset and generate a Treatment Plan.

DATASET: ${total.toLocaleString()} parcels total

ISSUES FOUND:
${issues.map((i) => `- [${i.severity}] ${i.issue_title} (Lane: ${i.lane}, Fix: ${i.fix_tier})`).join("\n")}

HARD BLOCKERS: ${hardBlockers.length > 0 ? hardBlockers.map((b) => b.issue_title).join("; ") : "None"}

Generate a JSON Treatment Plan with:
1. "executive_summary": 2-3 sentence overview of data health and estimated time to assessor-ready
2. "recommended_order": Array of lane names in recommended fix order with rationale
3. "estimated_completion_hours": Rough estimate of total remediation time
4. "risk_assessment": Key risks if issues are not addressed before certification
5. "quick_wins": Top 3 issues that can be auto-fixed immediately for biggest impact

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a data quality analyst for county property assessment. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return { error: "AI unavailable", fallback: true };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Treatment plan generation error:", err);
    return { error: String(err), fallback: true };
  }
}
