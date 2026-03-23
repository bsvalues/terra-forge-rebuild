import { supabase } from "@/integrations/supabase/client";

const MAX_CONTEXT_CHARS = 2000;

function compact(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function safeSlice(s: string, max = MAX_CONTEXT_CHARS) {
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

export async function buildParcelContext(parcelId: string): Promise<string> {
  const { data: parcel } = await (supabase as any)
    .from("parcels")
    .select("id, situs_address, city, neighborhood_code, property_class, assessed_value, land_value, improvement_value")
    .eq("id", parcelId)
    .maybeSingle();

  if (!parcel) return "";

  const { data: history } = await (supabase as any)
    .from("vw_full_value_history")
    .select("roll_year, total_value, source_system")
    .eq("parcel_id", parcelId)
    .order("roll_year", { ascending: false })
    .limit(4);

  const lines: string[] = [];
  lines.push(`parcel_id: ${parcel.id}`);
  lines.push(`address: ${parcel.situs_address || "-"}, ${parcel.city || "-"}`);
  lines.push(`neighborhood: ${parcel.neighborhood_code || "-"}`);
  lines.push(`property_class: ${parcel.property_class || "-"}`);
  lines.push(`assessed_value: ${parcel.assessed_value ?? "-"}`);
  lines.push(`land_value: ${parcel.land_value ?? "-"}`);
  lines.push(`improvement_value: ${parcel.improvement_value ?? "-"}`);

  if (history?.length) {
    const hist = history
      .map((h: any) => `${h.roll_year}:${h.total_value ?? "-"}(${h.source_system || "-"})`)
      .join(" | ");
    lines.push(`recent_history: ${hist}`);
  }

  return safeSlice(compact(lines.join("\n")));
}
