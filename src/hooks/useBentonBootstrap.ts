import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkConnectorHealth } from "@/services/pacsConnector";
import { invalidateBentonBootstrap } from "@/lib/queryInvalidation";

export type BentonBootstrapCheckStatus = "ready" | "warning" | "blocked";

export interface BentonBootstrapCheck {
  id: string;
  title: string;
  status: BentonBootstrapCheckStatus;
  detail: string;
  nextAction?: string;
}

export interface BentonBootstrapReport {
  overall: BentonBootstrapCheckStatus;
  executedAt: string;
  countyId: string | null;
  countyName: string | null;
  checks: BentonBootstrapCheck[];
}

export type BentonBootstrapExecutionStepStatus = "completed" | "skipped" | "failed";

export interface BentonBootstrapExecutionStep {
  id: string;
  title: string;
  status: BentonBootstrapExecutionStepStatus;
  detail: string;
}

export interface BentonBootstrapExecutionResult {
  status: "completed" | "partial" | "failed";
  executedAt: string;
  countyId: string | null;
  countyName: string | null;
  countyChanged: boolean;
  steps: BentonBootstrapExecutionStep[];
  nextActions: string[];
}

const BENTON_GIS_SOURCES = [
  {
    name: "Benton Assessor FGDB",
    source_type: "file_upload",
    connection_url: "E:\\Benton_County_Assessor.gdb",
    metadata: {
      county: "Benton",
      state: "WA",
      localPath: "E:\\Benton_County_Assessor.gdb",
      format: "gdb",
      role: "authoritative_geometry",
    },
  },
  {
    name: "Benton Taxing Jurisdiction Detail",
    source_type: "file_upload",
    connection_url: "E:\\Exports\\Exports\\taxing_jurisdiction_detail.csv",
    metadata: {
      county: "Benton",
      state: "WA",
      localPath: "E:\\Exports\\Exports\\taxing_jurisdiction_detail.csv",
      format: "csv",
      role: "district_enrichment",
    },
  },
  {
    name: "Benton Situs Extract",
    source_type: "file_upload",
    connection_url: "E:\\Exports\\Exports\\dataextract\\situs.csv",
    metadata: {
      county: "Benton",
      state: "WA",
      localPath: "E:\\Exports\\Exports\\dataextract\\situs.csv",
      format: "csv",
      role: "address_enrichment",
    },
  },
] as const;

const BENTON_DATA_REGISTRY_SOURCES = [
  {
    name: "Benton PACS SQL Server",
    source_type: "legacy_cama",
    description: "Primary Benton PACS/CIAPS lane for contract-driven read-only sync.",
    connection_config: {
      lane: "pacs_benton_sql",
      vendor: "True Automation",
      mode: "read_only",
      databaseSchema: "dbo",
    },
  },
  {
    name: "Benton Property Values Export",
    source_type: "csv_upload",
    description: "Current-year Benton property_val export used for parcel valuation and hood_cd joins.",
    connection_config: {
      localPath: "E:\\Exports\\Exports\\dataextract\\property_val.csv",
      role: "valuation_seed",
    },
  },
  {
    name: "Benton Situs Export",
    source_type: "csv_upload",
    description: "Benton situs export for parcel address enrichment.",
    connection_config: {
      localPath: "E:\\Exports\\Exports\\dataextract\\situs.csv",
      role: "address_enrichment",
    },
  },
  {
    name: "Benton Taxing Jurisdiction Export",
    source_type: "csv_upload",
    description: "Benton taxing_jurisdiction_detail export for levy and tax-district enrichment.",
    connection_config: {
      localPath: "E:\\Exports\\Exports\\taxing_jurisdiction_detail.csv",
      role: "district_enrichment",
    },
  },
] as const;

