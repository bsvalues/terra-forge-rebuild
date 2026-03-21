// TerraFusion OS — Phase 97: Owner Portal Hook
// Public property lookup, appeal submission, realtime tracking, evidence upload

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OwnerParcelResult {
  parcelNumber: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  propertyClass: string | null;
  neighborhoodCode: string | null;
  characteristics: {
    acres: number | null;
    yearBuilt: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    squareFootage: number | null;
  };
  assessments: {
    tax_year: number;
    land_value: number;
    improvement_value: number;
    total_value: number | null;
    assessment_date: string | null;
    certified: boolean | null;
  }[];
  valueChange: {
    priorYear: number;
    currentYear: number;
    priorValue: number;
    currentValue: number;
    change: number;
    changePct: number;
  } | null;
  appeals: {
    tax_year: number | null;
    status: string;
    appeal_date: string;
    original_value: number;
    requested_value: number | null;
    final_value: number | null;
    resolution_type: string | null;
    hearing_date: string | null;
  }[];
  exemptions: {
    tax_year: number;
    exemption_type: string;
    status: string;
    exemption_amount: number | null;
    exemption_percentage: number | null;
    application_date: string;
    approval_date: string | null;
    expiration_date: string | null;
  }[];
}

export interface AppealFormData {
  parcelNumber: string;
  ownerName: string;
  ownerEmail: string;
  requestedValue: string;
  reason: string;
  taxYear: number;
  landValue: number;
  improvementValue: number;
}

export interface AppealResult {
  id: string;
  caseNumber: string;
}

// ── Lookup hook (unchanged API) ──────────────────────────────────

export function useOwnerPortalLookup() {
  const [results, setResults] = useState<OwnerParcelResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (searchType: "parcel_number" | "address", searchValue: string) => {
    if (!searchValue.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("owner-portal-lookup", {
        body: { searchType, searchValue: searchValue.trim() },
      });

      if (error) throw error;
      setResults(data?.parcels ?? []);

      if ((data?.parcels ?? []).length === 0) {
        toast.info("No properties found matching your search");
      }
    } catch (err: any) {
      toast.error("Search failed", { description: err.message });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clear = () => {
    setResults([]);
    setSearched(false);
  };

  return { results, isLoading, searched, search, clear };
}

// ── Appeal submission hook ───────────────────────────────────────

export function useSubmitAppeal() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (data: AppealFormData): Promise<AppealResult | null> => {
    setIsSubmitting(true);
    try {
      // Resolve parcel_number → UUID
      const { data: parcelRow, error: parcelErr } = await supabase
        .from("parcels")
        .select("id")
        .eq("parcel_number", data.parcelNumber)
        .maybeSingle();

      if (parcelErr) throw parcelErr;
      if (!parcelRow) throw new Error("Parcel not found in system");

      const { data: appeal, error: appealErr } = await supabase
        .from("appeals")
        .insert({
          parcel_id: parcelRow.id,
          appeal_date: new Date().toISOString().split("T")[0],
          original_value: data.landValue + data.improvementValue,
          requested_value: data.requestedValue ? Number(data.requestedValue) : null,
          status: "pending",
          owner_email: data.ownerEmail,
          notes: `Owner: ${data.ownerName}\nReason: ${data.reason}\n[source:owner_portal]`,
          tax_year: data.taxYear,
        })
        .select("id")
        .single();

      if (appealErr) throw appealErr;

      const caseNumber = `APL-${data.taxYear}-${appeal.id.slice(0, 6).toUpperCase()}`;
      toast.success("Appeal submitted successfully");
      return { id: appeal.id, caseNumber };
    } catch (err: any) {
      toast.error("Failed to submit appeal", { description: err.message });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting };
}

// ── Realtime appeal status tracking ──────────────────────────────

export interface AppealStatus {
  status: string;
  hearing_date: string | null;
}

export function useAppealStatus(appealId: string | null) {
  const [appealStatus, setAppealStatus] = useState<AppealStatus | null>(null);

  useEffect(() => {
    if (!appealId) return;

    // Fetch initial status
    supabase
      .from("appeals")
      .select("status, hearing_date")
      .eq("id", appealId)
      .single()
      .then(({ data }) => {
        if (data) setAppealStatus({ status: data.status, hearing_date: data.hearing_date });
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`appeal-${appealId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appeals", filter: `id=eq.${appealId}` },
        (payload) => {
          const row = payload.new as { status: string; hearing_date: string | null };
          setAppealStatus({ status: row.status, hearing_date: row.hearing_date });
          toast.info(`Appeal status updated: ${row.status}`);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appealId]);

  return appealStatus;
}

// ── Evidence file upload ─────────────────────────────────────────

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/zip"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

export interface EvidenceFile {
  name: string;
  size: number;
  path: string;
}

export function useEvidenceUpload(parcelNumber: string | null) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const upload = async (fileList: FileList) => {
    if (!parcelNumber) return;
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const toUpload = Array.from(fileList).slice(0, remaining);
    const invalid = toUpload.filter(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE,
    );
    if (invalid.length > 0) {
      toast.error("Only PDF, JPG, PNG, ZIP files up to 10 MB are allowed");
      return;
    }

    setUploading(true);
    const uploaded: EvidenceFile[] = [];

    for (const file of toUpload) {
      const storagePath = `owner-evidence/${parcelNumber}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("dossier-files")
        .upload(storagePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      uploaded.push({ name: file.name, size: file.size, path: storagePath });
    }

    setFiles((prev) => [...prev, ...uploaded]);
    if (uploaded.length > 0) toast.success(`${uploaded.length} file(s) uploaded`);
    setUploading(false);
  };

  const remove = (path: string) => {
    setFiles((prev) => prev.filter((f) => f.path !== path));
    // Best-effort delete from storage
    supabase.storage.from("dossier-files").remove([path]);
  };

  const reset = () => setFiles([]);

  return { files, uploading, upload, remove, reset, maxFiles: MAX_FILES };
}
