// TerraFusion OS — Parcel Lookup Hook (Constitutional: DB access only in hooks)
// Used by GlobalCommandPalette to search parcels by PIN or address.

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParcelResult {
  id: string;
  parcel_number: string;
  address: string;
  assessed_value: number;
}

export function useParcelLookup(searchValue: string): ParcelResult[] {
  const [results, setResults] = useState<ParcelResult[]>([]);

  useEffect(() => {
    if (searchValue.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value")
        .or(`parcel_number.ilike.%${searchValue}%,address.ilike.%${searchValue}%`)
        .limit(8);
      setResults((data as ParcelResult[]) || []);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  return results;
}
