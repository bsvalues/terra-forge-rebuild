import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcelExemption {
  id: string;
  exemptionType: string | null;
  status: string | null;
  applicationDate: string | null;
  expirationDate: string | null;
  exemptionAmount: number | null;
  taxYear: number | null;
}

export function useParcelExemptions(parcelId: string | null) {
  return useQuery({
    queryKey: ["parcel-exemptions", parcelId],
    enabled: !!parcelId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ParcelExemption[]> => {
      if (!parcelId) return [];

      const { data, error } = await supabase
        .from("exemptions")
        .select("id, exemption_type, status, application_date, expiration_date, exemption_amount, tax_year")
        .eq("parcel_id", parcelId)
        .order("application_date", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((e) => ({
        id: e.id,
        exemptionType: e.exemption_type,
        status: e.status,
        applicationDate: e.application_date,
        expirationDate: e.expiration_date,
        exemptionAmount: e.exemption_amount,
        taxYear: e.tax_year,
      }));
    },
  });
}
