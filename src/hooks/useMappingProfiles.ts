// TerraFusion OS — useMappingProfiles
// County-scoped mapping profile CRUD + auto-detection logic.
// Constitutional: read-write to ingest_mapping_profiles / ingest_mapping_rules only.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showChangeReceipt } from "@/lib/changeReceipt";

// ─── Types ──────────────────────────────────────────────────────

export interface MappingRule {
  source_header: string;
  target_field: string;
  confidence_override?: "high" | "medium" | "low";
  transform?: string;
}

export interface MappingProfile {
  id: string;
  name: string;
  description?: string | null;
  dataset_type: string;
  is_default: boolean;
  created_at: string;
  rules: MappingRule[];
}

// ─── Helpers ────────────────────────────────────────────────────

/** Normalize a column header for fuzzy matching */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-\.]+/g, "").replace(/[^a-z0-9]/g, "");
}

/** Synonyms table: maps common CAMA export variants to canonical target field */
const SYNONYMS: Record<string, string> = {
  // Parcel identity
  parcelnumber: "parcel_number",
  pin: "parcel_number",
  apn: "parcel_number",
  parid: "parcel_number",
  acct: "parcel_number",
  accountnumber: "parcel_number",
  taxid: "parcel_number",
  situsaddr: "address",
  siteaddress: "address",
  streetaddress: "address",
  propertyaddress: "address",
  addr: "address",
  fulladdress: "address",
  situscity: "city",
  propclass: "property_class",
  propertyclass: "property_class",
  classcode: "property_class",
  usecode: "property_class",
  landuse: "property_class",
  nbhd: "neighborhood_code",
  neighborhood: "neighborhood_code",
  nbhdcode: "neighborhood_code",
  neigh: "neighborhood_code",
  zip: "zip_code",
  zipcode: "zip_code",
  postalcode: "zip_code",
  // Values
  assessedvalue: "assessed_value",
  totalvalue: "assessed_value",
  appraisedvalue: "assessed_value",
  marketvalue: "assessed_value",
  totval: "assessed_value",
  landval: "land_value",
  landvalue: "land_value",
  ldval: "land_value",
  impvalue: "improvement_value",
  improvementvalue: "improvement_value",
  bldgval: "improvement_value",
  bldgvalue: "improvement_value",
  // Physical
  sqft: "building_area",
  buildingareasqft: "building_area",
  gla: "building_area",
  livingarea: "building_area",
  lotsize: "land_area",
  lotareasqft: "land_area",
  landarea: "land_area",
  acreage: "land_area",
  yearbuilt: "year_built",
  yrbuilt: "year_built",
  yrblt: "year_built",
  beds: "bedrooms",
  bdrms: "bedrooms",
  baths: "bathrooms",
  fullbaths: "bathrooms",
  // Sales
  saledate: "sale_date",
  salesdate: "sale_date",
  deedsaledate: "sale_date",
  saleprice: "sale_price",
  salesprice: "sale_price",
  salamt: "sale_price",
  saleamt: "sale_price",
  qualified: "is_qualified",
  isqualified: "is_qualified",
  armslenght: "is_qualified",
  seller: "grantor",
  buyer: "grantee",
  deedtype: "deed_type",
  instrumentno: "instrument_number",
  instrno: "instrument_number",
  // Parcel linkage in sales
  parcelid: "parcel_id",
  parcelno: "parcel_number",
};

/** Score confidence of a header→target match */
function scoreMatch(sourceHeader: string, targetField: string): "high" | "medium" | "low" | null {
  const n = normalizeHeader(sourceHeader);
  const t = normalizeHeader(targetField);

  if (n === t) return "high";
  if (SYNONYMS[n] === targetField) return "high";
  if (n.includes(t) || t.includes(n)) return "medium";
  // partial synonym match
  for (const [syn, mapped] of Object.entries(SYNONYMS)) {
    if (mapped === targetField && (n.includes(syn) || syn.includes(n))) return "low";
  }
  return null;
}

