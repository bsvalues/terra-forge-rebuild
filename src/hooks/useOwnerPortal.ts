// TerraFusion OS — Phase 79: Owner Portal Hook
// Public property lookup via edge function

import { useState } from "react";
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