async function ensureBentonGISSources() {
  const { data: existing, error } = await supabase
    .from("gis_data_sources")
    .select("name");

  if (error) throw new Error(error.message);

  const existingNames = new Set((existing ?? []).map((row) => row.name));
  const missing = BENTON_GIS_SOURCES.filter((source) => !existingNames.has(source.name));

  if (missing.length === 0) {
    return { created: 0, total: BENTON_GIS_SOURCES.length };
  }

  const { error: insertError } = await supabase.from("gis_data_sources").insert(
    missing.map((source) => ({
      name: source.name,
      source_type: source.source_type,
      connection_url: source.connection_url,
      sync_status: "pending",
      metadata: source.metadata,
    })),
  );

  if (insertError) throw new Error(insertError.message);

  return { created: missing.length, total: BENTON_GIS_SOURCES.length };
}

async function ensureBentonDataRegistrySources(countyId: string) {
  const { data: existing, error } = await supabase
    .from("data_sources")
    .select("name")
    .eq("county_id", countyId);

  if (error) throw new Error(error.message);

  const existingNames = new Set((existing ?? []).map((row) => row.name));
  const missing = BENTON_DATA_REGISTRY_SOURCES.filter((source) => !existingNames.has(source.name));

  if (missing.length === 0) {
    return { created: 0, total: BENTON_DATA_REGISTRY_SOURCES.length };
  }

  const { error: insertError } = await supabase.from("data_sources").insert(
    missing.map((source) => ({
      county_id: countyId,
      name: source.name,
      source_type: source.source_type,
      description: source.description,
      connection_config: source.connection_config,
    })),
  );

  if (insertError) throw new Error(insertError.message);

  return { created: missing.length, total: BENTON_DATA_REGISTRY_SOURCES.length };
}