/** Auto-detect column mapping from headers + target schema */
export function autoDetectMapping(
  headers: string[],
  targetFields: string[]
): Record<string, { target: string; confidence: "high" | "medium" | "low" }> {
  const result: Record<string, { target: string; confidence: "high" | "medium" | "low" }> = {};
  const usedTargets = new Set<string>();

  // Priority pass: high confidence first, then medium, then low
  for (const level of ["high", "medium", "low"] as const) {
    for (const header of headers) {
      if (result[header]) continue;
      for (const target of targetFields) {
        if (usedTargets.has(target)) continue;
        const score = scoreMatch(header, target);
        if (score === level) {
          result[header] = { target, confidence: level };
          usedTargets.add(target);
          break;
        }
      }
    }
  }

  return result;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useMappingProfiles(datasetType: string) {
  const qc = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["mapping-profiles", datasetType],
    queryFn: async () => {
      const { data: profs, error: pe } = await supabase
        .from("ingest_mapping_profiles")
        .select("*")
        .eq("dataset_type", datasetType)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (pe) throw pe;

      const profilesWithRules: MappingProfile[] = await Promise.all(
        (profs ?? []).map(async (p: any) => {
          const { data: rules } = await supabase
            .from("ingest_mapping_rules")
            .select("*")
            .eq("profile_id", p.id);
          return { ...p, rules: rules ?? [] };
        })
      );

      return profilesWithRules;
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async ({
      name,
      description,
      mapping,
      transforms,
    }: {
      name: string;
      description?: string;
      mapping: Record<string, string>;
      transforms?: Record<string, string[]>;
    }) => {
      // Upsert profile
      const { data: prof, error: pe } = await supabase
        .from("ingest_mapping_profiles")
        .insert({
          dataset_type: datasetType,
          name,
          description: description ?? null,
          is_default: false,
        })
        .select()
        .single();

      if (pe) throw pe;

      // Insert rules
      const rules = Object.entries(mapping)
        .filter(([, target]) => target && target !== "__skip__")
        .map(([source_header, target_field]) => ({
          profile_id: (prof as any).id,
          source_header: normalizeHeader(source_header),
          target_field,
          transform: transforms?.[source_header]?.join(",") || null,
        }));

      if (rules.length > 0) {
        const { error: re } = await supabase
          .from("ingest_mapping_rules")
          .insert(rules);
        if (re) throw re;
      }

      return prof;
    },
    onSuccess: (prof: any) => {
      qc.invalidateQueries({ queryKey: ["mapping-profiles", datasetType] });
      showChangeReceipt({
        action: "Mapping Profile Saved",
        entity: prof.name,
        changes: [{ field: "profile", before: "—", after: prof.name }],
        reason: `Column mapping template saved for ${datasetType} imports`,
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to save mapping profile", { description: err.message });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from("ingest_mapping_profiles")
        .delete()
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mapping-profiles", datasetType] });
      toast.success("Mapping profile deleted");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Clear all defaults for this type first
      await supabase
        .from("ingest_mapping_profiles")
        .update({ is_default: false })
        .eq("dataset_type", datasetType);

      const { error } = await supabase
        .from("ingest_mapping_profiles")
        .update({ is_default: true })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mapping-profiles", datasetType] });
      toast.success("Default profile updated");
    },
  });

  const defaultProfile = profiles.find((p) => p.is_default) ?? profiles[0] ?? null;

  /** Convert a saved profile's rules back to a mapping record */
  function profileToMapping(profile: MappingProfile): Record<string, string> {
    const result: Record<string, string> = {};
    for (const rule of profile.rules) {
      result[rule.source_header] = rule.target_field;
    }
    return result;
  }

  return {
    profiles,
    isLoading,
    defaultProfile,
    profileToMapping,
    saveProfile: saveProfileMutation.mutate,
    isSaving: saveProfileMutation.isPending,
    deleteProfile: deleteProfileMutation.mutate,
    setDefault: setDefaultMutation.mutate,
  };
}