async function invokeCountySetup(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("county-setup", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "County setup failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

function deriveOverall(checks: BentonBootstrapCheck[]): BentonBootstrapCheckStatus {
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "ready";
}

async function runBentonBootstrapPreflight(): Promise<BentonBootstrapReport> {
  const executedAt = new Date().toISOString();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to run Benton bootstrap preflight.");
  }

  const [{ data: profile, error: profileError }, { data: bentonCounty, error: countyError }] = await Promise.all([
    supabase.from("profiles").select("county_id").eq("user_id", user.id).single(),
    supabase.from("counties").select("id, name, fips_code, state").eq("fips_code", "53005").maybeSingle(),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (countyError) throw new Error(countyError.message);

  const activeCountyId = profile?.county_id ?? null;
  const bentonCountyId = bentonCounty?.id ?? null;
  const hasBentonCounty = Boolean(bentonCountyId);
  const activeCountyIsBenton = Boolean(activeCountyId && bentonCountyId && activeCountyId === bentonCountyId);

  const counts = bentonCountyId
    ? await Promise.all([
        supabase.from("parcels").select("id", { count: "exact", head: true }).eq("county_id", bentonCountyId),
        supabase.from("study_periods").select("id", { count: "exact", head: true }).eq("county_id", bentonCountyId),
        supabase.from("gis_layers").select("id, layer_type") as any,
        supabase.from("gis_data_sources").select("id, source_type, connection_url"),
        supabase.from("data_sources").select("id, name, source_type").eq("county_id", bentonCountyId),
        (supabase.rpc as Function)("get_pipeline_status", { p_county_id: bentonCountyId }),
        checkConnectorHealth(),
      ])
    : null;

  const parcelCount = counts?.[0].count ?? 0;
  const studyCount = counts?.[1].count ?? 0;
  const layerRows = (counts?.[2].data ?? []) as Array<{ id: string; layer_type: string }>;
  const sourceRows = (counts?.[3].data ?? []) as Array<{ id: string; source_type: string; connection_url: string | null }>;
  const dataRegistryRows = (counts?.[4].data ?? []) as Array<{ id: string; name: string; source_type: string }>;
  const pipelineResult = (counts?.[5]?.data ?? null) as { last_success?: string | null; total_rows?: number | null } | null;
  const connectorHealth = counts?.[6] ?? null;

  const parcelLayers = layerRows.filter((layer) => layer.layer_type === "parcel").length;
  const boundaryLayers = layerRows.filter((layer) => layer.layer_type === "boundary").length;
  const arcgisSources = sourceRows.filter((source) => source.source_type === "arcgis" && source.connection_url).length;
  const registeredGISSeedSources = BENTON_GIS_SOURCES.filter((source) =>
    sourceRows.some((row) => row.connection_url === source.connection_url),
  ).length;
  const registeredDataSources = BENTON_DATA_REGISTRY_SOURCES.filter((source) =>
    dataRegistryRows.some((row) => row.name === source.name),
  ).length;

  const checks: BentonBootstrapCheck[] = [
    {
      id: "county",
      title: "Benton County Tenant",
      status: activeCountyIsBenton ? "ready" : hasBentonCounty ? "warning" : "blocked",
      detail: activeCountyIsBenton
        ? `Active county is ${bentonCounty?.name}, WA.`
        : hasBentonCounty
        ? `Benton county exists, but the current profile is not attached to it.`
        : "Benton county tenant has not been created yet.",
      nextAction: activeCountyIsBenton
        ? undefined
        : hasBentonCounty
        ? "Join Benton County from onboarding or county setup before seeding."
        : "Create Benton County, WA with FIPS 53005 from onboarding before seeding.",
    },
    {
      id: "parcel-spine",
      title: "Parcel Spine",
      status: parcelCount > 0 ? "ready" : bentonCountyId ? "blocked" : "warning",
      detail: bentonCountyId ? `${parcelCount} Benton parcels present.` : "Parcel count unavailable until Benton county exists.",
      nextAction: parcelCount > 0 ? undefined : "Run Benton PACS property core and valuation seed before GIS joins.",
    },
    {
      id: "pacs-lane",
      title: "PACS Lane",
      status: connectorHealth?.connected ? "ready" : hasBentonCounty ? "warning" : "blocked",
      detail: connectorHealth?.connected
        ? `Read-only PACS connector healthy (${connectorHealth.latencyMs ?? 0}ms).`
        : connectorHealth?.error ?? "Benton PACS connector is not wired yet.",
      nextAction: connectorHealth?.connected
        ? undefined
        : "Wire the PACS SQL connector or proxy, then run the Benton contract sync products.",
    },
    {
      id: "gis-sources",
      title: "GIS Sources",
      status: registeredGISSeedSources === BENTON_GIS_SOURCES.length
        ? "ready"
        : sourceRows.length > 0
        ? "warning"
        : "blocked",
      detail: `${registeredGISSeedSources}/${BENTON_GIS_SOURCES.length} Benton seed sources registered; ${arcgisSources} ArcGIS sources and ${sourceRows.length} total GIS sources configured.`,
      nextAction: arcgisSources > 0 ? undefined : "Register a Benton ArcGIS source or prepare exported FGDB GeoJSON inputs in GIS Ops.",
    },
    {
      id: "source-registry",
      title: "Source Registry",
      status: registeredDataSources === BENTON_DATA_REGISTRY_SOURCES.length
        ? "ready"
        : dataRegistryRows.length > 0
        ? "warning"
        : "blocked",
      detail: `${registeredDataSources}/${BENTON_DATA_REGISTRY_SOURCES.length} Benton operational sources registered.`,
      nextAction: registeredDataSources === BENTON_DATA_REGISTRY_SOURCES.length
        ? undefined
        : "Register the Benton PACS lane and export files in the source registry before running sync operations.",
    },
    {
      id: "gis-layers",
      title: "GIS Layer Seed",
      status: parcelLayers > 0 && boundaryLayers > 0 ? "ready" : layerRows.length > 0 ? "warning" : "blocked",
      detail: `${parcelLayers} parcel layers and ${boundaryLayers} boundary layers currently loaded for Benton.`,
      nextAction:
        parcelLayers > 0 && boundaryLayers > 0
          ? undefined
          : "Seed Benton parcels first, then jurisdiction, taxing district, and neighborhood layers from GIS Ops.",
    },
    {
      id: "study-period",
      title: "Study Period",
      status: studyCount > 0 ? "ready" : bentonCountyId ? "warning" : "blocked",
      detail: bentonCountyId ? `${studyCount} Benton study periods found.` : "Study period cannot be checked until Benton county exists.",
      nextAction: studyCount > 0 ? undefined : "Create or activate a Benton study period after parcel seed so quality and modeling views can run.",
    },
    {
      id: "pipeline",
      title: "Pipeline Observability",
      status: pipelineResult?.last_success || (pipelineResult?.total_rows ?? 0) > 0 ? "ready" : "warning",
      detail: pipelineResult?.last_success
        ? `Last Benton pipeline success: ${new Date(pipelineResult.last_success).toLocaleString()}`
        : "No Benton pipeline success recorded yet.",
      nextAction:
        pipelineResult?.last_success || (pipelineResult?.total_rows ?? 0) > 0
          ? undefined
          : "Run Benton ingest and validation flows so pipeline events and readiness signals become authoritative.",
    },
  ];

  return {
    overall: deriveOverall(checks),
    executedAt,
    countyId: bentonCountyId,
    countyName: bentonCounty?.name ?? null,
    checks,
  };
}

export function useRunBentonBootstrapPreflight() {
  return useMutation({
    mutationFn: runBentonBootstrapPreflight,
    onSuccess: (report) => {
      if (report.overall === "ready") {
        toast.success("Benton bootstrap preflight passed");
      } else if (report.overall === "warning") {
        toast.warning("Benton bootstrap preflight found gaps");
      } else {
        toast.error("Benton bootstrap preflight is blocked");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to run Benton bootstrap preflight", { description: error.message });
    },
  });
}

async function executeBentonBootstrap(): Promise<BentonBootstrapExecutionResult> {
  const executedAt = new Date().toISOString();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to execute Benton bootstrap.");
  }

  const steps: BentonBootstrapExecutionStep[] = [];
  let countyChanged = false;

  const [{ data: profile, error: profileError }, { data: existingCounty, error: countyError }] = await Promise.all([
    supabase.from("profiles").select("county_id").eq("user_id", user.id).single(),
    supabase.from("counties").select("id, name, fips_code, state").eq("fips_code", "53005").maybeSingle(),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (countyError) throw new Error(countyError.message);

  let bentonCountyId = existingCounty?.id ?? null;
  let bentonCountyName = existingCounty?.name ?? "Benton";
  const activeCountyId = profile?.county_id ?? null;

  if (!bentonCountyId) {
    const result = await invokeCountySetup("create_county", {
      name: "Benton",
      fipsCode: "53005",
      state: "WA",
    });
    bentonCountyId = result.countyId as string;
    bentonCountyName = "Benton";
    countyChanged = true;
    steps.push({
      id: "county-create",
      title: "Create Benton County",
      status: "completed",
      detail: "Created Benton County, WA and attached the current user to it.",
    });
  } else if (activeCountyId !== bentonCountyId) {
    await invokeCountySetup("join_county", { countyId: bentonCountyId });
    countyChanged = true;
    steps.push({
      id: "county-join",
      title: "Attach To Benton County",
      status: "completed",
      detail: "Switched the current user to the Benton county tenant.",
    });
  } else {
    steps.push({
      id: "county-ready",
      title: "County Tenant Ready",
      status: "skipped",
      detail: "Current user is already attached to Benton County, WA.",
    });
  }

  const gisSeedSources = await ensureBentonGISSources();
  steps.push({
    id: "gis-source-register",
    title: "Register Benton GIS Sources",
    status: gisSeedSources.created > 0 ? "completed" : "skipped",
    detail: gisSeedSources.created > 0
      ? `Registered ${gisSeedSources.created} Benton GIS source entries.`
      : "Benton GIS source catalog was already registered.",
  });

  const dataRegistrySources = await ensureBentonDataRegistrySources(bentonCountyId!);
  steps.push({
    id: "data-source-register",
    title: "Register Benton Source Registry",
    status: dataRegistrySources.created > 0 ? "completed" : "skipped",
    detail: dataRegistrySources.created > 0
      ? `Registered ${dataRegistrySources.created} Benton operational source entries.`
      : "Benton operational source registry entries were already present.",
  });

  const { data: studyPeriods, error: studyPeriodError } = await supabase
    .from("study_periods")
    .select("id, name, status, start_date, end_date")
    .eq("county_id", bentonCountyId!)
    .order("start_date", { ascending: false });

  if (studyPeriodError) throw new Error(studyPeriodError.message);

  const activeStudyPeriod = studyPeriods?.find((period) => period.status === "active") ?? null;
  const currentYear = new Date().getFullYear();

  if (!studyPeriods || studyPeriods.length === 0) {
    const { error } = await supabase.from("study_periods").insert({
      county_id: bentonCountyId,
      name: `Benton ${currentYear} Assessment Roll`,
      description: "Auto-created by Benton bootstrap executor.",
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-12-31`,
      status: "active",
      target_cod: 15,
      target_prd_low: 0.98,
      target_prd_high: 1.03,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);
    steps.push({
      id: "study-period-create",
      title: "Create Active Study Period",
      status: "completed",
      detail: `Created Benton ${currentYear} Assessment Roll as the active study period.`,
    });
  } else if (!activeStudyPeriod) {
    const targetPeriod = studyPeriods[0];
    await supabase.from("study_periods").update({ status: "completed" }).eq("county_id", bentonCountyId).eq("status", "active");
    const { error } = await supabase.from("study_periods").update({ status: "active" }).eq("id", targetPeriod.id);
    if (error) throw new Error(error.message);
    steps.push({
      id: "study-period-activate",
      title: "Activate Benton Study Period",
      status: "completed",
      detail: `Activated ${targetPeriod.name} for Benton bootstrap validation.`,
    });
  } else {
    steps.push({
      id: "study-period-ready",
      title: "Study Period Ready",
      status: "skipped",
      detail: `${activeStudyPeriod.name} is already active for Benton.`,
    });
  }

  const [{ count: parcelCount }, { data: sourceRows }, { data: layerRows }, connectorHealth] = await Promise.all([
    supabase.from("parcels").select("id", { count: "exact", head: true }).eq("county_id", bentonCountyId!),
    supabase.from("gis_data_sources").select("id, source_type, connection_url"),
    supabase.from("gis_layers").select("id, layer_type").eq("county_id", bentonCountyId!),
    checkConnectorHealth(),
  ]);

  const arcgisSources = (sourceRows ?? []).filter((source) => source.source_type === "arcgis" && source.connection_url).length;
  const parcelLayers = (layerRows ?? []).filter((layer) => layer.layer_type === "parcel").length;
  const boundaryLayers = (layerRows ?? []).filter((layer) => layer.layer_type === "boundary").length;

  const nextActions: string[] = [];
  if (!connectorHealth.connected) nextActions.push("Wire the Benton PACS SQL connector or proxy; the read-only PACS lane is still reporting offline.");
  if ((parcelCount ?? 0) === 0) nextActions.push("Run Benton PACS property core and valuation seed to populate parcels once the PACS lane is healthy.");
  if (arcgisSources === 0) nextActions.push("Register a Benton ArcGIS source or prepare exported FGDB GeoJSON inputs in GIS Ops.");
  if (parcelLayers === 0 || boundaryLayers === 0) nextActions.push("Seed Benton parcel and boundary layers from GIS Ops.");

  steps.push({
    id: "pacs-lane-health",
    title: "Verify PACS Lane Health",
    status: connectorHealth.connected ? "completed" : "skipped",
    detail: connectorHealth.connected
      ? `Read-only PACS connector responded in ${connectorHealth.latencyMs ?? 0}ms.`
      : connectorHealth.error ?? "PACS connector remains disconnected after bootstrap initialization.",
  });

  const failedSteps = steps.filter((step) => step.status === "failed").length;

  return {
    status: failedSteps > 0 ? "failed" : nextActions.length > 0 ? "partial" : "completed",
    executedAt,
    countyId: bentonCountyId,
    countyName: bentonCountyName,
    countyChanged,
    steps,
    nextActions,
  };
}

export function useExecuteBentonBootstrap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeBentonBootstrap,
    onSuccess: (result) => {
      invalidateBentonBootstrap(queryClient);

      if (result.status === "completed") {
        toast.success("Benton bootstrap executor completed");
      } else {
        toast.warning("Benton bootstrap executor finished with follow-up steps remaining");
      }

      if (result.countyChanged) {
        setTimeout(() => window.location.reload(), 400);
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to execute Benton bootstrap", { description: error.message });
    },
  });
}